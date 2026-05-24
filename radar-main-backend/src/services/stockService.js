const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();
const axios = require('axios');
const universe = require('../data/universe.json');
const { generateHistory } = require('../utils/mockGenerator');
const logger = require('../utils/logger');
const { getActiveSymbolsWithSuffix, SEED_SYMBOLS } = require('../utils/symbolRegistry');
const { getUniqueUniverse } = require('../config/marketUniverse');
const candleEngine = require('./candleEngine');

const QUOTE_CACHE_TTL_MS = Number.parseInt(process.env.STOCK_QUOTES_CACHE_TTL_MS || '20000', 10);
// Reduced from 180s → 90s so blocked providers recover faster after transient failures
const PROVIDER_FAILURE_COOLDOWN_MS = Number.parseInt(process.env.STOCK_PROVIDER_FAILURE_COOLDOWN_MS || '90000', 10);
const WARNING_THROTTLE_MS = Number.parseInt(process.env.STOCK_WARNING_THROTTLE_MS || '60000', 10);
const WARNING_THROTTLE_MAX_KEYS = Number.parseInt(process.env.STOCK_WARNING_THROTTLE_MAX_KEYS || '500', 10);
const TIINGO_BASE_URL = 'https://api.tiingo.com/tiingo';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const MARKETSTACK_BASE_URL = 'https://api.marketstack.com/v1';

const DEFAULT_MARKET_REGION = String(process.env.DEFAULT_MARKET_REGION || 'IN').toUpperCase();

// These are last-resort fallbacks only (used when DB is empty and no env override)
// Keep them as a minimal sentinel — real symbols come from DB via getActiveSymbols()
const FALLBACK_SYMBOLS_BY_REGION = {
    IN: SEED_SYMBOLS.map(s => `${s}.NS`),
    US: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM', 'XOM', 'UNH'],
    GLOBAL: SEED_SYMBOLS.slice(0, 5).map(s => `${s}.NS`),
};

// Cache for the DB-resolved list so we don't hit Mongo every request
let _resolvedSymbolsCache = null;
let _resolvedSymbolsExpiry = 0;
const SYMBOLS_CACHE_TTL_MS = 5 * 60 * 1000; // re-read DB every 5 minutes

const MIN_DB_SYMBOLS = 20;

const buildUniverseSymbols = () => {
    const universe = getUniqueUniverse();
    if (!Array.isArray(universe) || universe.length === 0) return [];
    if (DEFAULT_MARKET_REGION === 'IN' || DEFAULT_MARKET_REGION === 'GLOBAL') {
        return universe.map((symbol) => String(symbol || '').includes('.') ? String(symbol).toUpperCase() : `${String(symbol).toUpperCase()}.NS`);
    }
    return universe.map((symbol) => String(symbol).toUpperCase());
};

const mergeSymbols = (primary, secondary) => {
    const merged = [...primary, ...secondary].map((s) => String(s).toUpperCase());
    return [...new Set(merged)];
};

const getDefaultSymbols = async () => {
    // 1. Env override (comma-separated)
    const fromEnv = process.env.STOCK_SYMBOLS;
    if (fromEnv) {
        const parsed = fromEnv.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        if (parsed.length) return parsed;
    }

    // 2. DB cache
    const now = Date.now();
    if (_resolvedSymbolsCache && now < _resolvedSymbolsExpiry) {
        return _resolvedSymbolsCache;
    }

    const universeSymbols = buildUniverseSymbols();

    try {
        const symbols = await getActiveSymbolsWithSuffix();
        if (symbols.length >= MIN_DB_SYMBOLS) {
            _resolvedSymbolsCache = symbols;
            _resolvedSymbolsExpiry = now + SYMBOLS_CACHE_TTL_MS;
            return symbols;
        }

        if (symbols.length > 0 && universeSymbols.length > 0) {
            const merged = mergeSymbols(symbols, universeSymbols);
            _resolvedSymbolsCache = merged;
            _resolvedSymbolsExpiry = now + SYMBOLS_CACHE_TTL_MS;
            return merged;
        }
    } catch (err) {
        logger.error(`stockService.getDefaultSymbols DB error: ${err.message}`);
    }

    if (universeSymbols.length > 0) {
        _resolvedSymbolsCache = universeSymbols;
        _resolvedSymbolsExpiry = now + SYMBOLS_CACHE_TTL_MS;
        return universeSymbols;
    }

    // 3. Hardcoded fallback
    return FALLBACK_SYMBOLS_BY_REGION[DEFAULT_MARKET_REGION] || FALLBACK_SYMBOLS_BY_REGION.IN;
};

let quotesCache = {
    expiresAt: 0,
    data: null,
};

let quotesInFlightPromise = null;

// Stale-serve: keep the last known-good payload even after expiry
// so we can serve it when all live providers fail
let lastKnownGoodQuotes = null;

const providerState = {
    yahoo: { blockedUntil: 0, lastError: null },
    tiingo: { blockedUntil: 0, lastError: null },
    finnhub: { blockedUntil: 0, lastError: null },
    polygon: { blockedUntil: 0, lastError: null },
    marketstack: { blockedUntil: 0, lastError: null },
    stooq: { blockedUntil: 0, lastError: null },
};
const warningState = new Map();

const isProviderBlocked = (name) => Date.now() < (providerState[name]?.blockedUntil || 0);

const markProviderFailure = (name, errorMessage) => {
    if (!providerState[name]) return;
    providerState[name].blockedUntil = Date.now() + PROVIDER_FAILURE_COOLDOWN_MS;
    providerState[name].lastError = errorMessage;
};

const clearProviderFailure = (name) => {
    if (!providerState[name]) return;
    providerState[name].blockedUntil = 0;
    providerState[name].lastError = null;
};

const pruneWarningState = (now) => {
    if (warningState.size <= WARNING_THROTTLE_MAX_KEYS) {
        return;
    }

    for (const [key, blockedUntil] of warningState) {
        if (blockedUntil <= now) {
            warningState.delete(key);
        }
    }

    while (warningState.size > WARNING_THROTTLE_MAX_KEYS) {
        const oldestKey = warningState.keys().next().value;
        if (!oldestKey) break;
        warningState.delete(oldestKey);
    }
};

const warnThrottled = (key, message, meta = {}) => {
    const now = Date.now();
    pruneWarningState(now);

    const blockedUntil = warningState.get(key) || 0;
    if (now < blockedUntil) {
        return;
    }

    warningState.set(key, now + WARNING_THROTTLE_MS);
    logger.warn(message, meta);
};


const parseStockSymbols = async () => {
    // Combine universe.json with SEED_SYMBOLS and fallbackStockMeta to ensure a massive universe for screeners
    const universeSymbols = universe.map(asset => asset.symbol);
    const seedSymbolsNS = SEED_SYMBOLS.map(s => `${s}.NS`);
    const metaSymbolsNS = Object.keys(fallbackStockMeta)
        .filter(k => !k.includes('.') && k !== 'NIFTY' && k !== 'SENSEX' && k !== 'BANKNIFTY')
        .map(k => `${k}.NS`);
    return [...new Set([...universeSymbols, ...seedSymbolsNS, ...metaSymbolsNS])];
};

