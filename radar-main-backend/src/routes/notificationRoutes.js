const express = require('express');
const router = express.Router();
const { 
    getUserNotifications, 
    createNotification, 
    markAsRead, 
    markAllAsRead 
} = require('../controllers/notificationController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/user', authMiddleware, getUserNotifications);
router.post('/create', authMiddleware, createNotification);
router.patch('/read/:id', authMiddleware, markAsRead);
router.patch('/read-all', authMiddleware, markAllAsRead);

module.exports = router;
