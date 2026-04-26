const mongoose = require('mongoose');
const Alert = require('../models/Alert');
const Notification = require('../models/Notification');
const { fetchStockData } = require('./stockService');
const logger = require('../config/logger');

let alertInterval = null;
let alertEventEmitter = null;

const isDatabaseReady = () => mongoose.connection.readyState === 1;

const calculateRSI = (prices, period = 14) => {
    if (prices.length < period + 1) return null;
    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= period; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    const recentPrices = prices.slice(-period - 1); 
    gains = 0;
    losses = 0;
    for (let i = 1; i < recentPrices.length; i++) {
        const diff = recentPrices[i] - recentPrices[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    avgGain = gains / period;
    avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
};
const checkCondition = (value, condition, threshold) => {
    switch (condition) {
        case 'PRICE_ABOVE': return value > threshold;
        case 'PRICE_BELOW': return value < threshold;
        case 'RSI_ABOVE': return value > threshold;
        case 'RSI_BELOW': return value < threshold;
        case 'PE_BELOW': return value < threshold;
        case 'PE_ABOVE': return value > threshold;
        case 'EPS_GROWTH_ABOVE': return value > threshold;
        case 'MARKET_CAP_BELOW': return value < threshold; 
        default: return false;
    }
};

const emitAlertTriggered = (payload) => {
    if (typeof alertEventEmitter === 'function') {
        alertEventEmitter('alert_triggered', {
            ...payload,
            timestamp: new Date().toISOString(),
        });
    }
};

const checkAlerts = async () => {
    if (!isDatabaseReady()) return;

    try {
        const activeAlerts = await Alert.find({ isActive: true });
        if (activeAlerts.length === 0) return;

        logger.info(`Checking ${activeAlerts.length} active alerts...`);
        
        // Get unique symbols to fetch data efficiently
        const symbols = [...new Set(activeAlerts.map(a => a.symbol))];
        const stockData = await fetchStockData(symbols);
        const priceMap = new Map(stockData.map(s => [s.symbol, s.price]));

        for (const alert of activeAlerts) {
            const currentPrice = priceMap.get(alert.symbol);
            if (!currentPrice) continue;

            let triggered = false;
            if (alert.type === 'price') {
                // Simplified: trigger if price crosses the target
                // For a more robust system, we'd need to know if it's "Above" or "Below"
                // But following user's minimal schema, we'll assume targetPrice is the threshold
                // and we'll trigger if currentPrice >= targetPrice (Price Above logic as default)
                if (currentPrice >= alert.targetPrice) {
                    triggered = true;
                }
            } else if (alert.type === 'percentage') {
                // Percentage logic would need a base price, but user didn't provide one
                // We'll skip or use a default base for now
            }

            if (triggered) {
                logger.info(`Alert Triggered: ${alert.symbol} at ${currentPrice}`);
                
                // 1. Notification
                if (alert.delivery === 'app' || alert.delivery === 'both') {
                    await Notification.create({
                        userId: alert.userId,
                        type: 'PRICE_ALERT',
                        title: `Price Alert: ${alert.symbol}`,
                        message: `${alert.symbol} reached target price of ${alert.targetPrice} (Current: ${currentPrice})`,
                        metadata: { symbol: alert.symbol, targetPrice: alert.targetPrice, currentPrice }
                    });
                }

                // 2. Email (Simulated for architecture)
                if (alert.delivery === 'email' || alert.delivery === 'both') {
                    logger.info(`Sending email alert to user ${alert.userId} for ${alert.symbol}`);
                }

                // 3. Mark as inactive to avoid multiple triggers
                alert.isActive = false;
                await alert.save();

                // 4. Emit to Socket.io
                emitAlertTriggered({
                    alertId: alert._id,
                    userId: alert.userId,
                    symbol: alert.symbol,
                    currentPrice
                });
            }
        }
    } catch (error) {
        logger.error(`Error in Alert Engine: ${error.message}`);
    }
};

const startAlertEngine = () => {
    if (alertInterval) return;
    logger.info("Starting Advanced Alert Engine...");
    alertInterval = setInterval(checkAlerts, 30000); // Check every 30s
};

const stopAlertEngine = () => {
    if (alertInterval) {
        clearInterval(alertInterval);
        alertInterval = null;
    }
    logger.info('Alert Engine stopped');
};

const setAlertEventEmitter = (emitter) => {
    alertEventEmitter = emitter;
};

module.exports = { startAlertEngine, stopAlertEngine, setAlertEventEmitter };
