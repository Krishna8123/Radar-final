import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createChart, AreaSeries, CandlestickSeries, ColorType, LineSeries } from 'lightweight-charts';
import { ArrowLeft, BarChart2, Activity, TrendingUp, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchOHLCData } from '../../../api/ohlcApi';
import { fetchTechnicalSummary } from '../../../api/technicalApi';
import api from '../../../api/api';

const TIMEFRAME_OPTIONS = [
  { id: '10m', label: '10M', backend: '15m' },
  { id: '15m', label: '15M', backend: '15m' },
  { id: '30m', label: '30M', backend: '1h' },
  { id: '1H', label: '1H', backend: '1h' },
  { id: '1D', label: '1D', backend: '1d' },
  { id: '1W', label: '1W', backend: '1d' },
];

const generateFallbackCandles = (symbol, basePrice, timeframe) => {
  const tf = TIMEFRAME_OPTIONS.find((item) => item.id === timeframe);
  const stepMap = {
    '10m': 600,
    '15m': 900,
    '30m': 1800,
    '1H': 3600,
    '1D': 86400,
    '1W': 604800,
  };

  const step = stepMap[tf?.id || '10m'];
  const total = 160;
  const now = Math.floor(Date.now() / 1000);
  const start = now - (total - 1) * step;
  const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  let price = Number(basePrice);

  return Array.from({ length: total }, (_, index) => {
    const wave = Math.sin((index + seed) / 6) * (price * 0.004);
    const drift = ((index % 11) - 5) * (price * 0.00035);
    const close = Math.max(1, price + wave + drift);
    const open = price;
    const high = Math.max(open, close) + price * 0.0035;
    const low = Math.min(open, close) - price * 0.0035;
    const volume = Math.round(800000 + ((index + 1) * 17391) % 2200000);
    const timestamp = new Date((start + index * step) * 1000).toISOString();

    price = close;

    return {
      time: start + index * step,
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    };
  });
};

