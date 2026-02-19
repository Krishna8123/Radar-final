import React, { useState } from "react";
import { motion } from "framer-motion";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import {
    Search,
    Maximize2,
    Settings,
    TrendingUp,
    TrendingDown,
    Activity,
} from "lucide-react";

// ============================================
// MOCK DATA
// ============================================

const priceData = Array.from({ length: 50 }, (_, i) => ({
    time: `${i}m`,
    price: 18000 + Math.random() * 1000,
}));

// ============================================
// TRADER MODE COMPONENTS
// ============================================

const SectorHeatmap = () => (
    <div className="trader-card flex flex-col h-full bg-transparent border border-white/10">
        <div className="card-header flex justify-between items-center mb-2 px-3 py-2 bg-white/5 border-b border-white/10">
            <div className="flex items-center gap-2">
                <Activity size={12} className="text-[#9194a2]" />
                <h3 className="text-[#9194a2] font-bold text-xs tracking-wider uppercase">
                    Sector Heatmap
                </h3>
            </div>
            <span className="text-[10px] text-[#5d606b]">NIFTY 500</span>
        </div>
        <div className="flex-1 flex gap-2 p-2">
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
                <motion.div className="flex-1 bg-[#1e293b]/40 border border-slate-500/20 rounded-md flex flex-col justify-center items-center">
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
                    ]
                    : [
                        { s: "ADANIENT", v: "-3.2%", p: "2,400" },
                        { s: "TATAMOTORS", v: "-2.1%", p: "560" },
                        { s: "SBIN", v: "-1.5%", p: "580" },
                        { s: "BAJFINANCE", v: "-1.2%", p: "7,100" },
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
                <span className="text-[10px] text-yellow-500">LIVE</span>
            </div>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar p-3">
            {[
                { s: "ADANIENT", v: "3.5x", c: "text-[#bc13fe]", b: "bg-[#bc13fe]", p: 85 },
                { s: "HDFCBANK", v: "2.8x", c: "text-[#3b82f6]", b: "bg-[#3b82f6]", p: 65 },
                { s: "IDEA", v: "2.1x", c: "text-[#f97316]", b: "bg-[#f97316]", p: 50 },
                { s: "RELIANCE", v: "1.9x", c: "text-[#94a3b8]", b: "bg-[#94a3b8]", p: 35 },
                { s: "TATAMOTORS", v: "1.8x", c: "text-[#94a3b8]", b: "bg-[#94a3b8]", p: 30 },
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

const MultiChartGrid = ({ className }) => (
    <div className={`${className} h-full`}>
        <div className="trader-card h-full flex flex-col bg-transparent border border-white/10 p-0 overflow-hidden">
            <div className="flex justify-between items-center px-3 py-2 bg-white/5 border-b border-white/10">
                <h3 className="text-[#9194a2] font-bold text-xs">
                    MULTI-CHART WORKSPACE
                </h3>
                <div className="flex gap-2 items-center">
                    <span className="text-xs text-[#5d606b] mr-2">LAYOUT: 4-GRID</span>
                    <button className="text-xs px-2 py-1 bg-white/10 text-[#e2e8f0] rounded hover:bg-black">
                        1H
                    </button>
                    <button className="text-xs px-2 py-1 bg-[#3db26b] text-white rounded">
                        15M
                    </button>
                    <button className="text-xs px-2 py-1 bg-white/10 text-[#e2e8f0] rounded hover:bg-black">
                        5M
                    </button>
                </div>
            </div>
            <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-0">
                {["NIFTY 50", "BANKNIFTY", "RELIANCE", "HDFCBANK"].map((title, i) => (
                    <div
                        key={i}
                        className="bg-[#0b0e14] relative border-r border-b border-white/5 last:border-r-0 group flex flex-col"
                    >
                        <div className="flex justify-between text-xs px-2 py-1.5 border-b border-white/5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[#e2e8f0] font-bold text-xs">
                                        {title}
                                    </span>
                                    <span className="text-[#3db26b] text-[10px] font-mono">
                                        18500 (+0.5%)
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
                                <Maximize2 size={12} className="cursor-pointer hover:text-white" />
                            </div>
                        </div>

                        <div className="flex-1 w-full relative p-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={priceData}>
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
                                    <CartesianGrid
                                        stroke="#293839"
                                        strokeDasharray="3 3"
                                        vertical={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

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

const AdvancedWatchlist = () => (
    <div className="trader-card flex flex-col h-full bg-transparent border border-white/10">
        <div className="card-header flex justify-between items-center mb-2 px-3 py-2 bg-white/5 border-b border-white/10">
            <h3 className="text-[#9194a2] font-bold text-sm tracking-wider">
                ADVANCED WATCHLIST
            </h3>
            <div className="flex gap-2 text-[#9194a2]">
                <div className="bg-[#3db26b]/10 text-[#3db26b] px-2 py-0.5 rounded text-[10px] font-bold border border-[#3db26b]/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-[#3db26b] rounded-full animate-pulse"></span>
                    Live
                </div>
                <Search size={14} className="cursor-pointer hover:text-white" />
            </div>
        </div>
        <div className="flex-1 overflow-hidden">
            <div className="overflow-y-auto custom-scrollbar h-full">
                <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[#0b0e14] z-10">
                        <tr className="border-b border-white/10">
                            <th className="text-left py-2 pl-3 text-[#9194a2] font-bold uppercase tracking-wider text-[10px]">
                                Symbol
                            </th>
                            <th className="text-center py-2 text-[#9194a2] font-bold uppercase tracking-wider text-[10px]">
                                Trend
                            </th>
                            <th className="text-right py-2 text-[#9194a2] font-bold uppercase tracking-wider text-[10px]">
                                LTP
                            </th>
                            <th className="text-right py-2 text-[#9194a2] font-bold uppercase tracking-wider text-[10px]">
                                %
                            </th>
                            <th className="text-right py-2 pr-3 text-[#9194a2] font-bold uppercase tracking-wider text-[10px]">
                                Vol
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { sym: "TCS", ltp: "3,450.00", chg: "+1.2%", data: priceData, vol: 85 },
                            { sym: "INFY", ltp: "1,420.50", chg: "-0.5%", data: [...priceData].reverse(), vol: 60 },
                            { sym: "BANKNIFTY", ltp: "44,200", chg: "+0.8%", data: priceData, vol: 95 },
                            { sym: "RELIANCE", ltp: "2,550.00", chg: "+0.3%", data: priceData, vol: 50 },
                            { sym: "HDFCBANK", ltp: "1,650.00", chg: "+0.5%", data: priceData, vol: 70 },
                            { sym: "LT", ltp: "2,890.00", chg: "+1.5%", data: priceData, vol: 75 },
                            { sym: "AXISBANK", ltp: "980.00", chg: "-0.3%", data: [...priceData].reverse(), vol: 40 },
                        ].map((row, i) => (
                            <tr
                                key={i}
                                className="border-b border-white/10/50 hover:bg-white/10 transition-colors group cursor-pointer"
                            >
                                <td className="py-2.5 pl-3 font-bold text-[#e2e8f0] group-hover:text-white">
                                    {row.sym}
                                </td>
                                <td className="py-2.5 flex justify-center">
                                    <Sparkline
                                        data={row.data}
                                        color={row.chg.includes("+") ? "#3db26b" : "#ed5750"}
                                    />
                                </td>
                                <td className="py-2.5 text-right text-[#e2e8f0] font-mono">
                                    {row.ltp}
                                </td>
                                <td
                                    className={`py-2.5 text-right ${row.chg.includes("+") ? "text-[#3db26b]" : "text-[#ed5750]"
                                        } font-mono`}
                                >
                                    {row.chg}
                                </td>
                                <td className="py-2.5 text-right pr-3">
                                    <div className="w-16 h-1.5 bg-transparent ml-auto rounded overflow-hidden">
                                        <div
                                            style={{ width: `${row.vol}%` }}
                                            className="h-full bg-[#5d606b]"
                                        ></div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
            <div>
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

                <div className="text-xs text-center space-y-1">
                    <div className="flex justify-between">
                        <span className="text-[#9194a2]">Call OI</span>
                        <span className="text-[#e2e8f0] font-mono">2.4M</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-[#9194a2]">Put OI</span>
                        <span className="text-[#e2e8f0] font-mono">2.5M</span>
                    </div>
                </div>
            </div>

            <div>
                <div className="flex justify-between text-xs text-[#9194a2] mb-1">
                    <span>MAX PAIN</span>
                    <span className="text-[#e2e8f0] font-bold font-mono">18,450</span>
                </div>
                <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/10 mb-4">
                    <div className="bg-[#3db26b] h-full rounded-full" style={{ width: "65%" }}></div>
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
        <div className="text-[#9194a2] text-xs font-bold uppercase tracking-wider">
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
        <div className="flex justify-between items-center">
            <span className="text-[#9194a2] text-xs font-bold uppercase tracking-wider">
                MARKET SENTIMENT
            </span>
            <span className="text-[#3db26b] text-xs font-bold font-mono">
                BULLISH 68%
            </span>
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
            <span className="text-[#3db26b]">BULLISH</span>
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
// MAIN TRADER VIEW COMPONENT
// ============================================

function TraderView({ data, activeModule }) {
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
            <div className="main-content-area w-full max-w-[1920px] mx-auto p-2">
                {/* Ticker */}
                <div className="mb-2 bg-[#0b0e14] border border-white/10 rounded px-3 py-1.5">
                    <div className="overflow-hidden">
                        <motion.div
                            className="flex gap-8 text-xs text-[#9194a2]"
                            animate={{ x: [0, -600] }}
                            transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
                        >
                            <span>NIFTY <span className="text-green-400">18,500 (+0.5%)</span></span>
                            <span>BANKNIFTY <span className="text-green-400">43,800 (+0.7%)</span></span>
                            <span>SENSEX <span className="text-green-400">62,300 (+0.4%)</span></span>
                            <span>RELIANCE <span className="text-red-400">2,450 (-0.2%)</span></span>
                            <span>INFY <span className="text-red-400">1,420 (-0.5%)</span></span>
                        </motion.div>
                    </div>
                </div>

                {/* MAIN GRID */}
                <div className="grid grid-cols-12 gap-2">
                    {/* LEFT COLUMN (9 cols) */}
                    <div className="col-span-12 xl:col-span-9 space-y-2">

                        {/* ROW 1: Sector Heatmap - 200px */}
                        <div className="h-[200px]">
                            <SectorHeatmap />
                        </div>

                        {/* ROW 2: Market Movers - 220px */}
                        <div className="grid grid-cols-2 gap-2 h-[220px]">
                            <VolumeShockers />
                            <GapLists />
                        </div>

                        {/* ROW 3: Charts - 350px */}
                        <div className="h-[350px]">
                            <MultiChartGrid />
                        </div>

                        {/* ROW 4: Intelligence - 220px */}
                        <div className="grid grid-cols-3 gap-2 h-[220px]">
                            <TechnicalScreeners />
                            <FODashboard />
                            <NewsFlash />
                        </div>
                    </div>

                    {/* RIGHT COLUMN (3 cols) */}
                    <div className="col-span-12 xl:col-span-3 flex flex-col gap-2">
                        {/* Market Breadth - 95px */}
                        <div className="h-[95px]">
                            <MarketBreadth />
                        </div>

                        {/* Market Sentiment - 95px */}
                        <div className="h-[95px]">
                            <MarketSentiment />
                        </div>

                        {/* Advanced Watchlist - fills remaining space */}
                        <div className="flex-1 overflow-hidden">
                            <AdvancedWatchlist />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TraderView;
