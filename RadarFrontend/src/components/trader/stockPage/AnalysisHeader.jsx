import React from 'react';
import { TrendingUp, TrendingDown, Activity, Zap, BarChart3, AlertCircle, Clock } from 'lucide-react';

export default function AnalysisHeader({ stock, onBack }) {
    if (!stock) return null;
    const isPositive = stock.change >= 0;

    return (
        <div className="terminal-card bg-[#14171a] p-3 border-none flex items-center justify-between gap-6">
            <div className="flex items-center gap-6">
                {}
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-1 px-2 border border-blue-500/20 rounded bg-blue-500/5 text-[10px] font-black text-blue-500 uppercase hover:bg-blue-500/10 transition-all">
                        ← Back
                    </button>
                    <div className="h-4 w-[1px] bg-white/5"></div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-black text-white">{stock.name}</h1>
                            <span className="text-[10px] font-bold text-slate-500">{stock.symbol}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-slate-400">{stock.exchange}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="terminal-tag tag-momentum">Strong Momentum</span>
                            <span className="terminal-tag tag-trend">Bullish Trend</span>
                        </div>
                    </div>
                </div>

                <div className="h-8 w-[1px] bg-white/5 mx-2"></div>

                {}
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="terminal-price text-white">₹{stock.price.toLocaleString()}</span>
                        <div className={`flex items-center gap-1 text-[11px] font-black ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}% (+{stock.change.toFixed(2)})
                        </div>
                    </div>
                </div>
            </div>

            {}
            <div className="flex items-center gap-8 pr-2">
                <div className="flex flex-col items-center">
                    <span className="terminal-label mb-0.5">Volume (Day)</span>
                    <span className="text-xs font-bold text-white">90.64K</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="terminal-label mb-0.5">ATR (14)</span>
                    <span className="text-xs font-bold text-blue-400">42.15</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="terminal-label mb-0.5">Day Range</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-rose-500">2,812</span>
                        <div className="w-16 h-1 bg-white/5 rounded-full relative">
                            <div className="absolute top-0 h-full bg-blue-500 rounded-full" style={{ left: '20%', width: '60%' }}></div>
                            <div className="absolute -top-1 w-1.5 h-3 bg-white border border-black rounded-sm" style={{ left: '75%' }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-500">2,895</span>
                    </div>
                </div>
                <div className="h-6 w-[1px] bg-white/10 mx-2"></div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                    <Clock size={12} className="text-emerald-500" />
                    <span className="text-emerald-500">Market Open</span>
                </div>
            </div>
        </div>
    );
}
