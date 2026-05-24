const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require("socket.io");
const cors = require('cors');
const logger = require('./src/config/logger');
const { connectDB, getDbStatus } = require('./src/config/db');
require('dotenv').config();

// Configure global Yahoo Finance settings and proxy
const YahooFinance = require('yahoo-finance2').default;
YahooFinance.setGlobalConfig({
    suppressNotices: ['yahooSurvey']
});
if (process.env.YAHOO_PROXY_URL) {
    const { HttpsProxyAgent } = require('https-proxy-agent');
    YahooFinance.setGlobalConfig({
        request: {
            agent: new HttpsProxyAgent(process.env.YAHOO_PROXY_URL)
        }
    });
    logger.info('Yahoo Finance initialized with HttpsProxyAgent');
}

if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
    logger.error("FATAL ERROR: Missing required environment variables (JWT_SECRET or MONGO_URI).");
    process.exit(1);
}

const { initRealtimeService, subscribeToStockSymbols } = require('./src/services/realtimeService');
// Radar websocket stream removed per request
const { startAlertEngine, stopAlertEngine, setAlertEventEmitter } = require('./src/services/alertEngine');
const { notFound, errorHandler } = require('./src/middleware/errorMiddleware');
const dataUpdateCron = require('./src/services/dataUpdateCron');
const smartRefreshService = require('./src/services/smartRefreshService');
const { startFundamentalsRefreshCron } = require('./src/crons/fundamentalsRefreshCron');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL, "http://localhost:5173"] : "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});
const parsePort = (value, fallback) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const BASE_PORT = parsePort(process.env.PORT, 5000);
const SHOULD_AUTO_FALLBACK_PORT =
    process.env.NODE_ENV !== 'production' &&
    process.env.PORT_STRICT !== 'true' &&
    process.env.PORT_AUTO_FALLBACK !== 'false';
const DB_RETRY_INTERVAL_MS = 60000;

let alertEngineStarted = false;
let reconnectTimer = null;
let currentPort = BASE_PORT;

const allowedOrigins = process.env.FRONTEND_URL 
    ? [process.env.FRONTEND_URL, 'http://localhost:5173'] 
    : ['http://localhost:5173'];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

const maybeStartAlertEngine = () => {
    if (alertEngineStarted || !getDbStatus()) {
        return;
    }

    startAlertEngine();
    alertEngineStarted = true;
    logger.info('Alert Engine started');
};

const clearReconnectTimer = () => {
    if (reconnectTimer) {
        clearInterval(reconnectTimer);
        reconnectTimer = null;
    }
};

const scheduleDbReconnect = () => {
    if (reconnectTimer || getDbStatus()) {
        return;
    }

    logger.warn(`MongoDB unavailable. Retrying connection every ${DB_RETRY_INTERVAL_MS / 1000}s.`);

    reconnectTimer = setInterval(async () => {
        const connected = await connectDB();
        if (connected) {
            clearReconnectTimer();
            maybeStartAlertEngine();
        }
    }, DB_RETRY_INTERVAL_MS);
};

const normalizeSubscriptionChannels = (payload, fallback = ['ticker']) => {
    let raw = [];

    if (typeof payload === 'string') {
        raw = [payload];
    } else if (Array.isArray(payload)) {
        raw = payload;
    } else if (payload && typeof payload === 'object') {
        raw = [
            payload.channel,
            ...(Array.isArray(payload.channels) ? payload.channels : []),
            payload.room,
            ...(Array.isArray(payload.rooms) ? payload.rooms : []),
        ];

        if (payload.symbol) {
            raw.push(`symbol:${String(payload.symbol).trim().toUpperCase()}`);
        }
        if (Array.isArray(payload.symbols)) {
            payload.symbols.forEach((symbol) => {
                raw.push(`symbol:${String(symbol).trim().toUpperCase()}`);
            });
        }
    }

    const mapped = raw
        .map((item) => String(item || '').trim().toLowerCase())
        .filter(Boolean)
        .map((channel) => {
            if (channel === 'price_update' || channel === 'prices') return 'ticker';
            if (channel === 'alerts' || channel === 'alert_triggered') return 'alerts';
            if (channel === 'system' || channel === 'system_status') return 'system';
            return channel;
        });

    if (mapped.length === 0) {
        return [...fallback];
    }

    return [...new Set(mapped)];
};

const buildSystemStatusPayload = (overrides = {}) => ({
    status: 'ok',
    db: getDbStatus() ? 'connected' : 'disconnected',
    alertEngine: alertEngineStarted ? 'running' : 'stopped',
    timestamp: new Date().toISOString(),
    ...overrides,
});

