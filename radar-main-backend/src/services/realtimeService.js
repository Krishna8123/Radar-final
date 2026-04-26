const WebSocket = require('ws');
const logger = require('../utils/logger');

let io;
let cryptoSocket;
let cryptoReconnectTimer;
let cryptoReconnectAttempts = 0;
let cryptoConnectedAt = 0;
let lastReconnectLogAt = 0;
let lastLoggedReconnectDelay = null;
let lastNormalCloseLogAt = 0;
let lastWsErrorKey = null;
let lastWsErrorLogAt = 0;
let lastCloseCodeLogAt = 0;
let lastCloseCodeLogged = null;
let stocksSocket;
let stocksReconnectTimer;
let stocksReconnectAttempts = 0;
let stocksConnectedAt = 0;
let lastStocksReconnectLogAt = 0;
let lastStocksLoggedReconnectDelay = null;
let lastStocksNormalCloseLogAt = 0;
let lastStocksWsErrorKey = null;
let lastStocksWsErrorLogAt = 0;
let lastStocksCloseCodeLogAt = 0;
let lastStocksCloseCodeLogged = null;
let tickerInterval = null;

const CRYPTO_RECONNECT_BASE_DELAY_MS = 5000;
const CRYPTO_RECONNECT_MAX_DELAY_MS = 60000;
const STABLE_CONNECTION_THRESHOLD_MS = 15000;
const RECONNECT_LOG_THROTTLE_MS = 120000;
const MAX_BACKOFF_RECONNECT_LOG_THROTTLE_MS = 600000;
const NORMAL_CLOSE_LOG_THROTTLE_MS = 300000;
const WS_ERROR_LOG_THROTTLE_MS = 120000;
const CLOSE_CODE_LOG_THROTTLE_MS = 120000;
const FINNHUB_WS_URL = 'wss://ws.finnhub.io';
const FINNHUB_WS_DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN'];
const BINANCE_STREAM_MAP = {
    BTCUSDT: 'BTC',
    ETHUSDT: 'ETH',
    SOLUSDT: 'SOL',
    XRPUSDT: 'XRP',
    BNBUSDT: 'BNB',
    ADAUSDT: 'ADA',
    DOTUSDT: 'DOT',
    DOGEUSDT: 'DOGE',
    MATICUSDT: 'MATIC',
    LINKUSDT: 'LINK',
    TRXUSDT: 'TRX',
    LTCUSDT: 'LTC',
    BCHUSDT: 'BCH',
};
const parseFinnhubSymbols = () => {
    const raw = String(process.env.FINNHUB_WS_SYMBOLS || FINNHUB_WS_DEFAULT_SYMBOLS.join(','));
    const symbols = raw
        .split(',')
        .map((item) => String(item || '').trim().toUpperCase())
        .filter(Boolean);
    return symbols.length > 0 ? [...new Set(symbols)] : FINNHUB_WS_DEFAULT_SYMBOLS;
};
const FINNHUB_WS_SYMBOLS = parseFinnhubSymbols();

const initRealtimeService = (socketIoInstance) => {
    io = socketIoInstance;
    logger.info("Realtime Service Initialized");

    startCryptoStream();
    startStocksStream();
    startTickerInterval();
};

const clearCryptoReconnectTimer = () => {
    if (cryptoReconnectTimer) {
        clearTimeout(cryptoReconnectTimer);
        cryptoReconnectTimer = null;
    }
};

const cleanupCryptoSocket = () => {
    if (!cryptoSocket) {
        return;
    }

    cryptoSocket.removeAllListeners();

    if (cryptoSocket.readyState === WebSocket.OPEN || cryptoSocket.readyState === WebSocket.CONNECTING) {
        cryptoSocket.terminate();
    }

    cryptoSocket = null;
};

