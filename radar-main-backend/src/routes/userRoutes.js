const express = require('express');
const router = express.Router();
const { 
    getUserProfile, 
    getMode, 
    updateMode,
    getUserPortfolio,
    getUserPerformance,
    getUserHoldings,
    getUserInsights,
    getUserNews,
    getUserEvents
} = require('../controllers/userController');
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/profile', authMiddleware, getUserProfile);
router.get('/mode', authMiddleware, getMode);
router.patch('/mode', authMiddleware, updateMode);
router.get('/settings', authMiddleware, getSettings);
router.post('/settings', authMiddleware, updateSettings);

// Investor Dashboard APIs
router.get('/portfolio', authMiddleware, getUserPortfolio);
router.get('/performance', authMiddleware, getUserPerformance);
router.get('/holdings', authMiddleware, getUserHoldings);
router.get('/insights', authMiddleware, getUserInsights);
router.get('/news', authMiddleware, getUserNews);
router.get('/events', authMiddleware, getUserEvents);

module.exports = router;
