import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  MoreVertical,
  Filter,
  Download,
  Eye,
  Plus,
  Sparkles,
  SlidersHorizontal,
  Layers3,
  Newspaper,
  Maximize2,
  Minimize2,
  Keyboard,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TradingWatchlistGrid from './TradingWatchlistGrid';
import StockDetailsPanel from './StockDetailsPanel';
import FilterModal from './FilterModal';
import AlertsPanel from './AlertsPanel';
import PortfolioSummary from './PortfolioSummary';
import { ToolbarButton, NotificationBanner, ExportMenu } from './EnhancedWatchlistComponents';
import { useWatchlistEnhancements } from '../../hooks/useWatchlistEnhancements';
import { useKeyboardShortcuts, KEYBOARD_SHORTCUTS_HELP } from '../../hooks/useKeyboardShortcuts';
import { sortStocks, SORT_OPTIONS } from '../../hooks/watchlistSorting';
import api, { hasAuthToken } from '../../api/api';

const MOCK_STOCKS = [
  {
    id: 1,
    symbol: 'RELIANCE',
    name: 'Reliance Industries',
    price: 2845.50,
    change: 1.42,
    percent: 0.82,
    volume: 3250000,
    marketCap: 1850000,
    rsi: 62.5,
    macd: 'bullish',
    high52w: 3050,
    low52w: 2200,
    vwap: 2820.30,
    status: 'breakout',
  },
  {
    id: 2,
    symbol: 'HDFCBANK',
    name: 'HDFC Bank',
    price: 1618.75,
    change: -0.58,
    percent: -0.04,
    volume: 2840000,
    marketCap: 950000,
    rsi: 48.2,
    macd: 'neutral',
    high52w: 1850,
    low52w: 1420,
    vwap: 1625.40,
    status: 'neutral',
  },
  {
    id: 3,
    symbol: 'INFY',
    name: 'Infosys',
    price: 1520.25,
    change: 2.85,
    percent: 1.92,
    volume: 1950000,
    marketCap: 640000,
    rsi: 68.3,
    macd: 'bullish',
    high52w: 1650,
    low52w: 1200,
    vwap: 1510.50,
    status: 'strong',
  },
  {
    id: 4,
    symbol: 'TCS',
    name: 'Tata Consultancy',
    price: 3650.80,
    change: -1.25,
    percent: -0.34,
    volume: 850000,
    marketCap: 1200000,
    rsi: 42.1,
    macd: 'bearish',
    high52w: 4100,
    low52w: 3300,
    vwap: 3670.20,
    status: 'weak',
  },
  {
    id: 5,
    symbol: 'ICICIBANK',
    name: 'ICICI Bank',
    price: 945.60,
    change: 3.12,
    percent: 2.34,
    volume: 4120000,
    marketCap: 780000,
    rsi: 72.8,
    macd: 'bullish',
    high52w: 1050,
    low52w: 820,
    vwap: 938.15,
    status: 'breakout',
  },
  {
    id: 6,
    symbol: 'SBIN',
    name: 'State Bank of India',
    price: 520.15,
    change: -0.92,
    percent: -0.18,
    volume: 5650000,
    marketCap: 450000,
    rsi: 51.5,
    macd: 'neutral',
    high52w: 620,
    low52w: 450,
    vwap: 523.80,
    status: 'neutral',
  },
];

const FILTER_TABS = [
  { id: 'all', label: 'All', icon: null },
  { id: 'gainers', label: 'Gainers', icon: TrendingUp },
  { id: 'losers', label: 'Losers', icon: TrendingDown },
  { id: 'highVolume', label: 'High Volume', icon: null },
  { id: 'breakouts', label: 'Breakouts', icon: AlertCircle },
];

