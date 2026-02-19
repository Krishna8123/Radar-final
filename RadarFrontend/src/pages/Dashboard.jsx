import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Bar,
  Line,
} from "recharts";
import {
  Search,
  Maximize2,
  Settings,
  Pin,
  Bell,
  Menu,
  X,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  LogOut,
  LayoutDashboard,
  Star,
  Filter,
  Newspaper,
  ChevronRight,
  ChevronLeft,
  User,
  CreditCard,
  HelpCircle,
  CheckCircle,
} from "lucide-react";
import { Tilt } from "react-tilt";
import { motion } from "framer-motion";
import MarketTicker from "../components/MarketTicker";
import "./Dashboard.css";

// ============================================
// MOCK DATA
// ============================================

const mockStock = {
  symbol: "BTC",
  name: "Bitcoin",
  price: "42,500.00",
  change: "+5.2%",
  high: "43,000",
  low: "41,200",
  volume: "24B",
  marketCap: "800B",
};

// ============================================
// TIMEFRAME DATA SETS
// ============================================

// Helper function to generate realistic price data
const generatePriceData = (basePrice, points, volatility = 100) => {
  const data = [];
  let currentPrice = basePrice;

  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.5) * volatility;
    currentPrice += change;
    data.push({ price: Math.round(currentPrice) });
  }

  return data;
};

// Helper function to generate OHLC candlestick data
const generateCandlestickData = (basePrice, points, volatility = 100) => {
  const data = [];
  let currentPrice = basePrice;

  for (let i = 0; i < points; i++) {
    const open = currentPrice;
    const change = (Math.random() - 0.5) * volatility;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.3;
    const low = Math.min(open, close) - Math.random() * volatility * 0.3;

    data.push({
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
    });

    currentPrice = close;
  }

  return data;
};

// Timeframe configurations
const timeframeConfig = {
  "1m": { points: 60, volatility: 20, labels: Array.from({ length: 60 }, (_, i) => `${i}s`) },
  "5m": { points: 48, volatility: 40, labels: Array.from({ length: 48 }, (_, i) => `${i * 5}m`) },
  "15m": { points: 32, volatility: 80, labels: Array.from({ length: 32 }, (_, i) => `${i * 15}m`) },
  "1h": { points: 24, volatility: 120, labels: Array.from({ length: 24 }, (_, i) => `${i}h`) },
  "4h": { points: 18, volatility: 200, labels: Array.from({ length: 18 }, (_, i) => `${i * 4}h`) },
  "1D": { points: 30, volatility: 300, labels: Array.from({ length: 30 }, (_, i) => `D${i + 1}`) },
};

// Generate data for all timeframes
const chartDataByTimeframe = {};
Object.keys(timeframeConfig).forEach(tf => {
  const config = timeframeConfig[tf];
  const basePrice = 18500;

  // Area chart data
  const areaData = generatePriceData(basePrice, config.points, config.volatility);

  // Candlestick data
  const candleData = generateCandlestickData(basePrice, config.points, config.volatility);

  // Add time labels
  chartDataByTimeframe[tf] = {
    area: areaData.map((d, i) => ({ ...d, time: config.labels[i] })),
    candles: candleData.map((d, i) => ({ ...d, time: config.labels[i] })),
  };
});

// Default data (for backward compatibility)
const priceData = chartDataByTimeframe["15m"].area;
const candlestickData = chartDataByTimeframe["15m"].candles;

const topMovers = [
  { symbol: "SOL", name: "Solana", change: "+12.5%", price: "$98.20" },
  { symbol: "AVAX", name: "Avalanche", change: "+8.1%", price: "$34.50" },
  { symbol: "ETH", name: "Ethereum", change: "+4.2%", price: "$2,250" },
];

const mockNews = [
  {
    id: 1,
    source: "CoinDesk",
    title: "Bitcoin Surges Past $92k Amid ETF Optimism",
    time: "2h ago",
    sentiment: "Bullish",
  },
  {
    id: 2,
    source: "Bloomberg",
    title: "Global Markets Rally as Inflation Data Cools",
    time: "4h ago",
    sentiment: "Neutral",
  },
  {
    id: 3,
    source: "CryptoSlate",
    title: "Miners Holding Onto BTC Despite Price Volatility",
    time: "6h ago",
    sentiment: "Bullish",
  },
];

const dominanceData = [
  { name: "BTC", value: 52 },
  { name: "ETH", value: 17 },
  { name: "Others", value: 31 },
];

const COLORS = ["#00f3ff", "#bc13fe", "#0aff68"];