const fallbackStockMeta = {
    'RELIANCE.NS': { name: 'Reliance Industries Ltd', sector: 'Energy', peRatio: 24.1, dividendYield: 0.34 },
    'TCS.NS': { name: 'Tata Consultancy Services Ltd', sector: 'Information Technology', peRatio: 30.6, dividendYield: 1.17 },
    'HDFCBANK.NS': { name: 'HDFC Bank Ltd', sector: 'Financial Services', peRatio: 18.9, dividendYield: 0.97 },
    'INFY.NS': { name: 'Infosys Ltd', sector: 'Information Technology', peRatio: 26.4, dividendYield: 2.11 },
    'ICICIBANK.NS': { name: 'ICICI Bank Ltd', sector: 'Financial Services', peRatio: 20.2, dividendYield: 0.72 },
    'SBIN.NS': { name: 'State Bank of India', sector: 'Financial Services', peRatio: 11.8, dividendYield: 1.62 },
    'LT.NS': { name: 'Larsen & Toubro Ltd', sector: 'Industrials', peRatio: 33.1, dividendYield: 0.91 },
    'ITC.NS': { name: 'ITC Ltd', sector: 'Consumer Defensive', peRatio: 28.3, dividendYield: 3.41 },
    'HINDUNILVR.NS': { name: 'Hindustan Unilever Ltd', sector: 'Consumer Defensive', peRatio: 56.7, dividendYield: 1.58 },
    'KOTAKBANK.NS': { name: 'Kotak Mahindra Bank Ltd', sector: 'Financial Services', peRatio: 22.8, dividendYield: 0.09 },
    'BHARTIARTL.NS': { name: 'Bharti Airtel Ltd', sector: 'Communication Services', peRatio: 64.4, dividendYield: 0.23 },
    'BAJFINANCE.NS': { name: 'Bajaj Finance Ltd', sector: 'Financial Services', peRatio: 35.7, dividendYield: 0.34 },
    // ── No-suffix versions (Yahoo Finance often strips .NS) ──────────────────
    RELIANCE: { name: 'Reliance Industries Ltd', sector: 'Energy', peRatio: 24.1, dividendYield: 0.34 },
    TCS: { name: 'Tata Consultancy Services Ltd', sector: 'Information Technology', peRatio: 30.6, dividendYield: 1.17 },
    HDFCBANK: { name: 'HDFC Bank Ltd', sector: 'Financial Services', peRatio: 18.9, dividendYield: 0.97 },
    INFY: { name: 'Infosys Ltd', sector: 'Information Technology', peRatio: 26.4, dividendYield: 2.11 },
    ICICIBANK: { name: 'ICICI Bank Ltd', sector: 'Financial Services', peRatio: 20.2, dividendYield: 0.72 },
    SBIN: { name: 'State Bank of India', sector: 'Financial Services', peRatio: 11.8, dividendYield: 1.62 },
    LT: { name: 'Larsen & Toubro Ltd', sector: 'Industrials', peRatio: 33.1, dividendYield: 0.91 },
    ITC: { name: 'ITC Ltd', sector: 'Consumer Defensive', peRatio: 28.3, dividendYield: 3.41 },
    HINDUNILVR: { name: 'Hindustan Unilever Ltd', sector: 'Consumer Defensive', peRatio: 56.7, dividendYield: 1.58 },
    NESTLEIND: { name: 'Nestle India Ltd', sector: 'Consumer Defensive', peRatio: 75.2, dividendYield: 1.1 },
    BRITANNIA: { name: 'Britannia Industries', sector: 'Consumer Defensive', peRatio: 50.4, dividendYield: 1.5 },
    TATACONSUM: { name: 'Tata Consumer Products', sector: 'Consumer Defensive', peRatio: 60.1, dividendYield: 0.8 },
    COLPAL: { name: 'Colgate-Palmolive', sector: 'Consumer Defensive', peRatio: 45.6, dividendYield: 2.1 },
    DABUR: { name: 'Dabur India', sector: 'Consumer Defensive', peRatio: 48.3, dividendYield: 1.2 },
    MARICO: { name: 'Marico Ltd', sector: 'Consumer Defensive', peRatio: 42.1, dividendYield: 1.4 },
    GODREJCP: { name: 'Godrej Consumer', sector: 'Consumer Defensive', peRatio: 55.2, dividendYield: 0.9 },
    VBL: { name: 'Varun Beverages', sector: 'Consumer Defensive', peRatio: 85.4, dividendYield: 0.2 },
    KOTAKBANK: { name: 'Kotak Mahindra Bank Ltd', sector: 'Financial Services', peRatio: 22.8, dividendYield: 0.09 },
    BHARTIARTL: { name: 'Bharti Airtel Ltd', sector: 'Communication Services', peRatio: 64.4, dividendYield: 0.23 },
    BAJFINANCE: { name: 'Bajaj Finance Ltd', sector: 'Financial Services', peRatio: 35.7, dividendYield: 0.34 },
    AXISBANK: { name: 'Axis Bank Ltd', sector: 'Financial Services', peRatio: 14.8, dividendYield: 0.10 },
    HCLTECH: { name: 'HCL Technologies Ltd', sector: 'Information Technology', peRatio: 24.5, dividendYield: 3.20 },
    WIPRO: { name: 'Wipro Ltd', sector: 'Information Technology', peRatio: 22.1, dividendYield: 0.09 },
    TECHM: { name: 'Tech Mahindra Ltd', sector: 'Information Technology', peRatio: 28.3, dividendYield: 2.50 },
    LTIM: { name: 'LTIMindtree Ltd', sector: 'Information Technology', peRatio: 35.1, dividendYield: 1.1 },
    PERSISTENT: { name: 'Persistent Systems Ltd', sector: 'Information Technology', peRatio: 40.2, dividendYield: 0.8 },
    COFORGE: { name: 'Coforge Ltd', sector: 'Information Technology', peRatio: 38.5, dividendYield: 1.5 },
    MPHASIS: { name: 'Mphasis Ltd', sector: 'Information Technology', peRatio: 25.4, dividendYield: 2.1 },
    OFSS: { name: 'Oracle Financial Services', sector: 'Information Technology', peRatio: 22.1, dividendYield: 4.5 },
    CYIENT: { name: 'Cyient Ltd', sector: 'Information Technology', peRatio: 20.5, dividendYield: 1.8 },
    BAJAJFINSV: { name: 'Bajaj Finserv Ltd', sector: 'Financial Services', peRatio: 16.5, dividendYield: 0.07 },
    MARUTI: { name: 'Maruti Suzuki India Ltd', sector: 'Consumer Cyclical', peRatio: 28.9, dividendYield: 0.86 },
    TITAN: { name: 'Titan Company Ltd', sector: 'Consumer Cyclical', peRatio: 89.2, dividendYield: 0.27 },
    ASIANPAINT: { name: 'Asian Paints Ltd', sector: 'Consumer Cyclical', peRatio: 56.3, dividendYield: 0.99 },
    SUNPHARMA: { name: 'Sun Pharmaceutical Industries', sector: 'Healthcare', peRatio: 35.6, dividendYield: 0.70 },
    DRREDDY: { name: 'Dr Reddys Laboratories Ltd', sector: 'Healthcare', peRatio: 19.8, dividendYield: 0.52 },
    CIPLA: { name: 'Cipla Ltd', sector: 'Healthcare', peRatio: 27.1, dividendYield: 0.36 },
    DIVISLAB: { name: 'Divis Laboratories Ltd', sector: 'Healthcare', peRatio: 65.4, dividendYield: 0.8 },
    APOLLOHOSP: { name: 'Apollo Hospitals', sector: 'Healthcare', peRatio: 80.2, dividendYield: 0.3 },
    LUPIN: { name: 'Lupin Ltd', sector: 'Healthcare', peRatio: 40.1, dividendYield: 0.5 },
    AUROPHARMA: { name: 'Aurobindo Pharma', sector: 'Healthcare', peRatio: 15.2, dividendYield: 0.6 },
    BIOCON: { name: 'Biocon Ltd', sector: 'Healthcare', peRatio: 55.4, dividendYield: 0.4 },
    TORNTPHARM: { name: 'Torrent Pharma', sector: 'Healthcare', peRatio: 45.8, dividendYield: 0.7 },
    ZYDUSLIFE: { name: 'Zydus Lifesciences', sector: 'Healthcare', peRatio: 20.5, dividendYield: 0.9 },
    MAXHEALTH: { name: 'Max Healthcare Institute', sector: 'Healthcare', peRatio: 45.1, dividendYield: 0 },
    SYNGENE: { name: 'Syngene International', sector: 'Healthcare', peRatio: 52.4, dividendYield: 0.2 },
    GLENMARK: { name: 'Glenmark Pharmaceuticals', sector: 'Healthcare', peRatio: 18.2, dividendYield: 0.4 },
    LAURUSLABS: { name: 'Laurus Labs', sector: 'Healthcare', peRatio: 25.4, dividendYield: 0.8 },
    METROPOLIS: { name: 'Metropolis Healthcare', sector: 'Healthcare', peRatio: 38.2, dividendYield: 1.1 },
    ONGC: { name: 'Oil & Natural Gas Corporation', sector: 'Energy', peRatio: 8.2, dividendYield: 4.80 },
    NTPC: { name: 'NTPC Ltd', sector: 'Utilities', peRatio: 14.2, dividendYield: 2.50 },
    POWERGRID: { name: 'Power Grid Corporation', sector: 'Utilities', peRatio: 17.1, dividendYield: 3.90 },
    COALINDIA: { name: 'Coal India Ltd', sector: 'Energy', peRatio: 7.4, dividendYield: 6.20 },
    TATASTEEL: { name: 'Tata Steel Ltd', sector: 'Basic Materials', peRatio: 14.3, dividendYield: 1.20 },
    JSWSTEEL: { name: 'JSW Steel Ltd', sector: 'Basic Materials', peRatio: 18.6, dividendYield: 0.95 },
    HINDALCO: { name: 'Hindalco Industries Ltd', sector: 'Basic Materials', peRatio: 11.2, dividendYield: 0.70 },
    ULTRACEMCO: { name: 'UltraTech Cement Ltd', sector: 'Basic Materials', peRatio: 39.4, dividendYield: 0.35 },
    GRASIM: { name: 'Grasim Industries Ltd', sector: 'Basic Materials', peRatio: 18.7, dividendYield: 0.48 },
    TATAMOTORS: { name: 'Tata Motors Ltd', sector: 'Consumer Cyclical', peRatio: 9.1, dividendYield: 0.40 },
    M_M: { name: 'Mahindra & Mahindra Ltd', sector: 'Consumer Cyclical', peRatio: 27.3, dividendYield: 0.75 },
    'M&M': { name: 'Mahindra & Mahindra Ltd', sector: 'Consumer Cyclical', peRatio: 27.3, dividendYield: 0.75 },
    EICHERMOT: { name: 'Eicher Motors Ltd', sector: 'Consumer Cyclical', peRatio: 31.5, dividendYield: 1.20 },
    HEROMOTOCO: { name: 'Hero MotoCorp Ltd', sector: 'Consumer Cyclical', peRatio: 22.4, dividendYield: 3.10 },
    ASHOKLEY: { name: 'Ashok Leyland', sector: 'Consumer Cyclical', peRatio: 18.5, dividendYield: 2.1 },
    TVSMOTOR: { name: 'TVS Motor Company', sector: 'Consumer Cyclical', peRatio: 45.2, dividendYield: 0.5 },
    BOSCHLTD: { name: 'Bosch Ltd', sector: 'Consumer Cyclical', peRatio: 35.6, dividendYield: 1.1 },
    MRF: { name: 'MRF Ltd', sector: 'Consumer Cyclical', peRatio: 28.4, dividendYield: 0.2 },
    BALKRISIND: { name: 'Balkrishna Industries', sector: 'Consumer Cyclical', peRatio: 30.1, dividendYield: 0.8 },
    APOLLOTYRE: { name: 'Apollo Tyres', sector: 'Consumer Cyclical', peRatio: 15.6, dividendYield: 1.2 },
    MOTHERSON: { name: 'Samvardhana Motherson', sector: 'Consumer Cyclical', peRatio: 40.1, dividendYield: 0.5 },
    ESCORTS: { name: 'Escorts Kubota Ltd', sector: 'Consumer Cyclical', peRatio: 35.2, dividendYield: 0.4 },
    BAJAJ_AUTO: { name: 'Bajaj Auto Ltd', sector: 'Consumer Cyclical', peRatio: 18.4, dividendYield: 3.5 },
    'BAJAJ-AUTO': { name: 'Bajaj Auto Ltd', sector: 'Consumer Cyclical', peRatio: 18.4, dividendYield: 3.5 },
    BPCL: { name: 'Bharat Petroleum Corporation', sector: 'Energy', peRatio: 5.9, dividendYield: 5.70 },
    IOC: { name: 'Indian Oil Corporation Ltd', sector: 'Energy', peRatio: 5.1, dividendYield: 7.20 },
    GAIL: { name: 'GAIL (India) Ltd', sector: 'Energy', peRatio: 8.4, dividendYield: 4.1 },
    PETRONET: { name: 'Petronet LNG Ltd', sector: 'Energy', peRatio: 12.1, dividendYield: 3.8 },
    IGL: { name: 'Indraprastha Gas Ltd', sector: 'Energy', peRatio: 15.2, dividendYield: 2.1 },
    MGL: { name: 'Mahanagar Gas Ltd', sector: 'Energy', peRatio: 11.5, dividendYield: 2.8 },
    OIL: { name: 'Oil India Ltd', sector: 'Energy', peRatio: 6.2, dividendYield: 5.2 },
    HINDPETRO: { name: 'Hindustan Petroleum', sector: 'Energy', peRatio: 4.5, dividendYield: 6.1 },
    ADANIENT: { name: 'Adani Enterprises Ltd', sector: 'Industrials', peRatio: 85.2, dividendYield: 0.05 },
    ADANIPORTS: { name: 'Adani Ports & SEZ Ltd', sector: 'Industrials', peRatio: 28.4, dividendYield: 0.60 },
    ADANIGREEN: { name: 'Adani Green Energy Ltd', sector: 'Utilities', peRatio: 210.5, dividendYield: 0 },
    INDUSINDBK: { name: 'IndusInd Bank Ltd', sector: 'Financial Services', peRatio: 10.2, dividendYield: 1.40 },
    HDFCLIFE: { name: 'HDFC Life Insurance', sector: 'Financial Services', peRatio: 88.3, dividendYield: 0.30 },
    SBILIFE: { name: 'SBI Life Insurance', sector: 'Financial Services', peRatio: 72.5, dividendYield: 0.20 },
    // ── Indices ──────────────────────────────────────────────────────────────
    NIFTY: { name: 'Nifty 50', sector: 'Index', peRatio: 22.4, dividendYield: 1.25 },
    '^NSEI': { name: 'Nifty 50', sector: 'Index', peRatio: 22.4, dividendYield: 1.25 },
    'NIFTY 50': { name: 'Nifty 50', sector: 'Index', peRatio: 22.4, dividendYield: 1.25 },
    SENSEX: { name: 'BSE Sensex', sector: 'Index', peRatio: 23.1, dividendYield: 1.15 },
    '^BSESN': { name: 'BSE Sensex', sector: 'Index', peRatio: 23.1, dividendYield: 1.15 },
    BANKNIFTY: { name: 'Nifty Bank', sector: 'Index', peRatio: 16.8, dividendYield: 0.85 },
    '^NSEBANK': { name: 'Nifty Bank', sector: 'Index', peRatio: 16.8, dividendYield: 0.85 },
    // ── US stocks ────────────────────────────────────────────────────────────
    AAPL: { name: 'Apple Inc.', sector: 'Technology', peRatio: 29.4, dividendYield: 0.52 },
    MSFT: { name: 'Microsoft Corporation', sector: 'Technology', peRatio: 36.1, dividendYield: 0.74 },
    GOOGL: { name: 'Alphabet Inc.', sector: 'Communication Services', peRatio: 24.3, dividendYield: 0.42 },
    AMZN: { name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', peRatio: 52.8, dividendYield: 0 },
    META: { name: 'Meta Platforms Inc.', sector: 'Communication Services', peRatio: 28.9, dividendYield: 0.41 },
    NVDA: { name: 'NVIDIA Corporation', sector: 'Technology', peRatio: 64.2, dividendYield: 0.03 },
    TSLA: { name: 'Tesla Inc.', sector: 'Consumer Cyclical', peRatio: 62.5, dividendYield: 0 },
    JPM: { name: 'JPMorgan Chase & Co.', sector: 'Financial Services', peRatio: 13.7, dividendYield: 2.32 },
    XOM: { name: 'Exxon Mobil Corporation', sector: 'Energy', peRatio: 12.3, dividendYield: 3.41 },
    UNH: { name: 'UnitedHealth Group Incorporated', sector: 'Healthcare', peRatio: 21.1, dividendYield: 1.57 },
    WMT: { name: 'Walmart Inc.', sector: 'Consumer Defensive', peRatio: 31.8, dividendYield: 1.31 },
    BA: { name: 'The Boeing Company', sector: 'Industrials', peRatio: null, dividendYield: 0 },
    JINDRILL: {
        name: 'Jindal Drilling & Industries Ltd',
        sector: 'Energy',
        peRatio: 9.21,
        dividendYield: 0.85,
        details: {
            market_cap: '₹1,708 Cr',
            debt_to_equity: 0.12,
            pb_ratio: 1.45,
            ev_ebitda: 6.80,
            peg_ratio: 0.92,
            roe: '14.7%',
            roce: '18.2%',
            int_coverage: 14.2,
            current_ratio: 2.45,
            rev_growth: '12.4%',
            profit_growth: '8.9%',
            eps: 54.20,
            book_value: 388.15,
            face_value: 10.00
        }
    },
};

// Lookup sector for a symbol — checks both suffixed and plain versions
const resolveSectorForSymbol = (symbol) => {
    const s = String(symbol || '').toUpperCase();
    const meta = fallbackStockMeta[s]
        || fallbackStockMeta[s.replace(/\.(NS|BO)$/i, '')];
    return meta?.sector || null;
};

const fallbackPriceMap = {
    'RELIANCE.NS': 2968.5,
    'TCS.NS': 4098.2,
    'HDFCBANK.NS': 1638.6,
    'INFY.NS': 1672.9,
    'ICICIBANK.NS': 1124.4,
    'SBIN.NS': 825.1,
    'LT.NS': 3712.8,
    'ITC.NS': 427.3,
    'HINDUNILVR.NS': 2479.5,
    'KOTAKBANK.NS': 1820.2,
    'BHARTIARTL.NS': 1414.3,
    'BAJFINANCE.NS': 7248.7,
    AAPL: 212.4,
    MSFT: 438.2,
    GOOGL: 176.1,
    AMZN: 187.6,
    META: 509.8,
    NVDA: 924.5,
    TSLA: 196.3,
    JPM: 201.2,
    XOM: 118.4,
    UNH: 521.7,
    WMT: 68.3,
    BA: 177.9,
    JINDRILL: 562.9,
    NIFTY: 1931.25,
    '^NSEI': 1931.25,
    'NIFTY 50': 1931.25,
    SENSEX: 65320.50,
    '^BSESN': 65320.50,
    BANKNIFTY: 43950.00,
    '^NSEBANK': 43950.00,
};

const buildFallbackQuotes = (symbols) => symbols.map((symbol, index) => {
    const seed = symbol.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const basePrice = fallbackPriceMap[symbol] || (50 + (seed % 200));
    const drift = ((seed % 9) - 4) * 0.22;
    const dailyChange = Number((drift + ((index % 3) * 0.08)).toFixed(2));

    return {
        symbol,
        name: fallbackStockMeta[symbol]?.name || symbol,
        price: Number(basePrice.toFixed(2)),
        change: dailyChange,
        volume: 500000 + (seed % 5000000),
        type: 'STOCK',
        details: buildStockDetails(
            symbol,
            NaN,
            fallbackStockMeta[symbol]?.sector,
            fallbackStockMeta[symbol]?.name,
            fallbackStockMeta[symbol]?.peRatio,
            fallbackStockMeta[symbol]?.dividendYield,
        ),
        financials: null,
    };
});

const hasEnoughLiveData = (quotes, expectedCount = 0, allowPartial = false) => {
    if (!Array.isArray(quotes)) {
        return false;
    }

    const validPriced = quotes.filter((quote) => Number(quote.price) > 0).length;

    if (allowPartial) {
        return validPriced > 0;
    }
    
    if (expectedCount > 0 && expectedCount < 6) {
        return validPriced >= Math.max(1, Math.floor(expectedCount * 0.5));
    }

    if (quotes.length < 6) {
        return false;
    }

    return validPriced >= Math.max(4, Math.floor(quotes.length * 0.5));
};

const buildStockDetails = (symbol, marketCap, sector, longName, peRatio, dividendYield) => {
    const resolvedSector = sector || resolveSectorForSymbol(symbol) || 'Unknown';
    const meta = fallbackStockMeta[symbol] || fallbackStockMeta[String(symbol || '').replace(/\.(NS|BO)$/i, '')] || {};
    
    let roe = meta.roe;
    if (roe === undefined) {
        roe = Number((Math.random() * 20 + 5).toFixed(2));
    }
    
    let mcapStr = 'N/A';
    if (Number.isFinite(marketCap)) {
        const usStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM', 'XOM', 'UNH', 'WMT', 'BA'];
        if (String(symbol).endsWith('.us') || usStocks.includes(String(symbol).toUpperCase())) {
             mcapStr = `$${(marketCap / 1e9).toFixed(2)}B`;
        } else {
             mcapStr = `₹${(marketCap / 1e7).toFixed(2)} Cr`;
        }
    } else if (meta.details?.market_cap) {
         mcapStr = meta.details.market_cap;
    } else {
         mcapStr = `₹${(Math.random() * 50000 + 10000).toFixed(2)} Cr`;
    }

    return {
        pe_ratio: Number.isFinite(peRatio) ? peRatio : meta.peRatio ?? null,
        market_cap: mcapStr,
        roe: roe,
        dividend_yield: Number.isFinite(dividendYield)
            ? dividendYield.toFixed(2)
            : Number.isFinite(meta.dividendYield)
                ? Number(meta.dividendYield).toFixed(2)
                : 'N/A',
        sector: resolvedSector,
        about: `${longName || meta.name || symbol} market data sourced from live providers.`,
    };
};

const toStooqSymbol = (symbol) => {
    const normalized = String(symbol || '').toUpperCase();
    if (normalized.endsWith('.NS') || normalized.endsWith('.BO')) {
        return `${normalized.split('.')[0].toLowerCase()}.in`;
    }

    if (normalized.includes('.')) {
        const [base, market] = normalized.split('.');
        return `${base.toLowerCase()}.${String(market || 'US').toLowerCase()}`;
    }

    return `${normalized.toLowerCase()}.us`;
};

const normalizeStooqSymbol = (stooqSymbol) => {
    const upper = String(stooqSymbol || '').toUpperCase();
    if (upper.endsWith('.IN')) {
        return `${upper.replace('.IN', '')}.NS`;
    }
    if (upper.endsWith('.US')) {
        return upper.replace('.US', '');
    }

    return upper;
};

const toMarketstackSymbol = (symbol) => {
    const normalized = String(symbol || '').toUpperCase().trim();
    if (normalized.endsWith('.NS') || normalized.endsWith('.BO')) {
        return normalized;
    }
    if (normalized.includes('.')) {
        return normalized.split('.')[0];
    }
    return normalized;
};
const fetchYahooQuotes = async (symbols) => {
    // Add suffixes for Indian stocks
    const querySymbols = symbols.map(s => {
        let qs = s.toUpperCase();
        if (['NIFTY', '^NSEI'].includes(qs)) return '^NSEI';
        if (['SENSEX', '^BSESN'].includes(qs)) return '^BSESN';
        if (['BANKNIFTY', '^NSEBANK'].includes(qs)) return '^NSEBANK';
        if (!qs.includes('.') && !qs.startsWith('^')) return `${qs}.NS`;
        return qs;
    });

    const chunkSize = 20;
    const results = [];
    for (let i = 0; i < querySymbols.length; i += chunkSize) {
        const chunk = querySymbols.slice(i, i + chunkSize);
        try {
            const chunkResults = await yahooFinance.quote(chunk);
            if (Array.isArray(chunkResults)) {
                results.push(...chunkResults);
            } else if (chunkResults) {
                results.push(chunkResults);
            }
        } catch (error) {
            console.error(`[stockService] Yahoo Finance quote chunk failed:`, error.message);
            // Fallback: fetch quotes using direct v8 chart endpoint in parallel for this chunk
            const fallbackPromises = chunk.map(async (symbol) => {
                try {
                    const res = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
                        params: { range: '1d', interval: '1m' },
                        timeout: 5000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'application/json'
                        }
                    });
                    const meta = res.data?.chart?.result?.[0]?.meta;
                    if (meta) {
                        return {
                            symbol: symbol,
                            longName: meta.longName || meta.shortName || symbol,
                            shortName: meta.shortName || symbol,
                            regularMarketPrice: meta.regularMarketPrice,
                            regularMarketChangePercent: meta.previousClose > 0 ? ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100 : 0,
                            regularMarketVolume: meta.regularMarketVolume || 0,
                            regularMarketDayLow: meta.regularMarketDayLow || meta.regularMarketPrice,
                            regularMarketDayHigh: meta.regularMarketDayHigh || meta.regularMarketPrice,
                            marketCap: meta.marketCap || null,
                            trailingPE: null,
                            forwardPE: null,
                            trailingAnnualDividendYield: null
                        };
                    }
                } catch (fallbackErr) {
                    // ignore individual failure
                }
                return null;
            });
            const fallbackResults = await Promise.all(fallbackPromises);
            results.push(...fallbackResults.filter(Boolean));
        }
    }
    
    return results
        .filter((item) => item?.symbol)
        .map((item) => {
            const cleanSymbol = item.symbol.replace(/\.NS$|\.BO$/i, '');
            return {
                symbol: cleanSymbol,
                name: item.longName || item.shortName || cleanSymbol,
                price: Number(item.regularMarketPrice) || 0,
                change: Number(item.regularMarketChangePercent) || 0,
                volume: Number(item.regularMarketVolume) || 0,
                dayLow: Number(item.regularMarketDayLow) || Number(item.regularMarketPrice) || 0,
                dayHigh: Number(item.regularMarketDayHigh) || Number(item.regularMarketPrice) || 0,
                type: 'STOCK',
                details: buildStockDetails(
                    cleanSymbol,
                    Number(item.marketCap),
                    fallbackStockMeta[cleanSymbol]?.sector,
                    item.longName || item.shortName,
                    Number(item.trailingPE ?? item.forwardPE),
                    Number(item.trailingAnnualDividendYield) * 100,
                ),
                financials: null,
            };
        });
};
/*
const fetchYahooChartQuotes = async (symbols) => {
    const requests = symbols.map(async (symbol) => {
        const normalizedSymbol = String(symbol || '').toUpperCase();
        try {
            const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${normalizedSymbol}`, {
                params: {
                    range: '5d',
                    interval: '1d',
                    includePrePost: false,
                },
                timeout: 6000,
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    Accept: 'application/json',
                },
            });

            const result = response.data?.chart?.result?.[0];
            // Fetch company fundamentals
           const profileResponse = await axios.get(
                'https://finnhub.io/api/v1/stock/profile2',
                {
                    params: {
                        symbol: normalizedSymbol,
                        token: process.env.FINNHUB_API_KEY,
                    },
                    timeout: 6000,
                }
            );

            const metricResponse = await axios.get(
                'https://finnhub.io/api/v1/stock/metric',
                {
                    params: {
                        symbol: normalizedSymbol,
                        metric: 'all',
                        token: process.env.FINNHUB_API_KEY,
                    },
                    timeout: 6000,
                }
            );

            const profile = profileResponse.data;

            const metrics = metricResponse.data?.metric || {};

            const marketCap =
                profile?.marketCapitalization
                    ? profile.marketCapitalization * 1000000
                    : NaN;

            const peRatio =
                metrics?.peNormalizedAnnual || metrics?.peTTM || NaN;

            const sector =
                profile?.finnhubIndustry || 'Unknown';

            const dividendYield =
                metrics?.dividendYieldIndicatedAnnual || NaN;
            const closes = result?.indicators?.quote?.[0]?.close || [];
            const volumes = result?.indicators?.quote?.[0]?.volume || [];
            const lows = result?.indicators?.quote?.[0]?.low || [];
            const highs = result?.indicators?.quote?.[0]?.high || [];
            const validCloses = closes.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);

            if (!validCloses.length) {
                return null;
            }

            const last = validCloses[validCloses.length - 1];
            const previous = validCloses.length > 1 ? validCloses[validCloses.length - 2] : last;
            const change = previous > 0 ? Number((((last - previous) / previous) * 100).toFixed(2)) : 0;
            const lastVol = volumes.length > 0 ? Number(volumes[volumes.length - 1]) : 0;
            const lastLow = lows.length > 0 ? Number(lows[lows.length - 1]) : Number(last);
            const lastHigh = highs.length > 0 ? Number(highs[highs.length - 1]) : Number(last);

            return {
                symbol: normalizedSymbol,
                name: result?.meta?.longName || result?.meta?.shortName || fallbackStockMeta[normalizedSymbol]?.name || normalizedSymbol,
                price: Number(last.toFixed(2)),
                change,
                volume: Number.isFinite(lastVol) ? lastVol : 0,
                dayLow: Number.isFinite(lastLow) ? Number(lastLow.toFixed(2)) : Number(last.toFixed(2)),
                dayHigh: Number.isFinite(lastHigh) ? Number(lastHigh.toFixed(2)) : Number(last.toFixed(2)),
                type: 'STOCK',
                details: buildStockDetails(
                    normalizedSymbol,
                    marketCap,
                    sector,
                    result?.meta?.longName || result?.meta?.shortName,
                    peRatio,
                    dividendYield,
                ),
                financials: null,
            };
        }catch (error) {
            console.log("YAHOO ERROR:", normalizedSymbol, error.message);
            return null;
        }
    });

    const rows = await Promise.all(requests);
    return rows.filter(Boolean);
};
*/
const fetchTiingoQuotes = async (symbols) => {
    if (!process.env.TIINGO_API_KEY) {
        throw new Error('Missing TIINGO_API_KEY');
    }

    const normalizedSymbols = [...new Set((symbols || []).map((symbol) => String(symbol || '').toUpperCase()))];
    if (!normalizedSymbols.length) {
        return [];
    }

    const requests = normalizedSymbols.map(async (symbol) => {
        const ticker = symbol;

        try {
            const response = await axios.get(`${TIINGO_BASE_URL}/daily/${encodeURIComponent(ticker)}/prices`, {
                params: {
                    token: process.env.TIINGO_API_KEY,
                    resampleFreq: 'daily',
                    columns: 'date,close',
                },
                timeout: 7000,
            });

            const rows = Array.isArray(response.data) ? response.data : [];
            const valid = rows
                .map((row) => Number(row?.close))
                .filter((price) => Number.isFinite(price) && price > 0);

            if (!valid.length) {
                return null;
            }

            const last = valid[valid.length - 1];
            const prev = valid.length > 1 ? valid[valid.length - 2] : last;
            const change = prev > 0 ? Number((((last - prev) / prev) * 100).toFixed(2)) : 0;

            return {
                symbol,
                name: fallbackStockMeta[symbol]?.name || symbol,
                price: Number(last.toFixed(2)),
                change,
                type: 'STOCK',
                details: buildStockDetails(symbol, NaN, fallbackStockMeta[symbol]?.sector, fallbackStockMeta[symbol]?.name, NaN, NaN),
                financials: null,
            };
        } catch (_error) {
            return null;
        }
    });

    const rows = await Promise.all(requests);
    return rows.filter(Boolean);
};

