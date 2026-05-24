const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();
const axios = require('axios');
const redisClient = require('./redisClient');
const OHLC = require('../models/OHLC');
const logger = require('../utils/logger');
const symbolAdapter = require('../utils/symbolAdapter');

// Request deduplication cache
const activeRequests = new Map();

// Provider health monitoring / Circuit Breakers
const providerHealth = {
  yahoo: { failures: 0, cooldownUntil: 0 },
  alphavantage: { failures: 0, cooldownUntil: 0 }
};

const COOLDOWN_DURATION = 60 * 1000; // 1 minute cooldown on failure
const MAX_FAILURES = 3;

const isProviderHealthy = (provider) => {
  const health = providerHealth[provider];
  if (!health) return true;
  if (Date.now() < health.cooldownUntil) {
    logger.warn(`[Candle Engine] Provider ${provider} is on cooldown until ${new Date(health.cooldownUntil).toISOString()}`);
    return false;
  }
  return true;
};

const recordFailure = (provider) => {
  const health = providerHealth[provider];
  if (health) {
    health.failures++;
    if (health.failures >= MAX_FAILURES) {
      health.cooldownUntil = Date.now() + COOLDOWN_DURATION;
      health.failures = 0; // Reset counter for post-cooldown tracking
      logger.error(`[Candle Engine] Provider ${provider} reached ${MAX_FAILURES} consecutive failures. Cooldown activated for 1 minute.`);
    }
  }
};

const recordSuccess = (provider) => {
  const health = providerHealth[provider];
  if (health) {
    health.failures = 0;
    health.cooldownUntil = 0;
  }
};

// Normalization utilities
const normalizeInterval = (interval) => {
  const i = String(interval || '1d').toLowerCase().trim();
  if (i === '1d' || i === 'daily' || i === 'd') return '1d';
  if (i === '1h' || i === '60m' || i === 'hourly' || i === '60min') return '1h';
  if (i === '15m' || i === '15min') return '15m';
  return '1d';
};

const normalizeRange = (range) => {
  const r = String(range || '1y').toLowerCase().trim();
  if (['1mo', '3mo', '6mo', '1y', '5d', '1d'].includes(r)) return r;
  return '1y';
};

const getPeriodDates = (range) => {
  const to = new Date();
  const from = new Date();
  const r = String(range || '1y').toLowerCase().trim();
  
  if (r === '1mo') {
    from.setDate(to.getDate() - 30);
  } else if (r === '3mo') {
    from.setDate(to.getDate() - 90);
  } else if (r === '6mo') {
    from.setDate(to.getDate() - 180);
  } else if (r === '1y') {
    from.setDate(to.getDate() - 365);
  } else if (r === '5d') {
    from.setDate(to.getDate() - 5);
  } else if (r === '1d') {
    from.setDate(to.getDate() - 2);
  } else {
    from.setDate(to.getDate() - 365);
  }
  return { from, to };
};

// MongoDB OHLC storage
const saveCandlesToDB = async (symbol, interval, candles, source) => {
  try {
    const cleanSym = symbolAdapter.cleanBaseSymbol(symbol);
    const exchange = symbol.toUpperCase().endsWith('.BO') ? 'BSE' : 'NSE';
    const timeframe = interval;

    if (!Array.isArray(candles) || candles.length === 0) return;

    const timestamps = candles.map(c => new Date(c.time * 1000));
    const minDate = new Date(Math.min(...timestamps.map(t => t.getTime())));
    const maxDate = new Date(Math.max(...timestamps.map(t => t.getTime())));

    // Check for existing records in MongoDB within range to avoid duplicates
    const existingDocs = await OHLC.find({
      symbol: cleanSym,
      exchange,
      timeframe,
      timestamp: { $gte: minDate, $lte: maxDate }
    }).select('timestamp').lean();

    const existingTimes = new Set(existingDocs.map(d => new Date(d.timestamp).getTime()));

    const newDocs = [];
    for (const c of candles) {
      const tMs = c.time * 1000;
      if (!existingTimes.has(tMs)) {
        newDocs.push({
          timestamp: new Date(tMs),
          symbol: cleanSym,
          exchange,
          timeframe,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume || 0,
          source
        });
      }
    }

    if (newDocs.length > 0) {
      await OHLC.insertMany(newDocs, { ordered: false });
      logger.info(`[Candle Engine DB] Saved ${newDocs.length} new OHLC documents for ${cleanSym} (${timeframe}) from ${source}`);
    } else {
      logger.info(`[Candle Engine DB] No new OHLC documents needed for ${cleanSym} (${timeframe})`);
    }
  } catch (err) {
    logger.error(`[Candle Engine DB Error] Failed to save candles: ${err.message}`);
  }
};

