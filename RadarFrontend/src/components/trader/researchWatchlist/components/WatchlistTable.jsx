import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Trash2, WifiOff, ExternalLink } from 'lucide-react';
import { compactNumber, currency, toPercent } from '../utils/formatters';

const getSymbolGradient = (symbol) => {
  const charCode = symbol.charCodeAt(0) || 0;
  const gradients = [
    'from-cyan-500/20 to-blue-600/30 text-cyan-300 border-cyan-500/30',
    'from-emerald-500/20 to-teal-600/30 text-emerald-300 border-emerald-500/30',
    'from-purple-500/20 to-indigo-600/30 text-purple-300 border-purple-500/30',
    'from-amber-500/20 to-orange-600/30 text-amber-300 border-amber-500/30',
    'from-rose-500/20 to-pink-600/30 text-rose-300 border-rose-500/30',
    'from-violet-500/20 to-purple-600/30 text-violet-300 border-violet-500/30',
  ];
  return gradients[charCode % gradients.length];
};

const generateSparklinePoints = (symbol, chg) => {
  const seed = (symbol.charCodeAt(0) * 3) + (symbol.charCodeAt(1) * 7) || 120;
  const points = [];
  const current = 50;
  const isUp = chg >= 0;
  for (let i = 0; i < 15; i++) {
    const val = current + Math.sin(seed + i * 0.9) * 12 + (isUp ? i * 1.5 : -i * 1.5);
    points.push(val);
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  return points.map((p, idx) => `${(idx * 8).toFixed(0)},${(42 - ((p - min) / range) * 36 - 6).toFixed(1)}`).join(' ');
};

const getSignalBadge = (signal) => {
  if (!signal) return null;
  const themes = {
    'Volume Spike': 'border-purple-500/30 bg-purple-500/10 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.15)]',
    'Bullish RSI': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.15)]',
    'MACD Cross': 'border-blue-500/30 bg-blue-500/10 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.15)]',
    'Breakout Ready': 'border-amber-500/30 bg-amber-500/10 text-amber-300 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.25)]',
    'Weak Momentum': 'border-rose-500/30 bg-rose-500/10 text-rose-300 shadow-[0_0_8px_rgba(239,68,68,0.15)]',
    'Oversold': 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)]',
    'Overbought': 'border-orange-500/30 bg-orange-500/10 text-orange-300 shadow-[0_0_8px_rgba(249,115,22,0.15)]',
    'Intraday Strength': 'border-teal-500/30 bg-teal-500/10 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.15)]',
    'Neutral': 'border-slate-800/80 bg-slate-900/40 text-slate-400',
    'Data unavailable': 'border-slate-800 bg-slate-950 text-slate-500',
  };
  const theme = themes[signal] || 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100';
  return (
    <span className={`inline-block truncate rounded-md border px-3 py-1.5 text-xs font-black tracking-wider uppercase ${theme}`}>
      {signal}
    </span>
  );
};

