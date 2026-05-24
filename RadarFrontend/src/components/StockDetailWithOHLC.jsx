import React from 'react';
import { useOHLCData, useLatestOHLC, useChartData } from '../hooks/useOHLCData';



const StockChartWithOHLC = ({ symbol, chartType = 'line' }) => {
    const { data, loading, error, isCached, refetch } = useChartData(symbol, {
        type: 'STOCK',
        interval: '1D',
        limit: 90, // Last 90 days
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading chart data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="text-red-500 mb-4">Error: {error}</div>
                <button
                    onClick={refetch}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">No data available</div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {}
            <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{symbol} - Last 90 Days</h3>
                <div className="flex items-center gap-2">
                    {isCached && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                            ⚡ Fast (Cached)
                        </span>
                    )}
                    <span className="text-sm text-gray-500">
                        {data.length} data points
                    </span>
                </div>
            </div>

            {}
            <ResponsiveContainer width="100%" height={400}>
                {chartType === 'line' && (
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="close"
                            stroke="#8884d8"
                            strokeWidth={2}
                            dot={false}
                            name="Close Price"
                        />
                    </LineChart>
                )}

                {chartType === 'area' && (
                    <AreaChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area
                            type="monotone"
                            dataKey="close"
                            stroke="#8884d8"
                            fill="#8884d8"
                            fillOpacity={0.3}
                            name="Close Price"
                        />
                    </AreaChart>
                )}

                {chartType === 'volume' && (
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="volume" fill="#82ca9d" name="Volume" />
                    </BarChart>
                )}
            </ResponsiveContainer>
        </div>
    );
};


const LatestPriceCard = ({ symbol }) => {
    const { data, loading, error } = useLatestOHLC(symbol, {
        exchange: 'NSE',
        timeframe: '1d',
        refreshInterval: 60000, // Refresh every 60 seconds
    });

    if (loading) {
        return <div className="animate-pulse h-20 bg-gray-200 rounded"></div>;
    }

    if (error || !data) {
        return (
            <div className="p-4 bg-red-50 rounded">
                <div className="text-red-600 text-sm">Unable to load price</div>
            </div>
        );
    }

    const priceChange = data.close - data.open;
    const priceChangePercent = ((priceChange / data.open) * 100).toFixed(2);
    const isPositive = priceChange >= 0;

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <div className="text-sm text-gray-500 mb-1">{symbol}</div>
            <div className="text-2xl font-bold mb-2">₹{data.close.toFixed(2)}</div>
            <div className={`flex items-center gap-2 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                <span>{isPositive ? '▲' : '▼'}</span>
                <span>{Math.abs(priceChange).toFixed(2)}</span>
                <span>({priceChangePercent}%)</span>
            </div>
            <div className="mt-2 text-xs text-gray-400">
                H: ₹{data.high.toFixed(2)} | L: ₹{data.low.toFixed(2)}
            </div>
        </div>
    );
};


const PriceHistoryTable = ({ symbol, days = 10 }) => {
    const { data, loading, error } = useOHLCData(symbol, {
        exchange: 'NSE',
        timeframe: '1d',
        limit: days,
    });

    if (loading) {
        return <div className="text-center py-4">Loading...</div>;
    }

    if (error) {
        return <div className="text-red-500 text-center py-4">Error: {error}</div>;
    }

    if (!data || data.length === 0) {
        return <div className="text-gray-500 text-center py-4">No data available</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="px-4 py-2 border">Date</th>
                        <th className="px-4 py-2 border">Open</th>
                        <th className="px-4 py-2 border">High</th>
                        <th className="px-4 py-2 border">Low</th>
                        <th className="px-4 py-2 border">Close</th>
                        <th className="px-4 py-2 border">Volume</th>
                    </tr>
                </thead>
                <tbody>
                    {data.slice().reverse().map((candle, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 border">
                                {new Date(candle.timestamp).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 border">₹{candle.open.toFixed(2)}</td>
                            <td className="px-4 py-2 border text-green-600">₹{candle.high.toFixed(2)}</td>
                            <td className="px-4 py-2 border text-red-600">₹{candle.low.toFixed(2)}</td>
                            <td className="px-4 py-2 border font-semibold">₹{candle.close.toFixed(2)}</td>
                            <td className="px-4 py-2 border text-gray-600">
                                {candle.volume ? candle.volume.toLocaleString() : 'N/A'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const StockDetailPage = ({ symbol = 'RELIANCE' }) => {
    const [chartType, setChartType] = React.useState('line');

    return (
        <div className="container mx-auto p-4 space-y-6">
            <h1 className="text-3xl font-bold mb-6">Stock Details - {symbol}</h1>

            {}
            <LatestPriceCard symbol={symbol} />

            {}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-4 flex gap-2">
                    <button
                        onClick={() => setChartType('line')}
                        className={`px-4 py-2 rounded ${
                            chartType === 'line' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                        }`}
                    >
                        Line Chart
                    </button>
                    <button
                        onClick={() => setChartType('area')}
                        className={`px-4 py-2 rounded ${
                            chartType === 'area' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                        }`}
                    >
                        Area Chart
                    </button>
                    <button
                        onClick={() => setChartType('volume')}
                        className={`px-4 py-2 rounded ${
                            chartType === 'volume' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                        }`}
                    >
                        Volume
                    </button>
                </div>

                <StockChartWithOHLC symbol={symbol} chartType={chartType} />
            </div>

            {}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Recent Price History</h2>
                <PriceHistoryTable symbol={symbol} days={10} />
            </div>
        </div>
    );
};

export default StockDetailPage;
export {
    StockChartWithOHLC,
    LatestPriceCard,
    PriceHistoryTable,
};