const fetchTiingoHistory = async (symbol, interval = '1D') => {
    if (!process.env.TIINGO_API_KEY) {
        throw new Error('Missing TIINGO_API_KEY');
    }

    const normalized = String(symbol || '').toUpperCase();
    const ticker = normalized;

    const daysByInterval = {
        '5M': 5,
        '15M': 15,
        '1H': 30,
        '1D': 180,
        '1W': 365,
        '1M': 365,
        '3M': 540,
        '6M': 730,
        '1Y': 1095,
    };
    const lookbackDays = daysByInterval[String(interval || '1D').toUpperCase()] || 180;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - lookbackDays);

    const response = await axios.get(`${TIINGO_BASE_URL}/daily/${encodeURIComponent(ticker)}/prices`, {
        params: {
            token: process.env.TIINGO_API_KEY,
            startDate: start.toISOString().slice(0, 10),
            endDate: end.toISOString().slice(0, 10),
            resampleFreq: 'daily',
            columns: 'date,close',
        },
        timeout: 7000,
    });

    const rows = Array.isArray(response.data) ? response.data : [];
    return rows
        .map((row) => ({
            date: new Date(row?.date || row?.datetime || Date.now()).toLocaleString(),
            price: Number(row?.close),
        }))
        .filter((item) => Number.isFinite(item.price));
};

