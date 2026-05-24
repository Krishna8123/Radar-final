const axios = require('axios');
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();
const AlertRule = require('../models/AlertRule');
const cache = require('../cache/radarMemoryCache');
const { RSI, MACD, EMA } = require('technicalindicators');
const logger = require('../config/logger');
const symbolAdapter = require('../utils/symbolAdapter');
const candleEngine = require('./candleEngine');

const TWELVE_DATA_API_KEY = process.env.TWELVE_API_KEY;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY;

// Standardize symbol for Twelve Data
const toTwelveSymbol = (symbol) => {
    let s = String(symbol || '').trim().toUpperCase();
    s = s.replace(/\.(NS|BO)$/i, '');
    const knownCryptos = ['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOGE', 'DOT', 'BNB', 'MATIC', 'AVAX', 'LINK', 'LTC'];
    if (knownCryptos.includes(s) || s.endsWith('-USD')) {
        return s.endsWith('-USD') ? s.replace('-USD', '/USD') : `${s}/USD`;
    }
    const US_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM', 'XOM', 'UNH', 'WMT', 'BA'];
    if (US_STOCKS.includes(s)) {
        return s;
    }
    return `${s}.NSE`; // Default Indian Equities to NSE suffix for Twelve Data
};

// Standardize symbol for Yahoo, Finnhub, and Alpha Vantage
const toYahooSymbol = (symbol) => {
    let s = String(symbol || '').trim().toUpperCase();
    s = s.replace(/\.(NS|BO|NSE|BSE)$/i, '');
    const knownCryptos = ['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOGE', 'DOT', 'BNB', 'MATIC', 'AVAX', 'LINK', 'LTC'];
    if (knownCryptos.includes(s) || s.endsWith('-USD')) {
        return s.endsWith('-USD') ? s : `${s}-USD`;
    }
    const US_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM', 'XOM', 'UNH', 'WMT', 'BA'];
    if (US_STOCKS.includes(s)) {
        return s;
    }
    return `${s}.NS`;
};

// Fetch company news from Finnhub and calculate sentiment
const fetchFinnhubNewsSentiment = async (symbol) => {
    if (!FINNHUB_API_KEY) return 'Neutral';
    
    const cacheKey = `finnhub:sentiment:${symbol}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const finnhubSymbol = symbolAdapter.toFinnhub(symbol);
        const toDate = new Date().toISOString().split('T')[0];
        const fromDate = new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString().split('T')[0]; // Last 4 days
        
        const res = await axios.get(`https://finnhub.io/api/v1/company-news`, {
            params: { symbol: finnhubSymbol, from: fromDate, to: toDate, token: FINNHUB_API_KEY },
            timeout: 4000
        });

        if (Array.isArray(res.data) && res.data.length > 0) {
            let score = 0;
            const positiveWords = ['buy', 'growth', 'gain', 'bull', 'profit', 'rise', 'up', 'strength', 'support', 'beat', 'positive'];
            const negativeWords = ['sell', 'loss', 'decline', 'drop', 'bear', 'fall', 'down', 'weakness', 'pressure', 'miss', 'negative'];
            
            for (const news of res.data.slice(0, 8)) {
                const title = (news.headline || '').toLowerCase();
                const summary = (news.summary || '').toLowerCase();
                
                positiveWords.forEach(w => {
                    if (title.includes(w)) score++;
                    if (summary.includes(w)) score += 0.5;
                });
                negativeWords.forEach(w => {
                    if (title.includes(w)) score--;
                    if (summary.includes(w)) score -= 0.5;
                });
            }

            const sentiment = score > 1 ? 'Positive' : score < -1 ? 'Negative' : 'Neutral';
            cache.set(cacheKey, sentiment, 60000); // Cache for 60 seconds
            return sentiment;
        }
    } catch (e) {
        logger.warn(`Finnhub sentiment fetch failed for ${symbol}: ${e.message}`);
    }
    return 'Neutral';
};

