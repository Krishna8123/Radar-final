const Watchlist = require('../models/Watchlist');
const { evaluateRecentChanges } = require('../services/recentChangesEngine');

const profileCache = require('../services/profileCache');

// Normalizes a raw symbol to include an exchange suffix for Indian equities.
// Symbols from search results (e.g. "RELIANCE") get .NS appended so they work
// in Yahoo Finance / Tiingo / etc. Suffixed symbols and indices are left unchanged.
const normalizeSymbolForStorage = (sym) => {
    let s = String(sym || '').trim().toUpperCase();
    if (!s) return s;
    
    // Known Cryptos -> append -USD for Yahoo Finance, and clean up accidental .NS
    const knownCryptos = ['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOGE', 'DOT', 'BNB', 'MATIC', 'AVAX', 'LINK', 'LTC'];
    const bareSymbol = s.replace(/\.(NS|BO)$/i, '');
    if (knownCryptos.includes(bareSymbol) || bareSymbol.endsWith('-USD')) {
        return bareSymbol.endsWith('-USD') ? bareSymbol : `${bareSymbol}-USD`;
    }

    if (s.includes('.')) return s; // already has a suffix
    if (s.startsWith('^') || s.includes('NIFTY') || s.includes('SENSEX')) return s;
    return `${s}.NS`;
};

const mergeLegacyWatchlists = async (userId) => {
    try {
        const watchlists = await Watchlist.find({ userId });
        const traderWatchlist = watchlists.find(w => w.mode === 'trader' && w.name === 'Trader Watchlist');
        const researchWatchlist = watchlists.find(w => w.mode === 'trader' && w.name === 'Research Watchlist');
        
        if (traderWatchlist && researchWatchlist) {
            // Merge symbols from Trader Watchlist to Research Watchlist
            const existingSymbols = new Set(researchWatchlist.items.map(item => item.symbol.toUpperCase()));
            let addedAny = false;
            
            traderWatchlist.items.forEach(item => {
                if (item.symbol && !existingSymbols.has(item.symbol.toUpperCase())) {
                    researchWatchlist.items.push({ symbol: item.symbol });
                    existingSymbols.add(item.symbol.toUpperCase());
                    addedAny = true;
                }
            });
            
            if (addedAny) {
                await researchWatchlist.save();
            }
            
            // Delete legacy Trader Watchlist
            await Watchlist.deleteOne({ _id: traderWatchlist._id });
            try { await profileCache.invalidate(userId); } catch (_) {}
        } else if (traderWatchlist && !researchWatchlist) {
            // Rename Trader Watchlist to Research Watchlist
            traderWatchlist.name = 'Research Watchlist';
            await traderWatchlist.save();
            try { await profileCache.invalidate(userId); } catch (_) {}
        }
    } catch (err) {
        console.error('Error during legacy watchlist merge:', err);
    }
};

const getWatchlists = async (req, res) => {
    try {
        await mergeLegacyWatchlists(req.user._id);
        // Optional ?mode=trader|investor query param.
        // If omitted, return ALL watchlists for the user (backward compat).
        const query = { userId: req.user._id };
        if (req.query.mode) {
            query.mode = String(req.query.mode).toLowerCase();
        }
        const watchlists = await Watchlist.find(query).sort({ createdAt: 1 });
        res.json(watchlists);
    } catch (error) {
        console.error("Watchlist GET Error:", error);
        res.status(500).json({ error: "Failed to fetch watchlists", details: error.message });
    }
};

const createWatchlist = async (req, res) => {
    const { name, mode } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const validMode = ['trader', 'investor'].includes(String(mode || '').toLowerCase())
        ? String(mode).toLowerCase()
        : null;

    try {
        const watchlist = new Watchlist({
            userId: req.user._id,
            name,
            mode: validMode,
            items: []
        });
        await watchlist.save();
        try { await profileCache.invalidate(req.user._id); } catch (_) {}
        res.status(201).json(watchlist);
    } catch (error) {
        if (error.code === 11000) {
            // Already exists — return the existing one instead of erroring
            try {
                const existing = await Watchlist.findOne({
                    userId: req.user._id,
                    name,
                    mode: validMode ?? null,
                });
                if (existing) return res.status(200).json(existing);
            } catch (_) {}
            return res.status(400).json({ error: "Watchlist with this name already exists" });
        }
        res.status(500).json({ error: "Failed to create watchlist" });
    }
};

const addToWatchlist = async (req, res) => {
    const { id } = req.params;
    const { symbol: rawSymbol } = req.body;

    if (!rawSymbol) return res.status(400).json({ error: "Symbol is required" });

    // Normalize: plain tickers (e.g. "RELIANCE") → "RELIANCE.NS"
    const symbol = normalizeSymbolForStorage(rawSymbol);

    try {
        const watchlist = await Watchlist.findOne({ _id: id, userId: req.user._id });
        if (!watchlist) return res.status(404).json({ error: "Watchlist not found" });

        const bare = (s) => String(s || '').replace(/\.(NS|BO)$/i, '').toUpperCase();
        const exists = watchlist.items.some((item) => bare(item.symbol) === bare(symbol));
        if (exists) return res.status(400).json({ error: "Stock already in watchlist" });

        watchlist.items.push({ symbol });
        await watchlist.save();
        try { await profileCache.invalidate(req.user._id); } catch (_) {}
        res.json(watchlist);
    } catch (error) {
        res.status(500).json({ error: "Failed to add to watchlist" });
    }
};

