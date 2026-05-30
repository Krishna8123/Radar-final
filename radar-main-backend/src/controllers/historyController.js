const { fetchCryptoHistory } = require('../services/cryptoService');
const { fetchStockHistory } = require('../services/stockService');
const ohlcService = require('../services/ohlcService');
const { fetchForexHistory } = require('../services/forexService');
const { calculateSMA, calculateRSI, calculateBollinger, calculateMACD } = require('../utils/indicators');

// Map asset type → DB exchange label used during backfill
const EXCHANGE_FOR_TYPE = {
    STOCK:  'NSE',
    INDEX:  'NSE',
    CRYPTO: 'CRYPTO',
    FOREX:  'FX',
};

// Strip Yahoo Finance suffixes before querying DB (symbols are stored without them)
const toDbSymbol = (symbol, type) => {
    const upper = String(symbol || '').toUpperCase();
    if (type === 'CRYPTO') {
        const clean = upper.replace(/USDT$/i, '').replace(/-USD$/i, '');
        return `${clean}-USD`;
    }
    if (type === 'FOREX')  return upper; // stored as USDINR=X
    // Equity / Index: remove .NS .BO suffix; ^ prefix kept for indices
    return upper.replace(/\.(NS|BO)$/i, '');
};

const tryDbFirst = async (symbol, type, interval) => {
    const dbSymbol   = toDbSymbol(symbol, type);
    const exchange   = EXCHANGE_FOR_TYPE[type] || 'NSE';
    const timeframe  = (interval || '1D').toLowerCase() === '1d' ? '1d' : (interval || '1D').toLowerCase();

    const dbResponse = await ohlcService.getOHLCData({
        symbol:    dbSymbol,
        exchange,
        timeframe,
        limit:     365,
    });

    return (dbResponse.success && dbResponse.data && dbResponse.data.length > 0)
        ? dbResponse.data
        : null;
};

const getHistory = async (req, res) => {
    let { symbol, type, interval = '1D' } = req.query;
    const strictLive = String(req.query.strictLive || '').toLowerCase() === 'true';

    if (!symbol) return res.status(400).json({ error: 'Symbol required' });

    const cleanSym = String(symbol).trim().toUpperCase().replace(/\.(NS|BO)$/i, '').replace(/USDT$/i, '').replace(/-USD$/i, '');
    const knownCryptos = ['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOGE', 'DOT', 'BNB', 'MATIC', 'AVAX', 'LINK', 'LTC', 'SHIB', 'TRX', 'NEAR', 'UNI', 'ATOM', 'FIL'];
    if (knownCryptos.includes(cleanSym) || cleanSym === 'BITCOIN' || cleanSym === 'ETHEREUM') {
        type = 'CRYPTO';
    }

    let rawData = [];

    try {
        // ── Step 1: Always try DB first (works for STOCK, INDEX, CRYPTO, FOREX) ──
        if (!strictLive) {
            const dbData = await tryDbFirst(symbol, type, interval);
            if (dbData) {
                rawData = dbData;
            }
        }

        // ── Step 2: Live API fallback when DB is empty ────────────────────────
        if (rawData.length === 0) {
            if (type === 'STOCK' || type === 'INDEX') {
                rawData = await fetchStockHistory(symbol, interval, { allowSynthetic: true });
            } else if (type === 'FOREX') {
                rawData = await fetchForexHistory(symbol.toLowerCase(), interval);
            } else {
                rawData = await fetchCryptoHistory(symbol.toLowerCase(), interval);
            }
        }
    } catch (error) {
        return res.status(404).json({ error: error.message });
    }

    if (!rawData || rawData.length === 0) {
        return res.status(404).json({ error: 'History data unavailable' });
    }

    res.json({
        prices: rawData,
        indicators: {
            sma:       calculateSMA(rawData, 20),
            rsi:       calculateRSI(rawData, 14),
            bollinger: calculateBollinger(rawData, 20),
            macd:      calculateMACD(rawData),
        },
    });
};

module.exports = { getHistory };
