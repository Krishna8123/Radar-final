const express = require('express');
const router = express.Router();
const {
    getFundamentals,
    getEarningsCalendar,
    getNewsSentiment,
    getSignals,
} = require('../controllers/stockInsightsController');
const { getHistoricalData, getCompareData, getAvailableSymbols, getLatestCandle } = require('../controllers/ohlcController');

const { authMiddleware } = require('../middleware/authMiddleware');
const { validateRequest, validateSymbolParam } = require('../middleware/validationMiddleware');

router.get('/:symbol/fundamentals', authMiddleware, validateSymbolParam, validateRequest, getFundamentals);
router.get('/:symbol/earnings-calendar', authMiddleware, validateSymbolParam, validateRequest, getEarningsCalendar);
router.get('/:symbol/news-sentiment', authMiddleware, validateSymbolParam, validateRequest, getNewsSentiment);
router.get('/:symbol/signals', authMiddleware, validateSymbolParam, validateRequest, getSignals);
router.get('/:symbol/history', validateSymbolParam, validateRequest, getHistoricalData);
router.get('/:symbol/live', validateSymbolParam, validateRequest, getLatestCandle);
router.post('/compare', authMiddleware, getCompareData);
router.get('/search', authMiddleware, getAvailableSymbols);

module.exports = router;
