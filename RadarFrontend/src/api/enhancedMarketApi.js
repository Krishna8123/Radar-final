import { fetchOHLCData, fetchOHLCForChart, fetchPriceHistory, hasOHLCData } from './ohlcApi';
import { fetchMarketHistory } from './marketApi';




export const fetchEnhancedMarketHistory = async (
    symbol,
    type = 'STOCK',
    interval = '1D',
    options = {}
) => {
    try {
        if (type === 'STOCK') {
            const timeframeMap = {
                '1D': '1d',
                '1H': '1h',
                '15M': '15m',
                '5M': '5m',
                '1M': '1m',
            };

            const timeframe = timeframeMap[interval] || '1d';

            console.log(`[Enhanced] Attempting OHLC fetch for ${symbol} (${timeframe})`);
            
            const ohlcResult = await fetchOHLCData(symbol, {
                exchange: 'NSE',
                timeframe,
                limit: options.limit || 365,
                ...options,
            });

            if (ohlcResult.data && ohlcResult.data.length > 0) {
                console.log(`[Enhanced] ✅ Using OHLC data (${ohlcResult.count} records)`);

                const formattedData = ohlcResult.data.map(candle => ({
                    timestamp: candle.timestamp,
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                    volume: candle.volume || 0,
                }));

                return {
                    data: formattedData,
                    indicators: null, // Can add technical indicators here later
                    source: 'ohlc-storage',
                    cached: true,
                };
            }

            console.log(`[Enhanced] ⚠️ï¸ No OHLC data found, falling back to external API`);
        }

        console.log(`[Enhanced] Using external API for ${symbol}`);
        const result = await fetchMarketHistory(symbol, type, interval);

        return {
            ...result,
            source: 'external-api',
            cached: false,
        };
    } catch (error) {
        console.error('[Enhanced] Error fetching market history:', error);
        
        try {
            console.log(`[Enhanced] Attempting fallback to external API`);
            const fallbackResult = await fetchMarketHistory(symbol, type, interval);
            return {
                ...fallbackResult,
                source: 'external-api-fallback',
                cached: false,
            };
        } catch (fallbackError) {
            console.error('[Enhanced] Fallback also failed:', fallbackError);
            throw fallbackError;
        }
    }
};


export const fetchEnhancedChartData = async (symbol, options = {}) => {
    const {
        type = 'STOCK',
        interval = '1D',
        limit = 90,
    } = options;

    try {
        if (type === 'STOCK') {
            const timeframeMap = {
                '1D': '1d',
                '1H': '1h',
                '15M': '15m',
                '5M': '5m',
            };

            const timeframe = timeframeMap[interval] || '1d';

            const chartData = await fetchOHLCForChart(symbol, {
                exchange: 'NSE',
                timeframe,
                limit,
            });

            if (chartData && chartData.length > 0) {
                console.log(`[Chart] ✅ Using OHLC storage (${chartData.length} points)`);
                return chartData;
            }
        }

        console.log(`[Chart] Using external API for ${symbol}`);
        const result = await fetchMarketHistory(symbol, type, interval);
        
        return result.data || [];
    } catch (error) {
        console.error('[Chart] Error fetching chart data:', error);
        return [];
    }
};


export const fetchSimplePriceHistory = async (symbol, days = 30) => {
    try {
        const priceHistory = await fetchPriceHistory(symbol, {
            exchange: 'NSE',
            timeframe: '1d',
            limit: days,
        });

        if (priceHistory && priceHistory.length > 0) {
            console.log(`[Price] ✅ Using OHLC storage (${priceHistory.length} days)`);
            return priceHistory;
        }

        console.log(`[Price] Using external API`);
        const result = await fetchMarketHistory(symbol, 'STOCK', '1D');
        
        if (!result.data) return [];

        return result.data.slice(-days).map(candle => ({
            timestamp: candle.timestamp,
            price: candle.close,
            date: new Date(candle.timestamp).toLocaleDateString(),
        }));
    } catch (error) {
        console.error('[Price] Error fetching price history:', error);
        return [];
    }
};


export const hasCachedData = async (symbol) => {
    try {
        return await hasOHLCData(symbol, 'NSE');
    } catch (error) {
        return false;
    }
};


export const getDataFreshness = async (symbol) => {
    try {
        const hasCached = await hasCachedData(symbol);
        
        if (!hasCached) {
            return {
                cached: false,
                message: 'Using real-time external API',
            };
        }

        const latestResult = await fetchOHLCData(symbol, {
            exchange: 'NSE',
            timeframe: '1d',
            limit: 1,
        });

        if (latestResult.data && latestResult.data.length > 0) {
            const latestTimestamp = new Date(latestResult.data[0].timestamp);
            const now = new Date();
            const hoursDiff = (now - latestTimestamp) / (1000 * 60 * 60);

            return {
                cached: true,
                latestDate: latestTimestamp.toLocaleDateString(),
                hoursOld: Math.round(hoursDiff),
                message: hoursDiff < 24 
                    ? 'Data is current (less than 24 hours old)'
                    : `Data is ${Math.round(hoursDiff / 24)} days old`,
            };
        }

        return {
            cached: true,
            message: 'Cached data available',
        };
    } catch (error) {
        return {
            cached: false,
            error: error.message,
        };
    }
};

export default {
    fetchEnhancedMarketHistory,
    fetchEnhancedChartData,
    fetchSimplePriceHistory,
    hasCachedData,
    getDataFreshness,
};