const defaultTiltOptions = {
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

const mockNotifications = [
  { id: 1, text: "BTC broken resistance at $44k", time: "2m ago", read: false },
  { id: 2, text: "New Feature: Options Chain live", time: "1h ago", read: false },
  { id: 3, text: "Margin Call Warning: 80% usage", time: "3h ago", read: true },
];

// ============================================
// UTILITY COMPONENTS
// ============================================

const Sparkline = ({ data, color }) => (
  <div style={{ width: 60, height: 30 }}>
    <ResponsiveContainer>
      <AreaChart data={data}>
        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          fill="none"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

// ============================================
// INVESTOR MODE COMPONENTS
// ============================================

const TickerTape = () => {
  const stocks = [
    { symbol: "NIFTY 50", price: "18,500", change: 0.52 },
    { symbol: "SENSEX", price: "62,300", change: 0.4 },
    { symbol: "BANKNIFTY", price: "43,800", change: 0.7 },
    { symbol: "VIX", price: "12.5", change: -1.2 },
    { symbol: "NASDAQ", price: "13,200", change: 0.2 },
    { symbol: "S&P 500", price: "4,300", change: 0.4 },
    { symbol: "FTSE", price: "7,620", change: 0.0 },
    { symbol: "NIKKEI", price: "32,900", change: -0.2 },
  ];

  return (
    <div className="ticker-wrapper">
      <div className="ticker-track">
        {/* First set of items */}
        {stocks.map((stock, index) => (
          <div className="ticker-item" key={index}>
            <span className="symbol">{stock.symbol}</span>
            <span className="price">{stock.price}</span>
            <span className={stock.change > 0 ? "positive" : stock.change < 0 ? "negative" : "neutral"}>
              {stock.change > 0 ? "▲" : stock.change < 0 ? "▼" : "●"} {Math.abs(stock.change)}%
            </span>
          </div>
        ))}

        {/* Duplicate set for seamless loop */}
        {stocks.map((stock, index) => (
          <div className="ticker-item" key={`duplicate-${index}`}>
            <span className="symbol">{stock.symbol}</span>
            <span className="price">{stock.price}</span>
            <span className={stock.change > 0 ? "positive" : stock.change < 0 ? "negative" : "neutral"}>
              {stock.change > 0 ? "▲" : stock.change < 0 ? "▼" : "●"} {Math.abs(stock.change)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MarketMoodGauge = () => (
  <div className="investor-card p-6 h-full flex flex-col justify-between">
    <div className="card-header flex justify-between">
      <h3 className="text-lg font-bold text-slate-800">Market Mood Index</h3>
      <span className="text-gray-400">⋮</span>
    </div>

    <div className="gauge-chart-wrapper mt-4">
      <svg viewBox="0 0 200 100" className="w-full h-full">
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="20"
        />
        <path
          d="M 20 100 A 80 80 0 0 1 100 20"
          fill="none"
          stroke="#ef4444"
          strokeWidth="20"
          strokeDasharray="125 250"
        />
        <path
          d="M 100 20 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#22c55e"
          strokeWidth="20"
          strokeDasharray="125 250"
        />
        <line
          x1="100"
          y1="100"
          x2="140"
          y2="60"
          stroke="#334155"
          strokeWidth="4"
          className="gauge-needle"
        />
        <circle cx="100" cy="100" r="10" fill="#334155" />
      </svg>
    </div>

    <div className="flex justify-between text-xs font-semibold text-slate-500 mt-2">
      <span>Extreme Fear</span>
      <span>Greed</span>
    </div>
    <p className="text-xs text-center text-slate-400 mt-2">
      Market leaning towards greed.
    </p>
  </div>
);

const ValuationThermometer = () => (
  <div className="investor-card p-6 h-full flex flex-col">
    <div className="card-header flex justify-between mb-4">
      <h3 className="text-lg font-bold text-slate-800">
        Valuation Thermometer
      </h3>
      <span className="text-gray-400">⋮</span>
    </div>

    <div className="space-y-4 flex-1">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-slate-600">NIFTY 50 P/E</span>
        <span className="font-bold text-xl text-slate-800">21.8</span>
      </div>
      <div className="flex justify-between text-xs text-slate-400 border-b border-gray-100 pb-2">
        <span>5 Year Avg.</span>
        <span>20.0 / 3.8</span>
      </div>

      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-slate-600">P/B Ratio</span>
        <span className="font-bold text-xl text-slate-800">4.1</span>
      </div>

      <div className="mt-4">
        <div className="h-2 w-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded-full"></div>
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>Cheap</span>
          <span>Fair</span>
          <span>Expensive</span>
        </div>
      </div>
    </div>
    <p className="text-xs text-slate-400 mt-4">
      Near 5-year average valuations.
    </p>
  </div>
);

const GlobalPulse = () => (
  <div className="investor-card p-6 h-full">
    <div className="card-header mb-4">
      <h3 className="text-lg font-bold text-slate-800">Global Pulse</h3>
    </div>
    <div className="space-y-4">
      {[
        { name: "S&P 500", val: "4,300", change: "▲ 0.4%", code: "US" },
        { name: "FTSE", val: "7,620", change: "▲ 0.0%", code: "UK" },
        { name: "NIKKEI", val: "32,900", change: "▼ 0.2%", code: "JP" },
      ].map((m, i) => (
        <div
          key={i}
          className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {m.code === "US" ? "🇺🇸" : m.code === "UK" ? "🇬🇧" : "🇯🇵"}
            </span>
            <div>
              <div className="font-bold text-sm text-slate-700">{m.name}</div>
              <div
                className={`text-xs ${m.change.includes("▲") ? "text-green-500" : "text-red-500"
                  }`}
              >
                {m.change}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-sm text-slate-700">{m.val}</div>
            <div className="text-xs text-slate-300 tracking-tighter">∿∿∿∿</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const DiscoveryShelves = () => (
  <div className="investor-card p-6 h-full">
    <div className="card-header mb-4">
      <h3 className="text-lg font-bold text-slate-800">Discovery "Shelves"</h3>
    </div>
    <div className="space-y-0">
      {[
        {
          title: "Buffettology",
          desc: "High ROE, Low Debt, Consistent Margins",
          icon: "💎",
        },
        {
          title: "Dividend Aristocrats",
          desc: "Increasing dividends for > 5 years",
          icon: "🛡️",
        },
        {
          title: "Undervalued Giants",
          desc: "Blue-chip stocks near 52-week lows",
          icon: "📉",
        },
        {
          title: "Growth at Reasonable Price",
          desc: "PEG Ratio < 1",
          icon: "🚀",
        },
      ].map((item, i) => (
        <div
          key={i}
          className="feature-item hover:bg-slate-50 p-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="feature-icon bg-slate-100 p-2 rounded-full w-10 h-10 flex items-center justify-center text-lg">
              {item.icon}
            </div>
            <div>
              <div className="font-bold text-sm text-slate-700">
                {item.title}
              </div>
              <div className="text-xs text-slate-500">{item.desc}</div>
            </div>
          </div>
          <span className="text-gray-300">›</span>
        </div>
      ))}
    </div>
  </div>
);

const SectorLandscape = () => (
  <div className="investor-card p-6 col-span-2">
    <div className="card-header flex justify-between mb-4">
      <h3 className="text-lg font-bold text-slate-800">Sector Landscape</h3>
      <div className="flex gap-2">
        <button className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
          1 Year
        </button>
        <button className="text-xs bg-white border px-2 py-1 rounded text-slate-400">
          3 Years
        </button>
      </div>
    </div>
    <div className="h-40 flex items-end justify-between gap-4 px-4 border-b border-gray-100 pb-4">
      {[
        { label: "Auto", height: "60%", color: "bg-emerald-500", val: "+39%" },
        { label: "IT", height: "40%", color: "bg-teal-400", val: "+26%" },
        { label: "Banks", height: "20%", color: "bg-blue-500", val: "+8%" },
        { label: "Pharma", height: "15%", color: "bg-indigo-400", val: "+5%" },
        { label: "FMCG", height: "30%", color: "bg-slate-400", val: "+12%" },
      ].map((bar, i) => (
        <div
          key={i}
          className="flex flex-col items-center flex-1 group cursor-pointer"
        >
          <div
            className={`w-full max-w-[40px] rounded-t-sm transition-all group-hover:opacity-80 ${bar.color}`}
            style={{ height: bar.height }}
          ></div>
          <span className="text-xs font-bold text-slate-700 mt-2">
            {bar.label}
          </span>
          <span className="text-[10px] text-green-600 font-medium">
            {bar.val}
          </span>
        </div>
      ))}
    </div>
  </div>
);

function InvestorView({ data, movers, activeModule }) {
  if (activeModule && activeModule !== "DASHBOARD") {
    return (
      <div className="dashboard-layout fade-in flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-700 mb-2">
            {activeModule}
          </h2>
          <p className="text-slate-500">Module under development.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout fade-in">
      <div
        className="main-content-area"
        style={{ transition: "margin-left 0.3s ease" }}
      >

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
          <MarketMoodGauge />
          <ValuationThermometer />
          <GlobalPulse />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-1">
            <DiscoveryShelves />
          </div>
          <div className="md:col-span-2 space-y-6">
            <SectorLandscape />

            <div className="grid grid-cols-2 gap-6">
              <div className="investor-card p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">
                  Economic Calendar
                </h3>
                <div className="space-y-3">
                  <div className="text-xs flex justify-between">
                    <span className="flex items-center gap-2">
                      🇺🇸 FOMC Meeting
                    </span>
                    <span className="text-slate-400">July 5</span>
                  </div>
                  <div className="text-xs flex justify-between">
                    <span className="flex items-center gap-2">
                      🇯🇵 Inflation Data
                    </span>
                    <span className="text-slate-400">July 12</span>
                  </div>
                </div>
              </div>
              <div className="investor-card p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">
                  Trending Themes
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 text-green-700 text-xs p-2 rounded font-medium text-center">
                    Green Energy
                  </div>
                  <div className="bg-blue-50 text-blue-700 text-xs p-2 rounded font-medium text-center">
                    EV Ecosystem
                  </div>
                  <div className="bg-orange-50 text-orange-700 text-xs p-2 rounded font-medium text-center">
                    Defense
                  </div>
                  <div className="bg-purple-50 text-purple-700 text-xs p-2 rounded font-medium text-center">
                    AI Tech
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// TRADER MODE COMPONENTS
// ============================================

const SectorHeatmap = () => (
  <div className="trader-card flex flex-col h-full bg-transparent border border-white/10">
    <div className="card-header flex justify-between items-center mb-2 px-3 py-2 border-b border-white/10">
      <div className="flex items-center gap-2">
        <Activity size={12} className="text-[#9194a2]" />
        <h3 className="text-[#9194a2] font-bold text-xs tracking-wider uppercase">
          Sector Heatmap
        </h3>
      </div>
      <span className="text-[10px] text-[#5d606b]">NIFTY 500</span>
    </div>
    <div className="flex-1 p-2 flex gap-2">
      <motion.div
        whileHover={{ scale: 0.98 }}
        className="flex-1 bg-[#14532d]/40 border border-green-500/20 rounded-md flex flex-col justify-center items-center relative overflow-hidden group cursor-pointer"
      >
        <span className="text-white font-bold text-sm z-10">FINANCIALS</span>
        <span className="text-[#4ade80] text-lg font-mono font-bold z-10">
          +1.85%
        </span>
        <div className="absolute inset-0 bg-gradient-to-t from-green-900/20 to-transparent"></div>
      </motion.div>

      <motion.div
        whileHover={{ scale: 0.98 }}
        className="flex-1 bg-[#14532d]/40 border border-green-500/20 rounded-md flex flex-col justify-center items-center relative overflow-hidden group cursor-pointer"
      >
        <span className="text-white font-bold text-sm z-10">TECHNOLOGY</span>
        <span className="text-[#4ade80] text-lg font-mono font-bold z-10">
          +1.42%
        </span>
        <div className="absolute inset-0 bg-gradient-to-t from-green-900/20 to-transparent"></div>
      </motion.div>

      <div className="flex flex-col gap-2 w-1/4">
        <motion.div className="flex-1 bg-[#7f1d1d]/40 border border-red-500/20 rounded-md flex flex-col justify-center items-center">
          <span className="text-gray-300 text-[10px] font-semibold">AUTO</span>
          <span className="text-[#fecaca] text-xs font-mono font-bold">
            -0.45%
          </span>
        </motion.div>
        <motion.div className="flex-1 bg-[#14532d]/40 border border-green-500/20 rounded-md flex flex-col justify-center items-center">
          <span className="text-gray-300 text-[10px] font-semibold">
            PHARMA
          </span>
          <span className="text-[#4ade80] text-xs font-mono font-bold">
            +0.2%
          </span>
        </motion.div>
      </div>

      <div className="flex flex-col gap-2 w-1/4">
        <motion.div className="flex-1 bg-[#334155]/40 border border-slate-500/20 rounded-md flex flex-col justify-center items-center">
          <span className="text-gray-300 text-[10px] font-semibold">FMCG</span>
          <span className="text-slate-300 text-xs font-mono font-bold">0%</span>
        </motion.div>
        <motion.div className="flex-1 bg-[#991b1b]/40 border border-red-500/20 rounded-md flex flex-col justify-center items-center">
          <span className="text-gray-300 text-[10px] font-semibold">
            METALS
          </span>
          <span className="text-[#fecaca] text-xs font-mono font-bold">
            -1.1%
          </span>
        </motion.div>
      </div>
    </div>
  </div>
);

const GapLists = () => {
  const [activeTab, setActiveTab] = useState("GAINERS");

  return (
    <div className="trader-card flex flex-col h-full bg-transparent border border-white/10">
      <div className="card-header flex justify-between items-center mb-2 px-3 py-2 border-b border-white/10">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("GAINERS")}
            className={`flex items-center gap-1 text-[10px] font-bold tracking-wider transition-colors ${activeTab === "GAINERS" ? "text-white" : "text-[#9194a2]"
              }`}
          >
            <TrendingUp
              size={12}
              className={
                activeTab === "GAINERS" ? "text-[#3db26b]" : "text-gray-600"
              }
            />
            GAINERS
          </button>
          <button
            onClick={() => setActiveTab("LOSERS")}
            className={`flex items-center gap-1 text-[10px] font-bold tracking-wider transition-colors ${activeTab === "LOSERS" ? "text-white" : "text-[#9194a2]"
              }`}
          >
            <TrendingDown
              size={12}
              className={
                activeTab === "LOSERS" ? "text-[#ed5750]" : "text-gray-600"
              }
            />
            LOSERS
          </button>
        </div>
        <Maximize2
          size={10}
          className="text-[#9194a2] cursor-pointer hover:text-white"
        />
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar p-3">
        {(activeTab === "GAINERS"
          ? [
            { s: "TCS", v: "+2.5%", p: "3,450" },
            { s: "INFY", v: "+1.8%", p: "1,420" },
            { s: "WIPRO", v: "+1.1%", p: "410" },
            { s: "TECHM", v: "+0.9%", p: "1,250" },
            { s: "LTIM", v: "+0.8%", p: "5,600" },
            { s: "HCLTECH", v: "+0.7%", p: "1,180" },
            { s: "PERSISTENT", v: "+0.6%", p: "5,200" },
            { s: "COFORGE", v: "+0.5%", p: "4,800" },
          ]
          : [
            { s: "ADANIENT", v: "-3.2%", p: "2,400" },
            { s: "TATAMOTORS", v: "-2.1%", p: "560" },
            { s: "SBIN", v: "-1.5%", p: "580" },
            { s: "BAJFINANCE", v: "-1.2%", p: "7,100" },
            { s: "MARUTI", v: "-1.0%", p: "9,800" },
            { s: "M&M", v: "-0.9%", p: "1,450" },
            { s: "TATAPOWER", v: "-0.8%", p: "285" },
          ]
        ).map((i, idx) => (
          <div
            key={idx}
            className="flex justify-between items-center group cursor-pointer"
          >
            <div>
              <div className="font-bold text-[#e2e8f0] text-xs group-hover:text-white">
                {i.s}
              </div>
              <div className="text-[10px] text-gray-500 font-mono">{i.p}</div>
            </div>
            <span
              className={`${activeTab === "GAINERS" ? "text-[#3db26b]" : "text-[#ed5750]"
                } font-mono text-xs font-bold`}
            >
              {i.v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const VolumeShockers = () => (
  <div className="trader-card flex flex-col h-full bg-transparent border border-white/10">
    <div className="card-header flex justify-between items-center mb-2 px-3 py-2 border-b border-white/10">
      <div className="flex items-center gap-2">
        <div className="text-yellow-500">⚡</div>
        <h3 className="text-[#9194a2] font-bold text-xs tracking-wider uppercase">
          VOL SHOCKERS
        </h3>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></span>
        <span className="text-[10px] text-yellow-500 font-bold">LIVE</span>
      </div>
    </div>
    <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar p-3">
      {[
        { s: "ADANIENT", v: "3.5x", c: "text-[#bc13fe]", b: "bg-[#bc13fe]", p: 85 },
        { s: "HDFCBANK", v: "2.8x", c: "text-[#3b82f6]", b: "bg-[#3b82f6]", p: 65 },
        { s: "IDEA", v: "2.1x", c: "text-[#f97316]", b: "bg-[#f97316]", p: 50 },
        { s: "RELIANCE", v: "1.9x", c: "text-[#94a3b8]", b: "bg-[#94a3b8]", p: 35 },
        { s: "TATAMOTORS", v: "1.8x", c: "text-[#94a3b8]", b: "bg-[#94a3b8]", p: 30 },
        { s: "BAJFINANCE", v: "1.7x", c: "text-[#10b981]", b: "bg-[#10b981]", p: 45 },
        { s: "ICICIBANK", v: "1.6x", c: "text-[#06b6d4]", b: "bg-[#06b6d4]", p: 40 },
        { s: "AXISBANK", v: "1.5x", c: "text-[#8b5cf6]", b: "bg-[#8b5cf6]", p: 38 },
      ].map((i, idx) => (
        <div
          key={idx}
          className="flex justify-between items-center group cursor-pointer"
        >
          <span className="font-bold text-[#e2e8f0] text-xs w-24 group-hover:text-white transition-colors">
            {i.s}
          </span>
          <div className="flex flex-1 items-center gap-3 justify-end">
            <div className="h-2 w-20 bg-white/5 rounded-full overflow-hidden relative">
              <div
                style={{ width: `${i.p}%` }}
                className={`h-full ${i.b} opacity-80 rounded-full shadow-[0_0_8px_currentColor]`}
              ></div>
            </div>
            <span className={`${i.c} font-mono text-xs font-bold w-8 text-right`}>
              {i.v}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MultiChartGrid = ({ className, onOpenChart, chartType, timeframe = "15m", showIndicators = false, layout = "4-grid" }) => {

  // Get data for current timeframe
  const currentData = chartDataByTimeframe[timeframe];
  const areaData = currentData?.area || priceData;
  const candleData = currentData?.candles || candlestickData;

  // Calculate moving averages for indicators
  const calculateMA = (data, period) => {
    return data.map((point, index) => {
      if (index < period - 1) return null;
      const sum = data.slice(index - period + 1, index + 1).reduce((acc, p) => acc + (p.price || p.close), 0);
      return sum / period;
    });
  };

  const ma7 = showIndicators ? calculateMA(areaData, 7) : [];
  const ma25 = showIndicators ? calculateMA(areaData, 25) : [];

  // Custom candlestick shape component
  const CandlestickBar = (props) => {
    const { x, y, width, height, payload } = props;
    if (!payload) return null;

    const { open, close, high, low } = payload;
    const isGreen = close >= open;
    const color = isGreen ? "#22C55E" : "#EF4444";

    const bodyHeight = Math.abs(close - open) * (height / (payload.high - payload.low));
    const bodyY = isGreen ? y + (high - close) * (height / (high - low)) : y + (high - open) * (height / (high - low));
    const wickX = x + width / 2;

    return (
      <g>
        {/* High-Low wick */}
        <line
          x1={wickX}
          y1={y}
          x2={wickX}
          y2={y + height}
          stroke={color}
          strokeWidth={1}
        />
        {/* Open-Close body */}
        <rect
          x={x}
          y={bodyY}
          width={width}
          height={bodyHeight || 1}
          fill={color}
          stroke={color}
          strokeWidth={1}
        />
      </g>
    );
  };

  // Determine grid layout classes
  const getGridClass = () => {
    switch (layout) {
      case "1-grid": return "grid-cols-1 grid-rows-1";
      case "2-grid": return "grid-cols-2 grid-rows-1";
      case "4-grid": return "grid-cols-2 grid-rows-2";
      default: return "grid-cols-2 grid-rows-2";
    }
  };

  // Determine which charts to show based on layout
  const getChartsToShow = () => {
    const allCharts = ["NIFTY 50", "BANKNIFTY", "RELIANCE", "HDFCBANK"];
    switch (layout) {
      case "1-grid": return [allCharts[0]];
      case "2-grid": return allCharts.slice(0, 2);
      case "4-grid": return allCharts;
      default: return allCharts;
    }
  };

  const chartsToShow = getChartsToShow();

  return (
    <div className={`${className} h-full`}>
      <div className="trader-card h-full flex flex-col bg-transparent border border-white/10 p-0 overflow-hidden">
        <div className="flex justify-between items-center px-3 py-2 bg-white/5 border-b border-white/10">
          <h3 className="text-[#9194a2] font-bold text-xs">
            MULTI-CHART WORKSPACE
          </h3>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-[#5d606b] mr-2">LAYOUT: {layout.toUpperCase()}</span>
            <span className="text-xs text-[#3db26b] font-mono">{timeframe.toUpperCase()}</span>
            {showIndicators && (
              <span className="text-xs text-[#9194a2]">• MA(7,25)</span>
            )}
          </div>
        </div>
        <div className={`flex-1 grid ${getGridClass()}`}>
          {chartsToShow.map((title, i) => (
            <div
              key={i}
              className={`bg-[#0b0e14] relative group flex flex-col ${layout === "4-grid" && i % 2 === 0 ? 'border-r border-white/5' : ''
                } ${layout === "4-grid" && i < 2 ? 'border-b border-white/5' : ''
                } ${layout === "2-grid" && i === 0 ? 'border-r border-white/5' : ''
                }`}
            >
              <div className="flex justify-between text-xs px-2 py-1.5 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#e2e8f0] font-bold text-xs">
                      {title}
                    </span>
                    <span className="text-[#3db26b] text-[10px] font-mono">
                      {18500 + i * 100} (+0.{5 + i}%)
                    </span>
                  </div>
                  <div className="flex gap-2 text-[10px] text-[#5d606b] font-mono mt-0.5">
                    <span>
                      O:<span className="text-[#9194a2] ml-0.5">{18420 + i * 50}</span>
                    </span>
                    <span>
                      H:<span className="text-[#9194a2] ml-0.5">{18550 + i * 50}</span>
                    </span>
                    <span>
                      L:<span className="text-[#9194a2] ml-0.5">{18400 + i * 50}</span>
                    </span>
                    <span>
                      C:<span className="text-[#9194a2] ml-0.5">{18500 + i * 50}</span>
                    </span>
                  </div>
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity items-center">
                  <Settings size={12} className="cursor-pointer hover:text-white" />
                  <Maximize2
                    size={12}
                    className="cursor-pointer hover:text-white"
                    onClick={() => onOpenChart?.(title)}
                  />
                </div>
              </div>

              <div
                className="flex-1 w-full relative p-1 cursor-pointer"
                onClick={() => onOpenChart?.(title)}
              >
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "area" ? (
                    <AreaChart data={areaData}>
                      <defs>
                        <linearGradient id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3db26b" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#3db26b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#161c27",
                          border: "1px solid #293839",
                          fontSize: "10px",
                          color: "#fff",
                        }}
                        itemStyle={{ color: "#fff" }}
                        labelStyle={{ display: "none" }}
                      />
                      <XAxis dataKey="time" hide />
                      <YAxis hide domain={["auto", "auto"]} />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#3db26b"
                        fill={`url(#grad${i})`}
                        strokeWidth={1.5}
                        isAnimationActive={false}
                      />
                      {/* Moving Average Indicators */}
                      {showIndicators && (
                        <>
                          <Line
                            type="monotone"
                            data={areaData.map((d, idx) => ({ ...d, ma7: ma7[idx] }))}
                            dataKey="ma7"
                            stroke="#FFA500"
                            strokeWidth={1}
                            dot={false}
                            isAnimationActive={false}
                          />
                          <Line
                            type="monotone"
                            data={areaData.map((d, idx) => ({ ...d, ma25: ma25[idx] }))}
                            dataKey="ma25"
                            stroke="#FF1493"
                            strokeWidth={1}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </>
                      )}
                      <CartesianGrid
                        stroke="#293839"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                    </AreaChart>
                  ) : (
                    <ComposedChart data={candleData}>
                      <defs>
                        <linearGradient id={`candleGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3db26b" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#3db26b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#161c27",
                          border: "1px solid #293839",
                          fontSize: "10px",
                          color: "#fff",
                        }}
                        itemStyle={{ color: "#fff" }}
                        labelStyle={{ color: "#9194a2" }}
                        formatter={(value, name) => {
                          const labels = { open: "O", high: "H", low: "L", close: "C" };
                          return [value, labels[name] || name];
                        }}
                      />
                      <XAxis dataKey="time" hide />
                      <YAxis hide domain={["dataMin - 100", "dataMax + 100"]} />
                      <CartesianGrid
                        stroke="#293839"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      {/* Candlestick bars */}
                      <Bar
                        dataKey="high"
                        shape={<CandlestickBar />}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AdvancedWatchlist = () => (
  <div className="trader-card flex flex-col h-full bg-transparent border border-white/10">
    <div className="card-header flex justify-between items-center mb-0 px-3 py-2 bg-white/5 border-b border-white/10">
      <h3 className="text-[#9194a2] font-bold text-xs tracking-wider">
        ADVANCED WATCHLIST
      </h3>
      <div className="flex gap-2 text-[#9194a2] items-center">
        <div className="bg-[#3db26b]/10 text-[#3db26b] px-2 py-0.5 rounded text-[10px] font-bold border border-[#3db26b]/20 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-[#3db26b] rounded-full animate-pulse"></span>
          Live
        </div>
        <Search size={13} className="cursor-pointer hover:text-white" />
      </div>
    </div>
    <div className="watchlist-body flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 z-10 bg-[#0f1520]">
          <tr className="text-[10px] text-[#5d606b] font-bold uppercase tracking-wider border-b border-white/10">
            <th className="py-2 pl-3 w-[22%]">Symbol</th>
            <th className="py-2 text-center w-[18%]">Trend</th>
            <th className="py-2 text-right w-[18%]">LTP</th>
            <th className="py-2 text-right w-[12%]">Chg%</th>
            <th className="py-2 text-center w-[12%]">Vol</th>
            <th className="py-2 text-center pr-2 w-[18%]">Outlook</th>
          </tr>
        </thead>
        <tbody className="text-xs">
          {[
            { sym: "TCS", ltp: "3,450", chg: "+1.2%", vol: 85, outlook: "Breakout", outColor: "#3db26b", data: priceData },
            { sym: "INFY", ltp: "1,420", chg: "-0.5%", vol: 45, outlook: "Reversal", outColor: "#ed5750", data: [...priceData].reverse() },
            { sym: "BANKNIFTY", ltp: "44,200", chg: "+0.8%", vol: 90, outlook: "Momentum", outColor: "#3db26b", data: priceData },
            { sym: "RELIANCE", ltp: "2,550", chg: "+0.3%", vol: 30, outlook: "Hold", outColor: "#f0b429", data: priceData },
            { sym: "HDFCBANK", ltp: "1,650", chg: "+0.6%", vol: 60, outlook: "Breakout", outColor: "#3db26b", data: priceData },
            { sym: "ADANIENT", ltp: "2,400", chg: "-1.2%", vol: 70, outlook: "Sell", outColor: "#ed5750", data: [...priceData].reverse() },
            { sym: "SBIN", ltp: "580", chg: "+0.2%", vol: 20, outlook: "Sideways", outColor: "#8b909a", data: priceData },
            { sym: "WIPRO", ltp: "410", chg: "-0.1%", vol: 25, outlook: "Watch", outColor: "#f0b429", data: [...priceData].reverse() },
            { sym: "ICICIBANK", ltp: "950", chg: "+0.4%", vol: 55, outlook: "Momentum", outColor: "#3db26b", data: priceData },
            { sym: "LT", ltp: "2,890", chg: "+1.5%", vol: 75, outlook: "Breakout", outColor: "#3db26b", data: priceData },
            { sym: "AXISBANK", ltp: "980", chg: "-0.3%", vol: 40, outlook: "Reversal", outColor: "#ed5750", data: [...priceData].reverse() },
          ].map((row, i) => {
            const isPos = row.chg.includes("+");
            return (
              <tr
                key={i}
                className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer"
              >
                {/* Symbol */}
                <td className="py-2 pl-3 font-bold text-[#d1d4dc] group-hover:text-white text-[11px]">
                  {row.sym}
                </td>

                {/* Sparkline Trend */}
                <td className="py-2">
                  <div className="flex justify-center">
                    <svg width="52" height="22" viewBox="0 0 52 22">
                      {(() => {
                        const pts = row.data.slice(0, 12);
                        const vals = pts.map(p => p.price);
                        const min = Math.min(...vals);
                        const max = Math.max(...vals);
                        const range = max - min || 1;
                        const points = vals.map((v, idx) =>
                          `${(idx / (vals.length - 1)) * 50 + 1},${20 - ((v - min) / range) * 18 + 1}`
                        ).join(" ");
                        const color = isPos ? "#3db26b" : "#ed5750";
                        return (
                          <>
                            <polyline
                              points={points}
                              fill="none"
                              stroke={color}
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {/* Last dot */}
                            {(() => {
                              const last = points.split(" ").pop().split(",");
                              return <circle cx={last[0]} cy={last[1]} r="2" fill={color} />;
                            })()}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </td>

                {/* LTP */}
                <td className="py-2 text-right text-[#e2e8f0] font-mono text-[11px] pr-1">
                  {row.ltp}
                </td>

                {/* Change % */}
                <td className={`py-2 text-right font-mono text-[11px] font-bold ${isPos ? "text-[#3db26b]" : "text-[#ed5750]"}`}>
                  {row.chg}
                </td>

                {/* Volume bar */}
                <td className="py-2 px-2">
                  <div className="w-full h-1.5 bg-white/5 rounded overflow-hidden">
                    <div
                      style={{ width: `${row.vol}%`, background: isPos ? "#3db26b" : "#ed5750", opacity: 0.7 }}
                      className="h-full rounded"
                    />
                  </div>
                  <div className="text-[9px] text-[#5d606b] text-center mt-0.5">{row.vol}%</div>
                </td>

                {/* Outlook badge */}
                <td className="py-2 pr-2 text-center">
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      color: row.outColor,
                      background: `${row.outColor}18`,
                      border: `1px solid ${row.outColor}40`,
                    }}
                  >
                    {row.outlook}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);



const KeyLevelsPanel = () => (
  <div className="trader-card flex flex-col h-full bg-gradient-to-br from-[#131722] to-[#1a1e2e] border border-white/10">
    <div className="card-header flex justify-between items-center mb-3 px-3 py-2.5 bg-gradient-to-r from-[#2a2e39] to-[#1f232e] border-b border-white/10">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-[#3db26b] rounded-full animate-pulse"></div>
        <h3 className="text-[#9194a2] font-bold text-xs tracking-wider">
          KEY LEVELS
        </h3>
      </div>
      <span className="text-[10px] text-[#5d606b] bg-white/5 px-2 py-1 rounded">NIFTY 50</span>
    </div>
    <div className="flex-1 px-3 pb-3 space-y-2.5">
      {[
        { label: "Resistance", value: "18,550", color: "text-[#ed5750]", icon: "🔴", bg: "bg-[#ed5750]/10" },
        { label: "VWAP", value: "18,480", color: "text-[#8b909a]", icon: "📊", bg: "bg-white/5" },
        { label: "Current", value: "18,500", color: "text-[#d1d4dc]", icon: "🎯", bg: "bg-blue-500/10" },
        { label: "Support", value: "18,400", color: "text-[#3db26b]", icon: "🟢", bg: "bg-[#3db26b]/10" },
        { label: "Weekly High", value: "18,620", color: "text-[#8b909a]", icon: "⬆️", bg: "bg-white/5" },
        { label: "Weekly Low", value: "17,950", color: "text-[#8b909a]", icon: "⬇️", bg: "bg-white/5" },
      ].map((row, idx) => (
        <div key={idx} className={`flex justify-between items-center text-xs ${row.bg} rounded-lg p-2.5 hover:scale-[1.02] transition-transform`}>
          <div className="flex items-center gap-2">
            <span className="text-sm">{row.icon}</span>
            <span className="text-[#8b909a] uppercase text-[10px] tracking-wider font-semibold">{row.label}</span>
          </div>
          <span className={`font-mono font-bold text-sm ${row.color}`}>{row.value}</span>
        </div>
      ))}
    </div>
  </div>
);

const TrendStrengthPanel = () => (
  <div className="trader-card flex flex-col h-full border border-white/10" style={{ background: '#0d1117' }}>
    {/* Header */}
    <div className="card-header flex justify-between items-center px-3 py-2.5 border-b border-white/10" style={{ background: '#161b27' }}>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-[#3db26b] rounded-full animate-pulse"></div>
        <div>
          <h3 className="text-[#9194a2] font-bold text-xs tracking-wider">TREND MATRIX</h3>
          <p className="text-[9px] text-[#5d606b] mt-0.5">Multi-timeframe trend alignment per instrument</p>
        </div>
      </div>
      <span className="text-[9px] text-[#3db26b] bg-[#3db26b]/10 px-2 py-0.5 rounded border border-[#3db26b]/20 font-bold">● LIVE</span>
    </div>

    {/* Table */}
    <div className="flex-1 px-2 pb-2 pt-1 overflow-y-auto custom-scrollbar" style={{ scrollbarColor: '#2a2e39 transparent' }}>
      <table className="w-full text-xs border-collapse">
        {/* Column Headers */}
        <thead>
          <tr style={{ background: '#1a1f2e' }}>
            <th className="py-2 px-2 text-left text-[9px] text-[#5d606b] uppercase tracking-wider font-semibold rounded-l w-[28%]">Symbol</th>
            <th className="py-2 text-center text-[9px] text-[#5d606b] uppercase tracking-wider font-semibold">5M</th>
            <th className="py-2 text-center text-[9px] text-[#5d606b] uppercase tracking-wider font-semibold">15M</th>
            <th className="py-2 text-center text-[9px] text-[#5d606b] uppercase tracking-wider font-semibold">1H</th>
            <th className="py-2 text-center text-[9px] text-[#5d606b] uppercase tracking-wider font-semibold">4H</th>
            <th className="py-2 text-center text-[9px] text-[#5d606b] uppercase tracking-wider font-semibold rounded-r">1D</th>
          </tr>
        </thead>
        <tbody>
          {[
            { sym: "NIFTY 50", d: ["↑", "↑", "↑", "→", "↓"], score: 60 },
            { sym: "BANKNIFTY", d: ["↑", "↓", "↑", "↑", "↑"], score: 80 },
            { sym: "FINNIFTY", d: ["↑", "↑", "↑", "↑", "→"], score: 85 },
            { sym: "RELIANCE", d: ["→", "↑", "↑", "↑", "↑"], score: 80 },
            { sym: "INFY", d: ["↑", "↑", "↓", "→", "↑"], score: 60 },
            { sym: "HDFCBANK", d: ["↓", "↓", "↑", "↑", "↑"], score: 60 },
            { sym: "ADANIENT", d: ["↓", "↓", "↓", "↓", "→"], score: 20 },
            { sym: "TCS", d: ["↑", "↑", "↑", "↑", "↑"], score: 100 },
          ].map((row, idx) => {
            const ups = row.d.filter(x => x === "↑").length;
            const downs = row.d.filter(x => x === "↓").length;
            const bias = ups > downs ? "#3db26b" : downs > ups ? "#ed5750" : "#8b909a";
            return (
              <tr key={idx} className="border-b transition-colors cursor-pointer" style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#1a1f2e'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Symbol */}
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: bias }}></div>
                    <span className="text-white font-bold text-[10px] truncate">{row.sym}</span>
                  </div>
                </td>
                {/* Timeframe cells */}
                {row.d.map((dir, i) => (
                  <td key={i} className="py-2.5 text-center">
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                      style={{
                        background: dir === "↑" ? "rgba(61,178,107,0.2)" : dir === "↓" ? "rgba(237,87,80,0.2)" : "rgba(255,255,255,0.08)",
                        color: dir === "↑" ? "#3db26b" : dir === "↓" ? "#ed5750" : "#8b909a",
                        boxShadow: dir === "↑" ? "0 0 8px rgba(61,178,107,0.25)" : dir === "↓" ? "0 0 8px rgba(237,87,80,0.25)" : "none",
                      }}
                    >
                      {dir}
                    </span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {/* Legend + Market Bias Footer */}
    <div className="px-3 py-2 border-t border-white/10 flex items-center justify-between" style={{ background: '#161b27' }}>
      <div className="flex items-center gap-3 text-[9px]">
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px] font-bold" style={{ background: 'rgba(61,178,107,0.2)', color: '#3db26b' }}>↑</span>
          <span className="text-[#5d606b]">Bullish</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px] font-bold" style={{ background: 'rgba(237,87,80,0.2)', color: '#ed5750' }}>↓</span>
          <span className="text-[#5d606b]">Bearish</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px] font-bold" style={{ background: 'rgba(255,255,255,0.08)', color: '#8b909a' }}>→</span>
          <span className="text-[#5d606b]">Neutral</span>
        </div>
      </div>
      <div className="text-[9px] font-bold" style={{ color: '#3db26b' }}>
        Market Bias: <span>Bullish</span>
      </div>
    </div>
  </div>
);



const InstrumentSummaryPanel = () => (
  <div className="trader-card flex flex-col h-full border border-white/10" style={{ background: '#0d1117' }}>
    {/* Header */}
    <div className="card-header flex justify-between items-center px-3 py-2.5 border-b border-white/10" style={{ background: '#161b27' }}>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-[#3db26b] rounded-full animate-pulse"></div>
        <div>
          <h3 className="text-[#9194a2] font-bold text-xs tracking-wider">INSTRUMENT SUMMARY</h3>
          <p className="text-[9px] text-[#5d606b] mt-0.5">Technical health of NIFTY 50</p>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[18px] font-black" style={{ color: '#3db26b' }}>82</span>
        <span className="text-[8px] text-[#5d606b] uppercase tracking-wider">Score</span>
      </div>
    </div>

    {/* Metrics */}
    <div className="flex-1 px-3 pb-3 pt-2 space-y-2 overflow-y-auto custom-scrollbar">
      {[
        { label: "Trend", value: "Bullish", color: "#3db26b", icon: "📈", progress: 85, sub: "Above all key EMAs" },
        { label: "Momentum", value: "Strong", color: "#3db26b", icon: "⚡", progress: 90, sub: "RSI 67 · MACD +ve" },
        { label: "Volume", value: "Above Avg", color: "#3db26b", icon: "📊", progress: 75, sub: "2.1x 20-day average" },
        { label: "Volatility", value: "Moderate", color: "#f0b429", icon: "🌊", progress: 50, sub: "VIX 14.2 · Normal" },
        { label: "Breadth", value: "Positive", color: "#3db26b", icon: "🧭", progress: 70, sub: "68% stocks advancing" },
        { label: "Strength Score", value: "82 / 100", color: "#d1d4dc", icon: "💪", progress: 82, sub: "Strong bull setup" },
      ].map((row, idx) => (
        <div key={idx} className="rounded-lg p-2.5 transition-all" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.07)' }}
          onMouseEnter={e => e.currentTarget.style.background = '#1f2540'}
          onMouseLeave={e => e.currentTarget.style.background = '#1a1f2e'}
        >
          <div className="flex justify-between items-center mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm">{row.icon}</span>
              <div>
                <span className="text-[#9ca3af] uppercase text-[9px] tracking-wider font-semibold">{row.label}</span>
                <div className="text-[9px] text-[#4b5563] mt-0.5">{row.sub}</div>
              </div>
            </div>
            <span className="font-bold text-[11px] font-mono" style={{ color: row.color }}>{row.value}</span>
          </div>
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${row.progress}%`,
                background: row.progress >= 75
                  ? 'linear-gradient(90deg, #3db26b, #5dd68d)'
                  : row.progress >= 50
                    ? 'linear-gradient(90deg, #d97706, #f0b429)'
                    : 'linear-gradient(90deg, #6b7280, #9ca3af)',
                boxShadow: row.progress >= 75 ? '0 0 6px rgba(61,178,107,0.4)' : 'none',
              }}
            />
          </div>
        </div>
      ))}
    </div>

    {/* Footer */}
    <div className="px-3 py-2 border-t border-white/10 flex justify-between items-center" style={{ background: '#161b27' }}>
      <span className="text-[9px] text-[#5d606b]">Updated: 15:49 IST</span>
      <span className="text-[9px] font-bold" style={{ color: '#3db26b' }}>Overall: Bullish ↑</span>
    </div>
  </div>
);


const SignalEnginePanel = () => (
  <div className="trader-card flex flex-col h-full border border-white/10" style={{ background: '#0d1117' }}>
    {/* Header */}
    <div className="card-header flex justify-between items-center px-3 py-2.5 border-b border-white/10" style={{ background: '#161b27' }}>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-[#3db26b] rounded-full animate-pulse"></div>
        <h3 className="text-[#9194a2] font-bold text-xs tracking-wider">RESEARCH INSIGHTS</h3>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-[#8b909a] italic">For informational use only</span>
        <span className="text-[9px] text-[#3db26b] bg-[#3db26b]/10 px-2 py-0.5 rounded border border-[#3db26b]/20 font-bold">● LIVE</span>
      </div>
    </div>

    {/* Research Cards */}
    <div className="flex-1 px-3 pb-3 pt-2 space-y-3 overflow-y-auto custom-scrollbar">
      {[
        {
          sym: "INFY",
          pattern: "Ascending Triangle",
          patternColor: "#3db26b",
          timeframe: "1H",
          indicators: [
            { name: "RSI (14)", value: "67.4", note: "Near overbought zone", color: "#f0b429" },
            { name: "MACD", value: "+0.82", note: "Bullish crossover", color: "#3db26b" },
            { name: "Volume", value: "2.3x Avg", note: "Above average", color: "#3db26b" },
            { name: "EMA 20", value: "1,408", note: "Price above EMA", color: "#3db26b" },
          ],
          tfAlign: ["↑", "↑", "↑", "→"],
          note: "Price consolidating near resistance. Volume expansion observed. Watch for a decisive close above ₹1,435 for confirmation.",
        },
        {
          sym: "RELIANCE",
          pattern: "Double Bottom",
          patternColor: "#f0b429",
          timeframe: "4H",
          indicators: [
            { name: "RSI (14)", value: "31.2", note: "Oversold territory", color: "#3db26b" },
            { name: "MACD", value: "-1.20", note: "Histogram shrinking", color: "#f0b429" },
            { name: "Volume", value: "1.1x Avg", note: "Near average", color: "#8b909a" },
            { name: "EMA 50", value: "2,560", note: "Price below EMA", color: "#ed5750" },
          ],
          tfAlign: ["↓", "→", "↓", "↓"],
          note: "Potential base forming at ₹2,510 support zone. RSI divergence visible. Needs volume confirmation before any directional bias.",
        },
        {
          sym: "ADANIENT",
          pattern: "Head & Shoulders",
          patternColor: "#ed5750",
          timeframe: "1D",
          indicators: [
            { name: "RSI (14)", value: "58.1", note: "Neutral range", color: "#8b909a" },
            { name: "MACD", value: "-2.40", note: "Bearish crossover", color: "#ed5750" },
            { name: "Volume", value: "3.1x Avg", note: "High volume breakdown", color: "#ed5750" },
            { name: "EMA 20", value: "2,445", note: "Price below EMA", color: "#ed5750" },
          ],
          tfAlign: ["↓", "↓", "↓", "→"],
          note: "Classic H&S neckline breach on daily chart. High volume on breakdown adds significance. Pattern target zone: ₹2,280–2,320.",
        },
      ].map((item, idx) => (
        <div
          key={idx}
          className="rounded-xl p-3 transition-all"
          style={{
            border: `1px solid ${item.patternColor}50`,
            background: '#131722',
            boxShadow: `0 0 0 1px ${item.patternColor}15 inset`,
          }}
        >
          {/* Symbol + Pattern + Timeframe */}
          <div className="flex justify-between items-center mb-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-bold text-sm tracking-wide">{item.sym}</span>
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ color: item.patternColor, background: `${item.patternColor}18`, border: `1px solid ${item.patternColor}35` }}
              >
                {item.pattern}
              </span>
            </div>
            <span className="text-[9px] text-[#5d606b] bg-white/5 px-2 py-0.5 rounded font-mono">{item.timeframe}</span>
          </div>

          {/* Indicators Grid */}
          <div className="grid grid-cols-2 gap-1.5 mb-2.5">
            {item.indicators.map((ind, i) => (
              <div key={i} className="rounded-lg px-2 py-1.5" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold">{ind.name}</span>
                  <span className="text-[11px] font-mono font-bold" style={{ color: ind.color }}>{ind.value}</span>
                </div>
                <div className="text-[9px] text-[#4b5563] mt-0.5">{ind.note}</div>
              </div>
            ))}
          </div>

          {/* Multi-Timeframe Alignment */}
          <div className="flex items-center gap-2 mb-2.5" style={{ background: '#1a1f2e', borderRadius: '8px', padding: '6px 8px' }}>
            <span className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold">TF Align:</span>
            {["5M", "15M", "1H", "1D"].map((tf, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-[8px] text-[#5d606b]">{tf}</span>
                <span className={`text-xs font-bold ${item.tfAlign[i] === "↑" ? "text-[#3db26b]" : item.tfAlign[i] === "↓" ? "text-[#ed5750]" : "text-[#8b909a]"}`}>
                  {item.tfAlign[i]}
                </span>
              </div>
            ))}
          </div>

          {/* Research Note */}
          <div
            className="rounded-lg px-2.5 py-2"
            style={{ background: '#1a1f2e', borderLeft: `2px solid ${item.patternColor}`, border: '1px solid rgba(255,255,255,0.08)', borderLeftWidth: '2px', borderLeftColor: item.patternColor }}
          >
            <div className="text-[9px] uppercase tracking-wider mb-1 font-bold" style={{ color: item.patternColor }}>📋 Research Note</div>
            <p className="text-[10px] text-[#9ca3af] leading-relaxed">{item.note}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);


const CatalystPanel = () => (
  <div className="trader-card flex flex-col h-full border border-white/10" style={{ background: '#0d1117' }}>
    {/* Header */}
    <div className="card-header flex justify-between items-center px-3 py-2.5 border-b border-white/10" style={{ background: '#161b27' }}>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-[#3db26b] rounded-full animate-pulse"></div>
        <div>
          <h3 className="text-[#9194a2] font-bold text-xs tracking-wider">MARKET CATALYSTS</h3>
          <p className="text-[9px] text-[#5d606b] mt-0.5">Events that may drive price action today</p>
        </div>
      </div>
      <span className="text-[9px] text-[#f0b429] bg-[#f0b429]/10 px-2 py-0.5 rounded border border-[#f0b429]/20 font-bold">18 Feb</span>
    </div>

    {/* Events */}
    <div className="flex-1 px-3 pb-2 pt-2 space-y-2 overflow-y-auto custom-scrollbar">
      {[
        {
          time: "09:15", msg: "Market Open — Gap-up expected",
          impact: "HIGH", impactColor: "#3db26b",
          icon: "🔔", sector: "Broad Market",
          border: "#3db26b",
        },
        {
          time: "10:00", msg: "RBI Monetary Policy Statement",
          impact: "HIGH", impactColor: "#ed5750",
          icon: "🏦", sector: "Banking · NBFC",
          border: "#ed5750",
        },
        {
          time: "12:30", msg: "INFY Q3 Earnings Release",
          impact: "HIGH", impactColor: "#ed5750",
          icon: "💰", sector: "IT Sector",
          border: "#ed5750",
        },
        {
          time: "14:00", msg: "US CPI Data — Pre-market impact",
          impact: "MED", impactColor: "#f0b429",
          icon: "🌐", sector: "Global · FII Flow",
          border: "#f0b429",
        },
        {
          time: "15:30", msg: "F&O Weekly Expiry — High volatility",
          impact: "MED", impactColor: "#f0b429",
          icon: "⏰", sector: "Derivatives",
          border: "#f0b429",
        },
        {
          time: "EOD", msg: "FII/DII Provisional Data",
          impact: "LOW", impactColor: "#8b909a",
          icon: "📋", sector: "Institutional Flow",
          border: "#8b909a",
        },
      ].map((item, idx) => (
        <div
          key={idx}
          className="rounded-lg p-2.5 transition-all cursor-pointer"
          style={{
            background: '#131722',
            border: `1px solid ${item.border}30`,
            borderLeft: `3px solid ${item.border}`,
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1a1f2e'}
          onMouseLeave={e => e.currentTarget.style.background = '#131722'}
        >
          <div className="flex items-start gap-2">
            <span className="text-base mt-0.5 flex-shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-1">
                <span className="text-[11px] text-white font-semibold leading-tight">{item.msg}</span>
                <span
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{ color: item.impactColor, background: `${item.impactColor}18` }}
                >
                  {item.impact}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-mono text-[#5d606b]">{item.time}</span>
                <span className="text-[#2a2e39]">·</span>
                <span className="text-[9px] text-[#5d606b]">{item.sector}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Footer */}
    <div className="px-3 py-2 border-t border-white/10 flex justify-between items-center" style={{ background: '#161b27' }}>
      <span className="text-[9px] text-[#5d606b]">6 events today</span>
      <div className="flex items-center gap-2 text-[9px]">
        <span className="text-[#ed5750] font-bold">2 HIGH</span>
        <span className="text-[#f0b429] font-bold">2 MED</span>
        <span className="text-[#5d606b]">1 LOW</span>
      </div>
    </div>
  </div>
);


const TechnicalScreeners = () => {
  const [activeTab, setActiveTab] = useState("BREAKOUT");

  return (
    <div className="trader-card flex flex-col h-full bg-transparent border border-white/10 overflow-hidden">
      <div className="flex border-b border-white/10 mb-2 bg-white/5">
        <button
          onClick={() => setActiveTab("BREAKOUT")}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === "BREAKOUT"
            ? "border-b-2 border-[#3db26b] text-[#3db26b] bg-white/10/50"
            : "border-transparent text-[#9194a2] hover:text-[#e2e8f0]"
            }`}
        >
          Breakout Alerts
        </button>
        <button
          onClick={() => setActiveTab("INDICATOR")}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === "INDICATOR"
            ? "border-b-2 border-[#3db26b] text-[#3db26b] bg-white/10/50"
            : "border-transparent text-[#9194a2] hover:text-[#e2e8f0]"
            }`}
        >
          Indicator Signals
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
        {activeTab === "BREAKOUT" ? (
          <div className="space-y-1">
            {[
              { s: "INFY", m: "Vol Breakout > 200%", v: "1420", c: "text-[#3db26b]", t: "14:30" },
              { s: "BANKNIFTY", m: "Day High Break", v: "44250", c: "text-[#3db26b]", t: "14:15" },
              { s: "TCS", m: "Support Crack S1", v: "3440", c: "text-[#ed5750]", t: "13:45" },
              { s: "RELIANCE", m: "VWAP Cross Up", v: "2560", c: "text-[#3db26b]", t: "13:10" },
            ].map((i, k) => (
              <div
                key={k}
                className="flex justify-between items-center p-3 rounded hover:bg-white/10/50 text-xs border-b border-white/10/30"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#5d606b] font-mono text-xs">
                    {i.t}
                  </span>
                  <span className="font-bold text-[#e2e8f0] text-sm w-24">
                    {i.s}
                  </span>
                  <span className="text-[#9194a2] text-xs bg-white/10 px-2 py-0.5 rounded">
                    {i.m}
                  </span>
                </div>
                <span className={`${i.c} font-mono font-bold text-sm`}>
                  {i.v}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-[#9194a2] text-sm text-center py-4">
              Scanning active markets...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FODashboard = () => (
  <div className="trader-card flex flex-col h-full bg-transparent border border-white/10">
    <div className="card-header flex justify-between items-center mb-2 px-3 py-1 bg-white/5 border-b border-white/10">
      <h3 className="text-[#9194a2] font-bold text-xs tracking-wider">
        F&O INSIGHTS
      </h3>
      <div className="flex gap-2 items-center">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
        <span className="text-[10px] text-[#3db26b] uppercase">
          Options Chain
        </span>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4 h-full p-3">
      <div className="flex flex-col justify-center border-r border-white/10 pr-3">
        <div className="flex justify-between text-xs text-[#9194a2] mb-1">
          <span>PCR (Nifty)</span>
          <span className="text-white font-bold font-mono">1.06</span>
        </div>
        <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/10 mb-4">
          <div className="bg-gradient-to-r from-[#ed5750] via-yellow-400 to-[#3db26b] w-full h-full relative">
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_5px_white]"
              style={{ left: "60%" }}
            ></div>
          </div>
        </div>

        <div className="flex justify-between text-xs text-[#5d606b] mb-4 px-1">
          <div className="text-center">
            <div className="font-bold text-[#ed5750] text-sm">2.4M</div>
            <div>CALL OI</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-[#3db26b] text-sm">2.8M</div>
            <div>PUT OI</div>
          </div>
        </div>

        <div className="flex justify-between text-xs text-[#9194a2] mb-1">
          <span>MAX PAIN</span>
          <span className="text-[#e2e8f0] font-bold font-mono">18,450</span>
        </div>
        <div className="flex justify-between text-xs text-[#9194a2]">
          <span>IV PERCENTILE</span>
          <span className="text-[#e2e8f0] font-bold font-mono">45%</span>
        </div>
      </div>

      <div className="space-y-2 text-xs flex flex-col justify-center">
        <div className="flex justify-between items-center bg-white/10/30 p-3 rounded border-l-2 border-[#3db26b]">
          <div>
            <div className="text-[#e2e8f0] font-bold text-sm">
              Long Buildup
            </div>
            <div className="text-xs text-[#5d606b] mt-1">Price ▲ OI ▲</div>
          </div>
          <span className="font-mono text-white bg-[#3db26b]/20 px-2 py-1 rounded text-sm">
            42
          </span>
        </div>
        <div className="flex justify-between items-center bg-white/10/30 p-3 rounded border-l-2 border-[#ed5750]">
          <div>
            <div className="text-[#e2e8f0] font-bold text-sm">
              Short Covering
            </div>
            <div className="text-xs text-[#5d606b] mt-1">Price ▲ OI ▼</div>
          </div>
          <span className="font-mono text-white bg-[#ed5750]/20 px-2 py-1 rounded text-sm">
            18
          </span>
        </div>
      </div>
    </div>
  </div>
);

const MarketBreadth = () => (
  <div className="trader-card h-full bg-transparent border border-white/10 flex flex-col gap-3 rounded-lg p-3">
    <div className="flex justify-between text-xs text-[#9194a2] font-bold tracking-wider">
      <span>MARKET BREADTH</span>
    </div>
    <div className="flex items-center gap-0.5 h-3 rounded-full overflow-hidden bg-black/40">
      <div
        className="bg-[#3db26b] h-full shadow-[0_0_5px_#3db26b]"
        style={{ width: "55%" }}
      ></div>
      <div className="bg-[#5d606b] h-full" style={{ width: "10%" }}></div>
      <div
        className="bg-[#ed5750] h-full shadow-[0_0_5px_#ed5750]"
        style={{ width: "35%" }}
      ></div>
    </div>
    <div className="flex justify-between text-xs font-mono font-bold">
      <div className="text-[#3db26b]">
        1240 <span className="text-[10px] opacity-70">ADV</span>
      </div>
      <div className="text-[#9194a2]">
        230 <span className="text-[10px] opacity-70">UNCH</span>
      </div>
      <div className="text-[#ed5750]">
        980 <span className="text-[10px] opacity-70">DEC</span>
      </div>
    </div>
  </div>
);

const MarketSentiment = () => (
  <div className="trader-card h-full bg-transparent border border-white/10 flex flex-col gap-3 rounded-lg p-3">
    <div className="flex justify-between text-xs text-[#9194a2] font-bold tracking-wider">
      <span>MARKET SENTIMENT</span>
    </div>
    <div className="relative h-3 bg-black/40 rounded-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#ed5750] via-yellow-500 to-[#3db26b]"></div>
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_white]"
        style={{ left: "68%" }}
      ></div>
    </div>
    <div className="flex justify-between text-xs font-mono font-bold">
      <span className="text-[#ed5750]">BEARISH</span>
      <span className="text-[#3db26b]">BULLISH 68%</span>
    </div>
  </div>
);

const NewsFlash = () => (
  <div className="trader-card flex flex-col h-full bg-transparent border border-white/10 rounded-lg overflow-hidden">
    <div className="card-header flex justify-between items-center mb-2 px-3 py-2 bg-white/5 border-b border-white/10">
      <h3 className="text-[#9194a2] font-bold text-xs tracking-wider flex items-center gap-2">
        <Activity size={12} className="text-[#ed5750]" />
        NEWS FLASH
      </h3>
    </div>
    <div className="flex-1 relative overflow-hidden p-1">
      <div className="overflow-y-auto custom-scrollbar space-y-2 h-full pr-1">
        {[
          { t: "14:05", s: "RELIANCE", m: "Block deal executed at market price", imp: "High" },
          { t: "13:50", s: "ADANI", m: "Promoter increases stake by 2% via open market", imp: "Med" },
          { t: "13:30", s: "FED", m: "Powell hinting at rate pause next month", imp: "High" },
          { t: "12:15", s: "TCS", m: "Wins $500M contract with UK gov", imp: "Med" },
          { t: "11:45", s: "CRUDE", m: "Prices jump 3% on supply concerns", imp: "High" },
          { t: "11:00", s: "GOLD", m: "Hits all time high in domestic market", imp: "Med" },
          { t: "10:30", s: "INFY", m: "CEO speaks on AI adoption strategy", imp: "Low" },
        ].map((news, i) => (
          <div
            key={i}
            className="flex gap-3 text-xs border-b border-white/10/30 pb-3 hover:bg-white/10/30 p-2 rounded cursor-pointer group transition-colors"
          >
            <span className="text-[#5d606b] font-mono whitespace-nowrap">
              {news.t}
            </span>
            <div>
              <span
                className={`font-bold mr-2 ${news.imp === "High" ? "text-[#ed5750]" : "text-[#3db26b]"
                  }`}
              >
                {news.s}
              </span>
              <span className="text-[#9194a2] group-hover:text-[#e2e8f0] font-medium leading-relaxed">
                {news.m}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============================================
// QUICK TRADE PANEL
// ============================================

const QuickTradePanel = () => {
  const [qty, setQty] = useState("50");
  const [price, setPrice] = useState("18500");
  const [orderType, setOrderType] = useState("MARKET");
  const [tradeSymbol, setTradeSymbol] = useState("NIFTY 50");
  const [lastAction, setLastAction] = useState(null);

  const handleTrade = (side) => {
    setLastAction({ side, qty, price: orderType === "MARKET" ? "MKT" : price, time: new Date().toLocaleTimeString() });
    setTimeout(() => setLastAction(null), 3000);
  };

  return (
    <div className="trader-card flex flex-col h-full bg-gradient-to-br from-[#131722] to-[#0d1117] border border-white/10">
      <div className="card-header flex justify-between items-center px-3 py-2.5 bg-gradient-to-r from-[#1a1e2e] to-[#131722] border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[#3db26b] rounded-full animate-pulse"></div>
          <h3 className="text-[#9194a2] font-bold text-xs tracking-wider">QUICK TRADE</h3>
        </div>
        <select
          value={tradeSymbol}
          onChange={(e) => setTradeSymbol(e.target.value)}
          className="text-[10px] bg-white/5 border border-white/10 text-[#d1d4dc] rounded px-1.5 py-1 outline-none cursor-pointer"
        >
          {["NIFTY 50", "BANKNIFTY", "RELIANCE", "TCS", "HDFCBANK"].map(s => (
            <option key={s} value={s} className="bg-[#131722]">{s}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 p-3 space-y-3">
        {/* Order Type */}
        <div className="flex gap-1">
          {["MARKET", "LIMIT", "SL"].map(t => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${orderType === t
                ? "bg-[#3db26b] text-white border border-[#3db26b]"
                : "bg-white/5 text-[#9194a2] border border-white/10 hover:border-[#3db26b]/50"
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Quantity */}
        <div>
          <div className="text-[10px] text-[#5d606b] uppercase tracking-wider mb-1.5">Quantity (Lots)</div>
          <div className="flex gap-1">
            {["25", "50", "75", "MAX"].map(q => (
              <button
                key={q}
                onClick={() => setQty(q === "MAX" ? "200" : q)}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${qty === (q === "MAX" ? "200" : q)
                  ? "bg-white/20 text-white border border-white/30"
                  : "bg-white/5 text-[#9194a2] border border-white/10 hover:border-white/20"
                  }`}
              >
                {q}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="mt-1.5 w-full bg-white/5 border border-white/10 text-[#d1d4dc] text-xs rounded px-2 py-1.5 outline-none focus:border-[#3db26b]/50 font-mono"
            placeholder="Custom qty..."
          />
        </div>

        {/* Price */}
        {orderType !== "MARKET" && (
          <div>
            <div className="text-[10px] text-[#5d606b] uppercase tracking-wider mb-1.5">Price</div>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-[#d1d4dc] text-xs rounded px-2 py-1.5 outline-none focus:border-[#3db26b]/50 font-mono"
              placeholder="Enter price..."
            />
          </div>
        )}

        {/* Trade Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleTrade("BUY")}
            className="py-3 text-sm font-bold rounded-lg bg-gradient-to-b from-[#3db26b] to-[#2d9a5a] text-white border border-[#3db26b]/50 hover:from-[#4dc87a] hover:to-[#3db26b] transition-all shadow-[0_4px_12px_rgba(61,178,107,0.3)] hover:shadow-[0_6px_20px_rgba(61,178,107,0.4)] active:scale-95"
          >
            BUY
          </button>
          <button
            onClick={() => handleTrade("SELL")}
            className="py-3 text-sm font-bold rounded-lg bg-gradient-to-b from-[#ed5750] to-[#c94040] text-white border border-[#ed5750]/50 hover:from-[#f06860] hover:to-[#ed5750] transition-all shadow-[0_4px_12px_rgba(237,87,80,0.3)] hover:shadow-[0_6px_20px_rgba(237,87,80,0.4)] active:scale-95"
          >
            SELL
          </button>
        </div>

        {/* Order Summary */}
        <div className="bg-white/5 rounded-lg p-2.5 border border-white/5">
          <div className="flex justify-between text-[10px] text-[#5d606b] mb-1">
            <span>Margin Required</span>
            <span className="text-[#d1d4dc] font-mono">₹1,23,750</span>
          </div>
          <div className="flex justify-between text-[10px] text-[#5d606b]">
            <span>Available Margin</span>
            <span className="text-[#3db26b] font-mono">₹5,00,000</span>
          </div>
        </div>

        {/* Last Action Toast */}
        {lastAction && (
          <div className={`text-center text-[11px] font-bold py-2 rounded-lg animate-pulse ${lastAction.side === "BUY"
            ? "bg-[#3db26b]/20 text-[#3db26b] border border-[#3db26b]/30"
            : "bg-[#ed5750]/20 text-[#ed5750] border border-[#ed5750]/30"
            }`}>
            ✓ {lastAction.side} {lastAction.qty} @ {lastAction.price} — {lastAction.time}
          </div>
        )}
      </div>
    </div>
  );
};

function TraderView({ data, activeModule }) {
  const [expandedChart, setExpandedChart] = useState(null);
  const [chartType, setChartType] = useState("area");
  const [timeframe, setTimeframe] = useState("15m");
  const [showIndicators, setShowIndicators] = useState(false);
  const [layout, setLayout] = useState("4-grid");


  if (activeModule && activeModule !== "DASHBOARD") {
    return (
      <div className="dashboard-layout flex items-center justify-center text-white h-screen">
        <div className="text-center opacity-50">
          <h2 className="text-3xl font-bold mb-2">{activeModule}</h2>
          <p className="font-mono text-sm">MODULE INITIALIZING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout w-full">
      <div className="main-content-area w-full max-w-[1920px] mx-auto p-4">
        <div className="trader-bento-grid">

          {/* Row 1 - Left: Workspace */}
          <section className="bento-card bento-workspace" style={{ animationDelay: '0.1s' }}>
            <div className="workspace-header">
              <div className="workspace-title">
                <span className="workspace-label">Multi-Chart Workspace</span>
                <span className="workspace-symbol">
                  NIFTY 50 <span className="text-[#3db26b]">18,500 +0.52%</span>
                </span>
              </div>
              <div className="workspace-controls">
                {["1m", "5m", "15m", "1h", "4h", "1D"].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`workspace-chip ${tf === timeframe ? "active" : ""}`}
                  >
                    {tf.toUpperCase()}
                  </button>
                ))}
                <button
                  onClick={() => setChartType(chartType === "area" ? "candles" : "area")}
                  className={`workspace-chip ${chartType === "candles" ? "active" : ""}`}
                >
                  Candles
                </button>
                <button
                  onClick={() => setShowIndicators(!showIndicators)}
                  className={`workspace-chip ${showIndicators ? "active" : ""}`}
                >
                  Indicators
                </button>
                <button
                  onClick={() => {
                    const layouts = ["1-grid", "2-grid", "4-grid"];
                    const currentIndex = layouts.indexOf(layout);
                    const nextIndex = (currentIndex + 1) % layouts.length;
                    setLayout(layouts[nextIndex]);
                  }}
                  className="workspace-chip"
                >
                  Layouts
                </button>
              </div>
            </div>
            <MultiChartGrid
              className="workspace-body"
              onOpenChart={(title) => setExpandedChart(title)}
              chartType={chartType}
              timeframe={timeframe}
              showIndicators={showIndicators}
              layout={layout}
            />
          </section>

          {/* Row 1 - Right: Watchlist */}
          <aside className="bento-card bento-watchlist" style={{ animationDelay: '0.15s' }}>
            <AdvancedWatchlist />
          </aside>

          {/* Row 2 - Left: Signal Engine */}
          <section className="bento-card bento-positions" style={{ animationDelay: '0.2s' }}>
            <SignalEnginePanel />
          </section>

          {/* Row 2 - Right: Trend Matrix */}
          <aside className="bento-card bento-orderbook" style={{ animationDelay: '0.25s' }}>
            <TrendStrengthPanel />
          </aside>

          {/* Row 3 - Left: Catalyst Panel */}
          <aside className="bento-card bento-alerts" style={{ animationDelay: '0.3s' }}>
            <CatalystPanel />
          </aside>

          {/* Row 3 - Right: Instrument Summary */}
          <aside className="bento-card bento-trade" style={{ animationDelay: '0.35s' }}>
            <InstrumentSummaryPanel />
          </aside>

        </div>
      </div>


      {expandedChart && (
        <div className="chart-modal" role="dialog" aria-modal="true">
          <div
            className="chart-modal-backdrop"
            onClick={() => setExpandedChart(null)}
          ></div>
          <div className="chart-modal-panel">
            <div className="chart-modal-header">
              <div className="chart-modal-title">
                {expandedChart} — Full Screen
              </div>
              <button
                className="chart-modal-close"
                onClick={() => setExpandedChart(null)}
              >
                ✕ Close
              </button>
            </div>
            <div className="chart-modal-body">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceData}>
                  <defs>
                    <linearGradient id="modalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3db26b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3db26b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f141f",
                      border: "1px solid #2a2e39",
                      fontSize: "12px",
                      color: "#d1d4dc",
                    }}
                    itemStyle={{ color: "#d1d4dc" }}
                    labelStyle={{ color: "#8b909a" }}
                  />
                  <XAxis dataKey="time" stroke="#2a2e39" tick={{ fill: "#8b909a", fontSize: 11 }} />
                  <YAxis stroke="#2a2e39" tick={{ fill: "#8b909a", fontSize: 11 }} domain={["auto", "auto"]} />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#3db26b"
                    fill="url(#modalGrad)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <CartesianGrid stroke="#1f2633" strokeDasharray="3 3" vertical={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

export default function Dashboard() {
  const navigate = useNavigate();
  const [isTraderMode, setIsTraderMode] = useState(
    localStorage.getItem("mode") === "TRADER"
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userInitial, setUserInitial] = useState("U");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeModule, setActiveModule] = useState("DASHBOARD");

  useEffect(() => {
    const user = localStorage.getItem("user");
    const email = localStorage.getItem("email");
    const name = user
      ? JSON.parse(user).name
      : email
        ? email.split("@")[0]
        : "User";
    setUserInitial(name.charAt(0).toUpperCase());
  }, []);

  const toggleMode = () => {
    const newMode = !isTraderMode;
    setIsTraderMode(newMode);
    localStorage.setItem("mode", newMode ? "TRADER" : "INVESTOR");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userMode");
    localStorage.removeItem("mode");
    navigate("/", { state: { skipPreloader: true } });
  };

  return (
    <div
      className={`dashboard-container ${isTraderMode ? "trader-theme" : "investor-theme"
        }`}
    >
      <header className="navbar trader-glass-bar sticky top-0 z-50 px-6">
        <div className="max-w-[1920px] mx-auto w-full flex items-center justify-between">
          {/* Left: Brand & Nav */}
          <div className="flex items-center gap-10">
            <a href="/" className="brand flex items-center gap-3">
              <img
                src="/radar-logo-final.jpg"
                alt="Radar Logo"
                className="w-8 h-8 rounded-full shadow-[0_0_10px_rgba(0,243,255,0.3)]"
              />
              <span className="brand-name text-lg font-bold tracking-widest text-white">
                RADAR
              </span>
            </a>

            {/* Navigation Links */}
            <nav className="hidden lg:flex items-center gap-2">
              {[
                { id: "DASHBOARD", icon: LayoutDashboard, label: "Dashboard" },
                { id: "WATCHLIST", icon: Star, label: "Watchlist" },
                { id: "SCREENERS", icon: Filter, label: "Screeners" },
                { id: "NEWS", icon: Newspaper, label: "News" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  className={`nav-link flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${activeModule === item.id
                    ? isTraderMode
                      ? "bg-[#00f3ff]/10 text-[#00f3ff] border border-[#00f3ff]/20 shadow-[0_0_15px_rgba(0,243,255,0.1)]"
                      : "bg-blue-50 text-blue-600"
                    : isTraderMode
                      ? "text-gray-400 hover:text-white hover:bg-white/5"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                >
                  <item.icon size={14} />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right: Search & Actions */}
          <div className="flex items-center gap-6">
            <div className="relative group w-64 hidden xl:block">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#00f3ff] transition-colors">
                <Search size={14} />
              </div>
              <input
                type="text"
                placeholder="Search markets..."
                className="navbar-search w-full bg-black/30 border border-white/10 rounded-full py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-[#00f3ff]/50 focus:shadow-[0_0_15px_rgba(0,243,255,0.1)] transition-all placeholder:text-gray-600"
              />
            </div>

            <div className="flex items-center gap-4 pl-4 border-l border-white/10">
              <div className="relative cursor-pointer group">
                <Bell
                  size={20}
                  className="text-gray-400 group-hover:text-white transition-colors"
                />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#00f3ff] rounded-full animate-pulse shadow-[0_0_8px_#00f3ff]"></span>
              </div>

              {/* Profile Dropdown */}
              <div className="relative">
                <div
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00f3ff] to-[#bc13fe] flex items-center justify-center text-xs font-bold text-white cursor-pointer shadow-lg hover:scale-105 transition-transform"
                >
                  {userInitial}
                </div>

                {/* Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#0b0e14] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-xs text-[#9194a2] uppercase tracking-wider">Signed in as</p>
                      <p className="text-sm text-white font-bold mt-1">{localStorage.getItem('email') || 'User'}</p>
                    </div>

                    {/* Mode Switch */}
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-xs text-[#9194a2] uppercase tracking-wider mb-2">Current Mode</p>
                      <button
                        onClick={toggleMode}
                        className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isTraderMode ? 'bg-[#00f3ff]' : 'bg-blue-500'}`}></div>
                          <span className="text-sm text-white font-medium">
                            {isTraderMode ? 'Trader' : 'Investor'}
                          </span>
                        </div>
                        <span className="text-xs text-[#9194a2] group-hover:text-white">
                          Switch to {isTraderMode ? 'Investor' : 'Trader'}
                        </span>
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="p-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-red-500/10 rounded-lg transition-colors group"
                      >
                        <LogOut size={16} className="text-red-400 group-hover:text-red-300" />
                        <span className="text-sm text-red-400 group-hover:text-red-300 font-medium">
                          Logout
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
      <MarketTicker />

      <main className="content fade-in transition-all duration-300 w-full">
        {isTraderMode ? (
          <TraderView data={mockStock} activeModule={activeModule} />
        ) : (
          <InvestorView
            data={mockStock}
            movers={topMovers}
            activeModule={activeModule}
          />
        )}
      </main>
    </div>
  );
}