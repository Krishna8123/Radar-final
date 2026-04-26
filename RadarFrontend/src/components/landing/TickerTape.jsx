import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fetchMarketData } from "../../api/marketApi";

const fallbackTickers = [
    { symbol: "SPX", value: "4,783.45", change: "+0.45%" },
    { symbol: "NDX", value: "16,832.90", change: "+0.82%" },
    { symbol: "DJIA", value: "37,695.73", change: "-0.31%" },
    { symbol: "BTC", value: "$42,505.00", change: "+2.53%" },
    { symbol: "ETH", value: "$2,250.10", change: "+1.30%" },
    { symbol: "GOLD", value: "2,045.30", change: "+0.15%" },
    { symbol: "EUR/USD", value: "1.0950", change: "-0.05%" },
    { symbol: "AAPL", value: "185.92", change: "+0.55%" },
];

const investorClasses = {
    container: "w-full relative overflow-hidden py-4 select-none bg-transparent",
    content: "flex gap-20 w-max hover:[animation-play-state:paused] items-center",
    symbol: "text-[10px] font-black text-slate-400 tracking-[0.15em] uppercase mb-1 block",
    value: "text-sm font-black text-slate-800 font-mono",
    positive: "text-emerald-500 bg-emerald-50 border-emerald-100",
    negative: "text-rose-500 bg-rose-50 border-rose-100",
    neutral: "text-slate-400 bg-slate-50 border-slate-200",
    loading: "w-full flex justify-center items-center py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse",
    error: "w-full flex justify-center items-center py-2 text-[10px] font-black text-rose-500 uppercase tracking-widest py-4",
    item: "flex items-center gap-4",
    divider: "h-8 w-[1px] bg-slate-200 -skew-x-[24deg] ml-10 opacity-60",
    style: {
        maskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
    },
};

const darkClasses = {
    container: "w-full bg-[#0a2a30]/90 backdrop-blur-md border-b border-white/5 overflow-hidden py-3 flex relative z-50",
    content: "flex whitespace-nowrap",
    symbol: "font-bold text-white/80",
    value: "text-white font-mono",
    positive: "text-[#42C0A5] bg-[#42C0A5]/10",
    negative: "text-red-400 bg-red-400/10",
    neutral: "text-slate-300 bg-white/10",
    loading: "absolute inset-0 flex items-center justify-center text-xs font-bold text-white/40 animate-pulse",
    error: "absolute inset-0 flex items-center justify-center text-xs font-bold text-rose-400",
    item: "flex items-center mx-6 gap-2",
    divider: "",
    style: undefined,
};

export default function TickerTape({ variant = "dark" }) {
    const [items, setItems] = useState(fallbackTickers);
    const [error, setError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const classes = variant === "investor" ? investorClasses : darkClasses;

    useEffect(() => {
        const load = async () => {
            try {
                setIsLoading(true);
                setError(false);
                const res = await fetchMarketData({ category: "index", limit: 8 });
                if (res && res.length > 0) {
                    setItems(res.map((item) => ({
                        symbol: String(item.symbol || item.name || "ASSET").split('.')[0].substring(0, 10),
                        value: Number.isFinite(Number(item.price)) ? Number(item.price).toLocaleString() : "--",
                        change: (() => {
                            const rawChange = Number(item.change_24h ?? item.change ?? 0);
                            const safeChange = Number.isFinite(rawChange) ? rawChange : 0;
                            return `${safeChange > 0 ? "+" : ""}${safeChange.toFixed(2)}%`;
                        })(),
                    })));
                }
            } catch (err) {
                console.error("Failed to load ticker tape:", err);
                setError(true);
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, []);

    const duplicatedItems = useMemo(() => [...items, ...items, ...items, ...items], [items]);

    return (
        <div className={classes.container} style={classes.style}>
            {variant === "dark" && (
                <>
                    <div className="absolute top-0 bottom-0 left-0 w-20 bg-gradient-to-r from-[#0D343A] to-transparent z-10" />
                    <div className="absolute top-0 bottom-0 right-0 w-20 bg-gradient-to-l from-[#0D343A] to-transparent z-10" />
                </>
            )}

            {isLoading && <div className={classes.loading}>Connection sequence initiated...</div>}
            {error && !isLoading && <div className={classes.error}>Connection sequence failed. Showing stale data.</div>}

            <motion.div
                className={classes.content}
                animate={{ x: ["0%", "-50%"] }}
                transition={{ repeat: Infinity, ease: "linear", duration: 80 }}
            >
                {duplicatedItems.map((item, index) => {
                    const isPositive = item.change.startsWith("+");
                    const isNeutral = item.change === "0%" || item.change === "+0%" || item.change === "0.00%";
                    const badgeClass = isNeutral ? classes.neutral : isPositive ? classes.positive : classes.negative;
                    const direction = isNeutral ? "•" : isPositive ? "▲" : "▼";

                    return (
                        <div key={`${item.symbol}-${index}`} className={classes.item}>
                            <div className="flex flex-col leading-none">
                                <span className={classes.symbol}>{item.symbol}</span>
                                <div className="flex items-center gap-3">
                                    <span className={classes.value}>{item.value}</span>
                                    <div className={`flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded border ${badgeClass}`}>
                                        <span className="text-[7px]">{direction}</span>
                                        <span>{item.change}</span>
                                    </div>
                                </div>
                            </div>
                            {classes.divider ? <div className={classes.divider}></div> : null}
                        </div>
                    );
                })}
            </motion.div>
        </div>
    );
}