const WatchlistTable = ({ rows, selectedSymbol, onSelect, onOpen, onRemove, onAlert }) => {
  return (
    <div className="hidden lg:block select-none">
      <div className="flex flex-col gap-4 p-4">
        <AnimatePresence initial={false}>
          {rows.map((row) => {
            const hasError = row.price === null || row.price === undefined;
            const positive = !hasError && row.changePercent >= 0;
            const active = selectedSymbol === row.symbol;
            
            const rsiVal = row.rsi;
            const rsiStyle = rsiVal === null ? 'text-slate-500 border-slate-800' :
              rsiVal < 30 ? 'text-cyan-400 bg-cyan-950/30 border border-cyan-800/50' :
              rsiVal > 70 ? 'text-orange-400 bg-orange-950/30 border border-orange-800/50' :
              'text-slate-300 border-slate-800';

            const formattedTime = row.lastUpdated
              ? new Date(row.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : '—';
            return (
              <motion.div
                key={row.symbol}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                onClick={() => !hasError && onSelect(row.symbol)}
                className={`relative flex items-center justify-between gap-6 py-6 px-6 min-h-[92px] rounded-xl border transition-all duration-300 ${
                  active 
                    ? 'bg-gradient-to-r from-[#00f3ff]/[0.06] to-[#00f3ff]/[0.01] border-[#00f3ff]/50 shadow-[0_0_24px_rgba(0,243,255,0.12),inset_0_1px_1px_rgba(255,255,255,0.05)]' 
                    : 'bg-gradient-to-r from-slate-900/50 to-slate-950/30 border-slate-900 hover:border-slate-800 hover:from-slate-900/80 hover:to-slate-950/60 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)]'
                }`}
              >
                {/* Active indicator bar */}
                {active && (
                  <div className="absolute left-0 top-4 bottom-4 w-[4px] bg-[#00f3ff] rounded-r-md" />
                )}

                {/* 1. LEFT SECTION (Flex-1) */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${getSymbolGradient(row.symbol)} border flex items-center justify-center font-black text-lg shadow-[0_2px_8px_rgba(0,0,0,0.2)] flex-shrink-0`}>
                    {row.symbol ? row.symbol[0] : 'S'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2.5 leading-none">
                      <span className="font-mono text-sm font-black text-white uppercase tracking-wide">
                        {row.symbol}
                      </span>
                      <span className="text-[10px] font-black tracking-widest text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded uppercase">
                        NSE
                      </span>
                      {row.sector && (
                        <span className="text-[10px] font-black tracking-wider text-cyan-400/90 bg-cyan-950/20 border border-cyan-900/30 px-2 py-0.5 rounded uppercase truncate max-w-[120px]">
                          {row.sector}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-slate-450 truncate mt-2 leading-none">
                      {row.name || 'Equity Asset'}
                    </span>
                  </div>
                </div>

                {hasError ? (
                  <>
                    <div className="flex-grow flex items-center gap-2.5 text-sm font-mono text-rose-400/80 bg-rose-950/10 border border-rose-950/30 rounded-xl px-4 py-3 mr-4 min-w-0">
                      <WifiOff size={15} className="animate-pulse flex-shrink-0" />
                      <span className="truncate">Awaiting market feed... ({row.error || 'Connection error'})</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mr-4">
                      <button
                        type="button"
                        title="Remove from watchlist"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemove(row.symbol);
                        }}
                        className="grid h-10 w-10 place-items-center rounded-xl border border-rose-400/20 bg-rose-500/10 text-rose-300 hover:border-rose-400/50 hover:bg-rose-500/25 transition-all cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* 2. CENTER SECTION (Price & Sparkline) */}
                    <div className="flex items-center gap-7 shrink-0 px-2">
                      {/* Price & Change */}
                      <div className="flex flex-col items-start leading-none min-w-[105px]">
                        <motion.span
                          key={`${row.symbol}-${row.price}`}
                          initial={{ scale: 1.08, color: '#00f3ff' }}
                          animate={{ scale: 1, color: '#ffffff' }}
                          transition={{ duration: 0.3 }}
                          className="text-lg font-mono font-black text-white"
                        >
                          {currency(row.price)}
                        </motion.span>
                        <span className={`text-sm font-mono font-black mt-2 ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {toPercent(row.changePercent)}
                        </span>
                      </div>

                      {/* Sparkline chart */}
                      <div className="w-28 h-12 opacity-80 hover:opacity-100 transition-opacity">
                        <svg className="w-full h-full overflow-visible">
                          <polyline
                            fill="none"
                            stroke={positive ? '#10b981' : '#f43f5e'}
                            strokeWidth="2"
                            points={generateSparklinePoints(row.symbol, row.changePercent)}
                          />
                        </svg>
                      </div>
                    </div>

                    {/* 3. RIGHT SECTION (Indicators & Actions) */}
                    <div className="flex items-center gap-5 shrink-0">
                      {/* RSI info */}
                      <div className={`flex flex-col items-center justify-center rounded-lg px-3 py-1.5 border ${rsiStyle} min-w-[60px]`}>
                        <span className="text-[9px] font-black uppercase text-slate-500 leading-none">RSI</span>
                        <span className="text-sm font-mono font-bold mt-1 leading-none">
                          {rsiVal != null ? rsiVal.toFixed(1) : '—'}
                        </span>
                      </div>

                      {/* Technical signals */}
                      <div className="hidden xl:block shrink-0">
                        {getSignalBadge(row.technicalSignal)}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title={row.alertStatus ? "Alert rules active" : "Set Alert"}
                          onClick={(event) => {
                            event.stopPropagation();
                            onAlert?.(row);
                          }}
                          className={`grid h-10 w-10 place-items-center rounded-xl border transition-all duration-200 cursor-pointer ${
                            row.alertStatus
                              ? 'border-amber-400/40 bg-amber-400/20 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.25)] hover:bg-amber-400/30'
                              : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <Bell size={15} className={row.alertStatus ? 'animate-bounce' : ''} />
                        </button>

                        <button
                          type="button"
                          title="Open details"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpen(row.symbol);
                          }}
                          className="grid h-10 w-10 place-items-center rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-200 transition-colors cursor-pointer"
                        >
                          <ExternalLink size={15} />
                        </button>

                        <button
                          type="button"
                          title="Remove from watchlist"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRemove(row.symbol);
                          }}
                          className="grid h-10 w-10 place-items-center rounded-xl border border-rose-400/20 bg-rose-500/10 text-rose-300 hover:border-rose-400/50 hover:bg-rose-500/25 transition-all cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* 4. FINAL RIGHT (Feed Status & Timestamp) */}
                <div className="flex flex-col items-end gap-2 shrink-0 text-right font-mono w-[90px]">
                  <span className="text-xs font-semibold text-slate-500">{formattedTime}</span>
                  {!hasError && (
                    <div className="flex items-center gap-1.5 bg-emerald-400/10 border border-emerald-400/20 rounded px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase">FEED</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WatchlistTable;