const scheduleCryptoReconnect = () => {
    if (cryptoReconnectTimer) {
        return;
    }

    const delay = Math.min(
        CRYPTO_RECONNECT_BASE_DELAY_MS * (2 ** cryptoReconnectAttempts),
        CRYPTO_RECONNECT_MAX_DELAY_MS,
    );

    const reconnectLogThrottle =
        delay >= CRYPTO_RECONNECT_MAX_DELAY_MS
            ? MAX_BACKOFF_RECONNECT_LOG_THROTTLE_MS
            : RECONNECT_LOG_THROTTLE_MS;

    const now = Date.now();
    const shouldLogReconnect =
        lastLoggedReconnectDelay !== delay ||
        now - lastReconnectLogAt >= reconnectLogThrottle;

    if (shouldLogReconnect) {
        logger.warn(`Binance WS disconnected. Reconnecting in ${Math.round(delay / 1000)}s.`);
        lastReconnectLogAt = now;
        lastLoggedReconnectDelay = delay;
    }

    cryptoReconnectTimer = setTimeout(() => {
        cryptoReconnectTimer = null;
        startCryptoStream();
    }, delay);
};

const startCryptoStream = () => {
    const streams = Object.keys(BINANCE_STREAM_MAP).map(s => `${s.toLowerCase()}@ticker`).join('/');
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    clearCryptoReconnectTimer();
    cleanupCryptoSocket();
    cryptoSocket = new WebSocket(wsUrl);

    cryptoSocket.on('open', () => {
        cryptoConnectedAt = Date.now();
        lastLoggedReconnectDelay = null;

        if (cryptoReconnectAttempts > 0) {
            logger.info('Reconnected to Binance WebSocket');
        } else {
            logger.info('Connected to Binance WebSocket');
        }
    });

    cryptoSocket.on('message', (data) => {
        try {
            const payload = JSON.parse(data);
            const ticker = payload?.data;
            const symbol = ticker?.s;
            const mappedAsset = symbol ? BINANCE_STREAM_MAP[symbol] : null;

            if (!mappedAsset || !ticker?.c) {
                return;
            }

            const prices = { [mappedAsset]: ticker.c };
            if (io) {
                io.to('ticker').emit('cryptoUpdate', prices);
                io.to('ticker').emit('price_update', {
                    symbol: mappedAsset, // Normalized symbol e.g. BTC
                    asset: mappedAsset,
                    price: Number(ticker.c),
                    change: Number(ticker.P),
                    timestamp: new Date().toISOString(),
                    source: 'binance'
                });
                io.to(`symbol:${mappedAsset.toLowerCase()}`).emit('price_update', {
                    symbol: mappedAsset,
                    asset: mappedAsset,
                    price: Number(ticker.c),
                    change: Number(ticker.P),
                    timestamp: new Date().toISOString(),
                    source: 'binance'
                });
            }
        } catch (error) {
            logger.error("WS Parse Error", { error: error.message });
        }
    });

    cryptoSocket.on('close', (code) => {
        const now = Date.now();
        const connectionLifetime = cryptoConnectedAt ? Date.now() - cryptoConnectedAt : 0;

        if (connectionLifetime >= STABLE_CONNECTION_THRESHOLD_MS) {
            cryptoReconnectAttempts = 0;
        } else {
            cryptoReconnectAttempts += 1;
        }

        cryptoConnectedAt = 0;

        if (code === 1000) {
            if (now - lastNormalCloseLogAt >= NORMAL_CLOSE_LOG_THROTTLE_MS) {
                logger.info('Binance WS closed normally (code 1000).');
                lastNormalCloseLogAt = now;
            }
        } else {
            const shouldLogCloseCode =
                lastCloseCodeLogged !== code ||
                now - lastCloseCodeLogAt >= CLOSE_CODE_LOG_THROTTLE_MS;

            if (shouldLogCloseCode) {
                logger.warn(`Binance WS closed with code ${code}.`);
                lastCloseCodeLogged = code;
                lastCloseCodeLogAt = now;
            }
        }

        scheduleCryptoReconnect();
    });

    cryptoSocket.on('error', (err) => {
        const message = err?.message || 'Unknown websocket error';
        const key = message.toLowerCase();
        const now = Date.now();
        const shouldLogError = key !== lastWsErrorKey || now - lastWsErrorLogAt >= WS_ERROR_LOG_THROTTLE_MS;

        if (shouldLogError) {
            logger.warn(`Binance WS error: ${message}`);
            lastWsErrorKey = key;
            lastWsErrorLogAt = now;
        }
    });
};