export default function AdvancedWatchlistDashboard() {
  const [stocks, setStocks] = useState(MOCK_STOCKS);
  const [selectedStock, setSelectedStock] = useState(MOCK_STOCKS[0]);
  const [selectedStockIndex, setSelectedStockIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [columnVisibility, setColumnVisibility] = useState({
    symbol: true,
    price: true,
    change: true,
    percent: true,
    volume: true,
    marketCap: true,
    rsi: true,
    macd: true,
    high52w: true,
    low52w: true,
    vwap: true,
    sentiment: true, // NEW: Sentiment column
    news: true, // NEW: News count column
  });
  const [sortConfig, setSortConfig] = useState({ key: 'symbol', direction: 'asc' });
  const [sortType, setSortType] = useState('price_desc'); // NEW: Smart sorting
  const [alerts, setAlerts] = useState([]);
  const [filters, setFilters] = useState({
    priceRange: [0, 5000],
    volumeMin: 0,
    rsiMin: 0,
    rsiMax: 100,
  });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState(true);
  const searchInputRef = useRef(null);

  const {
    newsData,
    getNewsInfo,
    viewMode,
    toggleViewMode,
    showOnlyWithNews,
    setShowOnlyWithNews,
    notificationsEnabled,
    requestNotificationPermission,
    exportToCSV,
  } = useWatchlistEnhancements(stocks);

  // Live data load — replaces Math.random() simulation
  useEffect(() => {
    let active = true;

    const normalizeQuote = (q, idx) => ({
      id: q._id || q.id || idx + 1,
      symbol: String(q.symbol || '').replace(/\.(NS|BO)$/i, ''),
      name: q.name || q.companyName || q.symbol || '',
      price: Number(q.price ?? q.ltp ?? q.lastPrice ?? 0),
      change: Number(q.change ?? 0),
      percent: Number(q.changePercent ?? q.pChange ?? 0),
      volume: Number(q.volume ?? 0),
      marketCap: Number(q.marketCap ?? 0),
      rsi: Number(q.rsi ?? 50),
      macd: q.macd || 'neutral',
      high52w: Number(q.high52w ?? q.yearHigh ?? 0),
      low52w: Number(q.low52w ?? q.yearLow ?? 0),
      vwap: Number(q.vwap ?? q.price ?? 0),
      sector: q.sector || 'Equity',
      status: Number(q.changePercent ?? 0) > 2 ? 'breakout' : Number(q.changePercent ?? 0) > 0.5 ? 'strong' : Number(q.changePercent ?? 0) < -0.5 ? 'weak' : 'neutral',
    });

    const load = async (silent = false) => {
      try {
        if (!hasAuthToken()) return; // Not logged in — keep mock

        const wlRes = await api.get('/watchlists');
        const wlData = wlRes.data?.data ?? wlRes.data;
        const symbols = (Array.isArray(wlData)
          ? wlData.flatMap(w => w.symbols ?? w.stocks ?? [])
          : []).filter(Boolean).map(s => String(s).replace(/\.(NS|BO)$/i, ''));

        if (!symbols.length || !active) return;

        const mktRes = await api.get(`/market?symbols=${encodeURIComponent(symbols.join(','))}`);
        const quotes = mktRes.data?.data ?? mktRes.data;

        if (Array.isArray(quotes) && quotes.length && active) {
          const mapped = quotes.map(normalizeQuote);
          setStocks(mapped);
          if (!silent) {
            setSelectedStock(mapped[0]);
            setSelectedStockIndex(0);
          }
        }
      } catch (err) {
        console.warn('AdvancedWatchlistDashboard live load failed:', err.message);
      }
    };

    load(false);
    const interval = setInterval(() => load(true), 30000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  const filteredStocks = useMemo(() => {
    let result = stocks.filter((stock) => {
      if (
        searchQuery &&
        !stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !stock.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      if (showOnlyWithNews) {
        const newsInfo = getNewsInfo(stock.symbol);
        if (!newsInfo || newsInfo.count === 0) {
          return false;
        }
      }

      if (activeTab === 'gainers' && stock.change <= 0) return false;
      if (activeTab === 'losers' && stock.change >= 0) return false;
      if (activeTab === 'highVolume' && stock.volume < 2000000) return false;
      if (activeTab === 'breakouts' && stock.status !== 'breakout') return false;

      if (stock.price < filters.priceRange[0] || stock.price > filters.priceRange[1]) {
        return false;
      }

      if (stock.volume < filters.volumeMin) return false;

      if (stock.rsi < filters.rsiMin || stock.rsi > filters.rsiMax) return false;

      return true;
    });

    return sortStocks(result, sortType, newsData);
  }, [stocks, activeTab, searchQuery, filters, showOnlyWithNews, sortType, newsData, getNewsInfo]);

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const toggleColumnVisibility = useCallback((column) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  }, []);

  const handleAddAlert = useCallback((stock) => {
    const newAlert = {
      id: Date.now(),
      symbol: stock.symbol,
      condition: `Price above ${stock.price * 1.05}`,
      createdAt: new Date(),
    };
    setAlerts((prev) => [newAlert, ...prev]);
  }, []);

  const handleRemoveStock = useCallback((stockToRemove) => {
    setStocks((prev) => {
      const next = prev.filter((stock) => stock.id !== stockToRemove.id);

      if (selectedStock?.id === stockToRemove.id) {
        setSelectedStock(next[0] || null);
        setSelectedStockIndex(0);
      } else if (selectedStock) {
        const nextSelectedIndex = next.findIndex((stock) => stock.id === selectedStock.id);
        setSelectedStockIndex(nextSelectedIndex >= 0 ? nextSelectedIndex : 0);
      }

      return next;
    });

    setAlerts((prev) => prev.filter((alert) => alert.symbol !== stockToRemove.symbol));
  }, [selectedStock]);

  const keyboardCallbacks = useMemo(() => ({
    onNavigateDown: () => {
      setSelectedStockIndex((prev) => Math.min(prev + 1, filteredStocks.length - 1));
      if (filteredStocks[selectedStockIndex + 1]) {
        setSelectedStock(filteredStocks[selectedStockIndex + 1]);
      }
    },
    onNavigateUp: () => {
      setSelectedStockIndex((prev) => Math.max(prev - 1, 0));
      if (filteredStocks[selectedStockIndex - 1]) {
        setSelectedStock(filteredStocks[selectedStockIndex - 1]);
      }
    },
    onSelectStock: () => {
      if (filteredStocks[selectedStockIndex]) {
        setSelectedStock(filteredStocks[selectedStockIndex]);
      }
    },
    onFocusSearch: () => {
      searchInputRef.current?.focus();
    },
    onEscape: () => {
      setShowFilterModal(false);
      setShowExportMenu(false);
      setShowKeyboardHelp(false);
      setSearchQuery('');
    },
    onTabSwitch: (index) => {
      if (FILTER_TABS[index]) {
        setActiveTab(FILTER_TABS[index].id);
      }
    },
    onExport: () => {
      exportToCSV(filteredStocks, newsData);
    },
    onToggleNewsFilter: () => {
      setShowOnlyWithNews((prev) => !prev);
    },
    onToggleCompactView: () => {
      toggleViewMode();
    },
    onRefresh: () => {
      window.location.reload();
    },
    onShowHelp: () => {
      setShowKeyboardHelp((prev) => !prev);
    },
  }), [filteredStocks, selectedStockIndex, toggleViewMode, exportToCSV, newsData]);

  useKeyboardShortcuts(keyboardCallbacks);

  return (
    <div className="min-h-screen text-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.16),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(96,165,250,0.12),transparent_24%),linear-gradient(180deg,#02050c_0%,#07111f_42%,#050b14_100%)]">
      <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5">
        <motion.section
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[28px] border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(7,12,22,0.92),rgba(8,18,34,0.88))] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(45,212,191,0.16),transparent_26%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.16),transparent_22%)]" />
          <div className="relative grid gap-4 xl:grid-cols-[1.35fr_0.95fr] p-5 md:p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">
                <Sparkles size={13} className="text-cyan-300" />
                Live Frontend Watchlist
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Trading watchlist, rebuilt as a control room.</h1>
                <p className="max-w-2xl text-sm md:text-base text-slate-300 leading-relaxed">
                  Search, sort, filter, and inspect your symbols in a frontend-only workspace with stronger hierarchy, richer summaries, and a cleaner action bar.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                <span className="px-3 py-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">Frontend only</span>
                <span className="px-3 py-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-200">6 live mocks</span>
                <span className="px-3 py-1.5 rounded-full border border-sky-400/20 bg-sky-400/10 text-sky-200">3s refresh</span>
                <span className="px-3 py-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 text-amber-200">Distinct layout</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-slate-400">
                  <span>Watchlist Pulse</span>
                  <Layers3 size={14} className="text-cyan-300" />
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <div className="text-3xl font-black text-white leading-none">{filteredStocks.length}</div>
                  <div className="pb-1 text-sm text-emerald-300 font-semibold">symbols active</div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-slate-400">
                  <span>Watch Mode</span>
                  <SlidersHorizontal size={14} className="text-sky-300" />
                </div>
                <div className="mt-3 text-lg font-bold text-white">{activeTab === 'all' ? 'All Symbols' : FILTER_TABS.find((tab) => tab.id === activeTab)?.label || 'Filtered'}</div>
                <div className="text-sm text-slate-400">Sorted by {sortConfig.key}</div>
              </div>
            </div>
          </div>
        </motion.section>

        {}
        <AnimatePresence>
          {showNotificationBanner && !notificationsEnabled && (
            <NotificationBanner
              onEnable={async () => {
                const enabled = await requestNotificationPermission();
                if (enabled) {
                  setShowNotificationBanner(false);
                }
              }}
              onDismiss={() => setShowNotificationBanner(false)}
            />
          )}
        </AnimatePresence>

        {}
        <AnimatePresence>
          {showKeyboardHelp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setShowKeyboardHelp(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg mx-4 rounded-2xl border border-cyan-400/20 bg-slate-900/95 p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-lg font-bold text-white">Keyboard Shortcuts</h3>
                  </div>
                  <button
                    onClick={() => setShowKeyboardHelp(false)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    âœ•
                  </button>
                </div>
                <div className="space-y-2">
                  {KEYBOARD_SHORTCUTS_HELP.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/50"
                    >
                      <span className="text-sm text-slate-300">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, idx) => (
                          <React.Fragment key={idx}>
                            {idx > 0 && <span className="text-slate-500 mx-1">+</span>}
                            <kbd className="px-2 py-1 text-xs font-mono font-semibold text-cyan-300 bg-slate-900 border border-cyan-400/30 rounded shadow-sm">
                              {key}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-400 text-center">
                  Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded">?</kbd> anytime to toggle this help
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <PortfolioSummary stocks={filteredStocks} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-4 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[26px] border border-cyan-400/10 bg-[#07111f]/85 backdrop-blur-xl p-4 md:p-5 shadow-[0_18px_70px_rgba(0,0,0,0.35)]"
            >
                <div className="grid gap-3 xl:grid-cols-[1.35fr_auto_auto_auto_auto_auto] xl:items-center">
                <div className="relative min-w-0">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-300" size={17} />
                  <input
                    ref={searchInputRef}
                    type="search"
                    placeholder="Search a symbol, company, or keyword (press /)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 rounded-2xl border border-cyan-400/12 bg-[#06101e] text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-400/15"
                  />
                </div>

                {}
                <button
                  onClick={() => setShowOnlyWithNews(!showOnlyWithNews)}
                  className={`h-12 px-4 rounded-2xl border font-semibold flex items-center justify-center gap-2 transition-colors ${
                    showOnlyWithNews
                      ? 'border-cyan-400/40 bg-cyan-400/20 text-cyan-100'
                      : 'border-white/10 bg-white/5 text-slate-200 hover:border-cyan-400/30 hover:bg-cyan-400/10'
                  }`}
                  title="Show only stocks with news (press n)"
                >
                  <Newspaper size={17} />
                  News Only
                </button>

                <button
                  onClick={() => setShowFilterModal(true)}
                  className="h-12 px-4 rounded-2xl border border-cyan-400/15 bg-cyan-400/10 text-cyan-100 font-semibold flex items-center justify-center gap-2 hover:bg-cyan-400/15 transition-colors"
                >
                  <Filter size={17} />
                  Filters
                </button>

                {}
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="h-12 px-4 rounded-2xl border border-white/10 bg-white/5 text-slate-200 font-semibold flex items-center justify-center gap-2 hover:border-violet-400/30 hover:bg-violet-400/10 transition-colors"
                    title="Export watchlist (Ctrl+E)"
                  >
                    <Download size={17} />
                    Export
                  </button>
                  <AnimatePresence>
                    {showExportMenu && (
                      <ExportMenu
                        onExportCSV={() => {
                          exportToCSV(filteredStocks, newsData);
                          setShowExportMenu(false);
                        }}
                        onExportJSON={() => {
                          const dataStr = JSON.stringify(filteredStocks, null, 2);
                          const dataBlob = new Blob([dataStr], { type: 'application/json' });
                          const url = URL.createObjectURL(dataBlob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `watchlist_${new Date().toISOString().split('T')[0]}.json`;
                          link.click();
                          setShowExportMenu(false);
                        }}
                        onClose={() => setShowExportMenu(false)}
                      />
                    )}
                  </AnimatePresence>
                </div>

                {}
                <button
                  onClick={toggleViewMode}
                  className="h-12 px-4 rounded-2xl border border-white/10 bg-white/5 text-slate-200 font-semibold flex items-center justify-center gap-2 hover:border-sky-400/30 hover:bg-sky-400/10 transition-colors"
                  title={`Switch to ${viewMode === 'compact' ? 'expanded' : 'compact'} view (press c)`}
                >
                  {viewMode === 'compact' ? <Maximize2 size={17} /> : <Minimize2 size={17} />}
                  {viewMode === 'compact' ? 'Expand' : 'Compact'}
                </button>

                <div className="relative group">
                  <button className="h-12 px-4 rounded-2xl border border-white/10 bg-white/5 text-slate-200 font-semibold flex items-center justify-center gap-2 hover:border-sky-400/30 hover:bg-sky-400/10 transition-colors">
                    <Eye size={17} />
                    Columns
                  </button>

                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      whileHover={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-700/80 bg-[#08111f]/95 p-2 shadow-2xl z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all"
                    >
                      {Object.entries(columnVisibility).map(([column, visible]) => (
                        <label
                          key={column}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 cursor-pointer text-sm text-slate-300 hover:text-slate-100 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={visible}
                            onChange={() => toggleColumnVisibility(column)}
                            className="w-4 h-4 rounded bg-slate-700 border-slate-600 cursor-pointer"
                          />
                          <span className="capitalize">{column}</span>
                        </label>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 overflow-x-auto pb-1">
                <div className="flex gap-2">
                  {FILTER_TABS.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
                          activeTab === tab.id
                            ? 'bg-cyan-400/15 border-cyan-300/35 text-white shadow-[0_0_0_1px_rgba(34,211,238,0.12)]'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:border-cyan-400/25 hover:bg-cyan-400/8'
                        }`}
                      >
                        {Icon && <Icon size={15} />}
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-slate-400">Sort:</span>
                  <select
                    value={sortType}
                    onChange={(e) => setSortType(e.target.value)}
                    className="h-9 px-3 pr-8 rounded-xl border border-slate-600/50 bg-slate-800/50 text-xs text-slate-200 outline-none hover:border-cyan-400/30 focus:border-cyan-400/50 transition-colors cursor-pointer"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.icon} {option.label} {option.new ? 'âœ¨' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>

            <TradingWatchlistGrid
              stocks={filteredStocks}
              onSelectStock={setSelectedStock}
              onAddAlert={handleAddAlert}
              onRemoveStock={handleRemoveStock}
              selectedStockId={selectedStock?.id}
            />
          </div>

          <div className="min-w-0 xl:sticky xl:top-4 xl:self-start">
            <AnimatePresence>
              {selectedStock && (
                <StockDetailsPanel
                  stock={selectedStock}
                  onClose={() => setSelectedStock(null)}
                  onAddAlert={handleAddAlert}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AlertsPanel alerts={alerts} />

      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApplyFilters={setFilters}
      />
    </div>
  );
}
