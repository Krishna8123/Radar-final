export const mockStock = {
    symbol: "BTC",
    name: "Bitcoin",
    price: "42,500.00",
    change: "+5.2%",
    high: "43,000",
    low: "41,200",
    volume: "24B",
    marketCap: "800B",
};

export const topMovers = [
    { symbol: "SOL", name: "Solana", change: "+12.5%", price: "$98.20" },
    { symbol: "AVAX", name: "Avalanche", change: "+8.1%", price: "$34.50" },
    { symbol: "ETH", name: "Ethereum", change: "+4.2%", price: "$2,250" },
];

export const mockNews = [
    { id: 1, source: "CoinDesk", title: "Bitcoin Surges Past $92k Amid ETF Optimism", time: "2h ago", sentiment: "Bullish" },
    { id: 2, source: "Bloomberg", title: "Global Markets Rally as Inflation Data Cools", time: "4h ago", sentiment: "Neutral" },
    { id: 3, source: "CryptoSlate", title: "Miners Holding Onto BTC Despite Price Volatility", time: "6h ago", sentiment: "Bullish" },
];

export const dominanceData = [
    { name: "BTC", value: 52 },
    { name: "ETH", value: 17 },
    { name: "Others", value: 31 },
];

export const COLORS = ["#00f3ff", "#bc13fe", "#0aff68"];

export const defaultTiltOptions = {
    reverse: false,
    max: 15,
    perspective: 1000,
    scale: 1.02,
    speed: 1000,
    transition: true,
    axis: null,
    reset: true,
    easing: "cubic-bezier(.03,.98,.52,.99)",
};

export const mockNotifications = [
    { id: 1, text: "BTC broken resistance at $44k", time: "2m ago", read: false },
    { id: 2, text: "New Feature: Options Chain live", time: "1h ago", read: false },
    { id: 3, text: "Margin Call Warning: 80% usage", time: "3h ago", read: true },
];

export const generatePriceData = (basePrice, points, volatility = 100) => {
    return Array.from({ length: points }, (_, i) => {
        const price = basePrice + Math.sin(i / 5) * volatility;
        return { time: i, price: Math.max(price, basePrice * 0.7) };
    });
};

export const generateCandlestickData = (basePrice, points, volatility = 100) => {
    return Array.from({ length: points }, (_, i) => {
        const open = basePrice + Math.sin(i / 5) * volatility;
        const close = basePrice + Math.sin((i + 1) / 5) * volatility;
        const high = Math.max(open, close) + volatility * 0.2;
        const low = Math.min(open, close) - volatility * 0.2;
        return { time: i, open, high, low, close };
    });
};
const timeframeConfig = {
    "1m": { points: 60, volatility: 20, labels: Array.from({ length: 60 }, (_, i) => `${i}s`) },
    "5m": { points: 48, volatility: 40, labels: Array.from({ length: 48 }, (_, i) => `${i * 5}m`) },
    "15m": { points: 48, volatility: 60, labels: Array.from({ length: 48 }, (_, i) => `${i * 15}m`) },
    "1h": { points: 48, volatility: 100, labels: Array.from({ length: 48 }, (_, i) => `${i}h`) },
    "4h": { points: 42, volatility: 200, labels: Array.from({ length: 42 }, (_, i) => `${i * 4}h`) },
    "1D": { points: 30, volatility: 400, labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`) },
};

export const chartDataByTimeframe = Object.fromEntries(
    Object.entries(timeframeConfig).map(([tf, config]) => {
        const areaData = generatePriceData(18500, config.points, config.volatility);
        const candleData = generateCandlestickData(18500, config.points, config.volatility);
        return [tf, {
            area: areaData.map((d, i) => ({ ...d, time: config.labels[i] })),
            candles: candleData.map((d, i) => ({ ...d, time: config.labels[i] })),
        }];
    })
);
export const priceData = chartDataByTimeframe["15m"].area;
export const candlestickData = chartDataByTimeframe["15m"].candles;
