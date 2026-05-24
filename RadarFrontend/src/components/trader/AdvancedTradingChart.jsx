import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Maximize2,
  Settings,
  Download,
  Share2,
  Plus,
  Layers,
  Activity,
  BarChart3,
  Zap,
  Clock,
  Bell,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { fetchOHLCData } from '../../api/ohlcApi';
import api from '../../api/api';



const TIMEFRAMES = [
  { id: '1', label: '1m', seconds: 60 },
  { id: '5', label: '5m', seconds: 300 },
  { id: '15', label: '15m', seconds: 900 },
  { id: '30', label: '30m', seconds: 1800 },
  { id: '60', label: '1h', seconds: 3600 },
  { id: '240', label: '4h', seconds: 14400 },
  { id: 'D', label: '1D', seconds: 86400 },
  { id: 'W', label: '1W', seconds: 604800 },
  { id: 'M', label: '1M', seconds: 2592000 },
];

const BACKEND_TIMEFRAME = {
  '1': '1m',
  '5': '5m',
  '15': '15m',
  '30': '30m',
  '60': '1h',
  '240': '1h',
  D: '1d',
  W: '1wk',
  M: '1mo',
};

const CHART_TYPES = [
  { id: 'candlestick', label: 'Candlestick', icon: 'C' },
  { id: 'line', label: 'Line', icon: 'L' },
  { id: 'area', label: 'Area', icon: 'A' },
  { id: 'bars', label: 'Bars', icon: 'B' },
  { id: 'heikinashi', label: 'Heikin Ashi', icon: 'H' },
];

const INDICATORS = [
  { id: 'sma', label: 'Simple Moving Average (SMA)', category: 'Moving Averages', params: { period: 20 }, color: '#06b6d4' },
  { id: 'ema', label: 'Exponential Moving Average (EMA)', category: 'Moving Averages', params: { period: 20 }, color: '#8b5cf6' },
  { id: 'wma', label: 'Weighted Moving Average (WMA)', category: 'Moving Averages', params: { period: 20 }, color: '#f59e0b' },
  { id: 'vwma', label: 'Volume Weighted MA (VWMA)', category: 'Moving Averages', params: { period: 20 }, color: '#ec4899' },
  
  { id: 'rsi', label: 'Relative Strength Index (RSI)', category: 'Oscillators', params: { period: 14 }, color: '#10b981' },
  { id: 'macd', label: 'MACD', category: 'Oscillators', params: { fast: 12, slow: 26, signal: 9 }, color: '#3b82f6' },
  { id: 'stochastic', label: 'Stochastic', category: 'Oscillators', params: { k: 14, d: 3 }, color: '#f43f5e' },
  { id: 'cci', label: 'Commodity Channel Index (CCI)', category: 'Oscillators', params: { period: 20 }, color: '#14b8a6' },
  { id: 'mfi', label: 'Money Flow Index (MFI)', category: 'Oscillators', params: { period: 14 }, color: '#a855f7' },
  { id: 'willr', label: 'Williams %R', category: 'Oscillators', params: { period: 14 }, color: '#f97316' },
  
  { id: 'bollinger', label: 'Bollinger Bands', category: 'Bands', params: { period: 20, stdDev: 2 }, color: '#06b6d4' },
  { id: 'keltner', label: 'Keltner Channels', category: 'Bands', params: { period: 20, multiplier: 2 }, color: '#8b5cf6' },
  { id: 'donchian', label: 'Donchian Channels', category: 'Bands', params: { period: 20 }, color: '#f59e0b' },
  
  { id: 'volume', label: 'Volume', category: 'Volume', params: {}, color: '#64748b' },
  { id: 'obv', label: 'On Balance Volume (OBV)', category: 'Volume', params: {}, color: '#10b981' },
  { id: 'vwap', label: 'VWAP', category: 'Volume', params: {}, color: '#06b6d4' },
  { id: 'volumeRoc', label: 'Volume Rate of Change', category: 'Volume', params: { period: 12 }, color: '#f43f5e' },
  
  { id: 'adx', label: 'Average Directional Index (ADX)', category: 'Trend', params: { period: 14 }, color: '#3b82f6' },
  { id: 'ichimoku', label: 'Ichimoku Cloud', category: 'Trend', params: {}, color: '#8b5cf6' },
  { id: 'parabolicSar', label: 'Parabolic SAR', category: 'Trend', params: { step: 0.02, max: 0.2 }, color: '#f59e0b' },
  { id: 'supertrend', label: 'SuperTrend', category: 'Trend', params: { period: 10, multiplier: 3 }, color: '#10b981' },
  
  { id: 'atr', label: 'Average True Range (ATR)', category: 'Volatility', params: { period: 14 }, color: '#ef4444' },
  { id: 'stddev', label: 'Standard Deviation', category: 'Volatility', params: { period: 20 }, color: '#8b5cf6' },
  { id: 'historicalVolatility', label: 'Historical Volatility', category: 'Volatility', params: { period: 30 }, color: '#f59e0b' },
  
  { id: 'roc', label: 'Rate of Change (ROC)', category: 'Momentum', params: { period: 12 }, color: '#06b6d4' },
  { id: 'momentum', label: 'Momentum', category: 'Momentum', params: { period: 10 }, color: '#10b981' },
  { id: 'tsi', label: 'True Strength Index (TSI)', category: 'Momentum', params: { long: 25, short: 13 }, color: '#3b82f6' },
];