// --- Twelve Data (optional provider) -------------------------------------------------
const fetchTwelveQuotes = async (symbols) => {
    if (!process.env.TWELVE_API_KEY) throw new Error('Missing TWELVE_API_KEY');
    const unique = [...new Set(symbols.map(s => String(s || '').toUpperCase()))];
    if (!unique.length) return [];

    const qs = unique.join(',');
    const url = 'https://api.twelvedata.com/quote';
    const resp = await axios.get(url, { params: { symbol: qs, apikey: process.env.TWELVE_API_KEY }, timeout: 7000 });
    const data = resp.data || {};

    // TwelveData returns object per symbol when multiple requested
    const rows = unique.map(sym => {
        const entry = data[sym] || data[sym.replace('.NS','')] || data[sym.replace('.NS','').toUpperCase()] || data;
        const price = Number(entry?.price ?? entry?.close ?? 0);
        if (!Number.isFinite(price) || price <= 0) return null;
        const prev = Number(entry?.previous_close ?? entry?.previous_close ?? entry?.prev_close ?? 0);
        const change = Number.isFinite(entry?.percent_change) ? Number(entry.percent_change) : (prev > 0 ? Number((((price - prev) / prev) * 100).toFixed(2)) : 0);
        return {
            symbol: sym,
            name: entry?.name || fallbackStockMeta[sym]?.name || sym,
            price: Number(price.toFixed(2)),
            change,
            volume: Number(entry?.volume) || 0,
            type: 'STOCK',
            details: buildStockDetails(sym, NaN, fallbackStockMeta[sym]?.sector, entry?.name || fallbackStockMeta[sym]?.name, NaN, NaN),
            financials: null,
        };
    }).filter(Boolean);
    return rows;
};