io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.id}`);
    socket.join('ticker');

    socket.emit('system_status', buildSystemStatusPayload({
        event: 'connected',
        socketId: socket.id,
        channels: ['ticker'],
    }));

    socket.on('subscribe', (payload) => {
        const channels = normalizeSubscriptionChannels(payload, ['ticker']);
        channels.forEach((channel) => socket.join(channel));
        if (payload?.symbol || Array.isArray(payload?.symbols)) {
            const symbols = [payload.symbol, ...(Array.isArray(payload?.symbols) ? payload.symbols : [])]
                .filter(Boolean);
            subscribeToStockSymbols(symbols);
        }
        socket.emit('system_status', buildSystemStatusPayload({
            event: 'subscribed',
            channels,
        }));
    });

    socket.on('unsubscribe', (payload) => {
        const channels = normalizeSubscriptionChannels(payload, []);
        channels.forEach((channel) => socket.leave(channel));
        socket.emit('system_status', buildSystemStatusPayload({
            event: 'unsubscribed',
            channels,
        }));
    });

    socket.on('disconnect', () => {
        logger.info(`User disconnected: ${socket.id}`);
        io.to('ticker').emit('system_status', buildSystemStatusPayload({
            event: 'client_disconnected',
            socketId: socket.id,
        }));
    });
});

initRealtimeService(io);
setAlertEventEmitter((eventName, payload) => {
    io.to('alerts').emit(eventName, payload);
    io.to('ticker').emit(eventName, payload);
});

mongoose.connection.on('connected', () => {
    clearReconnectTimer();
    maybeStartAlertEngine();
});

mongoose.connection.on('disconnected', () => {
    if (alertEngineStarted) {
        stopAlertEngine();
        alertEngineStarted = false;
    }
    scheduleDbReconnect();
});
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        db: getDbStatus() ? 'connected' : 'disconnected',
        alertEngine: alertEngineStarted ? 'running' : 'stopped',
    });
});
app.use('/api/auth',          require('./src/routes/authRoutes'));
app.use('/api/user',          require('./src/routes/userRoutes'));
app.use('/api/user/settings', require('./src/routes/userSettingsRoutes'));
app.use('/api/user/preferences', require('./src/routes/userSettingsRoutes'));
app.use('/api/market',        require('./src/routes/marketRoutes'));
app.use('/api/news',          require('./src/routes/newsRoutes'));
// Radar routes removed

// Research endpoints for trader watchlist research panels
app.use('/api/research',      require('./src/routes/researchRoutes'));

app.use('/api/market/universe', require('./src/routes/marketUniverseRoutes'));
app.use('/api/watchlist',     require('./src/routes/watchlistRoutes'));
app.use('/api/watchlist',     require('./src/routes/watchlistDataRoutes'));
app.use('/api/portfolio',     require('./src/routes/portfolioRoutes'));
app.use('/api/alerts',        require('./src/routes/alertRoutes'));
app.use('/api/analytics',     require('./src/routes/analyticsRoutes'));
app.use('/api/technical',     require('./src/routes/technicalRoutes'));
app.use('/api/fno',           require('./src/routes/fnoRoutes'));
app.use('/api/fundamental',   require('./src/routes/fundamentalRoutes'));
app.use('/api/calendar',      require('./src/routes/calendarRoutes'));
app.use('/api/earnings',      require('./src/routes/earningsRoutes'));
app.use('/api/notifications', require('./src/routes/notificationRoutes'));
app.use('/api/ticker',        require('./src/routes/tickerRoutes'));
app.use('/api/sectors',       require('./src/routes/sectorRoutes'));
app.use('/api/learning',      require('./src/routes/learningRoutes'));
app.use('/api/ohlc',          require('./src/routes/ohlcRoutes'));
app.use('/api/admin',         require('./src/routes/adminRoutes'));
app.use('/api/admin/updates', require('./src/routes/updateAdminRoutes'));
app.use('/api/admin/refresh', require('./src/routes/refreshAdminRoutes'));
app.use('/api/admin/cache',   require('./src/routes/cacheAdminRoutes'));
app.use('/api/quotes',        require('./src/routes/quotesRoutes'));
app.use('/api/screener',      require('./src/routes/screenerRoutes'));
app.use('/api/stocks',        require('./src/routes/stocksRoutes'));
app.use('/api/chart',         require('./src/routes/chartRoutes'));
app.use('/api/charts',        require('./src/routes/chartRoutes'));
app.use('/api/options',       require('./src/routes/optionsRoutes'));
app.use('/api/backtest',      require('./src/routes/backtestRoutes'));
app.use('/api/signals',       require('./src/routes/signalsRoutes'));
app.use('/api/trader',        require('./src/routes/traderProfileRoutes'));
app.use('/api/support',       require('./src/routes/supportRoutes'));
app.use('/api/health',        require('./src/routes/healthRoutes'));
app.use('/api/notes',         require('./src/routes/noteRoutes'));
app.get(['/api', '/api/'], (req, res) => {
    res.json({
        status: 'ok',
        db: getDbStatus() ? 'connected' : 'disconnected',
        alertEngine: alertEngineStarted ? 'running' : 'stopped',
    });
});
app.use('/api',               require('./src/routes/contractRoutes'));
app.use(notFound);
app.use(errorHandler);

server.on('error', (error) => {
    if (error?.code === 'EADDRINUSE' && SHOULD_AUTO_FALLBACK_PORT) {
        const nextPort = currentPort + 1;
        logger.warn(`Port ${currentPort} is in use. Retrying on port ${nextPort}.`);
        currentPort = nextPort;
        setTimeout(() => {
            server.listen(currentPort);
        }, 150);
        return;
    }

    logger.error(`Server failed to start: ${error.message}`);
    process.exit(1);
});

server.on('listening', () => {
    logger.info(`Server running on http://localhost:${currentPort}`);
});

const startServer = async () => {
    server.listen(currentPort);

    const dbConnected = await connectDB();

    if (dbConnected) {
        maybeStartAlertEngine();
        
        // Start the incremental data update cron job
        try {
            dataUpdateCron.start();
            logger.info('Data update cron job initialized');
        } catch (error) {
            logger.error('Failed to start data update cron:', error);
        }

        // Start smart refresh service
        try {
            smartRefreshService.start();
            logger.info('Smart refresh service initialized');
        } catch (error) {
            logger.error('Failed to start smart refresh:', error);
        }

        // Start fundamentals refresh cron (seeds DB on first boot, nightly thereafter)
        try {
            await startFundamentalsRefreshCron();
            logger.info('Fundamentals refresh cron initialized');
        } catch (error) {
            logger.error('Failed to start fundamentals cron:', error);
        }
    } else {
        logger.warn('Skipping Alert Engine startup until MongoDB becomes available.');
        scheduleDbReconnect();
    }

};

startServer();
