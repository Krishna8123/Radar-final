import { useEffect, useMemo, useState, useRef, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  TrendingUp, 
  Activity, 
  ChevronLeft, 
  ChevronRight, 
  Zap, 
  Target, 
  ShieldAlert, 
  BarChart3,
  Flame,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  LayoutPanelLeft
} from "lucide-react";
import Header from "./stockScreener/Header.jsx";
import FiltersPanel from "./stockScreener/FiltersPanel.jsx";
import StockCardGrid from "./stockScreener/StockCardGrid.jsx";
import TerminalLogs from "./stockScreener/TerminalLogs.jsx";
import StockDetailsPanel from "../watchlist/StockDetailsPanel.jsx";
import "./stockScreener/StockScreener.css";
import { runScreenerScan } from "../../api/screenerApi";

const STORAGE_KEY = "radar_saved_screener_dashboards";
const INITIAL_ROWS = 12;

const SIGNAL_TABS = [
  { id: "all", label: "All Signals", icon: <LayoutPanelLeft className="h-4 w-4" /> },
  { id: "momentum", label: "Momentum", icon: <Zap className="h-4 w-4" /> },
  { id: "breakout", label: "Breakout", icon: <Flame className="h-4 w-4" /> },
  { id: "pullback", label: "Pullback", icon: <RefreshCw className="h-4 w-4" /> },
  { id: "fakeout", label: "Fakeout", icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> },
];

const DEFAULT_FILTERS = {
  search: "",
  sector: "All",
  minRsi: 0,
  maxRsi: 100,
  minPrice: "",
  maxPrice: "",
  minVolume: "",
  rvol: "",
  gapMin: 0,
  sma50: false,
  sma200: false,
  macdCross: false,
};



