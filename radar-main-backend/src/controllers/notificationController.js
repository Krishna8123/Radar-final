const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get user notifications
// @route   GET /api/notifications/user
// @access  Private
exports.getUserNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ timestamp: -1 })
            .limit(30);
        
        res.json({ success: true, count: notifications.length, data: notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Create notification
// @route   POST /api/notifications/create
// @access  Private (Internal/System usually, but accessible for testing)
exports.createNotification = async (req, res) => {
    try {
        const { type, title, message, relatedId } = req.body;
        
        // Fetch user settings to check if they want this type
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const notificationSettings = user.settings?.notifications || {};
        const typeKey = type === 'price_alert' ? 'priceAlerts' : 
                        type === 'earnings_update' ? 'earningsUpdates' : 'importantNews';
        
        const setting = notificationSettings[typeKey];
        
        // Always create In-App if enabled (or default true)
        if (setting && setting.enabled === false) {
            return res.json({ success: true, message: 'Notification disabled by user' });
        }

        const notification = await Notification.create({
            user: req.user.id,
            type,
            title,
            message,
            relatedId
        });

        // Check for Email Delivery Logic
        if (setting && setting.delivery && setting.delivery.includes('email')) {
            console.log(`[EMAIL SIMULATION] Sending notification to ${user.email}: ${title}`);
            // Logic for nodemailer/sendgrid would go here
        }

        res.status(201).json({ success: true, data: notification });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/read/:id
// @access  Private
exports.markAsRead = async (req, res) => {
    try {
        let notification = await Notification.findById(req.params.id);
        if (!notification) return res.status(404).json({ success: false, message: 'Not found' });
        
        // Check ownership
        if (notification.user.toString() !== req.user.id) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        notification.read = true;
        await notification.save();

        res.json({ success: true, data: notification });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user.id, read: false },
            { read: true }
        );
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