const fetchTwelveHistory = async (symbol, interval = '1D') => {
    if (!process.env.TWELVE_API_KEY) throw new Error('Missing TWELVE_API_KEY');
    const normalized = String(symbol || '').toUpperCase();
    const intervalMap = { '5M': '5min', '15M': '15min', '1H': '60min', '1D': '1day', '1W': '1week', '1M': '1month' };
    const tdInterval = intervalMap[String(interval || '1D').toUpperCase()] || '1day';
    const url = 'https://api.twelvedata.com/time_series';
    const params = { symbol: normalized, interval: tdInterval, outputsize: 500, apikey: process.env.TWELVE_API_KEY }; 
    const resp = await axios.get(url, { params, timeout: 8000 });
    const series = resp.data?.values || resp.data?.data || [];
    return series.map(item => ({ date: item.datetime || item.timestamp || new Date().toISOString(), price: Number(item.close) })).filter(i => Number.isFinite(i.price));
};

// --- Alpha Vantage (optional provider) ---------------------------------------------
const fetchAlphaQuote = async (symbol) => {
    if (!process.env.ALPHA_VANTAGE_KEY) throw new Error('Missing ALPHA_VANTAGE_KEY');
    const url = 'https://www.alphavantage.co/query';
    const resp = await axios.get(url, { params: { function: 'GLOBAL_QUOTE', symbol, apikey: process.env.ALPHA_VANTAGE_KEY }, timeout: 8000 });
    const data = resp.data?.['Global Quote'] || {};
    const price = Number(data['05. price'] || data['05. price'] || 0);
    if (!Number.isFinite(price) || price <= 0) return null;
    const prev = Number(data['08. previous close'] || 0);
    const change = prev > 0 ? Number((((price - prev) / prev) * 100).toFixed(2)) : 0;
    return { symbol: String(symbol).toUpperCase(), name: fallbackStockMeta[symbol]?.name || symbol, price: Number(price.toFixed(2)), change, volume: 0, type: 'STOCK', details: buildStockDetails(symbol, NaN, fallbackStockMeta[symbol]?.sector, fallbackStockMeta[symbol]?.name, NaN, NaN) };
};

const fetchAlphaHistory = async (symbol, interval = '1D') => {
    if (!process.env.ALPHA_VANTAGE_KEY) throw new Error('Missing ALPHA_VANTAGE_KEY');
    const func = 'TIME_SERIES_DAILY_ADJUSTED';
    const url = 'https://www.alphavantage.co/query';
    const resp = await axios.get(url, { params: { function: func, symbol, apikey: process.env.ALPHA_VANTAGE_KEY, outputsize: 'compact' }, timeout: 9000 });
    const series = resp.data?.['Time Series (Daily)'] || {};
    return Object.keys(series).map(date => ({ date: new Date(date).toISOString(), price: Number(series[date]['4. close']) })).sort((a,b)=> new Date(a.date) - new Date(b.date));
};


const fetchFinnhubQuotes = async (symbols) => {
    if (!process.env.FINNHUB_API_KEY) {
        throw new Error('Missing FINNHUB_API_KEY');
    }

    const normalizedSymbols = [...new Set((symbols || []).map((symbol) => String(symbol || '').toUpperCase()))];
    if (!normalizedSymbols.length) {
        return [];
    }

    const requests = normalizedSymbols.map(async (symbol) => {
        let ticker = symbol;

        if (symbol.endsWith('.NS')) {
            ticker = `NSE:${symbol.split('.')[0]}`;
        }
        else if (symbol.endsWith('.BO')) {
            ticker = `BSE:${symbol.split('.')[0]}`;
        }
        try {
            const response = await axios.get(`${FINNHUB_BASE_URL}/quote`, {
                params: {
                    symbol: ticker,
                    token: process.env.FINNHUB_API_KEY,
                },
                timeout: 6000,
            });
            console.log("FINNHUB RESPONSE:", ticker, response.data);

            const current = Number(response.data?.c);
            const previousClose = Number(response.data?.pc);
            if (!Number.isFinite(current) || current <= 0) {
                return null;
            }

            const change = Number.isFinite(response.data?.dp)
                ? Number(response.data.dp)
                : (Number.isFinite(previousClose) && previousClose > 0
                    ? Number((((current - previousClose) / previousClose) * 100).toFixed(2))
                    : 0);

            return {
                symbol,
                name: fallbackStockMeta[symbol]?.name || symbol,
                price: Number(current.toFixed(2)),
                change,
                type: 'STOCK',
                details: buildStockDetails(symbol, NaN, fallbackStockMeta[symbol]?.sector, fallbackStockMeta[symbol]?.name, NaN, NaN),
                financials: null,
            };
        } catch (_error) {
            return null;
        }
    });

    const rows = await Promise.all(requests);
    console.log("FINNHUB ROWS:", rows);
    return rows.filter(Boolean);
};
const fetchTwelveDataQuotes = async (symbols) => {
    if (!process.env.TWELVEDATA_API_KEY) {
        throw new Error('Missing TWELVEDATA_API_KEY');
    }

    const requests = symbols.map(async (symbol) => {
        try {
            const ticker = symbol.replace('.NS', ':NSE');

            const response = await axios.get(
                'https://api.twelvedata.com/quote',
                {
                    params: {
                        symbol: ticker,
                        apikey: process.env.TWELVEDATA_API_KEY,
                    },
                    timeout: 6000,
                }
            );

            const data = response.data;

            console.log("TWELVE DATA:", ticker, data);

            if (!data || !data.close) {
                return null;
            }

            return {
                symbol,
                name: data.name || symbol,
                price: Number(data.close),
                change: Number(data.percent_change || 0),
                type: 'STOCK',
                details: buildStockDetails(
                    symbol,
                    Number(data.market_cap || NaN),
                    fallbackStockMeta[symbol]?.sector || 'Unknown',
                    data.name,
                    Number(data.pe || NaN),
                    NaN
                ),
                financials: null,
            };
        } catch (error) {
            console.log("TWELVEDATA ERROR:", symbol, error.message);
            return null;
        }
    });

    const rows = await Promise.all(requests);

    console.log("TWELVEDATA ROWS:", rows);

    return rows.filter(Boolean);
};

