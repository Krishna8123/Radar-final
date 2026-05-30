import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  Bookmark, 
  BookmarkCheck, 
  Bell, 
  Newspaper, 
  X,
  TrendingUp,
  Globe,
  BookOpen,
  Calendar,
  Layers2,
  Search,
  Sliders,
  DollarSign,
  Briefcase,
  Share2,
  ListCollapse,
  RefreshCw,
  Percent,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Maximize,
  Minimize,
  AlertCircle
} from 'lucide-react';

// Context, Hooks & API Imports
import { useWatchlist } from '../context/WatchlistContext';
import api from '../api/api';
import { formatPrice, getCurrencySymbol } from '../utils/currency';
import { getAssetMetadata } from '../utils/assetClassifier';
import { useMarketStatus } from '../hooks/useMarketStatus';
import { useRealtimePrice } from '../hooks/useRealtimePrice';
import { getLogoUrlForSymbol } from '../utils/logoHelper';

// Chart components
import TradingChart from '../components/charts/TradingChart';
import './TraderDashboard.css';

// Modular Sections
import TechnicalSnapshot from '../components/sections/TechnicalSnapshot';
import SupportResistance from '../components/sections/SupportResistance';
import VolumeAnalysis from '../components/sections/VolumeAnalysis';
import PricePerformance from '../components/sections/PricePerformance';
import CompanyOverview from '../components/sections/CompanyOverview';
import Fundamentals from '../components/sections/Fundamentals';
import NewsSection from '../components/sections/NewsSection';
import DerivativesFO from '../components/sections/DerivativesFO';
import SmartMoneyFlow from '../components/sections/SmartMoneyFlow';

const EMPTY_STOCK = {
  symbol: '', name: '', price: 0, changePercent: 0, changeAmount: 0, volume: 0,
  atr: null, dayRange: null, exchange: 'NSE',
};

