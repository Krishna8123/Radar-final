const { fetchStockData } = require('../services/stockService');

const getPreMarketPulse = async (req, res) => {
    try {
        const stocks = await fetchStockData();

        const sortedByChangeDesc = [...stocks].sort((a, b) => Number(b.change || 0) - Number(a.change || 0));
        const sortedByChangeAsc = [...stocks].sort((a, b) => Number(a.change || 0) - Number(b.change || 0));

        const gapUp = sortedByChangeDesc.slice(0, 5).map((s) => ({
            symbol: s.symbol,
            change: `${Number(s.change || 0) >= 0 ? '+' : ''}${Number(s.change || 0).toFixed(2)}%`,
            price: s.price,
        }));
        const gapDown = sortedByChangeAsc.slice(0, 5).map((s) => ({
            symbol: s.symbol,
            change: `${Number(s.change || 0).toFixed(2)}%`,
            price: s.price,
        }));

        const volumeShockers = [...stocks]
            .map(s => {
                const vol = Number(s.volume) || 0;
                const avgVol = Number(s.averageVolume) || 0;
                const shockRatio = avgVol > 0 ? (vol / avgVol) : 1.0;
                return {
                    symbol: s.symbol,
                    volume: vol >= 1e6 ? `${(vol / 1e6).toFixed(2)}M` : vol.toLocaleString(),
                    avgVolume: avgVol > 0 ? (avgVol >= 1e6 ? `${(avgVol / 1e6).toFixed(2)}M` : avgVol.toLocaleString()) : 'Unavailable',
                    shock: avgVol > 0 ? `${shockRatio.toFixed(1)}x` : 'Unavailable',
                    shockRatio,
                    vol
                };
            })
            .sort((a, b) => {
                if (a.shock !== 'Unavailable' && b.shock !== 'Unavailable') {
                    return b.shockRatio - a.shockRatio;
                }
                if (a.shock !== 'Unavailable') return -1;
                if (b.shock !== 'Unavailable') return 1;
                return b.vol - a.vol;
            })
            .slice(0, 6)
            .map(({ symbol, volume, avgVolume, shock }) => ({ symbol, volume, avgVolume, shock }));

        res.json({
            gapUp,
            gapDown,
            volumeShockers
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
};

const getSectorHeatmap = async (req, res) => {
    try {
        const stocks = await fetchStockData();
        const sectorMap = {};

        for (const stock of stocks) {
            const sector = stock.details?.sector || stock.sector || 'General';
            if (['Unknown', 'Other', 'Currency', 'N/A', '', 'Broad Market'].includes(sector)) continue;
            if (!sectorMap[sector]) {
                sectorMap[sector] = [];
            }
            sectorMap[sector].push({
                name: String(stock.symbol || '').replace(/\.(NS|BO)$/i, ''),
                change: Number(stock.change || 0)
            });
        }

        const heatmapData = Object.entries(sectorMap).map(([sector, children]) => ({
            name: sector,
            children: children.slice(0, 5) // Limit to top 5 stocks per sector for rendering clarity
        }));

        res.json(heatmapData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
};

module.exports = { getPreMarketPulse, getSectorHeatmap };