const fetchFinnhubHistory = async (symbol, interval = '1D') => {
    if (!process.env.FINNHUB_API_KEY) {
        throw new Error('Missing FINNHUB_API_KEY');
    }

    const normalized = String(symbol || '').toUpperCase();
    let ticker = normalized;

    if (normalized.endsWith('.NS')) {
        ticker = `NSE:${normalized.split('.')[0]}`;
    }
    else if (normalized.endsWith('.BO')) {
        ticker = `BSE:${normalized.split('.')[0]}`;
    }
    const resolutionMap = {
        '5M': { resolution: '5', days: 7 },
        '15M': { resolution: '15', days: 15 },
        '1H': { resolution: '60', days: 30 },
        '1D': { resolution: 'D', days: 180 },
        '1W': { resolution: 'W', days: 365 },
        '1M': { resolution: 'D', days: 365 },
        '3M': { resolution: 'D', days: 540 },
        '6M': { resolution: 'D', days: 730 },
        '1Y': { resolution: 'D', days: 1095 },
    };
    const config = resolutionMap[String(interval || '1D').toUpperCase()] || resolutionMap['1D'];
    const to = Math.floor(Date.now() / 1000);
    const from = to - (config.days * 24 * 60 * 60);

    const response = await axios.get(`${FINNHUB_BASE_URL}/stock/candle`, {
        params: {
            symbol: ticker,
            resolution: config.resolution,
            from,
            to,
            token: process.env.FINNHUB_API_KEY,
        },
        timeout: 7000,
    });

    const closes = Array.isArray(response.data?.c) ? response.data.c : [];
    const timestamps = Array.isArray(response.data?.t) ? response.data.t : [];
    return closes
        .map((close, index) => ({
            date: new Date(Number(timestamps[index]) * 1000).toLocaleString(),
            price: Number(close),
        }))
        .filter((item) => Number.isFinite(item.price));
};

const toPolygonTicker = (symbol) => {
    const normalized = String(symbol || '').toUpperCase();
    if (normalized.endsWith('.NS') || normalized.endsWith('.BO')) {
        return normalized;
    }

    if (normalized.includes('.')) {
        return normalized.split('.')[0];
    }

    return normalized;
};

const fetchPolygonQuotes = async (symbols) => {
    if (!process.env.POLYGON_API_KEY) {
        throw new Error('Missing POLYGON_API_KEY');
    }

    const polygonTickers = [...new Set(symbols.map(toPolygonTicker).filter(Boolean))];
    if (!polygonTickers.length) {
        return [];
    }

    const res = await axios.get('https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers', {
        params: {
            tickers: polygonTickers.join(','),
            apiKey: process.env.POLYGON_API_KEY,
        },
        timeout: 6000,
    });

    const rows = Array.isArray(res.data?.tickers) ? res.data.tickers : [];
    return rows.map((row) => {
        const ticker = String(row.ticker || '').toUpperCase();
        const price = Number(row?.day?.c);
        const prevClose = Number(row?.prevDay?.c);
        const change = Number.isFinite(price) && Number.isFinite(prevClose) && prevClose > 0
            ? Number((((price - prevClose) / prevClose) * 100).toFixed(2))
            : 0;

        return {
            symbol: ticker,
            name: fallbackStockMeta[ticker]?.name || ticker,
            price: Number.isFinite(price) ? price : 0,
            change,
            type: 'STOCK',
            details: buildStockDetails(ticker, NaN, fallbackStockMeta[ticker]?.sector, fallbackStockMeta[ticker]?.name, NaN, NaN),
            financials: null,
        };
    }).filter((item) => item.symbol);
};

const fetchPolygonHistory = async (symbol, interval = '1D') => {
    if (!process.env.POLYGON_API_KEY) {
        throw new Error('Missing POLYGON_API_KEY');
    }

    const ticker = toPolygonTicker(symbol);
    if (!ticker) {
        throw new Error(`Unsupported Polygon symbol: ${symbol}`);
    }

    const intervalMap = {
        '5M': { multiplier: 5, timespan: 'minute', days: 5 },
        '15M': { multiplier: 15, timespan: 'minute', days: 5 },
        '1H': { multiplier: 60, timespan: 'minute', days: 30 },
        '1D': { multiplier: 1, timespan: 'day', days: 120 },
        '1W': { multiplier: 1, timespan: 'day', days: 180 },
        '1M': { multiplier: 1, timespan: 'day', days: 90 },
        '3M': { multiplier: 1, timespan: 'day', days: 180 },
        '6M': { multiplier: 1, timespan: 'day', days: 365 },
        '1Y': { multiplier: 1, timespan: 'day', days: 730 },
    };
    const config = intervalMap[String(interval).toUpperCase()] || intervalMap['1M'];

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - config.days);
    const from = start.toISOString().slice(0, 10);
    const to = end.toISOString().slice(0, 10);

    const res = await axios.get(`https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${config.multiplier}/${config.timespan}/${from}/${to}`, {
        params: {
            adjusted: 'true',
            sort: 'asc',
            limit: 50000,
            apiKey: process.env.POLYGON_API_KEY,
        },
        timeout: 7000,
    });

    const rows = Array.isArray(res.data?.results) ? res.data.results : [];
    return rows
        .map((row) => ({
            date: new Date(row.t).toLocaleString(),
            price: Number(row.c),
        }))
        .filter((item) => Number.isFinite(item.price));
};

const fetchMarketstackQuotes = async (symbols) => {
    if (!process.env.MARKETSTACK_KEY) {
        throw new Error('Missing MARKETSTACK_KEY');
    }

    const normalizedSymbols = [...new Set((symbols || []).map((symbol) => toMarketstackSymbol(symbol)).filter(Boolean))];
    if (!normalizedSymbols.length) {
        return [];
    }

    const response = await axios.get(`${MARKETSTACK_BASE_URL}/eod/latest`, {
        params: {
            access_key: process.env.MARKETSTACK_KEY,
            symbols: normalizedSymbols.join(','),
            limit: Math.max(20, normalizedSymbols.length * 2),
        },
        timeout: 7000,
    });

    const rows = Array.isArray(response.data?.data) ? response.data.data : [];
    const latestBySymbol = new Map();
    for (const row of rows) {
        const ticker = String(row?.symbol || '').toUpperCase();
        const close = Number(row?.close ?? row?.adj_close);
        if (!ticker || !Number.isFinite(close) || close <= 0) {
            continue;
        }
        const timestamp = new Date(row?.date || 0).getTime();
        const existing = latestBySymbol.get(ticker);
        if (!existing || timestamp > existing.timestamp) {
            latestBySymbol.set(ticker, {
                timestamp: Number.isFinite(timestamp) ? timestamp : 0,
                close,
                open: Number(row?.open),
            });
        }
    }

    return (symbols || [])
        .map((originalSymbol) => {
            const normalized = String(originalSymbol || '').toUpperCase();
            const ticker = toMarketstackSymbol(normalized);
            const latest = latestBySymbol.get(ticker);
            if (!latest) {
                return null;
            }

            const change = Number.isFinite(latest.open) && latest.open > 0
                ? Number((((latest.close - latest.open) / latest.open) * 100).toFixed(2))
                : 0;

            return {
                symbol: normalized,
                name: fallbackStockMeta[normalized]?.name || normalized,
                price: Number(latest.close.toFixed(2)),
                change,
                type: 'STOCK',
                details: buildStockDetails(normalized, NaN, fallbackStockMeta[normalized]?.sector, fallbackStockMeta[normalized]?.name, NaN, NaN),
                financials: null,
            };
        })
        .filter(Boolean);
};

const fetchMarketstackHistory = async (symbol, interval = '1D') => {
    if (!process.env.MARKETSTACK_KEY) {
        throw new Error('Missing MARKETSTACK_KEY');
    }

    const normalized = String(symbol || '').toUpperCase();
    const ticker = toMarketstackSymbol(normalized);
    const daysByInterval = {
        '5M': 7,
        '15M': 15,
        '1H': 30,
        '1D': 180,
        '1W': 365,
        '1M': 365,
        '3M': 540,
        '6M': 730,
        '1Y': 1095,
    };
    const lookback = daysByInterval[String(interval || '1D').toUpperCase()] || 180;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - lookback);

    const response = await axios.get(`${MARKETSTACK_BASE_URL}/eod`, {
        params: {
            access_key: process.env.MARKETSTACK_KEY,
            symbols: ticker,
            date_from: start.toISOString().slice(0, 10),
            date_to: end.toISOString().slice(0, 10),
            sort: 'ASC',
            limit: 1000,
        },
        timeout: 7000,
    });

    const rows = Array.isArray(response.data?.data) ? response.data.data : [];
    return rows
        .map((row) => ({
            date: new Date(row?.date || Date.now()).toLocaleString(),
            price: Number(row?.close ?? row?.adj_close),
        }))
        .filter((item) => Number.isFinite(item.price) && item.price > 0);
};

const fetchStooqQuotes = async (symbols) => {
    const pairs = symbols.map((symbol) => toStooqSymbol(symbol)).join(',');
    const stooqUrl = `https://stooq.com/q/l/?s=${pairs}&f=sd2t2ohlcv&h&e=csv`;
    const stooqRes = await axios.get(stooqUrl, { timeout: 5000 });
    const lines = String(stooqRes.data || '').split('\n').slice(1);

    return lines
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const parts = line.split(',');
            if (parts.length < 7) {
                return null;
            }

            const stooqSymbol = (parts[0] || '').toUpperCase();
            const symbol = normalizeStooqSymbol(stooqSymbol);
            const close = Number(parts[6]);

            return {
                symbol,
                name: fallbackStockMeta[symbol]?.name || symbol,
                price: Number.isFinite(close) ? close : 0,
                change: 0,
                type: 'STOCK',
                details: buildStockDetails(symbol, NaN, fallbackStockMeta[symbol]?.sector, fallbackStockMeta[symbol]?.name, NaN, NaN),
                financials: null,
            };
        })
        .filter(Boolean);
};

