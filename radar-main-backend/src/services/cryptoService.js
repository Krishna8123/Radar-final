const axios = require('axios');

const BINANCE_BASE_URL = 'https://api.binance.com';
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const COINMARKETCAP_BASE_URL = 'https://pro-api.coinmarketcap.com/v1';
const DEFAULT_PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'ADAUSDT', 'DOTUSDT', 'DOGEUSDT', 'MATICUSDT', 'LINKUSDT'];
const PAIR_META = {
    BTCUSDT: { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' },
    ETHUSDT: { id: 'ethereum', symbol: 'eth', name: 'Ethereum' },
    SOLUSDT: { id: 'solana', symbol: 'sol', name: 'Solana' },
    XRPUSDT: { id: 'ripple', symbol: 'xrp', name: 'XRP' },
    BNBUSDT: { id: 'binancecoin', symbol: 'bnb', name: 'BNB' },
    ADAUSDT: { id: 'cardano', symbol: 'ada', name: 'Cardano' },
    DOTUSDT: { id: 'polkadot', symbol: 'dot', name: 'Polkadot' },
    DOGEUSDT: { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin' },
    MATICUSDT: { id: 'matic-network', symbol: 'matic', name: 'Polygon' },
    LINKUSDT: { id: 'chainlink', symbol: 'link', name: 'Chainlink' },
};

const toBinancePair = (value = 'BTC') => {
    const normalized = String(value).trim().toUpperCase();
    const aliasMap = {
        BTC: 'BTCUSDT',
        BITCOIN: 'BTCUSDT',
        ETH: 'ETHUSDT',
        ETHEREUM: 'ETHUSDT',
        SOL: 'SOLUSDT',
        SOLANA: 'SOLUSDT',
        XRP: 'XRPUSDT',
        RIPPLE: 'XRPUSDT',
        BNB: 'BNBUSDT',
        BINANCECOIN: 'BNBUSDT',
    };

    if (aliasMap[normalized]) {
        return aliasMap[normalized];
    }

    if (normalized.endsWith('USDT')) {
        return normalized;
    }

    return `${normalized}USDT`;
};

const toBinanceInterval = (interval = '1D') => {
    const key = String(interval).toUpperCase();
    const map = {
        '1M': { interval: '4h', limit: 180 },
        '1W': { interval: '1h', limit: 168 },
        '1D': { interval: '15m', limit: 96 },
        '4H': { interval: '15m', limit: 64 },
        '1H': { interval: '5m', limit: 60 },
    };
    return map[key] || { interval: '1h', limit: 120 };
};

const fetchCryptoData = async () => {
    try {
        const response = await axios.get(`${BINANCE_BASE_URL}/api/v3/ticker/24hr`, {
            params: { symbols: JSON.stringify(DEFAULT_PAIRS) },
            timeout: 5000,
        });

        return response.data.map((ticker) => {
            const meta = PAIR_META[ticker.symbol] || {
                id: ticker.symbol.toLowerCase(),
                symbol: ticker.symbol.replace('USDT', '').toLowerCase(),
                name: ticker.symbol,
            };

            const currentPrice = Number(ticker.lastPrice);
            const change24h = Number(ticker.priceChangePercent);
            const quoteVolume = Number(ticker.quoteVolume);

            return {
                id: meta.id,
                symbol: meta.symbol,
                name: meta.name,
                current_price: Number.isFinite(currentPrice) ? currentPrice : 0,
                price_change_percentage_24h: Number.isFinite(change24h) ? change24h : 0,
                market_cap: null,
                total_volume: Number.isFinite(quoteVolume) ? quoteVolume : 0,
                image: null,
            details: {
                sector: "Blockchain",
                    market_cap: "N/A",
                    about: `${meta.name} market data sourced from Binance.`,
                    volume: Number.isFinite(quoteVolume) ? `$${(quoteVolume / 1e6).toFixed(2)}M` : 'N/A',
            }
            };
        });
    } catch (error) {
        console.error('Binance crypto fetch failed, trying CoinMarketCap:', error.message);
        if (!process.env.COINMARKETCAP_API_KEY) {
            return [];
        }
        try {
            const response = await axios.get(`${COINMARKETCAP_BASE_URL}/cryptocurrency/quotes/latest`, {
                params: {
                    symbol: 'BTC,ETH,SOL,XRP,BNB',
                    convert: 'USD',
                },
                timeout: 7000,
                headers: {
                    'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY,
                },
            });

            const data = response.data?.data || {};
            const order = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB'];
            return order
                .map((sym) => {
                    const row = data[sym];
                    const quote = row?.quote?.USD;
                    if (!row || !quote) {
                        return null;
                    }

                    return {
                        id: String(row.slug || sym).toLowerCase(),
                        symbol: String(row.symbol || sym).toLowerCase(),
                        name: row.name || sym,
                        current_price: Number(quote.price) || 0,
                        price_change_percentage_24h: Number(quote.percent_change_24h) || 0,
                        market_cap: Number(quote.market_cap) || null,
                        total_volume: Number(quote.volume_24h) || 0,
                        image: null,
                        details: {
                            sector: 'Blockchain',
                            market_cap: Number(quote.market_cap) > 0 ? `$${(Number(quote.market_cap) / 1e9).toFixed(2)}B` : 'N/A',
                            about: `${row.name || sym} market data sourced from CoinMarketCap.`,
                            volume: Number(quote.volume_24h) > 0 ? `$${(Number(quote.volume_24h) / 1e6).toFixed(2)}M` : 'N/A',
                        }
                    };
                })
                .filter(Boolean);
        } catch (cmcError) {
            console.error('CoinMarketCap crypto fetch failed:', cmcError.message);
            return [];
        }
    }
};

const fetchCryptoHistory = async (symbol, interval) => {
    try {
        const pair = toBinancePair(symbol);
        const timeConfig = toBinanceInterval(interval);
        const response = await axios.get(`${BINANCE_BASE_URL}/api/v3/klines`, {
            params: {
                symbol: pair,
                interval: timeConfig.interval,
                limit: timeConfig.limit,
            },
            timeout: 5000,
        });

        return response.data.map((candle) => ({
            date: new Date(candle[0]).toLocaleString(),
            price: Number(candle[4]),
        }));
    } catch (error) {
        console.error('Binance crypto history fetch failed:', error.message);
        return [];
    }
};

const fetchOrderBook = async (symbol) => {
    try {
        const pair = toBinancePair(symbol);
        const response = await axios.get(`${BINANCE_BASE_URL}/api/v3/depth`, {
            params: { symbol: pair, limit: 10 },
            timeout: 5000,
        });

        return {
            bids: response.data.bids || [],
            asks: response.data.asks || [],
        };
    } catch (error) {
        console.error('Binance order book fetch failed:', error.message);
        return null;
    }
};

module.exports = { fetchCryptoData, fetchCryptoHistory, fetchOrderBook };
