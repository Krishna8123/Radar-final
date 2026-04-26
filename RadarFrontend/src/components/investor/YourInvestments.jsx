import { useEffect, useMemo, useState } from 'react';
import { PieChart, Wallet, ArrowUpRight } from 'lucide-react';
import { fetchPortfolio } from '../../api/portfolioApi';

const displaySymbol = (value) => String(value || '').replace(/\.(NS|BO)$/i, '');

const YourInvestments = ({ onStartInvesting }) => {
    const [portfolio, setPortfolio] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const loadPortfolio = async () => {
            try {
                setIsLoading(true);
                setHasError(false);
                const response = await fetchPortfolio();
                setPortfolio(response);
            } catch (error) {
                console.error('Failed to load portfolio:', error);
                setHasError(true);
            } finally {
                setIsLoading(false);
            }
        };

        loadPortfolio();
    }, []);

    const summary = useMemo(() => {
        const holdings = portfolio?.holdings ?? [];
        const investedValue = holdings.reduce(
            (total, holding) => total + (Number(holding.quantity) || 0) * (Number(holding.avgBuyPrice) || 0),
            0
        );
        const cashBalance = Number(portfolio?.cashBalance) || 0;
        const totalValue = investedValue + cashBalance;

        const topHoldings = [...holdings]
            .map((holding) => ({
                ...holding,
                invested: (Number(holding.quantity) || 0) * (Number(holding.avgBuyPrice) || 0)
            }))
            .sort((a, b) => b.invested - a.invested)
            .slice(0, 3);

        return {
            holdings,
            topHoldings,
            investedValue,
            cashBalance,
            totalValue,
            totalTrades: Number(portfolio?.totalTrades) || 0
        };
    }, [portfolio]);

    return (
        <div className="investor-card p-6 flex flex-col items-center justify-between text-center h-full min-h-[320px] relative overflow-hidden">
            {isLoading && (
                <div className="absolute inset-0 bg-white/5 backdrop-blur-sm z-20 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            <div className="w-full text-left mb-2 z-10">
                <h3 className="text-lg font-bold text-slate-800">Your Investments</h3>
            </div>

            {summary.holdings.length > 0 ? (
                <div className="flex flex-col justify-between flex-1 w-full z-10 py-2 text-left">
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="rounded-2xl bg-blue-500/10 border border-blue-100/50 p-4">
                            <div className="flex items-center gap-2 text-blue-700 mb-2">
                                <Wallet size={15} />
                                <span className="text-[10px] font-black uppercase tracking-wider">Portfolio Value</span>
                            </div>
                            <div className="text-2xl font-black text-slate-800">₹{summary.totalValue.toLocaleString()}</div>
                            <p className="text-[11px] text-slate-500 mt-1">{summary.holdings.length} active holdings</p>
                        </div>

                        <div className="rounded-2xl bg-slate-500/10 border border-slate-100/50 p-4">
                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Cash Balance</div>
                            <div className="text-2xl font-black text-slate-800">₹{summary.cashBalance.toLocaleString()}</div>
                            <p className="text-[11px] text-slate-500 mt-1">{summary.totalTrades} trades executed</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100/30 bg-slate-500/5 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-black text-slate-800">Top Holdings</h4>
                            <span className="text-[10px] font-bold text-blue-600">Live portfolio sync</span>
                        </div>

                        <div className="space-y-3">
                            {summary.topHoldings.map((holding) => {
                                const allocation = summary.investedValue > 0
                                    ? Math.round((holding.invested / summary.investedValue) * 100)
                                    : 0;

                                return (
                                    <div key={holding.symbol} className="flex items-center justify-between gap-3 rounded-xl bg-white/10 px-3 py-2.5 border border-slate-100/50 space-y-3">
                                        <div>
                                            <div className="text-sm font-black text-slate-800">{displaySymbol(holding.symbol)}</div>
                                            <div className="text-[11px] text-slate-500">
                                                {holding.quantity} units · Avg ₹{Number(holding.avgBuyPrice || 0).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-black text-slate-800">₹{holding.invested.toLocaleString()}</div>
                                            <div className="text-[11px] font-bold text-blue-600">{allocation}% allocation</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center flex-1 w-full z-10 py-4">
                    <div className="w-20 h-20 mb-6 bg-blue-500/10 border border-blue-100/30 rounded-full flex items-center justify-center relative shadow-[inset_0_2px_10px_rgba(59,130,246,0.05)]">
                        <PieChart size={32} className="text-blue-500/50 relative z-10" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-white border border-blue-100 rounded-lg flex items-center justify-center shadow-sm">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        </div>
                    </div>

                    <h4 className="text-sm font-black text-slate-800 mb-2">
                        {hasError ? 'Portfolio sync is temporarily unavailable.' : 'Your portfolio is waiting for action.'}
                    </h4>
                    <p className="text-xs text-slate-400 mb-8 max-w-[220px] leading-relaxed">
                        {hasError
                            ? 'Sign in again or retry later to restore your portfolio snapshot.'
                            : 'Place your first trade to populate holdings, balances, and allocation insights here.'}
                    </p>

                    <button 
                        onClick={() => onStartInvesting && onStartInvesting('WATCHLIST')}
                        className="px-8 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[11px] font-black rounded-xl hover:shadow-[0_8px_20px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 transition-all shadow-md active:scale-95 uppercase tracking-wider inline-flex items-center gap-2"
                    >
                        <ArrowUpRight size={14} />
                        Start Investing
                    </button>
                </div>
            )}
        </div>
    );
};

export default YourInvestments;
