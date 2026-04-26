import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Bell, ShoppingCart, ShoppingBag, Eye, BarChart3, BookmarkPlus } from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
} from 'recharts';

const generateChartData = (basePrice, points = 50) => {
  return Array.from({ length: points }, (_, i) => ({
    time: `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`,
    price: basePrice * (1 + Math.sin(i / 5) * 0.02),
    volume: Math.floor(100000 + Math.sin(i / 3) * 50000),
    sma20: basePrice * (1 + Math.sin(i / 7) * 0.015),
  }));
};

const generateOrderBook = () => {
  return {
    bids: [],
    asks: [],
  };
};

const generateRecentTrades = () => {
  return [];
};

const StockDetailsPanel = ({ stock, onClose, onAddAlert, mode = 'research', onResearchAction }) => {
  if (!stock) return null;

  const safeNumber = (value, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  };

  const symbol = String(stock.symbol || '--');
  const name = String(stock.name || stock.company || stock.symbol || 'Unknown symbol');
  const price = safeNumber(stock.price, 0);
  const change = safeNumber(stock.change, safeNumber(stock.changePercent, 0));
  const percent = safeNumber(stock.percent, safeNumber(stock.changePercent, 0));
  const rsi = safeNumber(stock.rsi, safeNumber(stock.technicalScore, 0));
  const vwap = safeNumber(stock.vwap, price);
  const high52w = safeNumber(stock.high52w, safeNumber(stock.high52, price));
  const low52w = safeNumber(stock.low52w, safeNumber(stock.low52, price));

  const [activeTab, setActiveTab] = useState('chart');
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [researchNotice, setResearchNotice] = useState('');
  const chartData = useMemo(() => generateChartData(price), [price]);
  const orderBook = useMemo(() => generateOrderBook(), []);
  const recentTrades = useMemo(() => generateRecentTrades(), []);
  const isResearchMode = mode === 'research';

  const pushResearchNotice = (text) => {
    setResearchNotice(text);
    window.clearTimeout(pushResearchNotice._t);
    pushResearchNotice._t = window.setTimeout(() => setResearchNotice(''), 2400);
  };

  const tabs = [
    { id: 'chart', label: 'Chart' },
    { id: 'orderbook', label: isResearchMode ? 'Levels' : 'Order Book' },
    { id: 'trades', label: isResearchMode ? 'Signals' : 'Trades' },
    { id: 'news', label: 'News' },
  ];

  return (
    <motion.div
      initial={{ x: 420, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 420, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="w-full rounded-[2rem] border overflow-hidden flex flex-col h-[calc(100vh-180px)]"
      style={{
        background: "linear-gradient(180deg, #020617 0%, #051025 50%, #0a1e3d 100%)",
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}
    >
      <div className="sticky top-0 z-10 border-b border-white/5 px-4 py-3 bg-slate-900/95">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 font-medium">Research Terminal</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <h2 className="text-3xl font-bold tracking-tight text-white">{symbol}</h2>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-slate-400">
                LMM
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 transition-colors hover:border-cyan-300/35 hover:bg-cyan-400/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="rounded-xl border border-white/5 bg-slate-900 px-4 py-3 shadow-sm">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-bold mb-1">Spot Price context</div>
              <span className="block text-4xl font-bold tracking-tight text-white">â‚¹{price.toLocaleString()}</span>
            </div>
            <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold ${change > 0 ? 'border-emerald-900/50 bg-emerald-500/5 text-emerald-500/80' : 'border-rose-900/50 bg-rose-500/5 text-rose-500/80'}`}>
              {change > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {change.toFixed(1)} ({percent.toFixed(1)}%)
            </div>
          </div>
        </div>
      </div>

      {}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/5 bg-slate-900 p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">RSI</p>
            <p className={`mt-1 text-base font-black ${rsi > 70 ? 'text-rose-300' : rsi < 30 ? 'text-emerald-300' : 'text-slate-100'}`}>
              {rsi.toFixed(1)}
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-slate-900 p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">VWAP</p>
            <p className="mt-1 text-base font-black text-slate-100">â‚¹{vwap.toFixed(0)}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-slate-900 p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">52W High</p>
            <p className="mt-1 text-base font-black text-slate-100">â‚¹{high52w.toFixed(0)}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-slate-900 p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">52W Low</p>
            <p className="mt-1 text-base font-black text-slate-100">â‚¹{low52w.toFixed(0)}</p>
          </div>
        </div>

        {}
        <div className="mt-4 flex gap-1 rounded-xl border border-white/5 bg-slate-900 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {}
        <div className="py-4">
          {}
          {activeTab === 'chart' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="rounded-xl border border-white/5 bg-slate-900/30 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Price Dynamics</h3>
                  <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">Sample Curve</span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748b" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#475569' }} hide />
                    <YAxis tick={{ fontSize: 9, fill: '#475569' }} hide />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '4px',
                        fontSize: '10px'
                      }}
                      formatter={(value) => `â‚¹${value.toFixed(2)}`}
                    />
                    <Area type="monotone" dataKey="price" stroke="#94a3b8" fill="url(#colorPrice)" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900 p-3">
                <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600">Volume analysis</h3>
                <ResponsiveContainer width="100%" height={100}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#475569' }} hide />
                    <YAxis tick={{ fontSize: 9, fill: '#475569' }} hide />
                    <Bar dataKey="volume" fill="#475569" opacity={0.6} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {}
          {activeTab === 'orderbook' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Buy Interest Levels</h3>
                <div className="space-y-1">
                  {orderBook.bids.map((bid, i) => (
                    <div key={i} className={`rounded-lg p-2 border border-emerald-900/10 bg-emerald-900/5`}>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">â‚¹{bid.price.toFixed(1)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 text-[10px]">{bid.quantity}</span>
                          <div className="w-10 h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-700/40"
                              style={{ width: `${(bid.quantity / 2500) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Sell Pressure Levels</h3>
                <div className="space-y-1">
                  {orderBook.asks.map((ask, i) => (
                    <div key={i} className={`rounded-lg p-2 border border-rose-900/10 bg-rose-900/5`}>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">â‚¹{ask.price.toFixed(1)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 text-[10px]">{ask.quantity}</span>
                          <div className="w-10 h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-rose-700/40"
                              style={{ width: `${(ask.quantity / 2500) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {}
          {activeTab === 'trades' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              {recentTrades.map((trade, i) => (
                <div key={i} className="rounded-lg border border-white/5 bg-slate-900 p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    {trade.side === 'buy' ? (
                      <TrendingUp size={12} className="text-emerald-600" />
                    ) : (
                      <TrendingDown size={12} className="text-rose-600" />
                    )}
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400">{trade.time}</p>
                      <p className="text-[10px] text-slate-600">{isResearchMode ? `Signal strength ${Math.min(99, Math.max(45, trade.quantity % 100))}%` : `${trade.quantity} shares`}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-200">â‚¹{trade.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {}
          {activeTab === 'news' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <div className="rounded-lg bg-slate-900 p-3 border border-white/5">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-600">Positive</p>
                <p className="text-xs leading-tight text-slate-300">Strong institutional buying pressure continues</p>
              </div>
              <div className="rounded-lg bg-slate-900 p-3 border border-white/5">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Neutral</p>
                <p className="text-xs leading-tight text-slate-300">Company announced dividend payout date</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {}
      {isResearchMode ? (
        <div className="sticky bottom-0 border-t border-white/5 bg-slate-900 px-4 py-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                onResearchAction?.('focus', stock);
                pushResearchNotice('Added to focus queue');
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-[11px] font-bold text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <Eye size={12} /> Focus
            </button>
            <button
              onClick={() => {
                onResearchAction?.('compare', stock);
                pushResearchNotice('Comparison added');
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-[11px] font-bold text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <BarChart3 size={12} /> Compare
            </button>
            <button
              onClick={() => {
                onResearchAction?.('bookmark', stock);
                pushResearchNotice('Bookmarked for thesis');
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-[11px] font-bold text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <BookmarkPlus size={12} /> Save
            </button>
          </div>

          <button
            onClick={() => {
              onAddAlert?.(stock);
              pushResearchNotice('Research alert created');
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-xs font-bold text-slate-300 transition-all hover:bg-slate-700"
          >
            <Bell size={14} />
            Set Research Alert
          </button>

          {!!researchNotice && <div className="text-center text-[10px] font-semibold text-emerald-600/70">{researchNotice}</div>}
        </div>
      ) : (
        <div className="sticky bottom-0 border-t border-white/5 bg-slate-900 px-4 py-3 space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Vol</label>
            <input
              type="number"
              value={orderQuantity}
              onChange={(e) => setOrderQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-slate-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              className="flex items-center justify-center gap-2 rounded-lg border border-emerald-900/50 bg-emerald-900/10 px-4 py-2 text-[11px] font-bold text-emerald-500/80 hover:bg-emerald-900/20 transition-all"
            >
              <ShoppingCart size={14} />
              BUY
            </button>
            <button
              className="flex items-center justify-center gap-2 rounded-lg border border-rose-900/50 bg-rose-900/10 px-4 py-2 text-[11px] font-bold text-rose-500/80 hover:bg-rose-900/20 transition-all"
            >
              <ShoppingBag size={14} />
              SELL
            </button>
          </div>

          <button
            onClick={() => onAddAlert?.(stock)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-[10px] font-bold text-slate-400 transition-all hover:bg-slate-700"
          >
            <Bell size={14} />
            ALERT TRIGGER
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default StockDetailsPanel;
