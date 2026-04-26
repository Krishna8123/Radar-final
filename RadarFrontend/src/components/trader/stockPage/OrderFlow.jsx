import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const generateMockDepth = () => {
    const generateLevel = (base, offset) => Array.from({ length: 8 }, (_, i) => ({
        price: base + (offset * (i + 1)),
        size: (Math.floor(base / 10) + (i * 150)) % 5000 + 100,
        total: 0
    }));

    const bids = generateLevel(2870.15, -0.25);
    const asks = generateLevel(2870.15, 0.25).reverse();

    return { bids, asks };
};

export default function OrderFlow() {
    const { bids, asks } = useMemo(() => generateMockDepth(), []);

    const renderLevel = (item, type) => {
        const maxSize = 5100;
        const width = (item.size / maxSize) * 100;
        const color = type === 'bid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
        const textColor = type === 'bid' ? 'text-[#10b981]' : 'text-[#ef4444]';

        return (
            <div className="relative group flex items-center justify-between py-1.5 px-3 border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                <div 
                    className="absolute right-0 top-0 bottom-0 pointer-events-none transition-all duration-500" 
                    style={{ width: `${width}%`, background: color }}
                />
                <span className={`text-[11px] font-bold terminal-value ${textColor} z-10`}>
                    {item.price.toFixed(2)}
                </span>
                <span className="text-[10px] font-medium text-slate-300 z-10">
                    {item.size.toLocaleString()}
                </span>
            </div>
        );
    };

    return (
        <div className="alpha-bento-card h-full flex flex-col area-depth">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <h4 className="terminal-label">Market Depth</h4>
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></div>
                    <span className="text-[9px] font-bold text-slate-500">L2 LIVE</span>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col-reverse">
                    {asks.map((item, i) => (
                        <motion.div 
                            key={`ask-${i}`} 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            {renderLevel(item, 'ask')}
                        </motion.div>
                    ))}
                </div>

                {}
                <div className="py-2.5 bg-white/[0.05] border-y border-white/10 flex flex-col items-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Spread: 0.05 (0.002%)</span>
                    <span className="text-sm font-black text-white">2,870.15</span>
                </div>

                {}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {bids.map((item, i) => (
                        <motion.div 
                            key={`bid-${i}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            {renderLevel(item, 'bid')}
                        </motion.div>
                    ))}
                </div>
            </div>

            {}
            <div className="p-3 bg-[#0f172a]/40 border-t border-white/10 flex justify-between">
                <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-bold uppercase">Buy Vol</span>
                    <span className="text-xs font-bold text-emerald-400">58%</span>
                </div>
                <div className="flex flex-col text-right">
                    <span className="text-[9px] text-slate-500 font-bold uppercase">Sell Vol</span>
                    <span className="text-xs font-bold text-rose-400">42%</span>
                </div>
            </div>
        </div>
    );
}