const clearStocksReconnectTimer = () => {
    if (stocksReconnectTimer) {
        clearTimeout(stocksReconnectTimer);
        stocksReconnectTimer = null;
    }
};

const cleanupStocksSocket = () => {
    if (!stocksSocket) {
        return;
    }

    stocksSocket.removeAllListeners();

    if (stocksSocket.readyState === WebSocket.OPEN || stocksSocket.readyState === WebSocket.CONNECTING) {
        stocksSocket.terminate();
    }

    stocksSocket = null;
};

const scheduleStocksReconnect = () => {
    if (stocksReconnectTimer) {
        return;
    }

    if (!process.env.FINNHUB_API_KEY) {
        return;
    }

    const delay = Math.min(
        CRYPTO_RECONNECT_BASE_DELAY_MS * (2 ** stocksReconnectAttempts),
        CRYPTO_RECONNECT_MAX_DELAY_MS,
    );
    const reconnectLogThrottle =
        delay >= CRYPTO_RECONNECT_MAX_DELAY_MS
            ? MAX_BACKOFF_RECONNECT_LOG_THROTTLE_MS
            : RECONNECT_LOG_THROTTLE_MS;
    const now = Date.now();
    const shouldLogReconnect =
        lastStocksLoggedReconnectDelay !== delay ||
        now - lastStocksReconnectLogAt >= reconnectLogThrottle;

    if (shouldLogReconnect) {
        logger.warn(`Finnhub WS disconnected. Reconnecting in ${Math.round(delay / 1000)}s.`);
        lastStocksReconnectLogAt = now;
        lastStocksLoggedReconnectDelay = delay;
    }

    stocksReconnectTimer = setTimeout(() => {
        stocksReconnectTimer = null;
        startStocksStream();
    }, delay);
};

const subscribeFinnhubSymbols = () => {
    if (!stocksSocket || stocksSocket.readyState !== WebSocket.OPEN) {
        return;
    }

    FINNHUB_WS_SYMBOLS.forEach((symbol) => {
        stocksSocket.send(JSON.stringify({ type: 'subscribe', symbol }));
    });
};