export default function EnhancedStockScreener({ onStockDeepAnalysis }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allStocks, setAllStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const contentRef = useRef(null);

  // Live scan via screener API
  const doScan = async (activeFilters) => {
    setIsLoading(true);
    try {
      const data = await runScreenerScan(activeFilters);
      const rows = data?.results ?? data?.stocks ?? (Array.isArray(data) ? data : []);
      const normalized = rows.map((s, i) => ({
        symbol: String(s.symbol || '').replace(/\.(NS|BO)$/i, ''),
        name: s.name || s.companyName || '',
        sector: s.sector || 'Equity',
        price: Number(s.price ?? 0),
        change: Number(s.changePercent ?? s.change ?? 0),
        changePercent: Number(s.changePercent ?? 0),
        percent: Number(s.changePercent ?? 0),
        volume: Number(s.volume ?? 0),
        confidence: Number(s.confidence ?? s.score ?? 0),
        entry: Number(s.entry ?? s.price ?? 0),
        target: Number(s.target ?? 0),
        sl: Number(s.sl ?? 0),
        signalType: s.signalType || 'N/A',
        history: s.history || [],
        rvol: Number(s.volumeRatio ?? s.rvol ?? 0),
        rsi: Number(s.rsi ?? 0),
        gap: Number(s.gap ?? 0),
        sma50: Boolean(s.sma50 ?? false),
        sma200: Boolean(s.sma200 ?? false),
        macdCross: Boolean(s.macdCross ?? false),
        vwap: Number(s.vwap ?? s.price ?? 0),
        high52w: Number(s.high52w ?? s.yearHigh ?? 0),
        low52w: Number(s.low52w ?? s.yearLow ?? 0),
      }));
      setAllStocks(normalized);
      setFilteredStocks(normalized);
      setVisibleCount(INITIAL_ROWS);
    } catch (err) {
      console.warn('EnhancedStockScreener scan failed:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { doScan(appliedFilters); }, [appliedFilters, activeTab]);

  const visibleRows = useMemo(() => filteredStocks.slice(0, visibleCount), [filteredStocks, visibleCount]);

  const handleScroll = (e) => {
    if (loadingMore || visibleCount >= filteredStocks.length) return;
    
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      setLoadingMore(true);
      setTimeout(() => {
        setVisibleCount(prev => Math.min(prev + 12, filteredStocks.length));
        setLoadingMore(false);
      }, 600);
    }
  };

  const handleActivateScan = () => {
    setIsLoading(true);
    setAppliedFilters(filters);
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  };

  const handleExport = () => {
    alert("Exporting scanner results to Excel... Check your downloads area.");
  };

  const handleSave = () => {
    alert("Screener configuration saved to your Trader Dashboard profile.");
  };

  const handleNewScreener = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setSelectedStock(null);
  };

  return (
    <div className={`relative screener-v2-layout overflow-hidden bg-gradient-to-br from-[#020617] via-[#020617] to-[#0f172a] text-[#dce9ff] ${sidebarCollapsed ? "sidebar-closed" : ""}`}>
      {}
      <div className="pointer-events-none absolute -left-24 -top-20 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-8 top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] left-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      {}
      <aside className="screener-v2-sidebar">
        <div className="sidebar-header">
           <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-blue-500" />
            {!sidebarCollapsed && <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Scanner Params</span>}
           </div>
           <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="collapse-btn">
             {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
           </button>
        </div>
        
        {!sidebarCollapsed && (
          <div className="sidebar-content custom-scrollbar">
            <FiltersPanel
              filters={filters}
              setFilters={setFilters}
              onApply={handleActivateScan}
              onReset={() => {
                setFilters(DEFAULT_FILTERS);
                setAppliedFilters(DEFAULT_FILTERS);
              }}
              isOpen={true}
            />
          </div>
        )}
      </aside>

      {}
      <main className="screener-v2-main">
        {}
        <div className="intelligence-bar">
          <div className="market-status-group">
            <div className="market-stat-item">
              <span className="stat-label">NIFTY 50</span>
              <div className="flex items-center gap-1.5">
                <span className="stat-value text-green-500">22,453.10</span>
                <TrendingUp size={12} className="text-green-500" />
              </div>
            </div>
            <div className="divider" />
            <div className="market-stat-item">
              <span className="stat-label">Sentiment</span>
              <div className="flex items-center gap-1.5">
                <span className="stat-value text-amber-400">GREED</span>
                <Flame size={12} className="text-amber-400" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative group hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Universal Scan..." 
                  className="search-lite"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
             </div>
             <Header onSave={handleSave} onExport={handleExport} onNewScreener={handleNewScreener} />
          </div>
        </div>

        {}
        <div className="signal-tabs-container">
          <div className="signal-tabs">
            {SIGNAL_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`signal-tab ${activeTab === tab.id ? "active" : ""}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {activeTab === tab.id && <motion.div layoutId="activeTab" className="tab-indicator" />}
              </button>
            ))}
          </div>
          <div className="pool-count">
            <span className="ml-2 text-gray-500">{filteredStocks.length} ASSETS SCANNING</span>
          </div>
        </div>

        {}
        <div 
          className="content-area custom-scrollbar" 
          onScroll={handleScroll}
          ref={contentRef}
        >
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-32">
               <div className="loading-orbit">
                  <div className="orbit-dot" />
               </div>
              <span className="mt-8 text-[11px] font-bold text-blue-500/50 uppercase tracking-[0.3em]">Calibrating Trader Dashboard</span>
            </div>
          ) : (
            <>
            <StockCardGrid 
                stocks={visibleRows} 
                onSelect={(symbol) => onStockDeepAnalysis(symbol)}
                selectedSymbol={selectedStock?.symbol}
                onDeepResearch={onStockDeepAnalysis}
              />
              {loadingMore && (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                </div>
              )}
            </>
          )}

          {}
          <AnimatePresence>
            {selectedStock && (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 h-full w-[400px] z-[1000] p-4 bg-[#08162b]/95 backdrop-blur-xl border-l border-white/10 shadow-[-20px_0_40px_rgba(0,0,0,0.5)]"
              >
                <StockDetailsPanel 
                  stock={selectedStock} 
                  onClose={() => setSelectedStock(null)} 
                  mode="research"
                  onResearchAction={(action) => alert(`Action "${action}" triggered for ${selectedStock.symbol}`)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {}
        <div className="actionable-feed-container">
           <div className="feed-header">
              <div className="flex items-center gap-2">
                <div className="pulse-dot" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Actionable Intelligence</span>
              </div>
              <span className="text-[10px] text-gray-500 font-bold uppercase">Real-time Scanner v2.0</span>
           </div>
           <TerminalLogs mode="actionable" scanTimestamp={appliedFilters} />
        </div>
      </main>
    </div>
  );
}