// Fetch data from Twelve Data (Primary)
const fetchTwelveData = async (symbol) => {
    const twelveSymbol = toTwelveSymbol(symbol);
    
    // Fetch quote and time series daily in parallel
    const [quoteRes, seriesRes] = await Promise.all([
        axios.get(`https://api.twelvedata.com/quote`, {
            params: { symbol: twelveSymbol, apikey: TWELVE_DATA_API_KEY },
            timeout: 6000
        }).catch(err => {
            logger.warn(`Twelve Data Quote API error for ${twelveSymbol}: ${err.message}`);
            return null;
        }),
        axios.get(`https://api.twelvedata.com/time_series`, {
            params: { symbol: twelveSymbol, interval: '1day', outputsize: 50, apikey: TWELVE_DATA_API_KEY },
            timeout: 8000
        }).catch(err => {
            logger.warn(`Twelve Data Series API error for ${twelveSymbol}: ${err.message}`);
            return null;
        })
    ]);

    const quote = quoteRes?.data;
    const series = seriesRes?.data;

    if (quote?.status === 'error' || series?.status === 'error') {
        throw new Error(quote?.message || series?.message || 'Twelve Data returned error status');
    }

    if (!quote || !series || !series.values) {
        throw new Error('Twelve Data returned empty response');
    }

    const candles = series.values.map(item => ({
        timestamp: new Date(item.datetime),
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        volume: parseInt(item.volume || 0, 10),
    })).reverse(); // Oldest to newest

    return {
        price: parseFloat(quote.close || quote.price),
        changePercent: parseFloat(quote.percent_change || quote.change_percent || 0),
        volume: parseInt(quote.volume || candles[candles.length - 1]?.volume || 0, 10),
        high: parseFloat(quote.high || candles[candles.length - 1]?.high || 0),
        low: parseFloat(quote.low || candles[candles.length - 1]?.low || 0),
        candles
    };
};

// Fetch indicators using Alpha Vantage (Fallback indicators)
const fetchAlphaVantageCandles = async (symbol) => {
    if (!ALPHA_VANTAGE_KEY) throw new Error('Missing Alpha Vantage Key');
    const alphaSymbol = toYahooSymbol(symbol);
    
    const res = await axios.get(`https://www.alphavantage.co/query`, {
        params: {
            function: 'TIME_SERIES_DAILY',
            symbol: alphaSymbol,
            apikey: ALPHA_VANTAGE_KEY,
            outputsize: 'compact'
        },
        timeout: 9000
    });

    const timeSeries = res.data?.['Time Series (Daily)'];
    if (!timeSeries) {
        throw new Error(res.data?.['Note'] || res.data?.['Error Message'] || 'Alpha Vantage failed to return time series');
    }

    // Convert Alpha Vantage format
    const candles = Object.keys(timeSeries).map(date => {
        const item = timeSeries[date];
        return {
            timestamp: new Date(date),
            open: parseFloat(item['1. open']),
            high: parseFloat(item['2. high']),
            low: parseFloat(item['3. low']),
            close: parseFloat(item['4. close']),
            volume: parseInt(item['5. volume'] || 0, 10)
        };
    }).reverse(); // Oldest to newest

    return candles;
};

