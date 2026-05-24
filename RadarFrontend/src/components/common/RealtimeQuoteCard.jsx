import { useRealtimeQuote } from '../../hooks/useRealtimeQuote';


const RealtimeQuoteCard = ({ symbol, className = '' }) => {
    const {
        quote,
        loading,
        error,
        isStale,
        price,
        change,
        changePercent,
        source,
    } = useRealtimeQuote(symbol, {
        autoFetch: true,
        refreshInterval: 60000, // Refresh every 60 seconds
        maxAge: 60000, // Use 1-minute cached data
    });

    if (loading && !quote) {
        return (
            <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
                    <div className="h-10 bg-gray-200 rounded w-48 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-24"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-red-50 border border-red-200 p-6 rounded-lg ${className}`}>
                <h3 className="text-lg font-bold text-red-900 mb-2">{symbol}</h3>
                <p className="text-red-700">❌ {error}</p>
            </div>
        );
    }

    if (!quote) {
        return (
            <div className={`bg-gray-50 border border-gray-200 p-6 rounded-lg ${className}`}>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{symbol}</h3>
                <p className="text-gray-600">No quote data available</p>
            </div>
        );
    }

    const isPositive = change >= 0;
    const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
    const bgColor = isPositive ? 'bg-green-50' : 'bg-red-50';

    return (
        <div className={`bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow ${className}`}>
            {}
            <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-gray-900">{symbol}</h3>
                {isStale && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        ⚠️ Stale
                    </span>
                )}
            </div>

            {}
            <div className="mb-2">
                <p className="text-3xl font-bold text-gray-900">
                    ₹{price?.toFixed(2) || '—'}
                </p>
            </div>

            {}
            <div className={`${bgColor} ${changeColor} px-3 py-2 rounded-lg inline-block mb-3`}>
                <span className="font-semibold">
                    {isPositive ? '▲' : '▼'} {Math.abs(change)?.toFixed(2) || 0} ({changePercent?.toFixed(2) || 0}%)
                </span>
            </div>

            {}
            <div className="grid grid-cols-2 gap-3 text-sm mt-4">
                <div>
                    <p className="text-gray-500">Open</p>
                    <p className="font-semibold">₹{quote.open?.toFixed(2) || '—'}</p>
                </div>
                <div>
                    <p className="text-gray-500">Prev Close</p>
                    <p className="font-semibold">₹{quote.previousClose?.toFixed(2) || '—'}</p>
                </div>
                <div>
                    <p className="text-gray-500">High</p>
                    <p className="font-semibold text-green-600">₹{quote.high?.toFixed(2) || '—'}</p>
                </div>
                <div>
                    <p className="text-gray-500">Low</p>
                    <p className="font-semibold text-red-600">₹{quote.low?.toFixed(2) || '—'}</p>
                </div>
            </div>

            {}
            {quote.volume && (
                <div className="mt-3 text-sm">
                    <p className="text-gray-500">Volume</p>
                    <p className="font-semibold">{quote.volume.toLocaleString()}</p>
                </div>
            )}

            {}
            <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                    Source: <span className="font-semibold">{source || 'Unknown'}</span>
                    {quote.cached && <span className="ml-2">• Cached</span>}
                </p>
                {quote.timestamp && (
                    <p className="text-xs text-gray-500">
                        Updated: {new Date(quote.timestamp).toLocaleTimeString()}
                    </p>
                )}
            </div>
        </div>
    );
};

export default RealtimeQuoteCard;
