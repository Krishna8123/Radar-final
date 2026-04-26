import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { fetchPulse } from '../../api/analyticsApi';

const displaySymbol = (value) => String(value || '').replace(/\.(NS|BO)$/i, '');

const mockMostBought = [
    { id: 'mock-1', name: 'RELIANCE', price: '₹2,845', change: '+1.40%', isPositive: true, logo: 'R', tag: 'Gap Up' },
    { id: 'mock-2', name: 'INFY', price: '₹1,510', change: '+1.05%', isPositive: true, logo: 'I', tag: 'Gap Up' },
    { id: 'mock-3', name: 'TATASTEEL', price: '₹152', change: '-1.10%', isPositive: false, logo: 'T', tag: 'Gap Down' },
    { id: 'mock-4', name: 'ICICIBANK', price: '2.3x vol', change: '2.3x', isPositive: true, logo: 'I', tag: 'Volume' },
];

const MostBoughtStocks = () => {
    const navigate = useNavigate();
    const [pulse, setPulse] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const loadPulse = async () => {
            try {
                setIsLoading(true);
                setHasError(false);
                const response = await fetchPulse();
                setPulse(response);
            } catch (error) {
                console.error('Failed to load market pulse:', error);
                setHasError(true);
            } finally {
                setIsLoading(false);
            }
        };

        loadPulse();
    }, []);

    const cards = useMemo(() => {
        const gapUp = (pulse?.gapUp ?? []).map((item, index) => ({
            id: `gap-up-${item.symbol}-${index}`,
            name: item.symbol,
            price: `₹${Number(item.price || 0).toLocaleString()}`,
            change: item.change,
            isPositive: true,
            logo: displaySymbol(item.symbol || '?').slice(0, 1),
            tag: 'Gap Up'
        }));

        const gapDown = (pulse?.gapDown ?? []).map((item, index) => ({
            id: `gap-down-${item.symbol}-${index}`,
            name: item.symbol,
            price: `₹${Number(item.price || 0).toLocaleString()}`,
            change: item.change,
            isPositive: false,
            logo: displaySymbol(item.symbol || '?').slice(0, 1),
            tag: 'Gap Down'
        }));

        const volumeShockers = (pulse?.volumeShockers ?? []).map((item, index) => ({
            id: `volume-${item.symbol}-${index}`,
            name: item.symbol,
            price: `${item.volume} vol`,
            change: item.shock,
            isPositive: true,
            logo: displaySymbol(item.symbol || '?').slice(0, 1),
            tag: 'Volume'
        }));

        const liveCards = [...gapUp, ...gapDown, ...volumeShockers].slice(0, 8);

        if (liveCards.length > 0) {
            return liveCards;
        }

        return mockMostBought;
    }, [pulse]);

    const openStockPage = (name) => {
        const symbol = String(name || '').trim();
        if (!symbol) return;
        navigate(`/investor-stock/${encodeURIComponent(symbol.toUpperCase())}`);
    };

    return (
        <div className="investor-card p-6 h-full flex flex-col relative overflow-hidden">
            {isLoading && (
                <div className="absolute inset-0 bg-white/5 backdrop-blur-sm z-20 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-primary-500 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Market Pulse</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Gap movers and volume shockers from the analytics feed</p>
                </div>
                <div className="text-[10px] font-bold text-blue-600 bg-blue-50/70 px-2 py-1 rounded inline-flex items-center gap-1 border border-blue-100/50">
                    <Activity size={11} />
                    {hasError ? 'Fallback mode' : 'Live feed'}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
                {cards.map((stock) => (
                    <div 
                        key={stock.id} 
                        onClick={() => openStockPage(stock.name)}
                        className="p-4 relative group hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 border border-slate-200/80 rounded-2xl bg-white/10 backdrop-blur-sm shadow-sm cursor-pointer"
                    >
                        <div className="absolute top-3 right-3 text-slate-300 group-hover:text-blue-500 cursor-pointer transition-colors" onClick={(e) => e.stopPropagation()}>
                            <Bookmark size={15} />
                        </div>

                        <div className="w-9 h-9 rounded-xl bg-blue-50/50 border border-blue-100/50 flex items-center justify-center font-black text-blue-600/70 mb-4 shadow-sm group-hover:bg-blue-100 transition-colors">
                            {stock.logo}
                        </div>

                        <h4 className="text-xs font-bold text-slate-700 mb-5 line-clamp-2 h-8 leading-tight group-hover:text-blue-700 transition-colors">{displaySymbol(stock.name)}</h4>

                        {stock.tag && (
                            <div className={`inline-flex items-center mb-4 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${stock.isPositive ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                                {stock.tag}
                            </div>
                        )}

                        <div className="mt-auto border-t border-slate-50 pt-3">
                            <div className="text-sm font-black text-slate-800">{stock.price}</div>
                            <div className={`text-[10px] font-bold flex items-center gap-1 mt-1 ${stock.isPositive ? 'text-blue-500' : 'text-rose-500'}`}>
                                {stock.isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {stock.change}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MostBoughtStocks;