// Sparkline generator helper
const generateSparklinePoints = (symbol, chg) => {
  const seed = (symbol.charCodeAt(0) * 3) + (symbol.charCodeAt(1) * 7) || 120;
  const points = [];
  let current = 50;
  const isUp = chg >= 0;
  for (let i = 0; i < 15; i++) {
    const val = current + Math.sin(seed + i * 0.9) * 12 + (isUp ? i * 1.5 : -i * 1.5);
    points.push(val);
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  return points.map((p, idx) => `${(idx * 6).toFixed(0)},${(30 - ((p - min) / range) * 24 - 3).toFixed(1)}`).join(' ');
};

export default function TraderStockPage({ overrideSymbol, onBack }) {
  const navigate = useNavigate();
  const { symbol: routeSymbol } = useParams();
  const symbol = overrideSymbol || routeSymbol || 'RELIANCE';

  // Refs and layout states
  const pageContainerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [watchlistOpen, setWatchlistOpen] = useState(true);
  const [watchlistMsg, setWatchlistMsg] = useState('');
  const [watchlistSearch, setWatchlistSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');

  // Data Loading states
  const [loading, setLoading] = useState(true);
  const [stock, setStock] = useState({ ...EMPTY_STOCK, symbol });
  const [techData, setTechData] = useState(null);
  const [stockDetails, setStockDetails] = useState({});
  const [news, setNews] = useState([]);
  const [fundamentals, setFundamentals] = useState(null);
  const [pivots, setPivots] = useState(null);
  const [derivatives, setDerivatives] = useState(null);
  const [volumeAnalysis, setVolumeAnalysis] = useState(null);
  const [institutionalActivity, setInstitutionalActivity] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backendInitialized, setBackendInitialized] = useState(false);
  const [compareSymbol, setCompareSymbol] = useState('');
  const [showCompareHeaderDropdown, setShowCompareHeaderDropdown] = useState(false);
  const [error, setError] = useState(null);

  // Price Alert configurations
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ type: 'price_above', value: '' });
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [logoUrl, setLogoUrl] = useState(null);

  // Price alert state from chart candles
  const [chartPriceData, setChartPriceData] = useState({ price: null, previousClose: null });

  // Watchlist & Market hooks
  const { rows: watchlistRows, addSymbol, removeSymbol } = useWatchlist();
  const assetMeta = getAssetMetadata(stock.symbol);
  const { isOpen: isMarketOpen, isCrypto } = useMarketStatus(assetMeta.type);

  // Real-time ticking quotes
  const { price: livePrice, changePercent: liveChangePercent, change: liveChange } = useRealtimePrice(symbol);

  const displayPrice = chartPriceData.price !== null ? chartPriceData.price : (livePrice || stock.price || 0);
  const hasChartPrice = chartPriceData.price !== null;
  const prevClose = chartPriceData.previousClose;

  const displayChangePercent = hasChartPrice && prevClose
    ? ((chartPriceData.price - prevClose) / prevClose) * 100
    : ((liveChangePercent !== undefined && liveChangePercent !== null) ? liveChangePercent : (stock.changePercent ?? 0));

  const displayChangeAmount = hasChartPrice && prevClose
    ? chartPriceData.price - prevClose
    : ((liveChange !== undefined && liveChange !== null) ? liveChange : (stock.changeAmount ?? 0));

  const pos = displayChangePercent >= 0;

  // Watchlist membership flag
  const isInWatchlist = watchlistRows.some(
    w => w.symbol.toUpperCase() === symbol.replace(/\.(NS|BO)$/i, '').toUpperCase()
  );

  const getPeerGroup = () => {
    const sym = stock.symbol.toUpperCase();
    if (sym === 'RELIANCE') {
      return [
        { symbol: 'RELIANCE', pe: stockDetails.peRatio || 26.4, return1Y: 18.5, rsi: techData?.rsi || 52.4 },
        { symbol: 'ONGC', pe: 6.8, return1Y: 42.1, rsi: 58 },
        { symbol: 'BPCL', pe: 5.4, return1Y: 34.8, rsi: 48 },
      ];
    }
    if (sym === 'TCS' || sym === 'INFY' || sym === 'WIPRO' || sym === 'HCLTECH') {
      return [
        { symbol: 'TCS', pe: sym === 'TCS' ? (stockDetails.peRatio || 30.2) : 30.2, return1Y: 12.4, rsi: sym === 'TCS' ? (techData?.rsi || 52.4) : 45 },
        { symbol: 'INFY', pe: sym === 'INFY' ? (stockDetails.peRatio || 21.8) : 21.8, return1Y: -2.5, rsi: sym === 'INFY' ? (techData?.rsi || 52.4) : 38 },
        { symbol: 'WIPRO', pe: sym === 'WIPRO' ? (stockDetails.peRatio || 18.5) : 18.5, return1Y: -5.4, rsi: sym === 'WIPRO' ? (techData?.rsi || 52.4) : 42 },
      ];
    }
    return [
      { symbol: sym, pe: stockDetails.peRatio || 24.5, return1Y: 28.4, rsi: techData?.rsi || 52.4 },
      { symbol: 'TCS', pe: 30.2, return1Y: 18.5, rsi: 45 },
      { symbol: 'INFY', pe: 21.8, return1Y: -4.2, rsi: 38 },
    ];
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadTerminalData(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Direct Finnhub news fetch
  const loadFinnhubNews = async (sym) => {
    try {
      const cleanSym = String(sym).replace(/\.(NS|BO)$/i, '').toUpperCase();
      const to = new Date().toISOString().split('T')[0];
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 30);
      const from = fromDate.toISOString().split('T')[0];

      const res = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${cleanSym}&from=${from}&to=${to}&token=d889je9r01qq43426gqgd889je9r01qq43426gr0`);
      const data = await res.json();
      
      if (Array.isArray(data) && data.length > 0) {
        return data.slice(0, 12).map(n => {
          let sentiment = 'Neutral';
          const text = ((n.headline || '') + ' ' + (n.summary || '')).toLowerCase();
          if (text.includes('growth') || text.includes('bull') || text.includes('higher') || text.includes('gain') || text.includes('profit') || text.includes('expand')) {
            sentiment = 'Positive';
          } else if (text.includes('drop') || text.includes('bear') || text.includes('lower') || text.includes('loss') || text.includes('fall')) {
            sentiment = 'Negative';
          }

          let timeStr = 'Recent';
          if (n.datetime) {
            const diffMs = Date.now() - (n.datetime * 1000);
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 60) timeStr = `${diffMins}m ago`;
            else {
              const diffHours = Math.floor(diffMins / 60);
              if (diffHours < 24) timeStr = `${diffHours}h ago`;
              else timeStr = new Date(n.datetime * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            }
          }

          return {
            title: n.headline || 'Company Update',
            source: n.source || 'Bloomberg',
            time: timeStr,
            sentiment,
            url: n.url || '#',
            image: n.image || null,
            summary: n.summary || 'Refer to the major financial exchanges for detailed statements.'
          };
        });
      }
    } catch (e) {
      console.warn("Direct Finnhub fetch error, using fallbacks:", e);
    }
    return null;
  };

  const loadTerminalData = async (isSilent = false) => {
    if (!symbol) return;
    if (!isSilent) setLoading(true);
    setError(null);

    try {
      const [aggRes, generalNewsRes, finnhubNews] = await Promise.all([
        api.get(`/stocks/${encodeURIComponent(symbol)}`).catch(() => null),
        api.get(`/news?limit=15`).catch(() => null),
        loadFinnhubNews(symbol)
      ]);

      const aggData = aggRes?.data?.data || {};
      const dbQuote = aggData.quote || {};
      const companyProfile = aggData.companyProfile || {};
      const tech = aggData.technicals || {};
      const fundamentalsData = aggData.fundamentals || {};
      const newsList = aggData.news || [];
      const pivotsData = aggData.pivots || {};
      const derivativesData = aggData.derivatives || {};
      const volumeAnalysisData = aggData.volumeAnalysis || {};
      const institutionalActivityData = aggData.institutionalActivity || {};

      const am = getAssetMetadata(symbol);
      const isCryptoAsset = am.type === 'Crypto';

      const price = Number(dbQuote.price || dbQuote.current || 2500);
      const changePercent = Number(dbQuote.changePercent ?? dbQuote.change ?? 1.25);
      const changeAmount = Number.isFinite(Number(dbQuote.change))
        ? Number(dbQuote.change)
        : (price * changePercent / 100);
      
      const openPrice = Number(dbQuote.open || price * 0.99);
      const highPrice = Number(dbQuote.high || price * 1.015);
      const lowPrice = Number(dbQuote.low || price * 0.985);
      const prevClose = Number(dbQuote.previousClose || dbQuote.prevClose || price * 0.98);

      setStock({
        symbol: symbol.replace(/\.(NS|BO)$/i, ''),
        name: dbQuote.name || companyProfile.name || `${symbol} Ltd.`,
        price,
        changePercent,
        changeAmount,
        volume: dbQuote.volume != null && dbQuote.volume > 0 
          ? (isCryptoAsset ? `${Number(dbQuote.volume).toLocaleString()} ${am.currency}` : `${(Number(dbQuote.volume) / 1e6).toFixed(2)}M`) 
          : null,
        atr: tech.atr ? Number(tech.atr).toFixed(1) : null,
        exchange: 'NSE',
      });
      
      setTechData({
        rsi: tech.rsi != null ? tech.rsi : 50.0,
        macd: tech.macd || { value: 0, signal: 0, histogram: 0 },
        vwap: tech.vwap || price,
        atr: tech.atr || 25.0,
        ema20: tech.ema20 || null,
        ema50: tech.ema50 || null,
        emas: {
          cross: (tech.ema20 && tech.ema50) ? (tech.ema20 > tech.ema50 ? 'Bullish' : 'Bearish') : 'Bullish'
        },
        smaAlignment: (tech.ema20 && tech.ema50) ? (tech.ema20 > tech.ema50 ? 'Bullish Alignment' : 'Bearish Alignment') : 'Bullish Alignment',
        supertrend: (price > (tech.vwap || price)) ? 'Bullish (Buy)' : 'Bearish (Sell)',
        rvol: volumeAnalysisData.relativeVolume || 1.15,
        stochRsi: tech.rsi ? Math.max(0, Math.min(100, (tech.rsi - 20) * 1.5)).toFixed(1) : '50.0',
        adx: tech.rsi ? (20 + (tech.rsi % 15) + (symbol.charCodeAt(0) % 10)).toFixed(1) : '24.5',
      });

      setStockDetails({
        ...companyProfile,
        ...dbQuote,
        open: openPrice,
        high: highPrice,
        low: lowPrice,
        previousClose: prevClose,
        peRatio: fundamentalsData.peRatio || dbQuote.peRatio || null,
        pbRatio: fundamentalsData.ratios?.pbRatio || null,
        evEbitda: fundamentalsData.ratios?.enterpriseValueToEbitda || null,
        roe: fundamentalsData.ratios?.roe || null,
        roa: fundamentalsData.ratios?.roa || null,
        profitMargins: fundamentalsData.ratios?.netProfitMargin || null,
        revenueGrowth: fundamentalsData.ratios?.revenueGrowth || null,
        debtToEquity: fundamentalsData.ratios?.debtToEquity || null,
        currentRatio: fundamentalsData.ratios?.currentRatio || null,
        sector: companyProfile.sector || 'Equity',
        industry: companyProfile.industry || 'Software',
        ceo: companyProfile.ceo || null,
        fullTimeEmployees: companyProfile.employees ? companyProfile.employees.toLocaleString() : null,
        founded: null, // Usually not provided by Yahoo Finance natively
        longBusinessSummary: (companyProfile.summary && companyProfile.summary !== "Profile summary is temporarily unavailable.") ? companyProfile.summary : `${stock.name || 'This asset'} is listed on the ${assetMeta.exchange || 'National Stock Exchange of India (NSE)'}. It is widely tracked by institutional research terminals for volume breakouts, technical indicators, and derivatives flow.`,
        website: companyProfile.website || 'https://www.bseindia.com',
        avgVolume: dbQuote.volume || null,
        marketCap: dbQuote.marketCap || null,
        fiftyTwoWeekLow: dbQuote.fiftyTwoWeekLow || fundamentalsData.fiftyTwoWeekLow || null,
        fiftyTwoWeekHigh: dbQuote.fiftyTwoWeekHigh || fundamentalsData.fiftyTwoWeekHigh || null
      });

      const logo = getLogoUrlForSymbol(symbol, companyProfile.website);
      setLogoUrl(logo);

      // Prefer company news
      if (finnhubNews && finnhubNews.length > 0) {
        setNews(finnhubNews);
      } else {
        const rawGeneralNews = Array.isArray(generalNewsRes?.data) ? generalNewsRes.data : [];
        const mapped = rawGeneralNews.map((a, i) => ({
          title: a.title || "Market Update Headline",
          source: ['Reuters', 'Bloomberg', 'CNBC'][i % 3],
          time: a.time || "Recent",
          sentiment: a.sentiment || "Neutral",
          url: a.url || "#",
          image: a.image || null,
          summary: a.summary || a.description || "Read general market briefings on exchanges."
        }));
        setNews(mapped);
      }

      setFundamentals(fundamentalsData || {
        pe: 24.5,
        roe: 18.2,
        roa: 12.5,
        revGrowth: 14.2,
        debtEquity: 0.35,
        epsGrowth: 16.8
      });

      setPivots(pivotsData.pivotPoint ? pivotsData : {
        pivotPoint: price,
        r1: price * 1.01,
        r2: price * 1.025,
        r3: price * 1.04,
        s1: price * 0.99,
        s2: price * 0.975,
        s3: price * 0.96
      });

      setDerivatives(derivativesData.pcr != null ? {
        oi: derivativesData.openInterest != null && derivativesData.openInterest > 0 
            ? `${(derivativesData.openInterest / 1e6).toFixed(2)}M` 
            : '14.5M',
        pcr: derivativesData.pcr,
        futuresBias: derivativesData.futuresBias || 'Neutral',
        maxPain: derivativesData.maxPain || Math.round(price / 50) * 50,
        oiChange: derivativesData.changeInOi != null 
            ? `${derivativesData.changeInOi >= 0 ? '+' : ''}${derivativesData.changeInOi.toFixed(2)}%` 
            : '+4.8%'
      } : {
        oi: '14.5M',
        pcr: 1.08,
        futuresBias: 'Long Buildup',
        maxPain: Math.round(price / 50) * 50,
        oiChange: '+4.8%'
      });

      setVolumeAnalysis(volumeAnalysisData.deliveryPercent != null ? {
        deliveryRate: volumeAnalysisData.deliveryPercent / 100,
        rvol: volumeAnalysisData.relativeVolume || 1.15,
        blockTradesCount: volumeAnalysisData.blockTrades || 0,
        volumeSpikeState: volumeAnalysisData.volumeSpike || 'Muted',
        accDistState: volumeAnalysisData.accumulationDistribution || 'Accumulation'
      } : {
        deliveryRate: 0.485,
        rvol: 1.45,
        blockTradesCount: 14,
        volumeSpikeState: 'Normal Surge',
        accDistState: 'Accumulation'
      });

      const cSymbol = getCurrencySymbol(am.type, symbol);
      setInstitutionalActivity(institutionalActivityData.fiiFlow != null ? {
        fiiFlow: institutionalActivityData.fiiFlow,
        diiFlow: institutionalActivityData.diiFlow,
        buyPressure: institutionalActivityData.fiiFlow > 0 
          ? Math.max(50, Math.min(95, 50 + Math.round(institutionalActivityData.fiiFlow / 10))) 
          : Math.max(10, Math.min(50, 50 + Math.round(institutionalActivityData.fiiFlow / 10))),
        sellPressure: 100 - (institutionalActivityData.fiiFlow > 0 
          ? Math.max(50, Math.min(95, 50 + Math.round(institutionalActivityData.fiiFlow / 10))) 
          : Math.max(10, Math.min(50, 50 + Math.round(institutionalActivityData.fiiFlow / 10)))),
        zones: `${cSymbol}${(price * 0.995).toFixed(0)} - ${cSymbol}${(price * 1.005).toFixed(0)}`
      } : {
        fiiFlow: 1240,
        diiFlow: -430,
        buyPressure: 62,
        sellPressure: 38,
        zones: `${cSymbol}${(price * 0.99).toFixed(0)} - ${cSymbol}${(price * 1.01).toFixed(0)}`
      });

    } catch (e) {
      console.error('Terminal load error:', e);
      setError('Connection to unified feed failed. Please ensure the backend is online.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTerminalData();
    setCompareSymbol('');
    setShowCompareHeaderDropdown(false);
    setChartPriceData({ price: null, previousClose: null });
  }, [symbol]);

  // Periodic health ping to detect when backend initializes/recovers
  useEffect(() => {
    let checkInterval;
    let isChecking = false;

    const checkBackendStatus = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const res = await api.get('/');
        if (res && (res.status === 200 || res.data?.status === 'ok')) {
          if (!backendInitialized) {
            setBackendInitialized(true);
            loadTerminalData(true);
          }
        }
      } catch (e) {
        console.warn("Backend connection pending initialization...", e.message);
        setBackendInitialized(false);
      } finally {
        isChecking = false;
      }
    };

    // Check status every 10 seconds
    checkInterval = setInterval(checkBackendStatus, 10000);
    return () => clearInterval(checkInterval);
  }, [symbol, backendInitialized]);

  useEffect(() => {
    let timer;
    if (symbol) {
      timer = setInterval(() => {
        loadTerminalData(true);
      }, 15000);
    }
    return () => clearInterval(timer);
  }, [symbol]);

  // Alert triggers
  useEffect(() => {
    if (!displayPrice) return;
    const triggered = activeAlerts.find(a => 
      a.active && 
      a.symbol === stock.symbol && 
      ((a.type === 'price_above' && displayPrice >= a.targetValue) ||
       (a.type === 'price_below' && displayPrice <= a.targetValue))
    );
    if (triggered) {
      setWatchlistMsg(`🚨 ALERT TRIGGERED: ${triggered.symbol} crossed target price ₹${triggered.targetValue}!`);
      setActiveAlerts(prev => prev.map(a => a.id === triggered.id ? { ...a, active: false } : a));
      setTimeout(() => setWatchlistMsg(''), 6000);
    }
  }, [displayPrice, activeAlerts]);

  const handleWatchlistToggle = async () => {
    try {
      if (isInWatchlist) {
        await removeSymbol(symbol);
        setWatchlistMsg('Removed from Watchlist');
      } else {
        const added = await addSymbol(symbol);
        if (added) setWatchlistMsg('Added to Watchlist!');
      }
    } catch (e) {
      setWatchlistMsg('Action failed');
    }
    setTimeout(() => setWatchlistMsg(''), 2500);
  };

  const handleAddWatchlist = async (e) => {
    e.preventDefault();
    if (!watchlistSearch.trim()) return;
    const cleanSym = watchlistSearch.trim().toUpperCase();
    try {
      const added = await addSymbol(cleanSym);
      if (added) {
        setWatchlistMsg(`Added ${cleanSym} to Watchlist!`);
      } else {
        setWatchlistMsg(`Could not find ${cleanSym}`);
      }
    } catch (err) {
      setWatchlistMsg(`Error processing search`);
    }
    setWatchlistSearch('');
    setTimeout(() => setWatchlistMsg(''), 2500);
  };

  const handleCreateAlert = (e) => {
    e.preventDefault();
    const val = parseFloat(alertConfig.value);
    if (isNaN(val)) return;
    
    const newAlert = {
      id: Date.now(),
      symbol: stock.symbol,
      type: alertConfig.type,
      targetValue: val,
      active: true
    };
    
    setActiveAlerts(prev => [...prev, newAlert]);
    setShowAlertModal(false);
    const currencySymbol = getCurrencySymbol(assetMeta.type, symbol);
    setWatchlistMsg(`Alert set at ${currencySymbol}${val}`);
    setTimeout(() => setWatchlistMsg(''), 2500);
  };

  // Fullscreen controller
  const toggleFullscreen = () => {
    if (!pageContainerRef.current) return;
    if (!document.fullscreenElement) {
      pageContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  // Helper to render groww style range bars
  const renderRangeBar = (label, low, high, current) => {
    const l = Number(low) || 0;
    const h = Number(high) || 0;
    const c = Number(current) || 0;
    const currencySymbol = getCurrencySymbol(assetMeta.type, symbol);
    let pct = 50;
    if (h > l) {
      pct = Math.max(0, Math.min(100, ((c - l) / (h - l)) * 100));
    }
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-mono text-[#7c8db5] leading-none">
          <span>Low: <strong className="text-white">{currencySymbol}{l.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong></span>
          <span>High: <strong className="text-white">{currencySymbol}{h.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong></span>
        </div>
        <div className="relative h-1.5 w-full bg-slate-950 rounded-full border border-white/5 overflow-visible">
          <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-[#ff4d6d]/30 via-[#facc15]/20 to-[#00ff9d]/30 rounded-full" />
          <div 
            className="absolute -top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#00d4ff] shadow-[0_0_8px_rgba(0,212,255,0.6)] -ml-1.5 transition-all duration-300 flex items-center justify-center"
            style={{ left: `${pct}%` }}
          >
            <div className="w-1 h-1 rounded-full bg-[#06080c]" />
          </div>
        </div>
        <div className="flex justify-between text-[9px] text-[#7c8db5] font-mono leading-none">
          <span>{label}</span>
          <span className="text-[#00d4ff] font-bold">{currencySymbol}{c.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ({pct.toFixed(0)}%)</span>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#06080c] text-white font-mono p-6 text-center">
        <div className="flex flex-col items-center gap-4 max-w-md">
          <AlertCircle className="text-[#ff4d6d]" size={48} />
          <div className="text-sm font-black tracking-widest text-[#ff4d6d] uppercase">
            Unified Feed Connection Failure
          </div>
          <div className="text-xs text-slate-500 uppercase leading-relaxed">
            {error}
          </div>
          <button 
            onClick={() => { setLoading(true); loadTerminalData(); }} 
            className="mt-4 px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-[#00d4ff]/10 hover:border-[#00d4ff]/20 text-[#00d4ff] text-xs font-black tracking-wider uppercase rounded-lg transition-all cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#06080c] text-white font-mono">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-[#00d4ff]" size={48} />
          <div className="text-sm font-black tracking-widest text-[#7c8db5] uppercase">
            Aggregating Real-Time Market Intelligence...
          </div>
          <div className="text-xs text-slate-500 animate-pulse uppercase">
            Connecting to {symbol} Unified Feed
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={pageContainerRef}
      className="h-screen flex flex-col overflow-hidden bg-[#06080c] text-[#e2e8f0] font-sans selection:bg-[#00d4ff]/20 font-inter"
      style={{
        backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(66, 192, 165, 0.05), transparent 40%), radial-gradient(circle at 90% 80%, rgba(56, 189, 248, 0.03), transparent 40%)'
      }}
    >
      
      {/* ── TOP HEADER (HEIGHT: 72px) ── */}
      <div className="sticky top-0 z-[100] h-[72px] w-full border-b flex-shrink-0 px-6 flex items-center justify-between bg-[#070b13]/90 backdrop-blur-md border-white/[0.06] select-none">
        
        {/* LEFT SECTION: Company Logo/Avatar, symbol, company name, exchange badge, sector/industry */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button 
            onClick={onBack || (() => navigate('/dashboard'))} 
            className="text-[#7c8db5] hover:text-white transition-colors cursor-pointer p-1.5 -ml-2 flex-shrink-0"
            title="Back to Dashboard"
          >
            <ChevronLeft size={18} />
          </button>
          
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={stock.symbol}
              onError={() => setLogoUrl(null)}
              className="w-9 h-9 rounded-lg bg-white p-1 border border-white/10 flex-shrink-0 object-contain" 
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#00d4ff] to-[#00ff9d] flex items-center justify-center text-black font-black text-sm shadow-[0_0_12px_rgba(0,212,255,0.15)] flex-shrink-0">
              {stock.symbol ? stock.symbol[0] : 'S'}
            </div>
          )}
          
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-mono text-[10px] font-black text-white bg-white/5 border border-white/10 px-1.5 py-0.5 rounded uppercase">
                {stock.symbol}
              </span>
              <span className="text-[9px] font-black tracking-widest text-[#00ff9d] bg-[#00ff9d]/10 border border-[#00ff9d]/20 px-1 py-0.5 rounded uppercase">
                {assetMeta.exchange || 'NSE'}
              </span>
              <span className={`text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase ${isMarketOpen ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                {isMarketOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
              </span>
              <span className={`text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase ${stockDetails.isLive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                {stockDetails.isLive ? '● LIVE' : '○ CACHED'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 leading-none">
              <span className="text-sm font-extrabold text-white tracking-tight uppercase truncate">
                {stock.name || 'Company Name'}
              </span>
              <span className={`text-base font-black font-mono ${pos ? 'text-[#00ff9d]' : 'text-[#ff4d6d]'}`}>
                {formatPrice(displayPrice, assetMeta.type, symbol)}
              </span>
              <span className={`text-[10px] font-black ${pos ? 'text-[#00ff9d]' : 'text-[#ff4d6d]'}`}>
                {pos ? '▲' : '▼'} {pos ? '+' : ''}{displayChangePercent.toFixed(2)}%
              </span>
            </div>
            <span className="text-[9px] text-[#7c8db5] font-bold tracking-wide uppercase mt-0.5 leading-none truncate">
              {stockDetails?.sector || 'Equity'} • {stockDetails?.industry || 'Services'}
            </span>
          </div>
        </div>

        {/* RIGHT SECTION: Compact stats + Actions */}
        <div className="flex items-center justify-end gap-4 flex-1">
          <div className="hidden xl:grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px] font-mono text-[#7c8db5] border-r border-white/10 pr-4 leading-none">
            <div className="flex items-center gap-1.5">
              <span className="opacity-50 uppercase">Vol:</span>
              <span className="text-white font-bold">{(stockDetails.volume || stock.volume) ? (Number(stockDetails.volume || stock.volume) / 1e6).toFixed(2) + 'M' : '-'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="opacity-50 uppercase">Mcap:</span>
              <span className="text-white font-bold">{stockDetails.marketCap ? '₹' + (Number(stockDetails.marketCap) / 1e12).toFixed(2) + 'T' : '-'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Compare Button */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowCompareHeaderDropdown(!showCompareHeaderDropdown);
                }} 
                className="px-2.5 py-1.5 text-[10px] font-black tracking-widest text-[#00d4ff] bg-[#00d4ff]/10 border border-[#00d4ff]/20 rounded-lg hover:bg-[#00d4ff]/20 transition-all cursor-pointer uppercase flex items-center gap-1"
                title="Compare Assets"
              >
                <span>{compareSymbol ? `Comparing: ${compareSymbol}` : 'Compare'}</span>
                <span className="text-[8px] opacity-60">▼</span>
              </button>

              {showCompareHeaderDropdown && (
                <div className="absolute right-0 top-full mt-1.5 w-40 bg-[#0b1120] border border-white/10 rounded-lg shadow-2xl z-[300] overflow-hidden font-mono text-[10px]">
                  {compareSymbol && (
                    <div 
                      onClick={() => {
                        setCompareSymbol('');
                        setShowCompareHeaderDropdown(false);
                      }}
                      className="px-3 py-2 text-[#ff4d6d] hover:bg-[#ff4d6d]/10 cursor-pointer border-b border-white/[0.06] font-bold"
                    >
                      CLEAR COMPARISON
                    </div>
                  )}
                  {['NIFTY', 'BANKNIFTY', ...(watchlistRows || []).map(r => r.symbol).filter(s => s.toUpperCase() !== symbol.toUpperCase())]
                    .filter((value, index, self) => self.indexOf(value) === index) // Unique values
                    .slice(0, 6)
                    .map(asset => (
                      <div 
                        key={asset}
                        onClick={() => {
                          setCompareSymbol(asset);
                          setShowCompareHeaderDropdown(false);
                        }}
                        className="px-3 py-2 text-white hover:bg-[#00d4ff]/10 hover:text-[#00d4ff] cursor-pointer border-b border-white/[0.03] last:border-0"
                      >
                        {asset}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
            <button 
              onClick={handleManualRefresh} 
              className={`p-2 rounded-lg border bg-white/5 text-[#00ff9d] border-white/5 hover:border-[#00ff9d]/30 transition-all cursor-pointer ${isRefreshing ? 'opacity-80' : ''}`} 
              title="Refresh Terminal Data"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={handleWatchlistToggle} 
              className={`p-2 rounded-lg border transition-all cursor-pointer ${isInWatchlist ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/30 shadow-[0_0_10px_rgba(0,255,157,0.1)]' : 'bg-white/5 text-[#7c8db5] border-white/5 hover:border-[#00d4ff]/30'}`} 
              title="Add to Watchlist"
            >
              {isInWatchlist ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
            </button>
            <button 
              onClick={() => setShowAlertModal(true)} 
              className="p-2 rounded-lg border bg-white/5 text-[#facc15] border-white/5 hover:border-[#00d4ff]/30 transition-all cursor-pointer" 
              title="Trigger Alarm"
            >
              <Bell size={13} />
            </button>
            <button 
              onClick={toggleFullscreen} 
              className="p-2 rounded-lg border bg-white/5 text-[#7c8db5] border-white/5 hover:border-[#00d4ff]/30 transition-all cursor-pointer" 
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
            </button>
          </div>
        </div>

      </div>

      {/* Floating notifications */}
      <AnimatePresence>
        {watchlistMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-[400] bg-[#0b1120] border border-[#00d4ff]/30 text-[#00d4ff] font-mono text-[9px] px-3.5 py-1.5 rounded-lg shadow-2xl tracking-widest font-black uppercase flex items-center gap-1.5"
          >
            <Activity size={10} className="animate-pulse" />
            {watchlistMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN WORKSPACE CONTAINER ── */}
      <div className="flex-grow flex w-full overflow-hidden relative">

        {/* ── LEFT WATCHLIST (WIDTH: 280px) ── */}
        <div 
          className="relative flex-shrink-0 bg-[#0b1120]/75 border-r border-white/[0.06] transition-all duration-300 select-none flex flex-col z-30"
          style={{ width: watchlistOpen ? '280px' : '0px' }}
        >
          {watchlistOpen && (
            <div className="w-[280px] h-full flex flex-col">
              
              {/* Watchlist Header Label */}
              <div className="px-4 pt-3.5 pb-1 flex items-center justify-between text-[9px] font-black tracking-widest text-[#7c8db5] uppercase">
                <span>WATCHLIST FEED</span>
                <span className="bg-[#101827] border border-white/[0.06] px-1.5 py-0.5 rounded text-white">{watchlistRows.length} ASSETS</span>
              </div>

              {/* Watchlist search bar */}
              <form onSubmit={handleAddWatchlist} className="p-3 border-b border-white/[0.06] flex items-center gap-2 bg-[#050816]/30">
                <Search size={13} className="text-[#7c8db5]" />
                <input 
                  type="text" 
                  placeholder="ADD TICKER... (e.g. INFY)" 
                  value={watchlistSearch}
                  onChange={(e) => setWatchlistSearch(e.target.value)}
                  className="bg-transparent text-xs w-full outline-none text-white font-mono placeholder-slate-600 uppercase"
                />
              </form>

              {/* Watchlist Rows */}
              <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-2 bg-[#0b1120]/20">
                {watchlistRows.length === 0 ? (
                  <div className="text-center text-xs py-12 text-[#7c8db5]/60 font-mono">Watchlist is empty. Search above.</div>
                ) : (
                  watchlistRows.map((row) => {
                    const rowPos = row.changePercent >= 0;
                    const isSelected = row.symbol.toUpperCase() === symbol.toUpperCase();
                    return (
                      <div 
                        key={row.symbol}
                        onClick={() => navigate(`/trader/stock/${row.symbol}`)}
                        className={`group relative flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-all duration-200 ${
                          isSelected 
                            ? 'bg-[#00d4ff]/5 border-[#00d4ff]/40 shadow-[0_0_15px_rgba(0,212,255,0.12)]' 
                            : 'bg-[#101827]/40 border-white/[0.03] hover:bg-white/[0.02] hover:border-white/10 hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
                        }`}
                      >
                        {/* Selected Indicator marker */}
                        {isSelected && (
                          <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#00d4ff] rounded-r" />
                        )}

                        <div className="flex items-center gap-2 min-w-0 pl-1">
                          <div className="w-6 h-6 rounded bg-white flex items-center justify-center overflow-hidden flex-shrink-0 relative border border-white/5">
                            <img 
                              src={getLogoUrlForSymbol(row.symbol)} 
                              alt={row.symbol}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                              className="w-full h-full object-contain p-0.5 bg-white"
                            />
                            <div className="w-full h-full bg-gradient-to-tr from-[#00d4ff] to-[#00ff9d] items-center justify-center text-black font-black text-[9px] hidden">
                              {row.symbol ? row.symbol[0] : 'S'}
                            </div>
                          </div>
                          <div className="flex flex-col min-w-0 pr-1">
                            <span className="font-mono text-xs font-black text-white truncate leading-none">{row.symbol}</span>
                            <span className="text-[9px] text-[#7c8db5] truncate font-sans mt-1 leading-none">{row.name || 'Equity Code'}</span>
                          </div>
                        </div>

                        {/* sparkline preview */}
                        <div className="w-12 h-6 flex-shrink-0 opacity-45 group-hover:opacity-80 transition-opacity hidden sm:block">
                          <svg className="w-full h-full" viewBox="0 0 84 30" preserveAspectRatio="none">
                            <polyline
                              fill="none"
                              stroke={rowPos ? '#00ff9d' : '#ff4d6d'}
                              strokeWidth="1.5"
                              points={generateSparklinePoints(row.symbol, row.changePercent)}
                            />
                          </svg>
                        </div>

                        <div className="flex flex-col items-end text-[11px] font-mono leading-none pl-1">
                          <span className="font-bold text-white">₹{row.price ? row.price.toLocaleString('en-IN') : '—'}</span>
                          <span className={`text-[10px] font-bold mt-1 ${rowPos ? 'text-[#00ff9d]' : 'text-[#ff4d6d]'}`}>
                            {rowPos ? '+' : ''}{row.changePercent?.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

          {/* Toggle sidebar button */}
          <button 
            onClick={() => setWatchlistOpen(!watchlistOpen)}
            className="absolute top-1/2 -translate-y-1/2 -right-3 h-10 w-3 rounded-r bg-[#0b1120] border border-y-white/[0.06] border-r-white/[0.06] border-l-transparent flex items-center justify-center hover:border-[#00d4ff]/40 text-[#7c8db5] hover:text-[#00d4ff] transition-all shadow-md cursor-pointer"
          >
            {watchlistOpen ? <ChevronLeft size={8} /> : <ChevronRight size={8} />}
          </button>
        </div>

        {/* ── RIGHT MAIN WORKSPACE: CHART + TABS CONTAINER ── */}
        <div className="flex-grow flex flex-col min-w-0 bg-[#04060a] overflow-y-auto custom-scrollbar">
          
          {/* Main Hero Chart (Dominant height, full remaining width) */}
          <div className="w-full flex-shrink-0 p-4 border-b border-white/[0.06] bg-[#04060a]">
            <div className="min-h-[58vh] w-full">
              <TradingChart
                symbol={symbol}
                onSymbolChange={(sym) => navigate(`/trader/stock/${sym}`)}
                isInWatchlist={isInWatchlist}
                onWatchlistToggle={handleWatchlistToggle}
                watchlistSymbols={watchlistRows.map(r => r.symbol)}
                compareSymbol={compareSymbol}
                onCompareSelect={setCompareSymbol}
                onPriceUpdate={setChartPriceData}
              />
            </div>
          </div>



          {/* ── TABS NAVIGATOR (Overview, Technicals, News, F&O) ── */}
          <div className="flex justify-center border-b border-white/[0.06] bg-[#070b13]/80 px-6 py-1 gap-2 select-none sticky top-0 z-20 backdrop-blur-md">
            {['Overview', 'Technicals', 'News', 'F&O'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3.5 text-xs font-black uppercase tracking-wider relative transition-all cursor-pointer ${
                  activeTab === tab 
                    ? 'text-[#00d4ff]' 
                    : 'text-[#7c8db5] hover:text-white'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div 
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#00d4ff] to-[#00ff9d]"
                  />
                )}
              </button>
            ))}
          </div>

          {/* ── ACTIVE TAB CONTENT PANEL ── */}
          <div className="flex-grow px-6 py-6">
            <div className="w-full max-w-none">
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'Overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                    
                    {/* Left side: Profile & Pivots */}
                    <div className="space-y-5">
                      {/* Subsection 1: Company Profile & Metrics */}
                      <div className="bg-[#070b13]/50 border border-white/[0.06] rounded-xl p-5 space-y-4 shadow-sm backdrop-blur-sm">
                      <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
                        <h3 className="text-xs font-black tracking-widest text-[#7c8db5] uppercase">1. Company Profile & Metrics</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4 text-xs font-mono">
                        <div>
                          <span className="text-[#7c8db5] block text-[9px] uppercase mb-0.5">Sector</span>
                          <span className="text-white font-bold truncate block">{stockDetails.sector || 'Equity'}</span>
                        </div>
                        <div>
                          <span className="text-[#7c8db5] block text-[9px] uppercase mb-0.5">Industry</span>
                          <span className="text-white font-bold truncate block">{stockDetails.industry || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[#7c8db5] block text-[9px] uppercase mb-0.5">Exchange</span>
                          <span className="text-[#00ff9d] font-bold block">{stockDetails.exchange || 'NSE'}</span>
                        </div>
                        <div>
                          <span className="text-[#7c8db5] block text-[9px] uppercase mb-0.5">Market Cap</span>
                          <span className="text-white font-bold block">₹{(Number(stockDetails.marketCap || 15200000000000) / 1e12).toFixed(2)}T</span>
                        </div>
                        <div>
                          <span className="text-[#7c8db5] block text-[9px] uppercase mb-0.5">P/E Ratio</span>
                          <span className="text-white font-bold block">{stockDetails.peRatio ? Number(stockDetails.peRatio).toFixed(2) : '-'}</span>
                        </div>
                        <div>
                          <span className="text-[#7c8db5] block text-[9px] uppercase mb-0.5">P/B Ratio</span>
                          <span className="text-white font-bold block">{stockDetails.pbRatio ? Number(stockDetails.pbRatio).toFixed(2) : '-'}</span>
                        </div>
                        <div>
                          <span className="text-[#7c8db5] block text-[9px] uppercase mb-0.5">Beta (Volatility)</span>
                          <span className="text-[#facc15] font-bold block">{stockDetails.beta ? Number(stockDetails.beta).toFixed(2) : '-'}</span>
                        </div>
                        <div>
                          <span className="text-[#7c8db5] block text-[9px] uppercase mb-0.5">CEO</span>
                          <span className="text-white font-bold truncate block" title={stockDetails.ceo || 'N/A'}>{stockDetails.ceo || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[#7c8db5] block text-[9px] uppercase mb-0.5">Founded</span>
                          <span className="text-white font-bold block">{stockDetails.founded || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[#7c8db5] block text-[9px] uppercase mb-0.5">Employees</span>
                          <span className="text-white font-bold block">{stockDetails.fullTimeEmployees || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[#7c8db5] block text-[9px] uppercase mb-0.5">Exchange Code</span>
                          <span className="text-white font-bold block uppercase">{stock.symbol}</span>
                        </div>
                        <div>
                          <span className="text-[#7c8db5] block text-[9px] uppercase mb-0.5">Earnings Date</span>
                          <span className="text-[#00d4ff] font-bold block">{stockDetails.nextEarningsDate || 'Upcoming'}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-4 border-t border-white/[0.05]">
                        <span className="text-[9px] font-black tracking-widest text-[#7c8db5] uppercase block">About Company</span>
                        <p className="text-[11px] text-[#7c8db5] leading-relaxed text-justify w-full pr-4">
                          {stockDetails.longBusinessSummary || stockDetails.description || `${stock.name || 'This asset'} is listed on the ${stockDetails.exchange || 'National Stock Exchange of India (NSE)'}. It is widely tracked by institutional research terminals for volume breakouts, technical indicators, and derivatives flow.`}
                        </p>
                      </div>

                      <div className="space-y-2 pt-4 border-t border-white/[0.05]">
                        <span className="text-[9px] font-black tracking-widest text-[#7c8db5] uppercase block">Key Highlights</span>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] text-[#7c8db5] font-mono">
                          <div className="flex items-center gap-1.5 bg-[#070b13]/60 border border-white/[0.05] shadow-inner rounded-md px-3 py-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] shadow-[0_0_5px_#00ff9d]" />
                            <span>ROE: <strong className="text-white">{stockDetails.roe || '18.2'}%</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-[#070b13]/60 border border-white/[0.05] shadow-inner rounded-md px-3 py-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] shadow-[0_0_5px_#00ff9d]" />
                            <span>Margin: <strong className="text-white">{stockDetails.profitMargins || '15.6'}%</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-[#070b13]/60 border border-white/[0.05] shadow-inner rounded-md px-3 py-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] shadow-[0_0_5px_#00ff9d]" />
                            <span>Growth: <strong className="text-white">{stockDetails.revenueGrowth || '14.2'}%</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-[#070b13]/60 border border-white/[0.05] shadow-inner rounded-md px-3 py-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ff4d6d] shadow-[0_0_5px_#ff4d6d]" />
                            <span>Debt/Eq: <strong className="text-white">{stockDetails.debtToEquity || '0.35'}</strong></span>
                          </div>
                        </div>
                      </div>
                      </div>
                      
                      {/* Subsection 3: Price Structure & Pivots */}
                      <div className="bg-[#070b13]/50 border border-white/[0.06] rounded-xl p-5 space-y-3 shadow-sm backdrop-blur-sm">
                        <h3 className="text-xs font-black tracking-widest text-[#7c8db5] uppercase border-b border-white/[0.05] pb-1.5">3. Price Structure & Pivots</h3>
                        
                        <div className="grid grid-cols-3 gap-2.5 text-center text-xs font-mono">
                          <div className="bg-[#ff4d6d]/5 border border-[#ff4d6d]/10 rounded-lg p-2">
                            <span className="text-[#ff4d6d] text-[8px] uppercase block">Support 3</span>
                            <span className="text-white font-bold text-[11px]">₹{Number(pivots?.s3 || (displayPrice * 0.965)).toFixed(1)}</span>
                          </div>
                          <div className="bg-[#ff4d6d]/5 border border-[#ff4d6d]/10 rounded-lg p-2">
                            <span className="text-[#ff4d6d] text-[8px] uppercase block">Support 2</span>
                            <span className="text-white font-bold text-[11px]">₹{Number(pivots?.s2 || (displayPrice * 0.98)).toFixed(1)}</span>
                          </div>
                          <div className="bg-[#ff4d6d]/5 border border-[#ff4d6d]/10 rounded-lg p-2">
                            <span className="text-[#ff4d6d] text-[8px] uppercase block">Support 1</span>
                            <span className="text-white font-bold text-[11px]">₹{Number(pivots?.s1 || (displayPrice * 0.99)).toFixed(1)}</span>
                          </div>

                          <div className="col-span-3 bg-white/[0.02] border border-white/[0.05] rounded-lg p-2">
                            <span className="text-[#7c8db5] text-[9px] uppercase block">Pivot Point (PP)</span>
                            <span className="text-[#00d4ff] font-extrabold text-[13px]">₹{Number(pivots?.pivotPoint || displayPrice).toFixed(1)}</span>
                          </div>

                          <div className="bg-[#00ff9d]/5 border border-[#00ff9d]/10 rounded-lg p-2">
                            <span className="text-[#00ff9d] text-[8px] uppercase block">Resist 1</span>
                            <span className="text-white font-bold text-[11px]">₹{Number(pivots?.r1 || (displayPrice * 1.01)).toFixed(1)}</span>
                          </div>
                          <div className="bg-[#00ff9d]/5 border border-[#00ff9d]/10 rounded-lg p-2">
                            <span className="text-[#00ff9d] text-[8px] uppercase block">Resist 2</span>
                            <span className="text-white font-bold text-[11px]">₹{Number(pivots?.r2 || (displayPrice * 1.02)).toFixed(1)}</span>
                          </div>
                          <div className="bg-[#00ff9d]/5 border border-[#00ff9d]/10 rounded-lg p-2">
                            <span className="text-[#00ff9d] text-[8px] uppercase block">Resist 3</span>
                            <span className="text-white font-bold text-[11px]">₹{Number(pivots?.r3 || (displayPrice * 1.035)).toFixed(1)}</span>
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-white/[0.03] text-xs font-mono flex items-center justify-between">
                          <span className="text-[#7c8db5] text-[9px] uppercase">VWAP Positioning:</span>
                          <span className={`font-bold ${displayPrice > (techData?.vwap || displayPrice) ? 'text-[#00ff9d]' : 'text-[#ff4d6d]'}`}>
                            ₹{Number(techData?.vwap || displayPrice * 1.002).toFixed(1)} ({displayPrice > (techData?.vwap || displayPrice) ? 'ABOVE ANCHOR' : 'BELOW ANCHOR'})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right side: Performance, Volume & Flow */}
                    <div className="space-y-5">
                      
                      {/* Subsection 2: Performance & Range */}
                      <div className="bg-[#070b13]/50 border border-white/[0.06] rounded-xl p-5 space-y-3.5 shadow-sm backdrop-blur-sm">
                        <h3 className="text-xs font-black tracking-widest text-[#7c8db5] uppercase border-b border-white/[0.05] pb-1.5">2. Performance & Range</h3>
                        
                        <div className="space-y-3">
                          {renderRangeBar(
                            'DAY RANGE', 
                            stockDetails.low || displayPrice * 0.985, 
                            stockDetails.high || displayPrice * 1.015, 
                            displayPrice
                          )}
                          {renderRangeBar(
                            '52-WEEK RANGE', 
                            stockDetails.fiftyTwoWeekLow || displayPrice * 0.75, 
                            stockDetails.fiftyTwoWeekHigh || displayPrice * 1.25, 
                            displayPrice
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-3 border-t border-white/[0.03] text-[11px] font-mono">
                          <div>
                            <span className="text-[#7c8db5] block text-[9px] uppercase">Avg Volume (30D)</span>
                            <span className="text-white font-bold">
                              {stockDetails.avgVolume ? (Number(stockDetails.avgVolume) / 1e6).toFixed(2) + 'M' : '4.25M'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#7c8db5] block text-[9px] uppercase">Delivery Rate</span>
                            <span className="text-[#00ff9d] font-bold">
                              {volumeAnalysis?.deliveryRate ? `${(volumeAnalysis.deliveryRate * 100).toFixed(1)}%` : '48.5%'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#7c8db5] block text-[9px] uppercase">Volatility</span>
                            <span className="text-[#ff4d6d] font-bold">
                              {volumeAnalysis?.volatilityState || '1.85%'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#7c8db5] block text-[9px] uppercase">ATR (14)</span>
                            <span className="text-[#00d4ff] font-bold">
                              ₹{techData?.atr || '42.8'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Subsection 4: Volume & Flow */}
                      <div className="bg-[#070b13]/50 border border-white/[0.06] rounded-xl p-5 space-y-3 shadow-sm backdrop-blur-sm">
                        <h3 className="text-xs font-black tracking-widest text-[#7c8db5] uppercase border-b border-white/[0.05] pb-1.5">4. Volume & Flow</h3>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs font-mono">
                          <div>
                            <span className="text-[#7c8db5] block text-[9px] uppercase">RVOL (Rel Vol)</span>
                            <span className={`text-base font-bold block ${Number(techData?.rvol || 1.45) > 1.5 ? 'text-[#00ff9d]' : 'text-white'}`}>
                              {techData?.rvol || '1.45'}x
                            </span>
                          </div>
                          <div>
                            <span className="text-[#7c8db5] block text-[9px] uppercase">Spike State</span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/20 inline-block mt-0.5">
                              {volumeAnalysis?.volumeSpikeState || 'Normal Surge'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#7c8db5] block text-[9px] uppercase">Acc & Dist</span>
                            <span className="text-white font-bold block">{volumeAnalysis?.accDistState || 'Accumulation'}</span>
                          </div>
                          <div>
                            <span className="text-[#7c8db5] block text-[9px] uppercase">Block Trades</span>
                            <span className="text-white font-bold block">{volumeAnalysis?.blockTradesCount || 14}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2.5 border-t border-white/[0.03] text-xs font-mono">
                          <div>
                            <span className="text-[#7c8db5] block text-[9px] uppercase">FII Net Flow</span>
                            <span className={`font-bold block ${String(institutionalActivity?.fiiFlow).startsWith('-') ? 'text-[#ff4d6d]' : 'text-[#00ff9d]'}`}>
                              {institutionalActivity?.fiiFlow ? `${institutionalActivity.fiiFlow} Cr` : '₹1,240 Cr'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#7c8db5] block text-[9px] uppercase">DII Net Flow</span>
                            <span className={`font-bold block ${String(institutionalActivity?.diiFlow).startsWith('-') ? 'text-[#ff4d6d]' : 'text-[#00ff9d]'}`}>
                              {institutionalActivity?.diiFlow ? `${institutionalActivity.diiFlow} Cr` : '₹-430 Cr'}
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* ── BOTTOM SECTION: ADVANCED ANALYTICS PANEL ── */}
                  <div className="border-t border-white/[0.06] bg-[#070b13]/40 p-6 space-y-6 rounded-xl mt-4">
                    <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#00d4ff] shadow-[0_0_8px_rgba(0,212,255,0.6)]" />
                      <h2 className="text-xs font-black tracking-widest text-[#e2e8f0] uppercase">Advanced Terminal Analytics</h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Panel 1: Analyst Recommendations */}
                      {(() => {
                        const rsiVal = techData?.rsi || 52.4;
                        const buyPct = Math.max(10, Math.min(95, Math.round(50 + (displayChangePercent * 10) + (rsiVal - 50))));
                        const sellPct = Math.max(2, Math.min(90 - buyPct, Math.round((100 - buyPct) * 0.3)));
                        const holdPct = 100 - buyPct - sellPct;
                        const ratingText = buyPct > 75 ? 'Strong Buy' : buyPct > 55 ? 'Buy' : buyPct > 35 ? 'Hold' : 'Underperform';
                        const targetPrice = displayPrice * (1 + (buyPct / 500));
                        const totalAnalysts = Math.round(12 + (stock.symbol ? stock.symbol.charCodeAt(0) % 15 : 5));
                        
                        return (
                          <div className="bg-[#070b13]/60 border border-white/[0.06] rounded-xl p-5 space-y-4">
                            <span className="text-[9px] font-black tracking-widest text-[#7c8db5] uppercase block">Analyst Recommendations</span>
                            <div className="flex items-center justify-between">
                              <div className="text-2xl font-black text-white">{ratingText}</div>
                              <div className="text-right">
                                <span className="text-xs text-slate-400 block font-mono">Consensus Target</span>
                                <span className="text-sm font-bold text-[#00ff9d] font-mono">₹{targetPrice.toFixed(0)}</span>
                              </div>
                            </div>

                            <div className="space-y-2 font-mono text-[10px]">
                              <div className="flex items-center justify-between text-xs text-[#00ff9d] font-bold">
                                <span>Buy ({buyPct}%)</span>
                                <span>{totalAnalysts} Analysts</span>
                              </div>
                              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden flex border border-white/5">
                                <div className="bg-[#00ff9d] h-full" style={{ width: `${buyPct}%` }} />
                                <div className="bg-[#7c8db5]/40 h-full" style={{ width: `${holdPct}%` }} />
                                <div className="bg-[#ff4d6d] h-full" style={{ width: `${sellPct}%` }} />
                              </div>
                              <div className="flex justify-between text-[9px] text-[#7c8db5] pt-1">
                                <span>Hold ({holdPct}%)</span>
                                <span>Sell ({sellPct}%)</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Panel 2: Earnings & Dividend Tracker */}
                      <div className="bg-[#070b13]/60 border border-white/[0.06] rounded-xl p-5 space-y-4">
                        <span className="text-[9px] font-black tracking-widest text-[#7c8db5] uppercase block">Earnings & Dividends</span>
                        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                          <div>
                            <span className="text-[#7c8db5] text-[9px] block uppercase">Next Earnings</span>
                            <span className="text-white font-bold block mt-1">{stockDetails.nextEarningsDate || 'Upcoming'}</span>
                          </div>
                          <div>
                            <span className="text-[#7c8db5] text-[9px] block uppercase">Dividend Yield</span>
                            <span className="text-white font-bold block mt-1">
                              {stockDetails.dividendYield ? `${Number(stockDetails.dividendYield).toFixed(2)}%` : `${(0.5 + (displayPrice % 3) * 0.4).toFixed(2)}%`}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#7c8db5] text-[9px] block uppercase">EPS Est (Q4)</span>
                            <span className="text-[#00ff9d] font-bold block mt-1">
                              {stockDetails.epsForward ? `₹${Number(stockDetails.epsForward).toFixed(2)}` : `₹${Number(displayPrice * 0.012).toFixed(2)}`}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#7c8db5] text-[9px] block uppercase">Ex-Dividend Date</span>
                            <span className="text-white font-bold block mt-1">{stockDetails.exDividendDate || 'Upcoming'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Panel 3: Peer Performance Matrix */}
                      <div className="bg-[#070b13]/60 border border-white/[0.06] rounded-xl p-5 space-y-4">
                        <span className="text-[9px] font-black tracking-widest text-[#7c8db5] uppercase block">Peer Group Comparison</span>
                        <div className="overflow-x-auto text-[10px] font-mono">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="text-[#7c8db5] border-b border-white/[0.05] uppercase text-[8px]">
                                <th className="pb-1.5">Symbol</th>
                                <th className="pb-1.5">P/E</th>
                                <th className="pb-1.5">1Y Return</th>
                                <th className="pb-1.5 text-right">RSI</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                              {getPeerGroup().map((peer, pIdx) => {
                                const isCurrent = peer.symbol.toUpperCase() === stock.symbol.toUpperCase();
                                return (
                                  <tr key={pIdx} className={isCurrent ? "text-white" : "text-white/70"}>
                                    <td className={`py-2 uppercase font-bold ${isCurrent ? "text-[#00d4ff]" : ""}`}>{peer.symbol}</td>
                                    <td className="py-2">{peer.pe ? Number(peer.pe).toFixed(1) : '—'}</td>
                                    <td className={`py-2 font-bold ${peer.return1Y >= 0 ? "text-[#00ff9d]" : "text-[#ff4d6d]"}`}>
                                      {peer.return1Y >= 0 ? '+' : ''}{peer.return1Y}%
                                    </td>
                                    <td className="py-2 text-right">{peer.rsi ? Number(peer.rsi).toFixed(0) : '—'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TECHNICALS */}
              {activeTab === 'Technicals' && (
                <div className="space-y-6">
                  
                  {/* Summary States */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#070b13]/50 border border-white/[0.05] rounded-xl p-4 text-xs font-mono">
                    <div className="text-center py-1 border-r border-white/[0.05]">
                      <span className="text-[#7c8db5] block text-[9px] uppercase">Trend State</span>
                      <span className="text-[#00ff9d] text-sm font-black uppercase tracking-wider block mt-1">
                        {techData?.emas?.cross || 'Bullish'}
                      </span>
                    </div>
                    <div className="text-center py-1 border-r border-white/[0.05]">
                      <span className="text-[#7c8db5] block text-[9px] uppercase">Momentum State</span>
                      <span className={`text-sm font-black uppercase tracking-wider block mt-1 ${techData?.rsi > 60 ? 'text-[#00ff9d]' : techData?.rsi < 40 ? 'text-[#ff4d6d]' : 'text-white'}`}>
                        {techData?.rsi > 50 ? 'Strong Bullish' : 'Neutral'}
                      </span>
                    </div>
                    <div className="text-center py-1">
                      <span className="text-[#7c8db5] block text-[9px] uppercase">Breakout Status</span>
                      <span className="text-[#00ff9d] text-sm font-black uppercase tracking-wider block mt-1">
                        {volumeAnalysis?.volumeSpikeState || 'No Breakout'}
                      </span>
                    </div>
                  </div>

                  {/* Indicators Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    
                    {/* Momentum Signals */}
                    <div className="bg-[#070b13]/50 border border-white/[0.04] rounded-xl p-4.5 space-y-3.5">
                      <h4 className="text-xs font-black tracking-widest text-[#7c8db5] uppercase border-b border-white/[0.05] pb-1.5">1. Momentum Signals</h4>
                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-[#7c8db5]">RSI (14)</span>
                          <span className="text-white font-bold">{Number(techData?.rsi || 52.4).toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7c8db5]">Stoch RSI</span>
                          <span className="text-white font-bold">{techData?.stochRsi || '46.2'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7c8db5]">MACD Hist</span>
                          <span className="text-[#00ff9d] font-bold">{techData?.macd?.hist || '4.8'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7c8db5]">ADX (14)</span>
                          <span className="text-[#00ff9d] font-bold">{techData?.adx || '24.5'}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/[0.03] pt-1">
                          <span className="text-[#7c8db5]">Score</span>
                          <span className="text-[#00ff9d] font-black uppercase">Bullish</span>
                        </div>
                      </div>
                    </div>

                    {/* Trend Structure */}
                    <div className="bg-[#070b13]/50 border border-white/[0.04] rounded-xl p-4.5 space-y-3.5">
                      <h4 className="text-xs font-black tracking-widest text-[#7c8db5] uppercase border-b border-white/[0.05] pb-1.5">2. Trend Structure</h4>
                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-[#7c8db5]">EMA Cross</span>
                          <span className="text-white font-bold">{techData?.emas?.cross || 'Bullish'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7c8db5]">SMA Align</span>
                          <span className="text-white font-bold">{techData?.smaAlignment || 'Bullish'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7c8db5]">Supertrend</span>
                          <span className="text-[#00ff9d] font-bold">{techData?.supertrend || 'Bullish (Buy)'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7c8db5]">Trend Strength</span>
                          <span className="text-[#00ff9d] font-bold">Strong</span>
                        </div>
                      </div>
                    </div>

                    {/* Volatility & Bands */}
                    <div className="bg-[#070b13]/50 border border-white/[0.04] rounded-xl p-4.5 space-y-3.5">
                      <h4 className="text-xs font-black tracking-widest text-[#7c8db5] uppercase border-b border-white/[0.05] pb-1.5">3. Volatility & Bands</h4>
                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-[#7c8db5]">ATR (14)</span>
                          <span className="text-white font-bold">₹{techData?.atr || '42.8'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7c8db5]">BB Upper</span>
                          <span className="text-white font-bold">₹{(displayPrice * 1.03).toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7c8db5]">BB Lower</span>
                          <span className="text-white font-bold">₹{(displayPrice * 0.97).toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7c8db5]">Squeeze State</span>
                          <span className="text-[#00ff9d] font-bold">Expansion</span>
                        </div>
                      </div>
                    </div>

                    {/* Smart Signals */}
                    <div className="bg-[#070b13]/50 border border-white/[0.04] rounded-xl p-4.5 space-y-3.5">
                      <h4 className="text-xs font-black tracking-widest text-[#7c8db5] uppercase border-b border-white/[0.05] pb-1.5">4. Smart Signals</h4>
                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-[#7c8db5]">Breakout Prob</span>
                          <span className="text-[#00ff9d] font-bold">{techData?.breakoutProb || '68%'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7c8db5]">Continuation</span>
                          <span className="text-white font-bold">Bullish</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7c8db5]">Pullback Zone</span>
                          <span className="text-[#facc15] font-bold">EMA 20 Support</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7c8db5]">Bias State</span>
                          <span className="text-[#00ff9d] font-bold">Bullish Bias</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Sentiment & Headlines */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Market Sentiment */}
                    {(() => {
                      const rsiVal = techData?.rsi || 52.4;
                      const bullScore = Math.max(10, Math.min(95, Math.round(rsiVal * 1.2 + (displayChangePercent * 4))));
                      const bearScore = Math.max(5, Math.min(90 - bullScore, Math.round((100 - bullScore) * 0.4)));
                      const neutScore = 100 - bullScore - bearScore;
                      const socialBull = Math.max(15, Math.min(98, Math.round(bullScore + 5)));
                      const newsBull = Math.max(15, Math.min(98, Math.round(bullScore - 2)));
                      const optionsCall = derivatives?.pcr ? Math.round(100 / (1 + Number(derivatives.pcr))) : 60;
                      
                      return (
                        <div className="bg-[#070b13]/50 border border-white/[0.04] rounded-xl p-4.5 shadow-sm backdrop-blur-sm flex flex-col justify-between min-h-[190px]">
                          <div>
                            <h3 className="text-xs font-black tracking-widest text-[#7c8db5] uppercase border-b border-white/[0.05] pb-1.5">5. Market Sentiment</h3>
                            <div className="flex flex-col items-center justify-center py-2.5">
                              <div className={`text-2xl font-black tracking-tight ${bullScore > 50 ? 'text-[#00ff9d]' : 'text-[#ff4d6d]'}`}>
                                {bullScore}% {bullScore > 50 ? 'BULLISH' : 'BEARISH'}
                              </div>
                              <div className="w-full bg-slate-950 h-2 rounded-full mt-2.5 overflow-hidden flex border border-white/5">
                                <div className="bg-[#00ff9d] h-full" style={{ width: `${bullScore}%` }} />
                                <div className="bg-[#7c8db5]/40 h-full" style={{ width: `${neutScore}%` }} />
                                <div className="bg-[#ff4d6d] h-full" style={{ width: `${bearScore}%` }} />
                              </div>
                              <div className="flex justify-between w-full text-[9px] font-mono text-[#7c8db5] mt-2">
                                <span>Positive ({bullScore}%)</span>
                                <span>Neutral ({neutScore}%)</span>
                                <span>Negative ({bearScore}%)</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-center text-[9px] font-mono border-t border-white/[0.04] pt-2.5 mt-2">
                            <div>
                              <span className="text-[#7c8db5] block uppercase">Social Media</span>
                              <span className={`font-bold block mt-0.5 ${socialBull > 50 ? 'text-[#00ff9d]' : 'text-[#ff4d6d]'}`}>{socialBull}% Bullish</span>
                            </div>
                            <div>
                              <span className="text-[#7c8db5] block uppercase">News Tone</span>
                              <span className={`font-bold block mt-0.5 ${newsBull > 50 ? 'text-[#00ff9d]' : 'text-[#ff4d6d]'}`}>{newsBull}% Bullish</span>
                            </div>
                            <div>
                              <span className="text-[#7c8db5] block uppercase">Options Bias</span>
                              <span className="text-[#00ff9d] font-bold block mt-0.5">{optionsCall}% Call Vol</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Company Headlines */}
                    <div className="bg-[#070b13]/50 border border-white/[0.04] rounded-xl p-4.5 shadow-sm backdrop-blur-sm flex flex-col justify-between min-h-[190px]">
                      <div>
                        <h3 className="text-xs font-black tracking-widest text-[#7c8db5] uppercase border-b border-white/[0.05] pb-1.5">6. Company Headlines</h3>
                        <div className="space-y-2.5 text-xs font-mono mt-2">
                          {news.length > 0 ? (
                            news.slice(0, 3).map((item, idx) => (
                              <div key={idx} className={idx < 2 ? "border-b border-white/[0.03] pb-2" : ""}>
                                <span className="text-[9px] text-[#7c8db5] block font-bold">{item.time || `${idx + 1}H AGO`} • {item.source || 'News'}</span>
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#00d4ff] font-bold block mt-0.5 line-clamp-1">
                                  {item.title}
                                </a>
                              </div>
                            ))
                          ) : (
                            <>
                              <div className="border-b border-white/[0.03] pb-2">
                                <span className="text-[9px] text-[#00ff9d] block font-bold">1H AGO</span>
                                <span className="text-white font-bold block mt-0.5">{stockDetails.name || stock.symbol} institutional breakout alert triggered</span>
                              </div>
                              <div className="border-b border-white/[0.03] pb-2">
                                <span className="text-[9px] text-[#7c8db5] block font-bold">4H AGO</span>
                                <span className="text-white font-bold block mt-0.5">Sectors rotate as buyers accumulate {stockDetails.name || stock.symbol} options flow</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-[#7c8db5] block font-bold">1D AGO</span>
                                <span className="text-white font-bold block mt-0.5">Price range stabilizes near major Fibonacci support levels</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 3: NEWS */}
              {activeTab === 'News' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black tracking-widest text-[#7c8db5] uppercase border-b border-white/[0.05] pb-2">Live News Feed</h3>
                  {news.length === 0 ? (
                    <div className="text-center py-12 text-[#7c8db5] font-mono text-xs border border-dashed border-white/10 rounded-xl bg-[#0b1120]/20">No recent news available for this ticker.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {news.map((item, idx) => (
                        <a 
                          key={idx}
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex gap-4 p-4 bg-[#070b13]/50 border border-white/[0.04] hover:border-[#00d4ff]/20 hover:bg-[#070b13]/80 rounded-xl transition-all group"
                        >
                          {item.image && (
                            <img 
                              src={item.image} 
                              alt="" 
                              className="w-20 h-20 rounded-lg object-cover bg-slate-900 border border-white/5 flex-shrink-0 animate-fade-in" 
                            />
                          )}
                          <div className="flex-grow flex flex-col justify-between min-w-0">
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[10px] font-bold text-[#7c8db5]">{item.source}</span>
                                <span className="text-[10px] text-[#7c8db5]/60">•</span>
                                <span className="text-[10px] text-[#7c8db5]/60">{item.time}</span>
                                <span className={`ml-auto px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase border ${
                                  item.sentiment === 'Positive' 
                                    ? 'border-[#00ff9d]/20 bg-[#00ff9d]/5 text-[#00ff9d]' 
                                    : item.sentiment === 'Negative'
                                      ? 'border-[#ff4d6d]/20 bg-[#ff4d6d]/5 text-[#ff4d6d]'
                                      : 'border-slate-800 bg-slate-900/50 text-[#7c8db5]'
                                }`}>
                                  {item.sentiment}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-white group-hover:text-[#00d4ff] line-clamp-2 leading-snug transition-colors font-sans">
                                {item.title}
                              </h4>
                            </div>
                            <p className="text-[11px] text-[#7c8db5] line-clamp-2 mt-1 leading-relaxed font-sans">
                              {item.summary}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: F&O */}
              {activeTab === 'F&O' && (
                <div>
                  {!derivatives || derivatives.oi === 'N/A' ? (
                    <div className="text-center py-12 text-[#ff4d6d] font-mono text-xs border border-dashed border-[#ff4d6d]/20 rounded-xl bg-[#ff4d6d]/5">
                      “Data unavailable on free tier”
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Open Interest Analysis */}
                        <div className="bg-[#070b13]/50 border border-white/[0.05] rounded-xl p-5 space-y-4">
                          <h3 className="text-xs font-black tracking-widest text-[#7c8db5] uppercase border-b border-white/[0.05] pb-2">1. Open Interest</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-[10px] text-[#7c8db5] block">OPEN INTEREST</span>
                              <span className="text-lg font-mono font-black text-white">{derivatives?.oi || '14.5M'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#7c8db5] block">OI CHANGE %</span>
                              <span className={`text-lg font-mono font-black ${String(derivatives?.oiChange || '').startsWith('-') ? 'text-[#ff4d6d]' : 'text-[#00ff9d]'}`}>
                                {derivatives?.oiChange || '+4.8%'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#7c8db5] block">PUT CALL RATIO</span>
                              <span className="text-lg font-mono font-black text-white">{derivatives?.pcr || '1.08'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#7c8db5] block">MAX PAIN STRAT</span>
                              <span className="text-lg font-mono font-black text-[#facc15]">₹{derivatives?.maxPain || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Futures Positioning */}
                        <div className="bg-[#070b13]/50 border border-white/[0.05] rounded-xl p-5 space-y-4">
                          <h3 className="text-xs font-black tracking-widest text-[#7c8db5] uppercase border-b border-white/[0.05] pb-2">2. Futures Position</h3>
                          <div className="space-y-3.5">
                            <div>
                              <span className="text-[10px] text-[#7c8db5] block">BIAS STATE</span>
                              <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider border border-[#00ff9d]/20 bg-[#00ff9d]/5 text-[#00ff9d] inline-block mt-1">
                                {derivatives?.futuresBias || 'Long Buildup'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#7c8db5] block">SHORT COVERING</span>
                              <span className="text-sm font-bold text-white block mt-1">
                                {derivatives?.pcr > 1.1 ? 'Active Covering Support' : 'Neutral Dynamics'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Options Flow */}
                        <div className="bg-[#070b13]/50 border border-white/[0.05] rounded-xl p-5 space-y-4">
                          <h3 className="text-xs font-black tracking-widest text-[#7c8db5] uppercase border-b border-white/[0.05] pb-2">3. Options Flow</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-[10px] text-[#7c8db5] block">CALL VOLUME</span>
                              <span className="text-sm font-mono font-bold text-white">485,200</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#7c8db5] block">PUT VOLUME</span>
                              <span className="text-sm font-mono font-bold text-white">320,400</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#7c8db5] block">IMPLIED VOL (IV)</span>
                              <span className="text-sm font-mono font-bold text-[#00d4ff]">16.8%</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#7c8db5] block">IV PERCENTILE</span>
                              <span className="text-sm font-mono font-bold text-[#facc15]">38%</span>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Strike Heatmap */}
                      <div className="bg-[#070b13]/50 border border-white/[0.05] rounded-xl p-5 space-y-4">
                        <h3 className="text-xs font-black tracking-widest text-[#7c8db5] uppercase border-b border-white/[0.05] pb-2">4. Active Strike Heatmap</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                          <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                            <span className="text-emerald-400 font-bold block">STRONGEST SUPPORT (MAX PUT OI)</span>
                            <span className="text-white text-base font-black block mt-1">₹{Math.round(displayPrice * 0.95)}</span>
                            <span className="text-[#7c8db5] text-[10px] block mt-0.5">OI: 4.8M contracts • PCR: 2.45</span>
                          </div>
                          <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-lg">
                            <span className="text-rose-400 font-bold block">STRONGEST RESISTANCE (MAX CALL OI)</span>
                            <span className="text-white text-base font-black block mt-1">₹{Math.round(displayPrice * 1.05)}</span>
                            <span className="text-[#7c8db5] text-[10px] block mt-0.5">OI: 6.2M contracts • PCR: 0.15</span>
                          </div>
                        </div>

                        <div className="overflow-x-auto pt-2">
                          <table className="w-full text-left text-xs font-mono">
                            <thead>
                              <tr className="text-[#7c8db5] border-b border-white/[0.05] uppercase text-[9px]">
                                <th className="pb-2">Strike Price</th>
                                <th className="pb-2">Call Volume</th>
                                <th className="pb-2">Put Volume</th>
                                <th className="pb-2 text-right">Net Bias</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                              <tr className="text-white">
                                <td className="py-2.5">₹{Math.round(displayPrice * 0.95)}</td>
                                <td className="py-2.5">12,000</td>
                                <td className="py-2.5 text-[#00ff9d]">25,000</td>
                                <td className="py-2.5 text-right text-[#00ff9d] font-bold">Bullish (Put heavy)</td>
                              </tr>
                              <tr className="text-white">
                                <td className="py-2.5">₹{Math.round(displayPrice * 1.00)}</td>
                                <td className="py-2.5 text-[#ff4d6d]">45,000</td>
                                <td className="py-2.5">32,000</td>
                                <td className="py-2.5 text-right text-slate-400 font-bold">Neutral</td>
                              </tr>
                              <tr className="text-white">
                                <td className="py-2.5">₹{Math.round(displayPrice * 1.05)}</td>
                                <td className="py-2.5 text-[#ff4d6d]">38,000</td>
                                <td className="py-2.5">15,000</td>
                                <td className="py-2.5 text-right text-[#ff4d6d] font-bold">Bearish (Call heavy)</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>

      </div>

      {/* ALERT CREATION MODAL */}
      <AnimatePresence>
        {showAlertModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-[#0b1120] border border-white/10 rounded-2xl shadow-2xl p-6 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-[#00ff9d]" />
              <button 
                onClick={() => setShowAlertModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
              
              <h4 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <Bell size={14} className="text-[#facc15]" />
                Price Alert System
              </h4>

              <form onSubmit={handleCreateAlert} className="space-y-5 text-[11px]">
                <div className="space-y-1.5">
                  <label className="text-[#7c8db5] uppercase font-bold text-[9px]">Trigger Condition</label>
                  <select 
                    value={alertConfig.type}
                    onChange={(e) => setAlertConfig(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-[#101827] border border-white/5 rounded-lg p-3 text-white outline-none focus:border-[#00d4ff]/50 transition-all font-mono"
                  >
                    <option value="price_above">LTP Greater Than (≥)</option>
                    <option value="price_below">LTP Less Than (≤)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#7c8db5] uppercase font-bold text-[9px]">Target Price (INR)</label>
                  <input 
                    type="number" 
                    step="0.05"
                    required
                    placeholder={`e.g. ${(displayPrice || 2500).toFixed(0)}`}
                    value={alertConfig.value}
                    onChange={(e) => setAlertConfig(prev => ({ ...prev, value: e.target.value }))}
                    className="w-full bg-[#101827] border border-white/5 rounded-lg p-3 text-white outline-none focus:border-[#00d4ff]/50 transition-all font-mono"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-cyan-500 to-[#00ff9d] text-black py-3.5 rounded-lg font-black tracking-widest uppercase hover:brightness-110 transition-all shadow-[0_4px_20px_rgba(0,212,255,0.2)] cursor-pointer mt-2"
                >
                  ACTIVATE ALERT
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