const startStocksStream = () => {
    if (!process.env.FINNHUB_API_KEY) {
        logger.info('FINNHUB_API_KEY missing; skipping Finnhub WebSocket stock stream.');
        return;
    }

    const wsUrl = `${FINNHUB_WS_URL}?token=${encodeURIComponent(process.env.FINNHUB_API_KEY)}`;
    clearStocksReconnectTimer();
    cleanupStocksSocket();
    stocksSocket = new WebSocket(wsUrl);

    stocksSocket.on('open', () => {
        stocksConnectedAt = Date.now();
        lastStocksLoggedReconnectDelay = null;
        subscribeFinnhubSymbols();
        if (stocksReconnectAttempts > 0) {
            logger.info('Reconnected to Finnhub WebSocket');
        } else {
            logger.info('Connected to Finnhub WebSocket');
        }
    });

    stocksSocket.on('message', (data) => {
        try {
            const payload = JSON.parse(data);
            if (payload?.type !== 'trade' || !Array.isArray(payload.data)) {
                return;
            }

            payload.data.forEach((trade) => {
                const symbol = String(trade?.s || '').toUpperCase();
                const price = Number(trade?.p);
                const timestamp = Number(trade?.t);
                const volume = Number(trade?.v);

                if (!symbol || !Number.isFinite(price)) {
                    return;
                }

                const event = {
                    symbol,
                    asset: symbol,
                    price,
                    change: null,
                    volume: Number.isFinite(volume) ? volume : null,
                    source: 'finnhub',
                    type: 'stocks',
                    timestamp: Number.isFinite(timestamp)
                        ? new Date(timestamp).toISOString()
                        : new Date().toISOString(),
                };

                if (io) {
                    io.to('ticker').emit('price_update', event);
                    io.to(`symbol:${symbol.toLowerCase()}`).emit('price_update', event);
                }
            });
        } catch (error) {
            logger.warn('Finnhub WS Parse Error', { error: error.message });
        }
    });

    stocksSocket.on('close', (code) => {
        const now = Date.now();
        const connectionLifetime = stocksConnectedAt ? now - stocksConnectedAt : 0;

        if (connectionLifetime >= STABLE_CONNECTION_THRESHOLD_MS) {
            stocksReconnectAttempts = 0;
        } else {
            stocksReconnectAttempts += 1;
        }
        stocksConnectedAt = 0;

        if (code === 1000) {
            if (now - lastStocksNormalCloseLogAt >= NORMAL_CLOSE_LOG_THROTTLE_MS) {
                logger.info('Finnhub WS closed normally (code 1000).');
                lastStocksNormalCloseLogAt = now;
            }
        } else {
            const shouldLogCloseCode =
                lastStocksCloseCodeLogged !== code ||
                now - lastStocksCloseCodeLogAt >= CLOSE_CODE_LOG_THROTTLE_MS;

            if (shouldLogCloseCode) {
                logger.warn(`Finnhub WS closed with code ${code}.`);
                lastStocksCloseCodeLogged = code;
                lastStocksCloseCodeLogAt = now;
            }
        }

        scheduleStocksReconnect();
    });

    stocksSocket.on('error', (err) => {
        const message = err?.message || 'Unknown websocket error';
        const key = message.toLowerCase();
        const now = Date.now();
        const shouldLogError =
            key !== lastStocksWsErrorKey ||
            now - lastStocksWsErrorLogAt >= WS_ERROR_LOG_THROTTLE_MS;

        if (shouldLogError) {
            logger.warn(`Finnhub WS error: ${message}`);
            lastStocksWsErrorKey = key;
            lastStocksWsErrorLogAt = now;
        }
    });
};

const startTickerInterval = () => {
    if (tickerInterval) {
        return;
    }

    tickerInterval = setInterval(() => {
        if (!io) return;

        const domesticIndices = [
            { name: "NIFTY", value: (22500 + Math.random() * 50 - 25).toFixed(2), change: "+0.5%" },
            { name: "SENSEX", value: (74200 + Math.random() * 100 - 50).toFixed(2), change: "+0.4%" },
            { name: "BANKNIFTY", value: (48000 + Math.random() * 80 - 40).toFixed(2), change: "-0.2%" },
            { name: "INDIA VIX", value: (13.5 + Math.random() * 0.2 - 0.1).toFixed(2), change: "-1.5%" }
        ];

        io.to('ticker').emit('indexUpdate', domesticIndices);
        
        // Mock stock updates for common symbols if no live provider is active
        const symbols = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'JINDRILL', 'AAPL', 'TSLA', 'NVDA'];
        symbols.forEach(sym => {
            const base = 500 + (Math.random() * 1000);
            const price = (base + (Math.random() * 10 - 5)).toFixed(2);
            const change = (Math.random() * 4 - 2).toFixed(2);
            
            const event = {
                symbol: sym,
                asset: sym,
                price: Number(price),
                change: Number(change),
                timestamp: new Date().toISOString(),
                source: 'mock'
            };
            
            io.to('ticker').emit('price_update', event);
            io.to(`symbol:${sym.toLowerCase()}`).emit('price_update', event);
        });

        io.to('ticker').emit('price_update', {
            type: 'indices',
            data: domesticIndices,
            timestamp: new Date().toISOString(),
        });
        io.to('system').emit('system_status', {
            status: 'ok',
            service: 'realtime',
            marketFeed: 'active',
            timestamp: new Date().toISOString(),
        });
    }, 3000); // 3 seconds for better perceived "realtime"
};

module.exports = { initRealtimeService };
