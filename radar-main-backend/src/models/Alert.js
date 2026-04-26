const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    symbol: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    targetPrice: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['price', 'percentage'],
        default: 'price'
    },
    delivery: {
        type: String,
        enum: ['app', 'email', 'both'],
        default: 'app'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

AlertSchema.index({ userId: 1, symbol: 1 });
AlertSchema.index({ isActive: 1 });

module.exports = mongoose.model('Alert', AlertSchema);
