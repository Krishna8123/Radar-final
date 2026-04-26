const {
    getStockFundamentals,
    getStockEarningsCalendar,
    getStockNewsSentiment,
    getStockSignals,
} = require('../services/stockInsightsService');

const getFundamentals = async (req, res) => {
    try {
        const data = await getStockFundamentals(req.params.symbol);
        return res.json({ success: true, data });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to fetch fundamentals',
        });
    }
};

const getEarningsCalendar = async (req, res) => {
    try {
        const data = await getStockEarningsCalendar(req.params.symbol);
        return res.json({ success: true, data });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to fetch earnings calendar',
        });
    }
};

const getNewsSentiment = async (req, res) => {
    try {
        const data = await getStockNewsSentiment(req.params.symbol);
        return res.json({ success: true, data });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to fetch news sentiment',
        });
    }
};

const getSignals = async (req, res) => {
    try {
        const { term = 'medium' } = req.query;
        const data = await getStockSignals(req.params.symbol, term);
        return res.json({ success: true, data });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to fetch signals',
        });
    }
};

module.exports = {
    getFundamentals,
    getEarningsCalendar,
    getNewsSentiment,
    getSignals,
};