// Database Fallback
const fetchFromDBBackup = async (symbol, interval, range) => {
  try {
    const cleanSym = symbolAdapter.cleanBaseSymbol(symbol);
    const exchange = symbol.toUpperCase().endsWith('.BO') ? 'BSE' : 'NSE';
    const { from, to } = getPeriodDates(range);

    logger.info(`[Candle Engine DB Backup] Loading candles from MongoDB for ${cleanSym} (${interval})`);

    const docs = await OHLC.find({
      symbol: cleanSym,
      exchange,
      timeframe: interval,
      timestamp: { $gte: from, $lte: to }
    }).sort({ timestamp: 1 }).lean();

    if (docs.length > 0) {
      logger.info(`[Candle Engine DB Backup Success] Loaded ${docs.length} candles from DB for ${cleanSym}`);
      return docs.map(d => ({
        time: Math.floor(new Date(d.timestamp).getTime() / 1000),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume || 0
      }));
    }
  } catch (err) {
    logger.error(`[Candle Engine DB Backup Error] Failed to read from MongoDB: ${err.message}`);
  }
  return null;
};

// Provider Fetch Methods
const fetchYahooCandles = async (symbol, interval, range) => {
  const yahooSymbol = symbolAdapter.toYahoo(symbol);
  const { from, to } = getPeriodDates(range);
  
  const queryOptions = {
    period1: from,
    period2: to,
    interval: interval
  };

  logger.info(`[Candle Engine Yahoo] Querying Yahoo Finance for ${yahooSymbol} (options: ${JSON.stringify(queryOptions)})`);
  
  const fetchPromise = yahooFinance.chart(yahooSymbol, queryOptions);
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Yahoo Finance API timeout exceeded (6000ms)')), 6000)
  );

  const result = await Promise.race([fetchPromise, timeoutPromise]);
  
  if (!result || !result.quotes || !Array.isArray(result.quotes) || result.quotes.length === 0) {
    throw new Error(`Yahoo Finance returned empty chart data for ${yahooSymbol}`);
  }

  const candles = [];
  for (const q of result.quotes) {
    if (q.open == null || q.high == null || q.low == null || q.close == null) {
      continue;
    }
    
    const timeVal = Math.floor(new Date(q.date).getTime() / 1000);
    
    candles.push({
      time: timeVal,
      open: Number(q.open.toFixed(2)),
      high: Number(q.high.toFixed(2)),
      low: Number(q.low.toFixed(2)),
      close: Number(q.close.toFixed(2)),
      volume: Number(q.volume || 0)
    });
  }

  if (candles.length === 0) {
    throw new Error(`No valid candles parsed from Yahoo Finance response for ${yahooSymbol}`);
  }

  candles.sort((a, b) => a.time - b.time);
  return candles;
};

const fetchAlphaVantageCandles = async (symbol, interval, range) => {
  const alphaSymbol = symbolAdapter.toAlphaVantage(symbol);
  const alphaKey = process.env.ALPHA_VANTAGE_KEY;
  if (!alphaKey) {
    throw new Error('Alpha Vantage API Key is missing');
  }

  let func = 'TIME_SERIES_DAILY';
  let extraParams = {};

  if (interval === '15m') {
    func = 'TIME_SERIES_INTRADAY';
    extraParams = { interval: '15min' };
  } else if (interval === '1h') {
    func = 'TIME_SERIES_INTRADAY';
    extraParams = { interval: '60min' };
  }

  const url = 'https://www.alphavantage.co/query';
  logger.info(`[Candle Engine AlphaVantage] Querying Alpha Vantage for ${alphaSymbol} (${interval})`);

  const response = await axios.get(url, {
    params: {
      function: func,
      symbol: alphaSymbol,
      apikey: alphaKey,
      outputsize: 'compact',
      ...extraParams
    },
    timeout: 8000
  });

  const data = response.data;
  
  if (data['Note'] || data['Information']) {
    throw new Error(`Alpha Vantage API rate limit/note: ${data['Note'] || data['Information']}`);
  }

  let timeSeriesKey = 'Time Series (Daily)';
  if (interval === '15m') {
    timeSeriesKey = 'Time Series (15min)';
  } else if (interval === '1h') {
    timeSeriesKey = 'Time Series (60min)';
  }

  const timeSeries = data[timeSeriesKey];
  if (!timeSeries) {
    throw new Error(data['Error Message'] || 'Alpha Vantage failed to return time series data');
  }

  const candles = [];
  for (const dateStr of Object.keys(timeSeries)) {
    const item = timeSeries[dateStr];
    const timestamp = Math.floor(new Date(dateStr).getTime() / 1000);
    
    candles.push({
      time: timestamp,
      open: parseFloat(item['1. open']),
      high: parseFloat(item['2. high']),
      low: parseFloat(item['3. low']),
      close: parseFloat(item['4. close']),
      volume: parseInt(item['5. volume'] || 0, 10)
    });
  }

  if (candles.length === 0) {
    throw new Error(`No valid candles parsed from Alpha Vantage response for ${alphaSymbol}`);
  }

  candles.sort((a, b) => a.time - b.time);
  return candles;
};