const removeFromWatchlist = async (req, res) => {
    const { id, symbol: rawSymbol } = req.params;
    // Accept either "RELIANCE" or "RELIANCE.NS" from the frontend
    const normalized = normalizeSymbolForStorage(rawSymbol);
    const plain = String(rawSymbol || '').trim().toUpperCase();

    try {
        const watchlist = await Watchlist.findOne({ _id: id, userId: req.user._id });
        if (!watchlist) return res.status(404).json({ error: "Watchlist not found" });

        watchlist.items = watchlist.items.filter(item =>
            item.symbol !== normalized && item.symbol !== plain
        );
        await watchlist.save();
        try { await profileCache.invalidate(req.user._id); } catch (_) {}
        res.json(watchlist);
    } catch (error) {
        res.status(500).json({ error: "Failed to remove from watchlist" });
    }
};

const getDefaultWatchlist = async (userId, mode = 'trader') => {
    const cleanMode = String(mode || 'trader').toLowerCase();
    if (cleanMode === 'trader') {
        await mergeLegacyWatchlists(userId);
    }
    const targetName = cleanMode === 'investor' ? 'Investor Portfolio' : 'Research Watchlist';
    let watchlist = await Watchlist.findOne({ userId, mode: cleanMode, name: targetName });
    if (!watchlist) {
        watchlist = await Watchlist.findOne({ userId, mode: cleanMode });
    }
    if (!watchlist && cleanMode === 'trader') {
        // Only allow fallback to general watchlists if mode is trader (to catch legacy records with null mode)
        watchlist = await Watchlist.findOne({ userId, mode: null });
    }
    if (!watchlist) {
        watchlist = new Watchlist({
            userId,
            name: targetName,
            mode: cleanMode,
            items: []
        });
        await watchlist.save();
    }
    return watchlist;
};

const addToDefaultWatchlist = async (req, res) => {
    const { symbol: rawSymbol } = req.body;
    if (!rawSymbol) return res.status(400).json({ error: "Symbol is required" });
    const symbol = normalizeSymbolForStorage(rawSymbol);
    try {
        const watchlist = await getDefaultWatchlist(req.user._id, req.query.mode || 'trader');
        const bare = (s) => String(s || '').replace(/\.(NS|BO)$/i, '').toUpperCase();
        const exists = watchlist.items.some((item) => bare(item.symbol) === bare(symbol));
        if (exists) return res.status(400).json({ error: "Stock already in watchlist" });
        watchlist.items.push({ symbol });
        await watchlist.save();
        try { await profileCache.invalidate(req.user._id); } catch (_) {}
        res.json(watchlist);
    } catch (error) {
        res.status(500).json({ error: "Failed to add to default watchlist" });
    }
};

const removeFromDefaultWatchlist = async (req, res) => {
    const { symbol: rawSymbol } = req.params;
    const normalized = normalizeSymbolForStorage(rawSymbol);
    const plain = String(rawSymbol || '').trim().toUpperCase();
    try {
        const watchlist = await getDefaultWatchlist(req.user._id, req.query.mode || 'trader');
        watchlist.items = watchlist.items.filter(item =>
            item.symbol !== normalized && item.symbol !== plain
        );
        await watchlist.save();
        try { await profileCache.invalidate(req.user._id); } catch (_) {}
        res.json(watchlist);
    } catch (error) {
        res.status(500).json({ error: "Failed to remove from default watchlist" });
    }
};

const reorderWatchlist = async (req, res) => {
    const { symbols } = req.body;
    if (!Array.isArray(symbols)) return res.status(400).json({ error: "symbols must be an array" });
    try {
        const watchlist = await getDefaultWatchlist(req.user._id, req.query.mode || 'trader');
        const newItems = [];
        for (const sym of symbols) {
            const item = watchlist.items.find(i => i.symbol === sym || i.symbol.replace(/\.(NS|BO)$/i, '').toUpperCase() === sym.toUpperCase());
            if (item) {
                newItems.push(item);
            } else {
                newItems.push({ symbol: sym });
            }
        }
        watchlist.items = newItems;
        await watchlist.save();
        try { await profileCache.invalidate(req.user._id); } catch (_) {}
        res.json(watchlist);
    } catch (error) {
        res.status(500).json({ error: "Failed to reorder watchlist" });
    }
};

const getRecentChanges = async (req, res) => {
    try {
        const symbols = Array.isArray(req.body?.symbols) ? req.body.symbols : [];
        const data = await evaluateRecentChanges(symbols);
        return res.json({ success: true, data });
    } catch (error) {
        console.error("Watchlist recent-changes Error:", error);
        return res.status(500).json({ success: false, error: "Failed to evaluate recent changes", details: error.message });
    }
};

module.exports = { 
    getWatchlists, 
    createWatchlist, 
    addToWatchlist, 
    removeFromWatchlist,
    addToDefaultWatchlist,
    removeFromDefaultWatchlist,
    reorderWatchlist,
    getRecentChanges
};