// Fetch backup quotes using Yahoo Finance
const fetchYahooQuoteOnly = async (symbol) => {
    const yahooSymbol = symbolAdapter.toYahoo(symbol);
    try {
        const quote = await yahooFinance.quote(yahooSymbol);
        if (!quote) {
            throw new Error('Yahoo Finance returned no quote data');
        }
        return {
            price: quote.regularMarketPrice,
            changePercent: quote.regularMarketChangePercent,
            volume: quote.regularMarketVolume || 0,
            high: quote.regularMarketDayHigh || quote.regularMarketPrice,
            low: quote.regularMarketDayLow || quote.regularMarketPrice
        };
    } catch (err) {
        logger.warn(`[Market Aggregator] yahooFinance.quote failed for ${yahooSymbol}, trying direct v8 chart endpoint fallback: ${err.message}`);
        try {
            const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`, {
                params: {
                    range: '1d',
                    interval: '1m',
                },
                timeout: 6000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json'
                }
            });
            
            const result = response.data?.chart?.result?.[0];
            if (!result || !result.meta) {
                throw new Error(`Direct v8 chart endpoint returned no data for ${yahooSymbol}`);
            }
            
            const meta = result.meta;
            const prices = result.indicators?.quote?.[0]?.close || [];
            const validPrices = prices.filter(p => p != null);
            const currentPrice = validPrices.length > 0 ? validPrices[validPrices.length - 1] : meta.regularMarketPrice;
            
            const prevClose = meta.previousClose || currentPrice;
            const changePercent = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;
            
            return {
                price: currentPrice,
                changePercent: changePercent,
                volume: meta.regularMarketVolume || 0,
                high: meta.high || currentPrice,
                low: meta.low || currentPrice
            };
        } catch (fallbackErr) {
            throw new Error(`Yahoo Finance quote and direct fallback both failed: ${fallbackErr.message}`);
        }
    }
};

// Calculate indicators and signals
const computeIndicatorsAndSignals = (candles, price, volume, high, low) => {
    if (!Array.isArray(candles) || candles.length < 26) {
        return {
            rsi: null,
            macd: { macd: null, signal: null, histogram: null },
            vwap: null,
            rvol: null,
            trend: 'Sideways',
            signals: [],
            technicalSignal: 'Awaiting live market data'
        };
    }

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high || c.close);
    const volumes = candles.map(c => c.volume || 0);

    // RSI 14
    let rsi = null;
    try {
        const rsiValues = RSI.calculate({ values: closes, period: 14 });
        if (rsiValues.length) rsi = rsiValues[rsiValues.length - 1];
    } catch (e) {
        logger.warn(`RSI calculation error: ${e.message}`);
    }

    // MACD 12, 26, 9
    let macd = null, signal = null, histogram = null;
    let prevMacd = null, prevSignal = null;
    try {
        const macdValues = MACD.calculate({
            values: closes,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            SimpleMAOscillator: false,
            SimpleMASignal: false
        });
        if (macdValues.length) {
            const macdPoint = macdValues[macdValues.length - 1];
            macd = macdPoint.MACD;
            signal = macdPoint.signal;
            histogram = macdPoint.histogram;

            if (macdValues.length > 1) {
                const prevPoint = macdValues[macdValues.length - 2];
                prevMacd = prevPoint.MACD;
                prevSignal = prevPoint.signal;
            }
        }
    } catch (e) {
        logger.warn(`MACD calculation error: ${e.message}`);
    }

    // VWAP Position (using typical price & volume of candles)
    let vwap = null;
    let tpVol = 0, volSum = 0;
    for (const c of candles) {
        const tp = ((c.high || c.close) + (c.low || c.close) + c.close) / 3;
        const v = c.volume || 0;
        tpVol += tp * v;
        volSum += v;
    }
    if (volSum > 0) {
        vwap = tpVol / volSum;
    }

    // RVOL (Relative Volume over 20 days)
    const recentVolumes = volumes.slice(-20);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / (recentVolumes.length || 1);
    const rvol = avgVolume > 0 ? volume / avgVolume : 1.0;

    // Day High Breakout Detection
    const recentHigh = highs.length > 20 ? Math.max(...highs.slice(-21, -1)) : Math.max(...highs.slice(0, -1));

    const signals = [];

    // RSI rules
    if (rsi !== null) {
        if (rsi < 30) signals.push('Oversold');
        else if (rsi > 70) signals.push('Overbought');
        else if (rsi > 55) signals.push('Bullish RSI');
    }

    // MACD crossover
    if (macd !== null && signal !== null && prevMacd !== null && prevSignal !== null) {
        const currentCrossedAbove = macd > signal && prevMacd <= prevSignal;
        const currentCrossedBelow = macd < signal && prevMacd >= prevSignal;
        if (currentCrossedAbove || currentCrossedBelow) {
            signals.push('MACD Cross');
        }
    }

    // Volume Spike
    if (rvol > 2.0) {
        signals.push('Volume Spike');
    }

    // Breakout Ready
    if (price >= recentHigh || price >= high) {
        signals.push('Breakout Ready');
    }

    // Intraday Strength
    if (vwap !== null && price > vwap) {
        signals.push('Intraday Strength');
    }

    // Weak Momentum
    if (rsi !== null && rsi < 45 && rvol < 1.0) {
        signals.push('Weak Momentum');
    }

    // Trend EMA20 / EMA50
    let trend = 'Sideways';
    try {
        if (closes.length >= 50) {
            const ema20Values = EMA.calculate({ values: closes, period: 20 });
            const ema50Values = EMA.calculate({ values: closes, period: 50 });
            const ema20 = ema20Values[ema20Values.length - 1];
            const ema50 = ema50Values[ema50Values.length - 1];
            if (ema20 && ema50) {
                trend = ema20 > ema50 ? 'Bullish' : 'Bearish';
            }
        }
    } catch (e) {
        // ignore
    }

    const technicalSignal = signals.length > 0 ? signals[0] : 'Neutral';

    return {
        rsi,
        macd: { macd, signal, histogram },
        vwap,
        rvol,
        trend,
        signals,
        technicalSignal
    };
};

const Symbol = require('../models/Symbol');

// Get symbol name and sector from DB or fallback
const getSymbolMetadata = async (symbol) => {
    try {
        const clean = symbol.replace(/\.(NS|BO|NSE|BSE)$/i, '').toUpperCase();
        const meta = await Symbol.findOne({ symbol: { $in: [symbol.toUpperCase(), clean] } });
        if (meta) {
            return {
                name: meta.name || symbol,
                sector: meta.sector || 'Equity'
            };
        }
    } catch (e) {
        logger.warn(`Symbol metadata query failed for ${symbol}: ${e.message}`);
    }

    const fallbackStockMeta = {
        'RELIANCE': { name: 'Reliance Industries Ltd', sector: 'Energy' },
        'TCS': { name: 'Tata Consultancy Services Ltd', sector: 'Information Technology' },
        'HDFCBANK': { name: 'HDFC Bank Ltd', sector: 'Financial Services' },
        'INFY': { name: 'Infosys Ltd', sector: 'Information Technology' },
        'ICICIBANK': { name: 'ICICI Bank Ltd', sector: 'Financial Services' },
        'SBIN': { name: 'State Bank of India', sector: 'Financial Services' },
        'LT': { name: 'Larsen & Toubro Ltd', sector: 'Industrials' },
        'ITC': { name: 'ITC Ltd', sector: 'Consumer Defensive' },
        'HINDUNILVR': { name: 'Hindustan Unilever Ltd', sector: 'Consumer Defensive' },
        'KOTAKBANK': { name: 'Kotak Mahindra Bank Ltd', sector: 'Financial Services' },
        'BHARTIARTL': { name: 'Bharti Airtel Ltd', sector: 'Communication Services' },
        'BAJFINANCE': { name: 'Bajaj Finance Ltd', sector: 'Financial Services' },
        'AAPL': { name: 'Apple Inc.', sector: 'Technology' },
        'MSFT': { name: 'Microsoft Corporation', sector: 'Technology' },
        'GOOGL': { name: 'Alphabet Inc.', sector: 'Communication Services' },
        'AMZN': { name: 'Amazon.com Inc.', sector: 'Consumer Cyclical' },
        'META': { name: 'Meta Platforms Inc.', sector: 'Communication Services' },
        'NVDA': { name: 'NVIDIA Corporation', sector: 'Technology' },
        'TSLA': { name: 'Tesla Inc.', sector: 'Consumer Cyclical' },
    };

    const clean = symbol.replace(/\.(NS|BO|NSE|BSE)$/i, '').toUpperCase();
    const fback = fallbackStockMeta[clean] || fallbackStockMeta[symbol.toUpperCase()];
    return {
        name: fback?.name || symbol,
        sector: fback?.sector || 'Equity'
    };
};

// Main function to fetch and aggregate symbol data
const fetchSymbolData = async (symbol, opts = {}) => {
    const cleanSymbol = String(symbol || '').trim().toUpperCase();
    if (!cleanSymbol) return null;

    const { userId } = opts;
    const cacheKey = `watch:agg:${cleanSymbol}`;
    
    // Check 30-second cache
    const cachedRow = cache.get(cacheKey);
    const meta = await getSymbolMetadata(cleanSymbol);

    if (cachedRow) {
        const alertStatus = await getAlertStatusForSymbol(userId, cleanSymbol);
        return { ...cachedRow, alertStatus, ...meta };
    }

    try {
        let priceData = null;
        let candles = null;
        let sourceUsed = 'yahoo-finance';

        // 1. Try to fetch candles using Candle Engine (Yahoo -> Alpha Vantage -> MongoDB backup)
        try {
            candles = await candleEngine.getHistoricalData(cleanSymbol, '1d', '1y');
        } catch (candleErr) {
            logger.error(`[Market Aggregator] Candle Engine failed for ${cleanSymbol}: ${candleErr.message}`);
        }

        // 2. Try to fetch quote from Yahoo Finance
        try {
            priceData = await fetchYahooQuoteOnly(cleanSymbol);
        } catch (quoteErr) {
            logger.warn(`[Market Aggregator] Yahoo Finance quote failed for ${cleanSymbol}: ${quoteErr.message}`);
        }

        // 3. Fallback: if we have candles but no quote, construct quote from last candle
        if (!priceData && candles && candles.length > 0) {
            const latestCandle = candles[candles.length - 1];
            const prevCandle = candles.length > 1 ? candles[candles.length - 2] : null;
            const changePercent = prevCandle && prevCandle.close > 0 
                ? ((latestCandle.close - prevCandle.close) / prevCandle.close) * 100 
                : 0;

            priceData = {
                price: latestCandle.close,
                changePercent,
                volume: latestCandle.volume || 0,
                high: latestCandle.high || latestCandle.close,
                low: latestCandle.low || latestCandle.close
            };
            sourceUsed = 'candles-fallback';
        }

        // If we still don't have priceData or candles, throw error
        if (!priceData || !candles || candles.length === 0) {
            throw new Error('All quote and candle sources failed');
        }

        // Calculate indicators
        const indicators = computeIndicatorsAndSignals(
            candles,
            priceData.price,
            priceData.volume,
            priceData.high,
            priceData.low
        );

        // Fetch Sentiment
        const sentiment = await fetchFinnhubNewsSentiment(cleanSymbol);

        const alertStatus = await getAlertStatusForSymbol(userId, cleanSymbol);

        const row = {
            symbol: cleanSymbol,
            name: meta.name,
            sector: meta.sector,
            price: priceData.price,
            changePercent: priceData.changePercent,
            volume: priceData.volume,
            high: priceData.high,
            low: priceData.low,
            rvol: indicators.rvol,
            rsi: indicators.rsi,
            macd: indicators.macd,
            vwap: indicators.vwap,
            vwapPos: indicators.vwap !== null ? (priceData.price > indicators.vwap ? 'Above' : 'Below') : 'Unknown',
            trend: indicators.trend,
            sentiment,
            signals: indicators.signals,
            technicalSignal: indicators.technicalSignal,
            source: sourceUsed,
            lastUpdated: Date.now(),
            alertStatus
        };

        // Cache response for 30 seconds
        cache.set(cacheKey, row, 30000);

        return row;

    } catch (err) {
        logger.error(`Error aggregating data for ${cleanSymbol}: ${err.message}`);
        
        const alertStatus = await getAlertStatusForSymbol(userId, cleanSymbol);
        return {
            symbol: cleanSymbol,
            name: meta.name,
            sector: meta.sector,
            price: null,
            changePercent: null,
            volume: null,
            rvol: null,
            rsi: null,
            macd: { macd: null, signal: null, histogram: null },
            vwap: null,
            vwapPos: 'Unknown',
            trend: 'Unknown',
            sentiment: 'Neutral',
            signals: [],
            technicalSignal: 'Data unavailable',
            source: 'none',
            lastUpdated: Date.now(),
            alertStatus,
            error: err.message || 'API error'
        };
    }
};

// Get alert status for a symbol from DB
const getAlertStatusForSymbol = async (userId, symbol) => {
    if (!userId) return false;
    try {
        const bareSymbol = symbol.replace(/\.(NS|BO|NSE|BSE)$/i, '').toUpperCase();
        const rule = await AlertRule.findOne({
            user: userId,
            symbol: { $in: [symbol.toUpperCase(), bareSymbol] },
            active: true
        });
        return rule ? true : false;
    } catch (e) {
        return false;
    }
};

module.exports = { fetchSymbolData };
