

export const SCREENER_PRESETS = {
  momentum: {
    name: 'Momentum Movers',
    description: 'Stocks with strong upward price momentum and high RSI',
    icon: '🚀',
    category: 'Technical',
    filters: { minChange: 0.8, minRsi: 55, minScore: 55, volumeStatus: 'high_volume' },
    sortBy: 'change',
    sortOrder: 'desc',
  },
  value: {
    name: 'Value Picks',
    description: 'Undervalued stocks with low P/E ratios',
    icon: '👎',
    category: 'Fundamental',
    filters: { maxPe: 22, minPrice: 50, minMarketCap: '1000Cr' },
    sortBy: 'pe',
    sortOrder: 'asc',
  },
  breakout: {
    name: 'High RSI Breakouts',
    description: 'Stocks breaking out with strong technical indicators',
    icon: '📈',
    category: 'Technical',
    filters: { minRsi: 60, minScore: 65, minChange: 0.5 },
    sortBy: 'score',
    sortOrder: 'desc',
  },

  dividendKings: {
    name: 'Dividend Kings',
    description: 'High dividend yield stocks with consistent payouts',
    icon: '💎'
    category: 'Income',
    filters: { minDividendYield: 3.5, minMarketCap: '5000Cr', maxPe: 30 },
    sortBy: 'dividendYield',
    sortOrder: 'desc',
  },
  dividendGrowth: {
    name: 'Dividend Growth',
    description: 'Companies growing dividends year-over-year',
    icon: '📊',
    category: 'Income',
    filters: { minDividendYield: 2, minChange: 0, minScore: 50 },
    sortBy: 'dividendYield',
    sortOrder: 'desc',
  },

  growthLeaders: {
    name: 'Growth Leaders',
    description: 'High-growth stocks with strong earnings potential',
    icon: '🌟',
    category: 'Growth',
    filters: { minChange: 1.5, minScore: 70, sectors: ['Technology', 'Healthcare'] },
    sortBy: 'change',
    sortOrder: 'desc',
  },
  smallCapGems: {
    name: 'Small Cap Gems',
    description: 'Small-cap stocks with big potential',
    icon: '💠',
    category: 'Growth',
    filters: { minMarketCap: '100Cr', maxMarketCap: '5000Cr', minScore: 60 },
    sortBy: 'score',
    sortOrder: 'desc',
  },

  oversold: {
    name: 'Oversold Bounce',
    description: 'Oversold stocks ready for reversal',
    icon: '📄',
    category: 'Contrarian',
    filters: { maxRsi: 35, minScore: 40, volumeStatus: 'high_volume' },
    sortBy: 'rsi',
    sortOrder: 'asc',
  },
  fallenAngels: {
    name: 'Fallen Angels',
    description: 'Quality stocks temporarily beaten down',
    icon: '😇',
    category: 'Contrarian',
    filters: { minChange: -5, maxChange: -1, maxPe: 25, minMarketCap: '10000Cr' },
    sortBy: 'change',
    sortOrder: 'asc',
  },

  blueChips: {
    name: 'Blue Chip Quality',
    description: 'Large-cap stable companies',
    icon: '🏆',
    category: 'Quality',
    filters: { minMarketCap: '50000Cr', maxPe: 35, minScore: 55 },
    sortBy: 'marketcap',
    sortOrder: 'desc',
  },
  defensiveStocks: {
    name: 'Defensive Stocks',
    description: 'Low-volatility defensive sectors',
    icon: '🛡️',
    category: 'Quality',
    filters: { sectors: ['FMCG', 'Pharma', 'Utilities'], minMarketCap: '5000Cr' },
    sortBy: 'marketcap',
    sortOrder: 'desc',
  },

  highVolatility: {
    name: 'High Volatility Traders',
    description: 'Volatile stocks for day trading',
    icon: '⚡',
    category: 'Trading',
    filters: { volumeStatus: 'high_volume', minScore: 50 },
    sortBy: 'change',
    sortOrder: 'desc',
  },
  gappers: {
    name: 'Gap Up/Down Stocks',
    description: 'Stocks with significant price gaps',
    icon: 'ðŸ“‰',
    category: 'Trading',
    filters: { minChange: 2 },
    sortBy: 'change',
    sortOrder: 'desc',
  },

  sectorLeaders: {
    name: 'Sector Leaders',
    description: 'Top performers in each sector',
    icon: 'ðŸŽ¯',
    category: 'Sector',
    filters: { minScore: 65, minMarketCap: '1000Cr' },
    sortBy: 'score',
    sortOrder: 'desc',
  },
  itExporters: {
    name: 'IT Export Leaders',
    description: 'Technology and IT services exporters',
    icon: 'ðŸ’»',
    category: 'Sector',
    filters: { sectors: ['Technology'], minMarketCap: '10000Cr', minChange: 0 },
    sortBy: 'marketcap',
    sortOrder: 'desc',
  },

  newsMovers: {
    name: 'News Movers',
    description: 'Stocks moving on breaking news',
    icon: 'ðŸ“°',
    category: 'News',
    filters: { minNewsCount: 3, minChange: 1 },
    sortBy: 'newsCount',
    sortOrder: 'desc',
  },
  positiveSentiment: {
    name: 'Positive News Sentiment',
    description: 'Stocks with positive news sentiment',
    icon: 'ðŸ˜Š',
    category: 'News',
    filters: { minSentiment: 50, minNewsCount: 2 },
    sortBy: 'sentiment',
    sortOrder: 'desc',
  },

  custom: {
    name: 'Custom Scan',
    description: 'Create your own screening criteria',
    icon: '⚙️ï¸',
    category: 'Custom',
    filters: {},
    sortBy: 'symbol',
    sortOrder: 'asc',
  },
};

