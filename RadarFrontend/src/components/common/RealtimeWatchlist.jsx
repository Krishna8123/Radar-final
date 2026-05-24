import { useWatchlistQuotes } from '../../hooks/useRealtimeQuote';


const RealtimeWatchlist = ({ symbols = [], title = 'My Watchlist' }) => {
    const {
        quotes,
        loading,
        error,
        stats,
        refetch,
    } = useWatchlistQuotes(symbols);

    if (loading && Object.keys(quotes).length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-2xl font-bold mb-4">{title}</h2>
                <div className="animate-pulse space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-2xl font-bold mb-4">{title}</h2>
                <div className="bg-red-50 border border-red-200 p-4 rounded">
                    <p className="text-red-700">❌ {error}</p>
                    <button
                        onClick={refetch}
                        className="mt-2 text-red-600 underline text-sm"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (symbols.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-2xl font-bold mb-4">{title}</h2>
                <p className="text-gray-600">No symbols in watchlist</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            {}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold">{title}</h2>
                    <p className="text-sm text-gray-600">
                        {stats.successful} / {symbols.length} quotes loaded
                    </p>
                </div>
                <button
                    onClick={refetch}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    disabled={loading}
                >
                    {loading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left py-2 px-4">Symbol</th>
                            <th className="text-right py-2 px-4">Price</th>
                            <th className="text-right py-2 px-4">Change</th>
                            <th className="text-right py-2 px-4">Change %</th>
                            <th className="text-right py-2 px-4">Volume</th>
                            <th className="text-center py-2 px-4">Source</th>
                        </tr>
                    </thead>
                    <tbody>
                        {symbols.map((symbol) => {
                            const quote = quotes[symbol];

                            if (!quote) {
                                return (
                                    <tr key={symbol} className="border-b hover:bg-gray-50">
                                        <td className="py-3 px-4 font-semibold">{symbol}</td>
                                        <td colSpan="5" className="text-center text-gray-500">
                                            Loading...
                                        </td>
                                    </tr>
                                );
                            }

                            const isPositive = quote.change >= 0;
                            const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
                            const bgColor = isPositive ? 'bg-green-50' : 'bg-red-50';

                            return (
                                <tr key={symbol} className="border-b hover:bg-gray-50">
                                    <td className="py-3 px-4">
                                        <div>
                                            <p className="font-semibold">{symbol}</p>
                                            {quote.stale && (
                                                <span className="text-xs text-yellow-600">⚠️ï¸ Stale</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="text-right py-3 px-4 font-semibold">
                                        ₹{quote.price?.toFixed(2) || '—'}
                                    </td>
                                    <td className={`text-right py-3 px-4 font-semibold ${changeColor}`}>
                                        {isPositive ? '▲' : '▼'} {Math.abs(quote.change)?.toFixed(2) || 0}
                                    </td>
                                    <td className="text-right py-3 px-4">
                                        <span className={`${bgColor} ${changeColor} px-2 py-1 rounded font-semibold`}>
                                            {quote.changePercent?.toFixed(2) || 0}%
                                        </span>
                                    </td>
                                    <td className="text-right py-3 px-4 text-sm text-gray-600">
                                        {quote.volume?.toLocaleString() || '—'}
                                    </td>
                                    <td className="text-center py-3 px-4">
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                            {quote.source || 'N/A'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {}
            <div className="mt-4 text-xs text-gray-500 text-center">
                Auto-refreshes every 5 minutes
            </div>
        </div>
    );
};

export default RealtimeWatchlist;
