const { fetchStockData } = require('./stockService');
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

const toNumber = (value, fallback = NaN) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeSymbol = (value) => String(value || '').trim().toUpperCase();
const stripSuffix = (value) => normalizeSymbol(value).replace(/\.(NS|BO)$/i, '');

const findUnderlying = async (symbol) => {
    const normalized = stripSuffix(symbol);
    const stocks = await fetchStockData();
    return (Array.isArray(stocks) ? stocks : []).find((row) => stripSuffix(row?.symbol) === normalized) || null;
};

const buildChain = (symbol, underlyingPrice, expiry = null) => {
    const base = Number.isFinite(underlyingPrice) && underlyingPrice > 0 ? underlyingPrice : 100;
    const spacing = base > 1000 ? 50 : base > 300 ? 10 : 5;
    const strikeCenter = Math.round(base / spacing) * spacing;
    const strikes = Array.from({ length: 9 }).map((_, index) => strikeCenter + (index - 4) * spacing);

    const calls = strikes.map((strike, index) => {
        const intrinsic = Math.max(0, base - strike);
        const timeValue = Math.max(1, (5 - Math.abs(index - 4)) * (spacing * 0.35));
        const premium = Number((intrinsic + timeValue).toFixed(2));
        const iv = Number((18 + Math.abs(index - 4) * 2.4).toFixed(2));
        const oi = Math.max(1000, Math.round((4000 - Math.abs(index - 4) * 350)));
        const volume = Math.max(300, Math.round((1200 - Math.abs(index - 4) * 120)));
        return {
            strike,
            side: 'CALL',
            premium,
            iv,
            oi,
            volume,
            bid: Number((premium * 0.99).toFixed(2)),
            ask: Number((premium * 1.01).toFixed(2)),
        };
    });

    const puts = strikes.map((strike, index) => {
        const intrinsic = Math.max(0, strike - base);
        const timeValue = Math.max(1, (5 - Math.abs(index - 4)) * (spacing * 0.35));
        const premium = Number((intrinsic + timeValue).toFixed(2));
        const iv = Number((19 + Math.abs(index - 4) * 2.1).toFixed(2));
        const oi = Math.max(1100, Math.round((4200 - Math.abs(index - 4) * 320)));
        const volume = Math.max(260, Math.round((1100 - Math.abs(index - 4) * 110)));
        return {
            strike,
            side: 'PUT',
            premium,
            iv,
            oi,
            volume,
            bid: Number((premium * 0.99).toFixed(2)),
            ask: Number((premium * 1.01).toFixed(2)),
        };
    });

    return {
        symbol: normalizeSymbol(symbol),
        underlyingPrice: Number(base.toFixed(2)),
        expiry: expiry || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        strikes,
        calls,
        puts,
    };
};

const getOptionsChain = async (symbol, { expiry } = {}) => {
    let yahooSymbol = symbol.toUpperCase().trim();
    if (!yahooSymbol.includes('.') && !yahooSymbol.startsWith('^') && !yahooSymbol.endsWith('-USD')) {
        yahooSymbol = `${yahooSymbol}.NS`;
    }

    try {
        const queryOptions = {};
        if (expiry) {
            queryOptions.date = Math.floor(new Date(expiry).getTime() / 1000);
        }
        
        const rawChain = await yahooFinance.options(yahooSymbol, queryOptions);
        if (rawChain && rawChain.options && rawChain.options.length > 0) {
            const optionData = rawChain.options[0];
            const calls = (optionData.calls || []).map(c => {
                let iv = c.impliedVolatility || 0;
                if (iv > 0 && iv < 2.0) iv = iv * 100;
                const premium = c.lastPrice || 0;
                return {
                    strike: c.strike,
                    side: 'CALL',
                    premium: Number(premium.toFixed(2)),
                    iv: Number(iv.toFixed(2)),
                    oi: c.openInterest || 0,
                    volume: c.volume || 0,
                    bid: c.bid != null ? Number(c.bid.toFixed(2)) : Number((premium * 0.99).toFixed(2)),
                    ask: c.ask != null ? Number(c.ask.toFixed(2)) : Number((premium * 1.01).toFixed(2)),
                };
            });

            const puts = (optionData.puts || []).map(p => {
                let iv = p.impliedVolatility || 0;
                if (iv > 0 && iv < 2.0) iv = iv * 100;
                const premium = p.lastPrice || 0;
                return {
                    strike: p.strike,
                    side: 'PUT',
                    premium: Number(premium.toFixed(2)),
                    iv: Number(iv.toFixed(2)),
                    oi: p.openInterest || 0,
                    volume: p.volume || 0,
                    bid: p.bid != null ? Number(p.bid.toFixed(2)) : Number((premium * 0.99).toFixed(2)),
                    ask: p.ask != null ? Number(p.ask.toFixed(2)) : Number((premium * 1.01).toFixed(2)),
                };
            });

            const strikes = [...new Set([...calls.map(c => c.strike), ...puts.map(p => p.strike)])].sort((a, b) => a - b);

            let underlyingPrice = 0;
            if (rawChain.quote && rawChain.quote.regularMarketPrice) {
                underlyingPrice = rawChain.quote.regularMarketPrice;
            } else {
                const underlying = await findUnderlying(symbol);
                underlyingPrice = underlying ? toNumber(underlying.price, 100) : 100;
            }

            return {
                symbol: normalizeSymbol(symbol),
                underlyingPrice: Number(underlyingPrice.toFixed(2)),
                expiry: optionData.expirationDate || expiry || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
                strikes,
                calls,
                puts,
            };
        }
    } catch (err) {
        console.warn(`[optionsService] Failed to fetch options from Yahoo Finance for ${yahooSymbol}, falling back to mock: ${err.message}`);
    }

    const underlying = await findUnderlying(symbol);
    const price = underlying ? toNumber(underlying.price, 100) : 100;
    return buildChain(symbol, price, expiry);
};

const computeGreeks = (chain) => {
    const rows = [...chain.calls, ...chain.puts];
    return rows.map((row) => {
        const moneyness = (chain.underlyingPrice - row.strike) / Math.max(chain.underlyingPrice, 1);
        const isCall = row.side === 'CALL';
        const deltaBase = isCall ? 0.5 + moneyness : -0.5 + moneyness;
        const delta = Math.max(isCall ? 0.05 : -0.95, Math.min(isCall ? 0.95 : -0.05, deltaBase));
        const gamma = Math.max(0.01, 0.09 - Math.abs(moneyness) * 0.2);
        const theta = -(0.8 + Math.abs(moneyness) * 1.2);
        const vega = Math.max(0.08, 0.24 - Math.abs(moneyness) * 0.3);

        return {
            strike: row.strike,
            side: row.side,
            delta: Number(delta.toFixed(4)),
            gamma: Number(gamma.toFixed(4)),
            theta: Number(theta.toFixed(4)),
            vega: Number(vega.toFixed(4)),
            iv: row.iv,
            premium: row.premium,
        };
    });
};

const getOptionGreeks = async (symbol, { expiry } = {}) => {
    const chain = await getOptionsChain(symbol, { expiry });
    return {
        symbol: chain.symbol,
        underlyingPrice: chain.underlyingPrice,
        expiry: chain.expiry,
        greeks: computeGreeks(chain),
    };
};

module.exports = {
    getOptionsChain,
    getOptionGreeks,
};