const fetchYahooHistory = async (symbol, interval = '1D') => {
    // Map internal interval to candleEngine's timeframe format ('15m', '1h', '1d')
    let timeframe = '1d';
    if (interval === '15M' || interval === '15m') timeframe = '15m';
    else if (interval === '1H' || interval === '1h') timeframe = '1h';
    else if (interval === '5M' || interval === '5m') timeframe = '15m'; // closest fallback for 5m

    const rangeMap = {
        '5M': '5d',
        '15M': '5d',
        '1H': '1mo',
        '1D': '1y',
        '1W': '1y',
        '1M': '3mo',
        '3M': '6mo',
        '6M': '1y',
        '1Y': '1y'
    };
    const range = rangeMap[String(interval).toUpperCase()] || '1y';

    try {
        const candles = await candleEngine.getHistoricalData(symbol, timeframe, range);
        if (!candles || candles.length === 0) return [];
        
        return candles.map(c => ({
            timestamp: c.time * 1000,
            date: new Date(c.time * 1000).toISOString(),
            price: c.close,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume
        }));
    } catch (err) {
        logger.error(`[stockService] candleEngine failed for ${symbol}: ${err.message}`);
        return [];
    }
};

const fetchStockData = async (customSymbols = null, options = {}) => {
    const { strictLive = false } = options || {};
    const now = Date.now();
    if (!customSymbols && quotesCache.data && now < quotesCache.expiresAt) {
        return quotesCache.data;
    }

    if (!customSymbols && quotesInFlightPromise) {
        return quotesInFlightPromise;
    }

    const symbols = customSymbols || await parseStockSymbols();

    const fetchPromise = (async () => {
        let data = null;

        if (!isProviderBlocked('yahoo')) {
            let yahooQuotes = [];
            let yahooError = null;
            try {
                yahooQuotes = await fetchYahooQuotes(symbols);
            } catch (error) {
                yahooError = error;
            }

            if (!hasEnoughLiveData(yahooQuotes, symbols.length)) {
                try {

                    const existingSymbols = new Set(
                        yahooQuotes.map((item) =>
                            String(item.symbol || '').toUpperCase()
                        )
                    );

                    const missingSymbols = symbols.filter(
                        (symbol) =>
                            !existingSymbols.has(
                                String(symbol || '').toUpperCase()
                            )
                    );

                    const finnhubQuotes = await fetchFinnhubQuotes(
                        missingSymbols.length
                            ? missingSymbols
                            : symbols
                    );

                    const mergedQuotes = [
                        ...yahooQuotes,
                        ...finnhubQuotes
                    ].filter((item, index, array) => {

                        const symbol = String(
                            item.symbol || ''
                        ).toUpperCase();

                        return (
                            array.findIndex(
                                (row) =>
                                    String(
                                        row.symbol || ''
                                    ).toUpperCase() === symbol
                            ) === index
                        );
                    });

                    yahooQuotes = mergedQuotes;

                } catch (error) {

                    console.log(
                        "FINNHUB FALLBACK ERROR:",
                        error.message
                    );
                }
            }

            if (hasEnoughLiveData(yahooQuotes, symbols.length, strictLive)) {
                clearProviderFailure('yahoo');
                data = yahooQuotes;
            } else {
                if (yahooError) {
                    warnThrottled(
                        `quotes:yahoo-failed:${yahooError.message}`,
                        'Yahoo Finance quote fetch failed, trying Tiingo...',
                        { error: yahooError.message },
                    );
                }
                markProviderFailure('yahoo', yahooError?.message || 'Sparse quote payload');
            }
        }

        if (!data && !isProviderBlocked('tiingo')) {
            try {
                const tiingoQuotes = await fetchTiingoQuotes(symbols);
                if (hasEnoughLiveData(tiingoQuotes, symbols.length, strictLive)) {
                    clearProviderFailure('tiingo');
                    data = tiingoQuotes;
                } else {
                    markProviderFailure('tiingo', 'Sparse quote payload');
                }
            } catch (error) {
                markProviderFailure('tiingo', error.message);
                warnThrottled(
                    `quotes:tiingo-failed:${error.message}`,
                    'Tiingo quote fetch failed, trying Finnhub...',
                    { error: error.message },
                );
            }
        }

        if (!data && !isProviderBlocked('finnhub')) {
            try {
                const finnhubQuotes = await fetchFinnhubQuotes(symbols);
                if (hasEnoughLiveData(finnhubQuotes, symbols.length, strictLive)) {
                    clearProviderFailure('finnhub');
                    data = finnhubQuotes;
                } else {
                    markProviderFailure('finnhub', 'Sparse quote payload');
                }
            } catch (error) {
                markProviderFailure('finnhub', error.message);
                warnThrottled(
                    `quotes:finnhub-failed:${error.message}`,
                    'Finnhub quote fetch failed, trying Polygon...',
                    { error: error.message },
                );
            }
        }

        // Try Twelve Data as an additional quote provider (if configured)
        if (!data && !isProviderBlocked('twelvedata')) {
            try {
                const td = await fetchTwelveQuotes(symbols);
                if (hasEnoughLiveData(td, symbols.length, strictLive)) {
                    clearProviderFailure('twelvedata');
                    data = td;
                } else {
                    markProviderFailure('twelvedata', 'Sparse quote payload');
                }
            } catch (error) {
                markProviderFailure('twelvedata', error.message);
                warnThrottled(`quotes:twelvedata-failed:${error.message}`, 'TwelveData quote fetch failed.', { error: error.message });
            }
        }

        if (!data && !isProviderBlocked('polygon')) {
            try {
                const polygonQuotes = await fetchPolygonQuotes(symbols);
                if (hasEnoughLiveData(polygonQuotes, symbols.length, strictLive)) {
                    clearProviderFailure('polygon');
                    data = polygonQuotes;
                } else {
                    markProviderFailure('polygon', 'Sparse quote payload');
                }
            } catch (error) {
                markProviderFailure('polygon', error.message);
                warnThrottled(
                    `quotes:polygon-failed:${error.message}`,
                    'Polygon quote fetch failed, trying Stooq...',
                    { error: error.message },
                );
            }
        }

        // Try AlphaVantage as a fallback quotes provider (low-rate, optional)
        if (!data && !isProviderBlocked('alpha')) {
            try {
                const alphaRows = [];
                for (const s of symbols.slice(0, 40)) { // don't spam API: limit batch
                    try {
                        const r = await fetchAlphaQuote(s);
                        if (r) alphaRows.push(r);
                    } catch (_) {}
                }
                if (hasEnoughLiveData(alphaRows, symbols.length, strictLive)) {
                    clearProviderFailure('alpha');
                    data = alphaRows;
                } else {
                    markProviderFailure('alpha', 'Sparse quote payload');
                }
            } catch (error) {
                markProviderFailure('alpha', error.message);
                warnThrottled(`quotes:alpha-failed:${error.message}`, 'AlphaVantage quote fetch failed.', { error: error.message });
            }
        }

        if (!data && !isProviderBlocked('marketstack')) {
            try {
                const marketstackQuotes = await fetchMarketstackQuotes(symbols);
                if (hasEnoughLiveData(marketstackQuotes, symbols.length, strictLive)) {
                    clearProviderFailure('marketstack');
                    data = marketstackQuotes;
                } else {
                    markProviderFailure('marketstack', 'Sparse quote payload');
                }
            } catch (error) {
                markProviderFailure('marketstack', error.message);
                warnThrottled(
                    `quotes:marketstack-failed:${error.message}`,
                    'Marketstack quote fetch failed, trying Stooq...',
                    { error: error.message },
                );
            }
        }

        if (!data && !isProviderBlocked('stooq')) {
            try {
                const stooqQuotes = await fetchStooqQuotes(symbols);
                if (hasEnoughLiveData(stooqQuotes, symbols.length, strictLive)) {
                    clearProviderFailure('stooq');
                    data = stooqQuotes;
                } else {
                    markProviderFailure('stooq', 'Sparse quote payload');
                }
            } catch (error) {
                markProviderFailure('stooq', error.message);
                warnThrottled(
                    `quotes:stooq-failed:${error.message}`,
                    'Stooq quote fetch failed.',
                    { error: error.message },
                );
            }
        }

        // Persist the fresh payload as last-known-good
        if (data) {
            if (!customSymbols || !lastKnownGoodQuotes) {
                lastKnownGoodQuotes = data;
            } else {
                // Merge custom fetches into the existing fallback cache
                const incomingSet = new Set(data.map(q => String(q.symbol).toUpperCase()));
                lastKnownGoodQuotes = [
                    ...lastKnownGoodQuotes.filter(q => !incomingSet.has(String(q.symbol).toUpperCase())),
                    ...data
                ];
            }
        }

        if (!data) {
            if (strictLive) {
                logger.warn(`Live quotes unavailable for ${symbols.length} symbols — strictLive enabled, returning empty set.`);
                return [];
            }
            if (lastKnownGoodQuotes) {
                logger.warn(`All live quote providers failed. Serving stale cache for ${symbols.length} symbols.`);
                if (customSymbols) {
                    const customSet = new Set(customSymbols.map(s => String(s).toUpperCase()));
                    const filtered = lastKnownGoodQuotes.filter(q => customSet.has(String(q.symbol).toUpperCase()));
                    if (filtered.length > 0) {
                        return filtered;
                    }
                    // If cache doesn't contain these symbols, fall through to mock fallback
                } else {
                    return lastKnownGoodQuotes;
                }
            }
            logger.error(`Live quotes unavailable for ${symbols.slice(0, 5).join(', ')}${symbols.length > 5 ? '...' : ''} — using mock fallback data.`);
            return buildFallbackQuotes(symbols);
        }

        if (!customSymbols) {
            quotesCache = {
                data,
                expiresAt: Date.now() + QUOTE_CACHE_TTL_MS,
            };
        }

        return data;
    })();

    if (customSymbols) {
        return fetchPromise;
    }

    quotesInFlightPromise = fetchPromise;
    try {
        return await quotesInFlightPromise;
    } finally {
        quotesInFlightPromise = null;
    }
};

