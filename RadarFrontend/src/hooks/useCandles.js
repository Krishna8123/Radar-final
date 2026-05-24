import { useState, useEffect, useCallback } from 'react';
import api from '../api/api';

const mapIntervalToDaysAndInterval = (interval) => {
  const map = {
    '1D': { interval: '15m', daysBack: 5 },
    '5D': { interval: '15m', daysBack: 10 },
    '1M': { interval: '1d', daysBack: 60 },
    '3M': { interval: '1d', daysBack: 90 },
    '6M': { interval: '1d', daysBack: 180 },
    '1Y': { interval: '1d', daysBack: 365 },
    '5Y': { interval: '1wk', daysBack: 1825 }
  };
  return map[String(interval).toUpperCase()] || { interval: '1d', daysBack: 365 };
};

export const useCandles = (symbol, interval = '1D') => {
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCandles = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const { interval: yahooInterval, daysBack } = mapIntervalToDaysAndInterval(interval);
      const cleanSymbol = symbol.replace(/\.(NS|BO)$/i, '');
      
      const res = await api.get(`/ohlc/${encodeURIComponent(cleanSymbol)}/chart`, {
        params: { interval: yahooInterval, daysBack },
        timeout: 12000,
      });

      const rawData = res.data?.data || [];

      if (rawData && Array.isArray(rawData) && rawData.length > 0) {
        const mapped = rawData.map(c => {
          const t = Number(c.time || c.timestamp);
          let timeVal = isNaN(t) ? Math.floor(new Date(c.time || c.timestamp).getTime() / 1000) : t;
          if (timeVal > 9999999999) {
            timeVal = Math.floor(timeVal / 1000);
          }

          return {
            time: timeVal,
            open: Number(c.open || c.close),
            high: Number(c.high || c.close),
            low: Number(c.low || c.close),
            close: Number(c.close),
            volume: Number(c.volume || 0)
          };
        }).filter(item => item.time !== null && item.time !== undefined && !isNaN(item.time) && !isNaN(item.open) && !isNaN(item.close));

        // Sort chronologically
        mapped.sort((a, b) => a.time - b.time);

        // De-duplicate dates to satisfy lightweight-charts constraint
        const unique = [];
        const seen = new Set();
        for (const item of mapped) {
          if (!seen.has(item.time)) {
            seen.add(item.time);
            unique.push(item);
          }
        }

        setCandles(unique);
      } else {
        console.warn(`[useCandles] Empty response for ${symbol}`);
        setCandles([]);
      }
    } catch (err) {
      console.error(`[useCandles] Failed to load candles for ${symbol}:`, err.message);
      setError(err.message);
      setCandles([]);
    } finally {
      setLoading(false);
    }
  }, [symbol, interval]);

  useEffect(() => {
    loadCandles();
  }, [loadCandles]);

  return { candles, loading, error, refetch: loadCandles };
};

export default useCandles;
