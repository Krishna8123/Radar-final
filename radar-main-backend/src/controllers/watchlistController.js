const Watchlist = require('../models/Watchlist');

const getWatchlists = async (req, res) => {
    try {
        const watchlists = await Watchlist.find({ userId: req.user._id });
        res.json(watchlists);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch watchlists" });
    }
};

const createWatchlist = async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    try {
        const watchlist = new Watchlist({
            userId: req.user._id,
            name,
            items: []
        });
        await watchlist.save();
        res.status(201).json(watchlist);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: "Watchlist with this name already exists" });
        }
        res.status(500).json({ error: "Failed to create watchlist" });
    }
};

const addToWatchlist = async (req, res) => {
    const { id } = req.params;
    const { symbol } = req.body;

    if (!symbol) return res.status(400).json({ error: "Symbol is required" });

    try {
        const watchlist = await Watchlist.findOne({ _id: id, userId: req.user._id });
        if (!watchlist) return res.status(404).json({ error: "Watchlist not found" });

        const exists = watchlist.items.some(item => item.symbol === symbol.toUpperCase());
        if (exists) return res.status(400).json({ error: "Stock already in watchlist" });

        watchlist.items.push({ symbol: symbol.toUpperCase() });
        await watchlist.save();
        res.json(watchlist);
    } catch (error) {
        res.status(500).json({ error: "Failed to add to watchlist" });
    }
};

const removeFromWatchlist = async (req, res) => {
    const { id, symbol } = req.params;

    try {
        const watchlist = await Watchlist.findOne({ _id: id, userId: req.user._id });
        if (!watchlist) return res.status(404).json({ error: "Watchlist not found" });

        watchlist.items = watchlist.items.filter(item => item.symbol !== symbol.toUpperCase());
        await watchlist.save();
        res.json(watchlist);
    } catch (error) {
        res.status(500).json({ error: "Failed to remove from watchlist" });
    }
};

module.exports = { getWatchlists, createWatchlist, addToWatchlist, removeFromWatchlist };
