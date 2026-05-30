import React, { useState } from 'react';
import { BarChart2, Activity, Settings2, Grid, TrendingUp, TrendingDown } from 'lucide-react';

export default function MinimalTraderChart({ symbol, price, isPositive, technicalSummary }) {
    const [timeframe, setTimeframe] = useState('1D');
    const [chartType, setChartType] = useState('candlestick');
    const [showIndicators, setShowIndicators] = useState(false);

    const rsiVal = technicalSummary?.indicators?.rsi ?? null;
    const rsi = rsiVal != null ? Number(rsiVal) : null;
    const rsiLabel = rsi !== null
        ? (rsi >= 70 ? 'Overbought' : rsi <= 30 ? 'Oversold' : 'Neutral')
        : 'Unavailable';

    const volStatusRaw = technicalSummary?.indicators?.volumeStatus || null;
    const volumeStatus = volStatusRaw
        ? (volStatusRaw === 'high_volume' ? 'High Volume' : volStatusRaw === 'above_average' ? 'Above Average' : volStatusRaw === 'average' ? 'Average' : volStatusRaw === 'below_average' ? 'Below Average' : volStatusRaw === 'low_volume' ? 'Low Volume' : volStatusRaw)
        : 'Unavailable';

    return (
        <div className="flex flex-col flex-1 w-full gap-4">
            {/* Top Bar: Timeframes and Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center bg-[#101828] rounded-lg p-1 border border-white/5 shadow-inner overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    {['1m', '5m', '10m', '15m', '30m', '1H', '4H', '1D'].map(tf => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${timeframe === tf ? 'bg-cyan-500 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex bg-[#101828] rounded-lg p-1 border border-white/5">
                        <button 
                            onClick={() => setChartType('candlestick')}
                            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors ${chartType === 'candlestick' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            <BarChart2 size={14} /> Candles
                        </button>
                        <button 
                            onClick={() => setChartType('line')}
                            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors ${chartType === 'line' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Activity size={14} /> Line
                        </button>
                    </div>
                    
                    <div className="relative">
                        <button 
                            onClick={() => setShowIndicators(!showIndicators)}
                            className="px-4 py-2 rounded-lg bg-[#101828] border border-white/5 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                        >
                            <Settings2 size={14} /> Indicators
                        </button>
                        
                        {showIndicators && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-[#151921] border border-white/10 rounded-xl shadow-2xl p-2 z-10">
                                <div className="text-[10px] font-black text-slate-500 uppercase px-2 py-1 mb-1">Active Indicators</div>
                                {['EMA (20, 50)', 'RSI (14)', 'MACD (12, 26, 9)'].map(ind => (
                                    <label key={ind} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded cursor-pointer">
                                        <input type="checkbox" defaultChecked className="accent-cyan-500 w-3 h-3" />
                                        <span className="text-xs font-bold text-slate-300">{ind}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* The Chart Mock */}
            <div className="flex-1 min-h-[450px] w-full bg-[#0B1220] rounded-xl border border-white/5 flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]"></div>
                
                <div className="relative z-10 flex items-center gap-4 text-slate-500 opacity-50 group-hover:opacity-100 transition-opacity">
                    <Grid size={32} />
                    <span className="font-mono font-bold tracking-widest uppercase">Minimal Interactive Chart Region</span>
                </div>
                
                {/* Price axis mock */}
                <div className="absolute right-0 top-0 bottom-0 w-16 border-l border-white/5 bg-[#0B1220]/80 backdrop-blur flex flex-col justify-between py-8 text-[10px] font-mono text-slate-500 items-center">
                    <span>{(price * 1.01).toFixed(2)}</span>
                    <span>{(price * 1.005).toFixed(2)}</span>
                    <span className="text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">{price.toFixed(2)}</span>
                    <span>{(price * 0.995).toFixed(2)}</span>
                    <span>{(price * 0.99).toFixed(2)}</span>
                </div>
                
                {/* Time axis mock */}
                <div className="absolute left-0 right-16 bottom-0 h-8 border-t border-white/5 bg-[#0B1220]/80 backdrop-blur flex justify-between px-12 text-[10px] font-mono text-slate-500 items-center">
                    <span>10:00</span>
                    <span>11:00</span>
                    <span>12:00</span>
                    <span>13:00</span>
                    <span>14:00</span>
                    <span>15:00</span>
                </div>
            </div>

            {/* Compact Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#101828] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Current Trend</div>
                        <div className={`text-sm font-black flex items-center gap-1.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            {isPositive ? 'Bullish' : 'Bearish'}
                        </div>
                    </div>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        <Activity size={16} />
                    </div>
                </div>
                
                <div className="bg-[#101828] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">RSI (14)</div>
                        <div className="text-sm font-black text-white">
                            {rsi !== null ? `${rsi.toFixed(1)} ` : ''}
                            <span className="text-xs text-slate-500 font-semibold">({rsiLabel})</span>
                        </div>
                    </div>
                    <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400" style={{ width: rsi !== null ? `${rsi}%` : '0%' }}></div>
                    </div>
                </div>
                
                <div className="bg-[#101828] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Volume Status</div>
                        <div className={`text-sm font-black ${volumeStatus === 'Unavailable' ? 'text-slate-500' : 'text-cyan-400'}`}>
                            {volumeStatus}
                        </div>
                    </div>
                    <div className="flex items-end gap-1 h-6">
                        <div className="w-1.5 h-3 bg-white/10 rounded-sm"></div>
                        <div className="w-1.5 h-4 bg-white/10 rounded-sm"></div>
                        <div className={`w-1.5 h-6 rounded-sm ${volumeStatus === 'Unavailable' ? 'bg-white/10' : 'bg-cyan-500/50'}`}></div>
                        <div className={`w-1.5 h-5 rounded-sm ${volumeStatus === 'Unavailable' ? 'bg-white/10' : 'bg-cyan-400'}`}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