// Core aggregation engine
const getHistoricalDataInternal = async (symbol, timeframe, period) => {
  const normInterval = normalizeInterval(timeframe);
  const normRange = normalizeRange(period);
  const redisKey = `candles:${symbol.toUpperCase()}:${normInterval}:${normRange}`;

  // 1. Try Redis cache
  try {
    const cached = await redisClient.get(redisKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      logger.info(`[Candle Engine Cache Hit] Loaded ${cached.length} candles from Redis for ${symbol} (${normInterval})`);
      return cached;
    }
  } catch (err) {
    logger.warn(`[Candle Engine Cache Error] Redis read failed: ${err.message}`);
  }

  let candles = null;
  let providerUsed = null;

  // 2. Try Yahoo Finance (Primary)
  if (isProviderHealthy('yahoo')) {
    try {
      candles = await fetchYahooCandles(symbol, normInterval, normRange);
      providerUsed = 'yahoo';
      recordSuccess('yahoo');
    } catch (err) {
      logger.warn(`[Candle Engine Warning] Yahoo Finance failed for ${symbol}: ${err.message}`);
      recordFailure('yahoo');
    }
  }

  // 3. Try Alpha Vantage (Fallback)
  if (!candles && isProviderHealthy('alphavantage') && process.env.ALPHA_VANTAGE_KEY) {
    try {
      candles = await fetchAlphaVantageCandles(symbol, normInterval, normRange);
      providerUsed = 'alphavantage';
      recordSuccess('alphavantage');
    } catch (err) {
      logger.warn(`[Candle Engine Warning] Alpha Vantage fallback failed for ${symbol}: ${err.message}`);
      recordFailure('alphavantage');
    }
  }

  // 4. Try MongoDB Backup (Offline fallback)
  if (!candles) {
    candles = await fetchFromDBBackup(symbol, normInterval, normRange);
    if (candles) {
      providerUsed = 'mongodb-backup';
    }
  }

  // If we fetched fresh candles from APIs, write to DB and cache in Redis
  if (candles && candles.length > 0) {
    // Save to DB asynchronously to keep response fast
    if (providerUsed === 'yahoo' || providerUsed === 'alphavantage') {
      saveCandlesToDB(symbol, normInterval, candles, providerUsed);
    }

    // Cache in Redis
    try {
      // Intraday TTL: 2 mins; Daily TTL: 15 mins
      const ttlMs = normInterval === '1d' ? 15 * 60 * 1000 : 2 * 60 * 1000;
      await redisClient.set(redisKey, candles, ttlMs);
      logger.info(`[Candle Engine Cache Save] Cached ${candles.length} candles to Redis for ${symbol} (TTL: ${ttlMs / 1000}s)`);
    } catch (err) {
      logger.warn(`[Candle Engine Cache Save Error] Redis write failed: ${err.message}`);
    }

    return candles;
  }

  throw new Error(`All candle aggregation providers failed for symbol: ${symbol}`);
};

// Public Entry Point with Request Deduplication
const getHistoricalData = async (symbol, timeframe = '1d', period = '1y') => {
  const normInterval = normalizeInterval(timeframe);
  const normRange = normalizeRange(period);
  const requestKey = `${symbol.toUpperCase()}:${normInterval}:${normRange}`;

  if (activeRequests.has(requestKey)) {
    logger.info(`[Candle Engine Deduplication] Reusing existing promise for ${requestKey}`);
    return activeRequests.get(requestKey);
  }

  const promise = getHistoricalDataInternal(symbol, timeframe, period);
  activeRequests.set(requestKey, promise);

  try {
    return await promise;
  } finally {
    activeRequests.delete(requestKey);
  }
};

module.exports = {
  getHistoricalData,
  normalizeInterval,
  normalizeRange
};