export const PRESET_CATEGORIES = [
  { id: 'all', label: 'All Presets', icon: 'ðŸ“‹' },
  { id: 'Technical', label: 'Technical', icon: 'ðŸ“Š' },
  { id: 'Fundamental', label: 'Fundamental', icon: 'ðŸ“ˆ' },
  { id: 'Income', label: 'Income', icon: 'ðŸ’°' },
  { id: 'Growth', label: 'Growth', icon: 'ðŸš€' },
  { id: 'Contrarian', label: 'Contrarian', icon: 'ðŸ”„' },
  { id: 'Quality', label: 'Quality', icon: '⭐' },
  { id: 'Trading', label: 'Trading', icon: '⚡' },
  { id: 'Sector', label: 'Sector', icon: 'ðŸŽ¯' },
  { id: 'News', label: 'News', icon: 'ðŸ“°' },
  { id: 'Custom', label: 'Custom', icon: '⚙️ï¸' },
];

export const getPresetsByCategory = (category) => {
  if (category === 'all') {
    return Object.entries(SCREENER_PRESETS).map(([key, preset]) => ({ key, ...preset }));
  }
  return Object.entries(SCREENER_PRESETS)
    .filter(([_, preset]) => preset.category === category)
    .map(([key, preset]) => ({ key, ...preset }));
};

export const SAVED_SCREENERS_STORAGE_KEY = 'radar_saved_screeners';

export const saveScreener = (name, config) => {
  const saved = JSON.parse(localStorage.getItem(SAVED_SCREENERS_STORAGE_KEY) || '[]');
  const newScreener = {
    id: Date.now(),
    name,
    config,
    createdAt: new Date().toISOString(),
  };
  saved.push(newScreener);
  localStorage.setItem(SAVED_SCREENERS_STORAGE_KEY, JSON.stringify(saved));
  return newScreener;
};

export const getSavedScreeners = () => {
  return JSON.parse(localStorage.getItem(SAVED_SCREENERS_STORAGE_KEY) || '[]');
};

export const deleteSavedScreener = (id) => {
  const saved = JSON.parse(localStorage.getItem(SAVED_SCREENERS_STORAGE_KEY) || '[]');
  const filtered = saved.filter(s => s.id !== id);
  localStorage.setItem(SAVED_SCREENERS_STORAGE_KEY, JSON.stringify(filtered));
};

export default SCREENER_PRESETS;