const fetchStockHistory = async (symbol, interval = '1D', options = {}) => {
    const { allowSynthetic = false } = options;
    const rawSymbol = String(symbol || '').trim().toUpperCase();
    const normalizedSymbol = (() => {
        if (!rawSymbol) return rawSymbol;
        if (rawSymbol.includes('.') || rawSymbol.startsWith('^') || rawSymbol.endsWith('-USD') || rawSymbol.includes('=X')) {
            return rawSymbol;
        }
        return `${rawSymbol}.NS`;
    })();
    const normalizedInterval = String(interval || '1D').toUpperCase();
    const requiresIntraday = ['5M', '15M', '1H'].includes(normalizedInterval);

    if (!isProviderBlocked('yahoo')) {
        try {
            const yahooHistory = await fetchYahooHistory(normalizedSymbol, normalizedInterval);
            if (yahooHistory.length > 0) {
                clearProviderFailure('yahoo');
                return yahooHistory;
            }

            markProviderFailure('yahoo', `Sparse history payload for ${normalizedSymbol}`);
        } catch (error) {
            markProviderFailure('yahoo', error.message);
            warnThrottled(
                `history:yahoo-failed:${error.message}`,
                'Yahoo Finance history fetch failed, trying Tiingo...',
                { error: error.message },
            );
        }
    }

    if (!isProviderBlocked('tiingo')) {
        try {
            const tiingoHistory = await fetchTiingoHistory(normalizedSymbol, normalizedInterval);
            if (tiingoHistory.length > 0) {
                clearProviderFailure('tiingo');
                return tiingoHistory;
            }

            markProviderFailure('tiingo', `Sparse history payload for ${normalizedSymbol}`);
        } catch (error) {
            markProviderFailure('tiingo', error.message);
            warnThrottled(
                `history:tiingo-failed:${error.message}`,
                'Tiingo history fetch failed, trying Finnhub...',
                { error: error.message },
            );
        }
    }

    // Twelve Data history (optional)
    if (!isProviderBlocked('twelvedata')) {
        try {
            const tdHistory = await fetchTwelveHistory(normalizedSymbol, normalizedInterval);
            if (tdHistory.length > 0) {
                clearProviderFailure('twelvedata');
                return tdHistory;
            }
            markProviderFailure('twelvedata', `Sparse history payload for ${normalizedSymbol}`);
        } catch (error) {
            markProviderFailure('twelvedata', error.message);
            warnThrottled(`history:twelvedata-failed:${error.message}`, 'TwelveData history fetch failed, trying Finnhub...', { error: error.message });
        }
    }

    if (!isProviderBlocked('finnhub')) {
        try {
            const finnhubHistory = await fetchFinnhubHistory(normalizedSymbol, normalizedInterval);
            if (finnhubHistory.length > 0) {
                clearProviderFailure('finnhub');
                return finnhubHistory;
            }

            markProviderFailure('finnhub', `Sparse history payload for ${normalizedSymbol}`);
        } catch (error) {
            markProviderFailure('finnhub', error.message);
            warnThrottled(
                `history:finnhub-failed:${error.message}`,
                'Finnhub history fetch failed, trying Polygon...',
                { error: error.message },
            );
        }
    }

    // AlphaVantage history fallback (low-rate)
    if (!isProviderBlocked('alpha')) {
        try {
            const alphaHistory = await fetchAlphaHistory(normalizedSymbol, normalizedInterval);
            if (alphaHistory.length > 0) {
                clearProviderFailure('alpha');
                return alphaHistory;
            }
            markProviderFailure('alpha', `Sparse history payload for ${normalizedSymbol}`);
        } catch (error) {
            markProviderFailure('alpha', error.message);
            warnThrottled(`history:alpha-failed:${error.message}`, 'AlphaVantage history fetch failed, trying Polygon...', { error: error.message });
        }
    }

    if (!isProviderBlocked('polygon')) {
        const polygonTicker = toPolygonTicker(normalizedSymbol);
        if (!polygonTicker) {
            warnThrottled(
                `history:polygon-unsupported:${normalizedInterval}`,
                'Skipping Polygon history for unsupported symbol.',
                { symbol: normalizedSymbol },
            );
        } else {
            try {
                const polygonHistory = await fetchPolygonHistory(normalizedSymbol, normalizedInterval);
                if (polygonHistory.length > 0) {
                    clearProviderFailure('polygon');
                    return polygonHistory;
                }

                markProviderFailure('polygon', `Sparse history payload for ${normalizedSymbol}`);
            } catch (error) {
                markProviderFailure('polygon', error.message);
                warnThrottled(
                    `history:polygon-failed:${error.message}`,
                    'Polygon history fetch failed, trying Stooq...',
                    { error: error.message },
                );
            }
        }
    }

    if (!isProviderBlocked('marketstack')) {
        try {
            const marketstackHistory = await fetchMarketstackHistory(normalizedSymbol, normalizedInterval);
            if (marketstackHistory.length > 0) {
                clearProviderFailure('marketstack');
                return marketstackHistory;
            }

            markProviderFailure('marketstack', `Sparse history payload for ${normalizedSymbol}`);
        } catch (error) {
            markProviderFailure('marketstack', error.message);
            warnThrottled(
                `history:marketstack-failed:${error.message}`,
                'Marketstack history fetch failed, trying Stooq...',
                { error: error.message },
            );
        }
    }

    if (!requiresIntraday && !isProviderBlocked('stooq')) {
        try {
            const stooqSymbol = toStooqSymbol(normalizedSymbol);
            const lookback = {
                '1D': 5,
                '1W': 30,
                '1M': 90,
                '3M': 180,
                '6M': 365,
                '1Y': 730,
            }[normalizedInterval] || 120;
            const stooqUrl = `https://stooq.com/q/d/l/?s=${stooqSymbol}&i=d`;

            const stooqRes = await axios.get(stooqUrl, { timeout: 5000 });
            const csvData = stooqRes.data;
            const lines = csvData.split('\n').slice(1, lookback + 1);

            const history = lines.map(line => {
                const parts = line.split(',');
                if (parts.length < 5) return null;
                const close = parseFloat(parts[4]);
                
                if (!Number.isFinite(close)) return null;
                const parsedDate = new Date(parts[0]);
                return {
                    timestamp: parsedDate.getTime(),
                    datetime: parsedDate.toISOString(),
                    open: parseFloat(parts[1]),
                    high: parseFloat(parts[2]),
                    low: parseFloat(parts[3]),
                    close: parseFloat(parts[4]),
                    volume: parseFloat(parts[5] || 0)
                
                };
            }).filter(item => item !== null).reverse();

            if (history.length > 0) {
                clearProviderFailure('stooq');
                return history;
            }

            markProviderFailure('stooq', `Sparse history payload for ${normalizedSymbol}`);
        } catch (stooqError) {
            markProviderFailure('stooq', stooqError.message);
            warnThrottled(
                `history:stooq-failed:${stooqError.message}`,
                'Stooq history fetch failed.',
                { error: stooqError.message },
            );
        }
    }

    throw new Error(`Live history unavailable for ${normalizedSymbol} and synthetic fallbacks are disabled.`);
};
const fetchYahooFundamentals = async (symbol) => {

    try {

        const result = await yahooFinance.quoteSummary(symbol, {
            modules: [
                'price',
                'summaryDetail',
                'defaultKeyStatistics',
                'financialData',
                'assetProfile'
            ]
        });
        const quote = await yahooFinance.quote(symbol);

        return {

            symbol,

            marketCap:
                quote?.marketCap
                ? `₹${(quote.marketCap / 1e7).toFixed(2)} Cr`
                : 'N/A',

            roe:
                result?.financialData?.returnOnEquity !== undefined && result?.financialData?.returnOnEquity !== null
                ? Number((result.financialData.returnOnEquity * 100).toFixed(2))
                : 'N/A',

            peRatio:
                result?.summaryDetail?.trailingPE ||
                result?.defaultKeyStatistics?.forwardPE ||
                'N/A',

            eps:
                result?.defaultKeyStatistics?.trailingEps || 'N/A',

            dividendYield:
                result?.summaryDetail?.dividendYield || 'N/A',

            beta:
                result?.summaryDetail?.beta || 'N/A',

            sector:
                result?.assetProfile?.sector || 'Unknown',

            industry:
                result?.assetProfile?.industry || 'Unknown',

            profitMargins:
                result?.financialData?.profitMargins || 'N/A',

            operatingMargins:
                result?.financialData?.operatingMargins || 'N/A',

            revenueGrowth:
                result?.financialData?.revenueGrowth || 'N/A',

            bookValue:
                result?.defaultKeyStatistics?.bookValue || 'N/A',

            priceToBook:
                result?.defaultKeyStatistics?.priceToBook || 'N/A',

            fiftyTwoWeekHigh:
                result?.summaryDetail?.fiftyTwoWeekHigh || 'N/A',

            fiftyTwoWeekLow:
                result?.summaryDetail?.fiftyTwoWeekLow || 'N/A',
        };

    } catch (error) {

        console.log(
            'YAHOO FUNDAMENTALS ERROR:',
            symbol,
            error.message
        );

        return null;
    }
};

module.exports = {
    fetchStockData,
    fetchStockHistory,
    fetchFinnhubQuotes,
    fetchTwelveDataQuotes,
    fetchYahooFundamentals
};