const calculateMovingAverage = (rows, period) => {
  return rows.map((row, index) => {
    if (index < period - 1) {
      return null;
    }

    const slice = rows.slice(index - period + 1, index + 1);
    const average = slice.reduce((sum, item) => sum + item.close, 0) / period;

    return {
      time: row.time,
      value: Number(average.toFixed(2)),
    };
  }).filter(Boolean);
};

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function ResearchAdvancedChartPage({ symbol, basePrice = 2870.15 }) {
  const navigate = useNavigate();
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const [timeframe, setTimeframe] = useState('10m');
  const [chartType, setChartType] = useState('candles');
  const [showSma, setShowSma] = useState(true);
  const [showEma, setShowEma] = useState(false);
  const [rows, setRows] = useState([]);
  const [dataSource, setDataSource] = useState('fallback');
  const [statusText, setStatusText] = useState('Using frontend fallback data');
  const [loading, setLoading] = useState(false);

  const selectedTimeframe = TIMEFRAME_OPTIONS.find((item) => item.id === timeframe) || TIMEFRAME_OPTIONS[0];

  // Live sidebar data
  const [sidebarData, setSidebarData] = useState({ trend: null, sentiment: null, insights: [], news: [], atr: null, volumeStatus: null });

  useEffect(() => {
    if (!symbol) return;
    let active = true;
    Promise.allSettled([
      fetchTechnicalSummary('stock', symbol),
      api.get(`/market/news?symbol=${encodeURIComponent(symbol)}&limit=3`),
    ]).then(([techRes, newsRes]) => {
      if (!active) return;
      const tech = techRes.status === 'fulfilled' ? techRes.value : null;
      const newsData = newsRes.status === 'fulfilled' ? (newsRes.value?.data?.articles ?? newsRes.value?.data?.news ?? newsRes.value?.data ?? []) : [];
      setSidebarData({
        trend: tech?.score?.bias ?? tech?.indicators?.trend ?? 'N/A',
        sentiment: tech?.score?.bias ?? 'N/A',
        insights: tech?.patterns?.map(p => p.description || p.pattern) ?? [],
        news: Array.isArray(newsData) ? newsData.slice(0, 3) : [],
        atr: tech?.indicators?.atr ?? null,
        volumeStatus: tech?.indicators?.volumeStatus ?? null,
      });
    });
    return () => { active = false; };
  }, [symbol]);

  useEffect(() => {
    let isMounted = true;

    const loadRows = async () => {
      setLoading(true);

      try {
        const result = await fetchOHLCData(symbol, {
          exchange: 'NSE',
          timeframe: selectedTimeframe.backend,
          limit: 160,
        });

        if (!isMounted) {
          return;
        }

        if (Array.isArray(result.data) && result.data.length > 0) {
          setRows(result.data.map((item) => ({
            time: Math.floor(new Date(item.timestamp).getTime() / 1000),
            timestamp: item.timestamp,
            open: Number(item.open),
            high: Number(item.high),
            low: Number(item.low),
            close: Number(item.close),
            volume: Number(item.volume || 0),
          })));
          setDataSource('backend');
          setStatusText('Using backend OHLC data');
        } else {
          setRows(generateFallbackCandles(symbol, basePrice, timeframe));
          setDataSource('fallback');
          setStatusText('Backend unavailable, showing frontend fallback data');
        }
      } catch (_error) {
        if (!isMounted) {
          return;
        }

        setRows(generateFallbackCandles(symbol, basePrice, timeframe));
        setDataSource('fallback');
        setStatusText('Backend unavailable, showing frontend fallback data');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRows();

    return () => {
      isMounted = false;
    };
  }, [symbol, basePrice, timeframe, selectedTimeframe.backend]);

  const latestBar = rows[rows.length - 1];
  const firstBar = rows[0];
  const currentPrice = latestBar?.close ?? Number(basePrice);
  const changePercent = firstBar?.open
    ? ((currentPrice - firstBar.open) / firstBar.open) * 100
    : 0;
  const positive = changePercent >= 0;

  const sma20 = useMemo(() => calculateMovingAverage(rows, 20), [rows]);
  const ema20 = useMemo(() => {
    if (!rows.length) {
      return [];
    }

    const multiplier = 2 / (20 + 1);
    let previous = rows[0].close;

    return rows.map((row) => {
      previous = (row.close - previous) * multiplier + previous;
      return { time: row.time, value: Number(previous.toFixed(2)) };
    });
  }, [rows]);

  useEffect(() => {
    if (!chartContainerRef.current || !rows.length) {
      return undefined;
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0b1120' },
        textColor: 'rgba(148, 163, 184, 0.92)',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 620,
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.06)',
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        timeVisible: true,
      },
      crosshair: {
        vertLine: { color: 'rgba(56, 189, 248, 0.22)' },
        horzLine: { color: 'rgba(56, 189, 248, 0.22)' },
      },
    });

    let priceSeries;
    if (chartType === 'candles') {
      priceSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#12d18e',
        downColor: '#ff4d6d',
        wickUpColor: '#12d18e',
        wickDownColor: '#ff4d6d',
        borderVisible: false,
      });
      priceSeries.setData(rows);
    } else if (chartType === 'area') {
      priceSeries = chart.addSeries(AreaSeries, {
        lineColor: '#38bdf8',
        topColor: 'rgba(56, 189, 248, 0.22)',
        bottomColor: 'rgba(56, 189, 248, 0.02)',
      });
      priceSeries.setData(rows.map((row) => ({ time: row.time, value: row.close })));
    } else {
      priceSeries = chart.addSeries(LineSeries, {
        color: '#38bdf8',
        lineWidth: 2,
      });
      priceSeries.setData(rows.map((row) => ({ time: row.time, value: row.close })));
    }

    if (showSma && sma20.length) {
      const smaSeries = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 2,
      });
      smaSeries.setData(sma20);
    }

    if (showEma && ema20.length) {
      const emaSeries = chart.addSeries(LineSeries, {
        color: '#a78bfa',
        lineWidth: 2,
      });
      emaSeries.setData(ema20);
    }

    chart.timeScale().fitContent();
    chartInstanceRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartInstanceRef.current = null;
    };
  }, [rows, chartType, showSma, showEma]);

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <div className="mx-auto max-w-[1800px] px-4 py-4 md:px-6">
        <header className="rounded-3xl border border-white/8 bg-[#0b1120] px-5 py-4 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-black tracking-tight">{symbol}</h1>
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">NSE</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className={`rounded-xl border px-3 py-2 ${positive ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-rose-500/25 bg-rose-500/10'}`}>
                    <span className={`text-xl font-black ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>{formatNumber(currentPrice)}</span>
                    <span className={`ml-3 text-sm font-bold ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {positive ? '+' : ''}{changePercent.toFixed(2)}%
                    </span>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${dataSource === 'backend' ? 'bg-emerald-500/12 text-emerald-300' : 'bg-amber-500/12 text-amber-300'}`}>
                    {dataSource === 'backend' ? 'Backend OHLC' : 'Fallback'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {TIMEFRAME_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTimeframe(option.id)}
                  className={`rounded-full px-4 py-2 text-xs font-black tracking-[0.18em] transition ${
                    timeframe === option.id
                      ? 'bg-cyan-400 text-slate-950'
                      : 'border border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/6 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'candles', label: 'Candles', icon: BarChart2 },
                { id: 'line', label: 'Line', icon: Activity },
                { id: 'area', label: 'Area', icon: TrendingUp },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setChartType(option.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                    chartType === option.id
                      ? 'bg-white/10 text-white'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <option.icon size={15} />
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSma((value) => !value)}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition ${showSma ? 'bg-amber-500/15 text-amber-300' : 'bg-white/5 text-slate-400'}`}
              >
                SMA 20
              </button>
              <button
                type="button"
                onClick={() => setShowEma((value) => !value)}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition ${showEma ? 'bg-violet-500/15 text-violet-300' : 'bg-white/5 text-slate-400'}`}
              >
                EMA 20
              </button>
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                {statusText}
              </div>
            </div>
          </div>
        </header>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-3xl border border-white/8 bg-[#0b1120] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
            <div ref={chartContainerRef} className="w-full overflow-hidden rounded-2xl border border-white/6 bg-[#0a0f1c]" />
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-white/8 bg-[#0b1120] p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Research Summary</div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Trend</div>
                  <div className="mt-2 text-lg font-black text-emerald-300 capitalize">{sidebarData.trend ?? '—'}</div>
                </div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Sentiment</div>
                  <div className="mt-2 text-lg font-black text-cyan-300 capitalize">{sidebarData.sentiment ?? '—'}</div>
                </div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Research Notes</div>
                  {sidebarData.insights.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm text-slate-300">
                      {sidebarData.insights.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">Loading insights...</p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/8 bg-[#0b1120] p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Research Feed</div>
              <div className="mt-4 space-y-3">
                {sidebarData.news.length > 0 ? sidebarData.news.map((item, i) => (
                  <div key={i} className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                    <div className="text-sm font-bold leading-snug text-slate-100">{item.title || item.headline}</div>
                    <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      {item.source?.name ?? item.source ?? 'RADAR'} • {item.publishedAt ? new Date(item.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500 mt-2">Fetching news...</p>
                )}
              </div>
            </section>
          </aside>
        </div>

        <section className="mt-4 rounded-3xl border border-white/8 bg-[#0b1120] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Stock Details</div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
            {[
              ['Price', formatNumber(currentPrice)],
              ['Date', latestBar?.timestamp ? new Date(latestBar.timestamp).toLocaleDateString() : 'Fallback'],
              ['Open', formatNumber(latestBar?.open || currentPrice)],
              ['High', formatNumber(latestBar?.high || currentPrice)],
              ['Low', formatNumber(latestBar?.low || currentPrice)],
              ['Close', formatNumber(latestBar?.close || currentPrice)],
              ['Volume', Number(latestBar?.volume || 0).toLocaleString('en-IN')],
              ['Source', dataSource === 'backend' ? 'Backend OHLC' : 'Fallback'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</div>
                <div className="mt-2 text-sm font-bold text-slate-100">{value}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-400">
            <div>Exchange: NSE</div>
            <div>Timeframe: {selectedTimeframe.label}</div>
            <div>ATR: {sidebarData.atr != null ? Number(sidebarData.atr).toFixed(2) : '—'}</div>
            <div>Volume Status: {sidebarData.volumeStatus ?? '—'}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
