const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const { calculatePortfolioRisk } = require('../services/portfolioRiskService');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const logger = require('../config/logger');


const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const normalizeIdentifier = (value) => String(value || '').trim().toLowerCase();

const registerUser = asyncHandler(async (req, res) => {
    const { username, password, email, identifier } = req.body;

    try {
        const normalizedUsername = String(username || '').trim();
        const normalizedEmail = normalizeIdentifier(email || identifier || '');
        const userExists = await User.findOne({
            $or: [
                { username: normalizedUsername },
                ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
            ],
        });
        if (userExists) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const user = await User.create({
            username: normalizedUsername,
            password,
            ...(normalizedEmail ? { email: normalizedEmail } : {}),
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email || null,
                preferredMode: user.preferredMode,
                token: generateToken(user._id)
            });
        }
    } catch (error) {
        logger.error('Error during user registration:', error);
        res.status(400).json({ error: 'Invalid user data', details: error.message });
    }
});

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); 

const googleAuth = asyncHandler(async (req, res) => {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const { name, email, picture } = ticket.getPayload();

        let user = await User.findOne({ email });

        if (user) {
            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                preferredMode: user.preferredMode,
                token: generateToken(user._id),
                picture: picture
            });
        } else {
            
            const randomPassword = crypto.randomBytes(16).toString('hex');
            user = await User.create({
                username: name,
                email: email,
                password: randomPassword
            });

            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                preferredMode: user.preferredMode,
                token: generateToken(user._id),
                picture: picture
            });
        }
    } catch (error) {
        logger.error('Error during Google login:', error);
        res.status(400).json({ error: 'Google Login Failed', details: error.message });
    }
});


const loginUser = asyncHandler(async (req, res) => {
    const { username, identifier, password } = req.body;
    const loginId = String(username || identifier || '').trim();
    const normalized = normalizeIdentifier(loginId);

    try {
        if (!loginId || !password) {
            return res.status(400).json({ error: 'Username/email and password are required' });
        }

        const user = await User.findOne({
            $or: [
                { username: loginId },
                { email: normalized },
            ],
        });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                username: user.username,
                email: user.email || null,
                preferredMode: user.preferredMode,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ error: 'Invalid username or password' });
        }
    } catch (error) {
        logger.error('Error during user login:', error);
        res.status(500).json({ error: error.message });
    }
});

const getUserProfile = asyncHandler(async (req, res) => {
    res.json({
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email || null,
        preferredMode: req.user.preferredMode,
        watchlist: req.user.watchlist,
        settings: req.user.settings || {}
    });
});

const getMode = asyncHandler(async (req, res) => {
    res.json({ preferredMode: req.user.preferredMode });
});

const updateMode = asyncHandler(async (req, res) => {
    const { mode } = req.body;
    
    const user = req.user;

    user.preferredMode = mode;
    await user.save();
    res.json({ message: "Mode updated", preferredMode: user.preferredMode });
});

// Investor Dashboard APIs Implementation

const getUserPortfolio = asyncHandler(async (req, res) => {
    const riskData = await calculatePortfolioRisk(req.user._id);
    const portfolio = await Portfolio.findOne({ user: req.user._id });
    
    // Calculate total investment (sum of qty * avgBuyPrice)
    const totalInvestment = (portfolio?.holdings || []).reduce((sum, h) => sum + (h.quantity * h.avgBuyPrice), 0);
    const currentValue = riskData.totalValue - (portfolio?.cashBalance || 100000); // Only holdings value
    const pnlValue = currentValue - totalInvestment;
    const pnlPercent = totalInvestment > 0 ? (pnlValue / totalInvestment) * 100 : 0;
    const dayChange = (currentValue * 0.012) * (Math.random() > 0.5 ? 1 : -1); // Mock day change

    res.json({
        totalInvestment: Number(totalInvestment.toFixed(2)),
        currentValue: Number(currentValue.toFixed(2)),
        overallPnL: Number(pnlValue.toFixed(2)),
        overallPnLPercent: Number(pnlPercent.toFixed(2)),
        dayChange: Number(dayChange.toFixed(2)),
        dayChangePercent: Number(((dayChange / currentValue) * 100).toFixed(2)),
        riskLevel: riskData.riskLevel,
        chartData: [2100, 2150, 2120, 2180, 2200, 2190, 2250] // Mock growth chart
    });
});

const getUserPerformance = asyncHandler(async (req, res) => {
    // Mock performance comparison with Nifty 50
    res.json({
        portfolioReturn: 12.8,
        indexReturn: 8.6,
        alpha: 4.2,
        timeframe: '1Y',
        history: [
            { date: '2024-01', portfolio: 100, index: 100 },
            { date: '2024-02', portfolio: 105, index: 103 },
            { date: '2024-03', portfolio: 102, index: 101 },
            { date: '2024-04', portfolio: 110, index: 106 },
            { date: '2024-05', portfolio: 115, index: 108 }
        ]
    });
});

const getUserHoldings = asyncHandler(async (req, res) => {
    const portfolio = await Portfolio.findOne({ user: req.user._id });
    const holdings = (portfolio?.holdings || []).map(h => ({
        symbol: h.symbol,
        quantity: h.quantity,
        avgPrice: h.avgBuyPrice,
        currentPrice: h.avgBuyPrice * (1 + (Math.random() * 0.2 - 0.1)), // Mock current price
        allocation: 25, // Mock allocation
        pnl: 1500,
        pnlPercent: 5.4
    }));
    
    res.json(holdings);
});

const getUserInsights = asyncHandler(async (req, res) => {
    const riskData = await calculatePortfolioRisk(req.user._id);
    const insights = [];
    
    if (riskData.riskLevel === 'high') {
        insights.push({ type: 'warning', text: "Your portfolio risk is high. Consider diversifying into defensive sectors." });
    }
    
    if (riskData.concentration.length > 0 && riskData.concentration[0].weightPct > 30) {
        insights.push({ type: 'info', text: `High exposure to ${riskData.concentration[0].symbol} (${riskData.concentration[0].weightPct.toFixed(1)}%). Consider rebalancing.` });
    }

    insights.push({ type: 'success', text: "Outperforming Nifty 50 by 4.2% over the last 6 months." });
    insights.push({ type: 'info', text: "Technology sector allocation (45%) is higher than benchmark." });

    res.json(insights);
});

const getUserNews = asyncHandler(async (req, res) => {
    // Mock news relevant to portfolio
    res.json([
        { title: "Reliance Industries shares hit record high as profits soar", source: "Mint", time: "2h ago", sentiment: "positive" },
        { title: "Infosys Q4 results: What to expect from IT major?", source: "MoneyControl", time: "5h ago", sentiment: "neutral" },
        { title: "TATA Motors wins massive EV order in Europe", source: "Bloomberg", time: "1d ago", sentiment: "positive" }
    ]);
});

const getUserEvents = asyncHandler(async (req, res) => {
    // Mock upcoming events for held stocks
    res.json([
        { symbol: "RELIANCE", event: "Q4 Earnings Call", date: "May 25, 2024", type: "earnings" },
        { symbol: "INFY", event: "Dividend Record Date", date: "June 02, 2024", type: "dividend" },
        { symbol: "TATAMOTORS", event: "Annual General Meeting", date: "June 15, 2024", type: "agm" }
    ]);
});

module.exports = { 
    registerUser, 
    loginUser, 
    getUserProfile, 
    getMode, 
    updateMode, 
    googleAuth,
    getUserPortfolio,
    getUserPerformance,
    getUserHoldings,
    getUserInsights,
    getUserNews,
    getUserEvents
};
