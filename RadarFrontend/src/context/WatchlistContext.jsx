import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { addSymbolToWatchlist, ensureWatchlist, removeSymbolFromWatchlist } from '../api/watchlistApi';
import { enrichWatchlistSymbols } from '../components/trader/researchWatchlist/services/watchlistMarketService';
import { normalizeSymbol, withNseSuffix } from '../components/trader/researchWatchlist/utils/formatters';
import api from '../api/api';

const WatchlistContext = createContext(null);

export const WatchlistProvider = ({ children }) => {
  const [rows, setRows] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [watchlistId, setWatchlistId] = useState('');
  const location = useLocation();

  const currentMode = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/investor')) return 'investor';
    if (path.includes('/trader')) return 'trader';
    return String(localStorage.getItem('mode') || 'trader').toLowerCase();
  }, [location.pathname]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const mode = currentMode;
      const targetName = mode === 'investor' ? 'Investor Portfolio' : 'Research Watchlist';
      const watchlist = await ensureWatchlist(mode, targetName);
      setWatchlistId(watchlist?._id || watchlist?.id || '');
      const symbols = (watchlist?.items || [])
        .map((item) => (typeof item === 'string' ? item : item?.symbol))
        .filter(Boolean);

      const cleanSymbols = [...new Set(symbols.map(normalizeSymbol).filter(Boolean))].slice(0, 24);
      if (!cleanSymbols.length) {
        setRows([]);
        setSelectedSymbol('');
        return;
      }

      const enriched = await enrichWatchlistSymbols(cleanSymbols);
      
      // Merge fallback: Ensure EVERY symbol in cleanSymbols is represented, even if market API fails to return it!
      const merged = cleanSymbols.map(sym => {
        const found = (enriched || []).find(e => normalizeSymbol(e?.symbol) === sym);
        if (found) return found;
        return {
          symbol: sym,
          name: sym,
          price: null,
          changePercent: null,
          rsi: null,
          trend: 'Neutral',
          sentiment: 'Neutral',
          technicalSignal: 'Data unavailable',
          error: 'Awaiting feed'
        };
      });

      setRows(merged);
      setSelectedSymbol((current) => (
        merged.some((row) => row.symbol === current)
          ? current
          : merged[0]?.symbol || ''
      ));
    } catch (err) {
      setError(err?.message || 'Unable to load research watchlist');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [currentMode]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    const onWatchlistChanged = (e) => {
      try {
        load();
      } catch (err) {
        // ignore
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('watchlist:changed', onWatchlistChanged);
      window.addEventListener('watchlist_updated', onWatchlistChanged);
    }
    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('watchlist:changed', onWatchlistChanged);
        window.removeEventListener('watchlist_updated', onWatchlistChanged);
      }
    };
  }, [load]);

  const stats = useMemo(() => ({
    tracked: rows.length,
    signals: rows.reduce((total, row) => total + (row.signals?.length || 0), 0),
    volumeSpikes: rows.filter((row) => row.signals?.includes('Volume Spike')).length,
    breakouts: rows.filter((row) => row.signals?.includes('Breakout Ready') || row.signals?.includes('Breakout Candidate')).length,
  }), [rows]);

  const selected = rows.find((row) => row.symbol === selectedSymbol) || rows[0] || null;

  const addSymbol = useCallback(async (rawInput) => {
    const symbol = normalizeSymbol(rawInput);
    if (!symbol) {
      setError('Enter a valid NSE symbol (e.g. TCS, RELIANCE, INFY).');
      return false;
    }

    const mode = currentMode;
    const targetName = mode === 'investor' ? 'Investor Portfolio' : 'Research Watchlist';
    const watchlist = await ensureWatchlist(mode, targetName);
    const listId = watchlist?._id || watchlist?.id || '';
    setWatchlistId(listId);

    if (!listId) {
      setError('Could not open your watchlist. Please sign in and try again.');
      return false;
    }

    setAdding(true);
    setError('');
    try {
      await addSymbolToWatchlist(listId, withNseSuffix(symbol));
      await load();
      setSelectedSymbol(symbol);
      window.dispatchEvent(new Event('watchlist_updated'));
      window.dispatchEvent(new CustomEvent('watchlist:changed'));
      return true;
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to add stock to watchlist');
      return false;
    } finally {
      setAdding(false);
    }
  }, [load, currentMode]);

  const removeSymbol = useCallback(async (symbol) => {
    try {
      const mode = currentMode;
      const targetName = mode === 'investor' ? 'Investor Portfolio' : 'Research Watchlist';
      const watchlist = await ensureWatchlist(mode, targetName);
      const listId = watchlist?._id || watchlist?.id || '';
      if (!listId) return;

      await removeSymbolFromWatchlist(listId, symbol);
      await load();
      window.dispatchEvent(new Event('watchlist_updated'));
      window.dispatchEvent(new CustomEvent('watchlist:changed'));
    } catch (err) {
      console.error('Failed to remove symbol:', err);
    }
  }, [load, currentMode]);

  const reorderSymbols = useCallback(async (symbols) => {
    try {
      await api.patch('/watchlist/reorder', { symbols });
      await load();
      return true;
    } catch (err) {
      console.error('Failed to reorder symbols:', err);
      return false;
    }
  }, [load]);

  return (
    <WatchlistContext.Provider value={{
      rows,
      selected,
      selectedSymbol,
      setSelectedSymbol,
      loading,
      adding,
      error,
      setError,
      stats,
      load,
      addSymbol,
      removeSymbol,
      reorderSymbols,
      hasStocks: rows.length > 0,
    }}>
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = () => {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
};