const AdvancedTradingChart = ({ 
  symbol = 'RELIANCE',
  initialTimeframe = '15',
  height = 600,
  onChartReady,
  showHeader = true,
}) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const ma7SeriesRef = useRef(null);
  const ma25SeriesRef = useRef(null);
  const indicatorSeriesRef = useRef({});
  
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [chartType, setChartType] = useState('candlestick');
  const [activeIndicators, setActiveIndicators] = useState([]);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceChange, setPriceChange] = useState({ value: 0, percent: 0 });

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: showHeader ? height : height + 80,
      layout: {
        background: { color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b', style: LineStyle.Dashed },
        horzLines: { color: '#1e293b', style: LineStyle.Dashed },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#06b6d4',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#06b6d4',
        },
        horzLine: {
          color: '#06b6d4',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#06b6d4',
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 12,
        minBarSpacing: 4,
        rightOffset: 5,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    candleSeriesRef.current = candleSeries;

    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // set as an overlay
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    const ma7Series = chart.addLineSeries({ color: '#22d3ee', lineWidth: 1.5, title: 'MA 7' });
    ma7SeriesRef.current = ma7Series;

    const ma25Series = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1.5, title: 'MA 25' });
    ma25SeriesRef.current = ma25Series;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight || (showHeader ? height : height + 80),
        });
      }
    };

    // ResizeObserver for accurate container sizing
    const resizeObserver = new ResizeObserver(() => handleResize());
    if (chartContainerRef.current) resizeObserver.observe(chartContainerRef.current);
    window.addEventListener('resize', handleResize);
    // Initial size set after mount
    setTimeout(handleResize, 50);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [symbol, timeframe, height, showHeader]);

  const calculateSMA = useCallback((data, period) => {
    const smaData = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
      smaData.push({
        time: data[i].time,
        value: sum / period,
      });
    }
    return smaData;
  }, []);

  const loadChartData = useCallback(async () => {
    setIsLoading(true);
    try {
      const cleanSymbol = symbol.replace(/\.(NS|BO)$/i, '');
      
      let yahooInterval = timeframe;
      if (timeframe === '60') yahooInterval = '1h';
      else if (timeframe === '240') yahooInterval = '1d';
      else if (timeframe === 'D') yahooInterval = '1d';
      else if (timeframe === 'W') yahooInterval = '1wk';
      else if (timeframe === 'M') yahooInterval = '1mo';
      else if (!['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo'].includes(yahooInterval)) {
           yahooInterval = yahooInterval + 'm'; 
      }

      const response = await api.get(`/ohlc/${cleanSymbol}/chart`, {
        params: { interval: yahooInterval, daysBack: 200 }
      });
      
      const rawData = response.data?.data || [];
      console.log("RAW API DATA", rawData);
      
      const candles = rawData
        .map(d => ({
          time: d.time ? Number(d.time) : Math.floor(new Date(d.timestamp || d.datetime || d.date).getTime() / 1000),
          open: Number(d.open),
          high: Number(d.high),
          low: Number(d.low),
          close: Number(d.close),
          volume: Number(d.volume) || 0,
        }))
        .sort((a, b) => a.time - b.time)
        .filter((d, index, rows) => index === 0 || d.time !== rows[index - 1].time);

      const cleanCandles = candles
        .filter(c =>
          c &&
          Number.isFinite(c.open) &&
          Number.isFinite(c.high) &&
          Number.isFinite(c.low) &&
          Number.isFinite(c.close) &&
          c.open > 0 &&
          c.high > 0 &&
          c.low > 0 &&
          c.close > 0 &&
          c.high >= c.low
        )
        .map(c => ({
          time: c.time,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume: Number(c.volume) || 0,
        }));
        
      console.log("CLEAN CANDLES", cleanCandles);
      
      if (candleSeriesRef.current && cleanCandles.length > 0) {
        candleSeriesRef.current.setData(cleanCandles);

        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.setData(
            cleanCandles.map(d => ({
              time: d.time,
              value: d.volume,
              color: d.close >= d.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
            }))
          );
        }

        if (ma7SeriesRef.current) ma7SeriesRef.current.setData(calculateSMA(cleanCandles, 7));
        if (ma25SeriesRef.current) ma25SeriesRef.current.setData(calculateSMA(cleanCandles, 25));

        const lastCandle = cleanCandles[cleanCandles.length - 1];
        const firstCandle = cleanCandles[0];
        setCurrentPrice(lastCandle.close);
        setPriceChange({
          value: lastCandle.close - firstCandle.close,
          percent: ((lastCandle.close - firstCandle.close) / firstCandle.close) * 100,
        });

        // Fit and scroll to show latest candles properly
        setTimeout(() => {
          if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
          }
        }, 50);
      }
      
      if (onChartReady) {
        onChartReady(chartRef.current);
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe, onChartReady, calculateSMA]);

  useEffect(() => {
    if (candleSeriesRef.current) {
      loadChartData();
    }
  }, [loadChartData]);





  const addIndicator = useCallback((indicator) => {
    if (!chartRef.current) return;

    const newIndicator = { ...indicator, id: `${indicator.id}-${Date.now()}` };
    setActiveIndicators(prev => [...prev, newIndicator]);
    setShowIndicatorMenu(false);

    try {
      const chartData = candleSeriesRef.current.data();
      
      if (indicator.category === 'Moving Averages') {
        const lineSeries = chartRef.current.addLineSeries({
          color: indicator.color,
          lineWidth: 2,
          title: indicator.label,
        });
        
        const indicatorData = calculateSMA(chartData, indicator.params.period);
        lineSeries.setData(indicatorData);
        indicatorSeriesRef.current[newIndicator.id] = lineSeries;
      }
      
    } catch (error) {
      console.error('Error adding indicator:', error);
    }
  }, []);

  const removeIndicator = useCallback((indicatorId) => {
    if (indicatorSeriesRef.current[indicatorId]) {
      chartRef.current.removeSeries(indicatorSeriesRef.current[indicatorId]);
      delete indicatorSeriesRef.current[indicatorId];
    }
    
    setActiveIndicators(prev => prev.filter(ind => ind.id !== indicatorId));
  }, []);

  const handleTimeframeChange = useCallback((newTimeframe) => {
    setTimeframe(newTimeframe);
    loadChartData();
  }, [loadChartData]);

  const handleChartTypeChange = useCallback((newType) => {
    setChartType(newType);
    console.log('Changing chart type to:', newType);
  }, []);

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
      {}
      {showHeader && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-slate-950 via-slate-950/90 to-transparent p-4 pb-8">
          <div className="flex items-center justify-between">
            {}
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{symbol}</h2>
                {currentPrice && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-mono font-bold text-white">
                      ₹{currentPrice.toFixed(2)}
                    </span>
                    <span className={`flex items-center gap-1 text-sm font-semibold ${
                      priceChange.value >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {priceChange.value >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {priceChange.value >= 0 ? '+' : ''}{priceChange.value.toFixed(2)} ({priceChange.percent.toFixed(2)}%)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {}
            <div className="flex items-center gap-2">
              {}
              <div className="flex items-center gap-1 bg-slate-900/80 rounded-lg p-1 backdrop-blur-sm">
                {TIMEFRAMES.map(tf => (
                  <button
                    key={tf.id}
                    onClick={() => handleTimeframeChange(tf.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      timeframe === tf.id
                        ? 'bg-cyan-500 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              {}
              <div className="flex items-center gap-1 bg-slate-900/80 rounded-lg p-1 backdrop-blur-sm">
                {CHART_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => handleChartTypeChange(type.id)}
                    className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                      chartType === type.id
                        ? 'bg-cyan-500'
                        : 'hover:bg-slate-800'
                    }`}
                    title={type.label}
                  >
                    {type.icon}
                  </button>
                ))}
              </div>

              {}
              <button
                onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
                className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-all flex items-center gap-2 backdrop-blur-sm border border-cyan-400/30"
              >
                <Layers className="w-4 h-4" />
                <span className="text-xs font-semibold">Indicators</span>
                {activeIndicators.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-white text-[10px] font-bold">
                    {activeIndicators.length}
                  </span>
                )}
              </button>

              {}
              <button className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all">
                <Settings className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all">
                <Download className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all">
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {}
          {activeIndicators.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {activeIndicators.map(indicator => (
                <div
                  key={indicator.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 backdrop-blur-sm border border-slate-700"
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: indicator.color }}
                  />
                  <span className="text-xs font-semibold text-cyan-300">{indicator.label}</span>
                  <button
                    onClick={() => removeIndicator(indicator.id)}
                    className="text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {}
      <div ref={chartContainerRef} className="w-full h-full" />

      {}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm">
          <div className="text-center">
            <Activity className="w-12 h-12 text-cyan-400 animate-pulse mx-auto mb-3" />
            <p className="text-slate-400">Loading chart data...</p>
          </div>
        </div>
      )}

      {}
      <AnimatePresence>
        {showIndicatorMenu && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-20 right-4 w-80 max-h-[500px] bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden z-20"
          >
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Technical Indicators</h3>
                  <p className="text-xs text-slate-400 mt-1">{INDICATORS.length} indicators available</p>
                </div>
                <button
                  onClick={() => setShowIndicatorMenu(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-2">
              {Object.entries(
                INDICATORS.reduce((acc, ind) => {
                  if (!acc[ind.category]) acc[ind.category] = [];
                  acc[ind.category].push(ind);
                  return acc;
                }, {})
              ).map(([category, indicators]) => (
                <div key={category} className="mb-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 py-2">
                    {category}
                  </h4>
                  {indicators.map(indicator => (
                    <button
                      key={indicator.id}
                      onClick={() => addIndicator(indicator)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: indicator.color }}
                        />
                        <span className="text-sm text-slate-300 group-hover:text-white">
                          {indicator.label}
                        </span>
                      </div>
                      <Plus className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedTradingChart;
