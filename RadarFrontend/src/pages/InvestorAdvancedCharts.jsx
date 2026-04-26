import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../api/api';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Star, ArrowLeftRight, Newspaper, Activity, Bell, Edit3, 
  ChevronLeft, ChevronDown, Layout as LayoutIcon, Maximize2, Minimize2, Settings, 
  Calendar, X, Search, Camera, Info, Check, Plus, Save, Trash2, 
  Columns, Columns2, LayoutGrid, Rows, Grid as GridIcon, Square, Globe, Clock, MousePointer2, 
  MoreHorizontal, LineChart, BarChart3, Sun, Moon, CandlestickChart,
  RefreshCw, Sliders, ShieldCheck, Volume2, Monitor, Zap, MousePointer
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries, AreaSeries, BarSeries, BaselineSeries } from 'lightweight-charts';
import Header from '../components/common/Header';
import './InvestorDashboard.css';

// Dummy Data Generator for Testing


// 1. Comprehensive Indicator Registry
const MASTER_INDICATOR_REGISTRY = [
    { id: 'sma', name: 'SMA (Moving Average)', type: 'overlay', category: 'Trend', color: '#3b82f6', description: 'Simple Moving Average calculates the average price over a specific period, smoothing out price action.' },
    { id: 'ema', name: 'EMA (Moving Average)', type: 'overlay', category: 'Trend', color: '#8b5cf6', description: 'Exponential Moving Average gives more weight to recent prices, making it more responsive to new information.' },
    { id: 'bb', name: 'Bollinger Bands', type: 'overlay', category: 'Trend', color: 'rgba(59, 130, 246, 0.2)', description: 'A volatility indicator consisting of a middle SMA and two outer bands representing standard deviations.' },
    { id: 'vwap', name: 'VWAP', type: 'overlay', category: 'Trend', color: '#f59e0b', description: 'Volume Weighted Average Price shows the average price an asset has traded at throughout the day, based on both volume and price.' },
    { id: 'rsi', name: 'RSI', type: 'panel', category: 'Momentum', color: '#ec4899', description: 'Relative Strength Index measures the speed and change of price movements, indicating overbought or oversold conditions.' },
    { id: 'macd', name: 'MACD', type: 'panel', category: 'Momentum', color: '#06b6d4', description: 'Moving Average Convergence Divergence shows the relationship between two moving averages of an asset\'s price.' },
    { id: 'stoch', name: 'Stochastic Oscillator', type: 'panel', category: 'Momentum', color: '#10b981', description: 'Compares a particular closing price of an asset to a range of its prices over a certain period of time.' },
    { id: 'volume', name: 'Volume', type: 'panel', category: 'Volume', color: '#64748b', description: 'The amount of an asset that has been traded over a given period of time.' },
    { id: 'obv', name: 'OBV (On-Balance Volume)', type: 'panel', category: 'Volume', color: '#ef4444', description: 'Uses volume flow to predict changes in stock price, adding volume on up days and subtracting on down days.' },
    { id: 'atr', name: 'ATR (Average True Range)', type: 'panel', category: 'Volatility', color: '#6366f1', description: 'Measures market volatility by decomposing the entire range of an asset price for that period.' }
];

// 2. Technical Analysis Math
const calculateSMA = (data, period = 20) => {
    let result = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push({ time: data[i].time, value: null });
            continue;
        }
        let sum = 0;
        for (let j = 0; j < period; j++) sum += data[i - j].close;
        result.push({ time: data[i].time, value: sum / period });
    }
    return result.filter(d => d.value !== null);
};

const calculateRSI = (data, period = 14) => {
    if (!data || data.length <= period) return [];
    let result = [];
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        let diff = data[i].close - data[i - 1].close;
        if (diff >= 0) gains += diff; else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    for (let i = period + 1; i < data.length; i++) {
        let diff = data[i].close - data[i - 1].close;
        let gain = diff >= 0 ? diff : 0;
        let loss = diff < 0 ? -diff : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        let rs = avgGain / avgLoss;
        result.push({ time: data[i].time, value: 100 - (100 / (1 + rs)) });
    }
    return result;
};

const calculateEMA = (data, period) => {
    if (!data || data.length === 0) return [];
    const k = 2 / (period + 1);
    let emaData = [{ time: data[0].time, value: data[0].close }];
    for (let i = 1; i < data.length; i++) {
        emaData.push({
            time: data[i].time,
            value: data[i].close * k + emaData[i - 1].value * (1 - k)
        });
    }
    return emaData;
};

const calculateMACD = (data) => {
    if (!data || data.length < 26) return { macd: [], signal: [], hist: [] };
    const ema12 = calculateEMA(data, 12);
    const ema26 = calculateEMA(data, 26);
    
    let macdLine = [];
    for (let i = 0; i < ema26.length; i++) {
        const e12 = ema12.find(d => d.time === ema26[i].time);
        if (e12) {
            macdLine.push({ time: ema26[i].time, value: e12.value - ema26[i].value });
        }
    }
    
    const signalLine = calculateEMA(macdLine.map(d => ({ time: d.time, close: d.value })), 9);
    
    let hist = [];
    for (let i = 0; i < signalLine.length; i++) {
        const m = macdLine.find(d => d.time === signalLine[i].time);
        if (m) {
            hist.push({ time: signalLine[i].time, value: m.value - signalLine[i].value });
        }
    }
    
    return { macd: macdLine, signal: signalLine, hist: hist };
};

const calculateBB = (data, period = 20, stdDev = 2) => {
    if (!data || data.length < period) return { middle: [], upper: [], lower: [] };
    let middle = [], upper = [], lower = [];
    
    for (let i = period - 1; i < data.length; i++) {
        const slice = data.slice(i - period + 1, i + 1);
        const sum = slice.reduce((a, b) => a + b.close, 0);
        const avg = sum / period;
        const squareDiffs = slice.map(d => Math.pow(d.close - avg, 2));
        const variance = squareDiffs.reduce((a, b) => a + b, 0) / period;
        const sd = Math.sqrt(variance);
        
        middle.push({ time: data[i].time, value: avg });
        upper.push({ time: data[i].time, value: avg + (stdDev * sd) });
        lower.push({ time: data[i].time, value: avg - (stdDev * sd) });
    }
    return { middle, upper, lower };
};

const calculateStoch = (data, period = 14, smoothK = 3) => {
    if (!data || data.length < period) return { k: [], d: [] };
    let kLine = [];
    
    for (let i = period - 1; i < data.length; i++) {
        const slice = data.slice(i - period + 1, i + 1);
        const low = Math.min(...slice.map(d => d.low));
        const high = Math.max(...slice.map(d => d.high));
        const k = ((data[i].close - low) / (high - low)) * 100;
        kLine.push({ time: data[i].time, value: k });
    }
    
    const dLine = calculateSMA(kLine.map(d => ({ time: d.time, close: d.value })), smoothK);
    return { k: kLine, d: dLine };
};

const calculateOBV = (data) => {
    if (!data || data.length < 2) return [];
    let obv = [{ time: data[0].time, value: data[0].volume }];
    for (let i = 1; i < data.length; i++) {
        let val = obv[i - 1].value;
        if (data[i].close > data[i - 1].close) val += data[i].volume;
        else if (data[i].close < data[i - 1].close) val -= data[i].volume;
        obv.push({ time: data[i].time, value: val });
    }
    return obv;
};

const calculateATR = (data, period = 14) => {
    if (!data || data.length < 2) return [];
    let tr = [];
    for (let i = 1; i < data.length; i++) {
        const h_l = data[i].high - data[i].low;
        const h_pc = Math.abs(data[i].high - data[i - 1].close);
        const l_pc = Math.abs(data[i].low - data[i - 1].close);
        tr.push({ time: data[i].time, close: Math.max(h_l, h_pc, l_pc) });
    }
    return calculateEMA(tr, period);
};

const calculateVWAP = (data) => {
    if (!data || data.length === 0) return [];
    let cumulativePV = 0;
    let cumulativeV = 0;
    return data.map(d => {
        const tp = (d.high + d.low + d.close) / 3;
        cumulativePV += tp * d.volume;
        cumulativeV += d.volume;
        return { time: d.time, value: cumulativePV / cumulativeV };
    });
};

const calculateHeikinAshi = (data) => {
    if (!data || data.length === 0) return [];
    let result = [];
    let prevOpen = data[0].open;
    let prevClose = data[0].close;

    for (let i = 0; i < data.length; i++) {
        const close = (data[i].open + data[i].high + data[i].low + data[i].close) / 4;
        const open = (prevOpen + prevClose) / 2;
        const high = Math.max(data[i].high, open, close);
        const low = Math.min(data[i].low, open, close);
        
        result.push({ time: data[i].time, open, high, low, close });
        prevOpen = open;
        prevClose = close;
    }
    return result;
};

// 3. Chart Type Registry
const chartTypeRegistry = [
    { id: 'candlestick', name: 'Candles', category: 'Standard', icon: CandlestickChart },
    { id: 'line', name: 'Line', category: 'Standard', icon: LineChart },
    { id: 'area', name: 'Area', category: 'Standard', icon: BarChart3 }, // Substitute for Area
    { id: 'bars', name: 'OHLC Bars', category: 'Standard', icon: Columns },
    { id: 'heikinAshi', name: 'Heikin Ashi', category: 'Variations', icon: Activity },
    { id: 'baseline', name: 'Baseline', category: 'Simplified', icon: TrendingUp },
    { id: 'columns', name: 'Columns', category: 'Simplified', icon: LayoutGrid }
];

// ChartPane with Sync Support
const ChartPane = ({ 
    id, symbol, timeframe, settings, isActive, data,
    onSelect, onCrosshairMove, onVisibleRangeChange, externalCrosshair, externalRange 
}) => {
    const [clickTooltip, setClickTooltip] = useState(null);

    const latestPrice = useMemo(() => {

        if (!data || data.length === 0) return 0;
        return data[data.length - 1].close;
    }, [data]);

    const formatPrice = (value, type = 'price') => {

        if (value === undefined || value === null) return '';
        if (typeof value !== 'number') return value;

        // Indicators like RSI don't use currency
        const isPriceBased = type === 'price';
        const precision = parseInt(settings.precision) || 2;
        let formatted = value.toFixed(precision);

        if (isPriceBased) {
            return `₹${formatted}`;
        }
        return formatted;
    };



    const containerRef = useRef(null);

    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const volumeSeriesRef = useRef(null);
    const indicatorSeriesRef = useRef([]);

    useEffect(() => {
        if (!containerRef.current) return;
        const isDark = settings.theme === 'dark';
        
        const activePanelIndicators = MASTER_INDICATOR_REGISTRY.filter(ind => settings.indicators[ind.id] && ind.type === 'panel');
        const totalPanelSpace = activePanelIndicators.length * 0.15;
        const mainSpace = 0.9 - totalPanelSpace;

        const chart = createChart(containerRef.current, {
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            layout: { 
                textColor: isDark ? '#94a3b8' : '#64748b', 
                background: { type: ColorType.Solid, color: isDark ? '#0f172a' : '#f8fafc' }, 
                fontSize: 11,
                fontFamily: 'Inter, sans-serif'
            },

            grid: { 
                vertLines: { color: settings.showGrid ? (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(241, 245, 249, 0.8)') : 'transparent' }, 
                horzLines: { color: settings.showGrid ? (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(241, 245, 249, 0.8)') : 'transparent' } 
            },
            timeScale: { borderColor: 'transparent', borderVisible: false },
            rightPriceScale: { 
                borderColor: 'transparent', 
                borderVisible: false, 
                scaleMargins: { top: 0.05, bottom: totalPanelSpace + 0.05 } 
            },
            localization: {
                priceFormatter: (price) => formatPrice(price, 'price'),
            },
            crosshair: { mode: 1 }

        });
        chart.subscribeClick((param) => {
            if (!param.point || !param.time || !mainSeries) {
                setClickTooltip(null);
                return;
            }
            const dataPoint = param.seriesData.get(mainSeries);
            if (dataPoint) {
                setClickTooltip({
                    x: param.point.x,
                    y: param.point.y,
                    time: param.time,
                    open: dataPoint.open,
                    high: dataPoint.high,
                    low: dataPoint.low,
                    close: dataPoint.close
                });
            }
        });

        chartRef.current = chart;


        // 1. Main Series Rendering
        let mainSeries;
        const commonOptions = {
            priceFormat: { 
                type: 'price', 
                precision: parseInt(settings.precision) || 2, 
                minMove: 1 / Math.pow(10, parseInt(settings.precision) || 2) 
            },
            priceLineVisible: true,
            lastValueVisible: true,
        };


        switch (settings.chartType) {
            case 'line':
                mainSeries = chart.addSeries(LineSeries, { ...commonOptions, color: '#3b82f6', lineWidth: 2 });
                if (data?.length) mainSeries.setData(data.map(d => ({ time: d.time, value: d.close })));
                break;
            case 'area':
                mainSeries = chart.addSeries(AreaSeries, { 
                    ...commonOptions, 
                    lineColor: '#3b82f6', topColor: 'rgba(59, 130, 246, 0.4)', bottomColor: 'rgba(59, 130, 246, 0.05)',
                    lineWidth: 2
                });
                if (data?.length) mainSeries.setData(data.map(d => ({ time: d.time, value: d.close })));
                break;
            case 'bars':
                mainSeries = chart.addSeries(BarSeries, { ...commonOptions, upColor: '#10b981', downColor: '#ef4444' });
                mainSeries.setData(data);
                break;
            case 'heikinAshi':
                mainSeries = chart.addSeries(CandlestickSeries, { 
                    ...commonOptions, 
                    upColor: '#10b981', downColor: '#ef4444', borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#ef4444' 
                });
                mainSeries.setData(calculateHeikinAshi(data));
                break;
            case 'baseline':
                mainSeries = chart.addSeries(BaselineSeries, { 
                    ...commonOptions, 
                    topLineColor: '#10b981', topFillColor1: 'rgba(16, 185, 129, 0.28)', topFillColor2: 'rgba(16, 185, 129, 0.05)',
                    bottomLineColor: '#ef4444', bottomFillColor1: 'rgba(239, 68, 68, 0.05)', bottomFillColor2: 'rgba(239, 68, 68, 0.28)',
                    baseValue: { type: 'price', price: data[0]?.close || 0 }
                });
                if (data?.length) mainSeries.setData(data.map(d => ({ time: d.time, value: d.close })));
                break;
            case 'columns':
                mainSeries = chart.addSeries(HistogramSeries, { ...commonOptions, color: '#3b82f6' });
                mainSeries.setData(data.map(d => ({ time: d.time, value: d.close, color: d.close >= d.open ? '#10b981' : '#ef4444' })));
                break;
            default: // candlestick
                mainSeries = chart.addSeries(CandlestickSeries, { 
                    ...commonOptions, 
                    upColor: '#10b981', downColor: '#ef4444', borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#ef4444' 
                });
        }
        seriesRef.current = mainSeries;
        
        // Initial data injection if available
        if (data && data.length > 0) {
            const isOHLC = ['candlestick', 'bars', 'heikinAshi'].includes(settings.chartType);
            if (isOHLC) {
                mainSeries.setData(settings.chartType === 'heikinAshi' ? calculateHeikinAshi(data) : data);
            } else if (settings.chartType === 'columns') {
                mainSeries.setData(data.map(d => ({ time: d.time, value: d.close, color: d.close >= d.open ? '#10b981' : '#ef4444' })));
            } else {
                mainSeries.setData(data.map(d => ({ time: d.time, value: d.close })));
            }
        }

        // 2. Overlays (SMA, EMA, BB, VWAP)
        indicatorSeriesRef.current = [];
        if (settings.indicators.sma) {
            const smaSeries = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1.5, priceLineVisible: false, title: 'SMA (20)' });
            smaSeries.id = 'sma';
            indicatorSeriesRef.current.push(smaSeries);
        }
        if (settings.indicators.ema) {
            const emaSeries = chart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 1.5, priceLineVisible: false, title: 'EMA (9)' });
            emaSeries.id = 'ema';
            indicatorSeriesRef.current.push(emaSeries);
        }
        if (settings.indicators.bb) {
            const upper = chart.addSeries(LineSeries, { color: 'rgba(59, 130, 246, 0.4)', lineWidth: 1, priceLineVisible: false, title: 'BB Upper' });
            const middle = chart.addSeries(LineSeries, { color: 'rgba(59, 130, 246, 0.4)', lineWidth: 1, priceLineVisible: false, title: 'BB Middle' });
            const lower = chart.addSeries(LineSeries, { color: 'rgba(59, 130, 246, 0.4)', lineWidth: 1, priceLineVisible: false, title: 'BB Lower' });
            upper.id = 'bb_upper'; middle.id = 'bb_middle'; lower.id = 'bb_lower';
            indicatorSeriesRef.current.push(upper, middle, lower);
        }
        if (settings.indicators.vwap) {
            const vwapSeries = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1.5, priceLineVisible: false, title: 'VWAP' });
            vwapSeries.id = 'vwap';
            indicatorSeriesRef.current.push(vwapSeries);
        }

        // 3. Panels (RSI, MACD, Stoch, OBV, ATR)
        activePanelIndicators.forEach((ind, idx) => {
            const topMargin = mainSpace + (idx * 0.15) + 0.05;
            
            if (ind.id === 'macd') {
                const macdLine = chart.addSeries(LineSeries, { color: '#2196F3', lineWidth: 1.5, priceScaleId: 'macd', title: 'MACD', priceLineVisible: false });
                const signalLine = chart.addSeries(LineSeries, { color: '#FF5252', lineWidth: 1.5, priceScaleId: 'macd', title: 'Signal', priceLineVisible: false });
                const hist = chart.addSeries(HistogramSeries, { color: '#4CAF50', priceScaleId: 'macd', title: 'Hist', priceLineVisible: false });
                macdLine.id = 'macd_line'; signalLine.id = 'macd_signal'; hist.id = 'macd_hist';
                indicatorSeriesRef.current.push(macdLine, signalLine, hist);
                chart.priceScale('macd').applyOptions({ scaleMargins: { top: topMargin, bottom: 1 - (topMargin + 0.1) }, borderVisible: false });
            } else if (ind.id === 'stoch') {
                const kLine = chart.addSeries(LineSeries, { color: '#10b981', lineWidth: 1.5, priceScaleId: 'stoch', title: '%K', priceLineVisible: false });
                const dLine = chart.addSeries(LineSeries, { color: '#ef4444', lineWidth: 1.5, priceScaleId: 'stoch', title: '%D', priceLineVisible: false });
                kLine.id = 'stoch_k'; dLine.id = 'stoch_d';
                indicatorSeriesRef.current.push(kLine, dLine);
                chart.priceScale('stoch').applyOptions({ scaleMargins: { top: topMargin, bottom: 1 - (topMargin + 0.1) }, borderVisible: false });
            } else {
                const panelSeries = chart.addSeries(LineSeries, { color: ind.color, lineWidth: 1.5, priceScaleId: ind.id, title: ind.name, priceLineVisible: false });
                panelSeries.id = ind.id;
                indicatorSeriesRef.current.push(panelSeries);
                chart.priceScale(ind.id).applyOptions({ scaleMargins: { top: topMargin, bottom: 1 - (topMargin + 0.1) }, borderVisible: false });
            }
        });

        // 4. Volume
        if (settings.showVolume) {
            const volumeSeries = chart.addSeries(HistogramSeries, { color: isDark ? '#1e293b' : '#e2e8f0', priceFormat: { type: 'volume' }, priceScaleId: 'volume' });
            chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0.02 } });
            volumeSeries.setData(data.map(d => ({ time: d.time, value: d.volume, color: d.close >= d.open ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' })));
            volumeSeriesRef.current = volumeSeries;
        }

        const observer = new ResizeObserver(entries => {
            if (entries[0].contentRect && chartRef.current) {
                const { width, height } = entries[0].contentRect;
                requestAnimationFrame(() => chartRef.current?.applyOptions({ width, height }));
            }
        });
        observer.observe(containerRef.current);

        chart.subscribeCrosshairMove((param) => {
            if (param.time && (isActive || !externalCrosshair)) {
                onCrosshairMove?.(id, param);
            }
        });

        chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
            if (isActive || !externalRange) {
                onVisibleRangeChange?.(id, range);
            }
        });

        return () => {
            observer.disconnect();
            chart.remove();
        };
    }, [settings.chartType, settings.showVolume, settings.showGrid, settings.theme, settings.indicators, settings.precision, settings.currency, settings.numberFormat]); 


    const [legendData, setLegendData] = useState({});

    useEffect(() => {
        if (!chartRef.current || !data || data.length === 0) return;
        
        // Initial legend value (last data point)
        const lastPoint = data[data.length - 1];
        setLegendData(prev => ({ ...prev, main: lastPoint }));

        if (seriesRef.current) {
            const isOHLC = ['candlestick', 'bars', 'heikinAshi'].includes(settings.chartType);
            if (isOHLC) {
                seriesRef.current.setData(settings.chartType === 'heikinAshi' ? calculateHeikinAshi(data) : data);
            } else if (settings.chartType === 'columns') {
                seriesRef.current.setData(data.map(d => ({ time: d.time, value: d.close, color: d.close >= d.open ? '#10b981' : '#ef4444' })));
            } else {
                seriesRef.current.setData(data.map(d => ({ time: d.time, value: d.close })));
            }
            
            // Update Overlays & Panels
            indicatorSeriesRef.current.forEach(s => {
                if (s.id === 'sma') s.setData(calculateSMA(data, 20));
                if (s.id === 'ema') s.setData(calculateEMA(data, 9));
                if (s.id === 'vwap') s.setData(calculateVWAP(data));
                
                if (s.id === 'bb_upper') s.setData(calculateBB(data).upper);
                if (s.id === 'bb_middle') s.setData(calculateBB(data).middle);
                if (s.id === 'bb_lower') s.setData(calculateBB(data).lower);
                
                if (s.id === 'rsi') s.setData(calculateRSI(data));
                
                if (s.id.startsWith('macd_')) {
                    const macdData = calculateMACD(data);
                    if (s.id === 'macd_line') s.setData(macdData.macd);
                    if (s.id === 'macd_signal') s.setData(macdData.signal);
                    if (s.id === 'macd_hist') s.setData(macdData.hist.map(d => ({ ...d, color: d.value >= 0 ? '#4CAF50' : '#FF5252' })));
                }
                
                if (s.id.startsWith('stoch_')) {
                    const stochData = calculateStoch(data);
                    if (s.id === 'stoch_k') s.setData(stochData.k);
                    if (s.id === 'stoch_d') s.setData(stochData.d);
                }
                
                if (s.id === 'obv') s.setData(calculateOBV(data));
                if (s.id === 'atr') s.setData(calculateATR(data));
            });

            if (volumeSeriesRef.current) {
                volumeSeriesRef.current.setData(data.map(d => ({
                    time: d.time,
                    value: d.volume || 100,
                    color: d.close >= d.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
                })));
            }
            // Handle Crosshair Move for Legend
            chartRef.current.subscribeCrosshairMove((param) => {
                if (param.time) {
                    const point = data.find(d => d.time === param.time) || data[data.length - 1];
                    setLegendData({
                        main: point,
                        sma: settings.indicators.sma ? calculateSMA(data, 20).find(d => d.time === param.time) : null,
                        ema: settings.indicators.ema ? calculateEMA(data, 9).find(d => d.time === param.time) : null,
                        rsi: settings.indicators.rsi ? calculateRSI(data).find(d => d.time === param.time) : null,
                        bb: settings.indicators.bb ? { middle: calculateBB(data).middle.find(d => d.time === param.time) } : null,
                        vwap: settings.indicators.vwap ? calculateVWAP(data).find(d => d.time === param.time) : null,
                        macd: settings.indicators.macd ? { macd: calculateMACD(data).macd.find(d => d.time === param.time) } : null,
                        stoch: settings.indicators.stoch ? { k: calculateStoch(data).k.find(d => d.time === param.time) } : null
                    });
                } else {
                    const last = data[data.length - 1];
                    setLegendData({
                        main: last,
                        sma: settings.indicators.sma ? calculateSMA(data, 20).slice(-1)[0] : null,
                        ema: settings.indicators.ema ? calculateEMA(data, 9).slice(-1)[0] : null,
                        rsi: settings.indicators.rsi ? calculateRSI(data).slice(-1)[0] : null,
                        bb: settings.indicators.bb ? { middle: calculateBB(data).middle.slice(-1)[0] } : null,
                        vwap: settings.indicators.vwap ? calculateVWAP(data).slice(-1)[0] : null,
                        macd: settings.indicators.macd ? { macd: calculateMACD(data).macd.slice(-1)[0] } : null,
                        stoch: settings.indicators.stoch ? { k: calculateStoch(data).k.slice(-1)[0] } : null
                    });
                }
            });

            chartRef.current.timeScale().fitContent();
        }
    }, [data, settings.indicators, settings.chartType]);

    useEffect(() => {
        if (externalCrosshair && !isActive && chartRef.current) {
            chartRef.current.setCrosshairPosition(externalCrosshair.price || 0, externalCrosshair.time, seriesRef.current);
        }
    }, [externalCrosshair, isActive]);

    useEffect(() => {
        if (externalRange && !isActive && chartRef.current) {
            chartRef.current.timeScale().setVisibleRange(externalRange);
        }
    }, [externalRange, isActive]);

    return (
        <div 
            onClick={() => onSelect(id)}
            className={`w-full h-full relative transition-all duration-300 p-1.5 ${isActive ? 'bg-blue-50/20' : 'bg-[#f8fafc]'}`}
        >
            <div className="absolute top-4 left-4 z-10 flex items-center gap-3 pointer-events-none bg-[#f8fafc]/40 backdrop-blur-sm p-1.5 rounded-xl border border-white/20 shadow-sm transition-all group-hover:bg-[#f8fafc]/80">

                <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : (settings.theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 shadow-sm border border-slate-100')}`}>{symbol}</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${settings.theme === 'dark' ? 'bg-slate-800 text-slate-400 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>{settings.defaultExchange}</span>

                </div>
                
                <div className="flex items-center gap-4">
                    <h4 className={`text-[10px] font-black uppercase tracking-tight whitespace-nowrap ${settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {symbol === 'JDI' ? 'Just Dial Limited' : symbol === 'RELIANCE' ? 'Reliance Industries' : `${symbol} Corp`} ({settings.defaultExchange})
                    </h4>

                    
                    <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                        <span className={`text-sm font-black tracking-tighter ${settings.theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatPrice(latestPrice)}</span>


                        <div className="flex items-center gap-1 text-[9px] font-bold text-green-500 bg-green-50/50 px-2 py-0.5 rounded-full">
                            <TrendingUp size={10}/>
                            <span>+1.25%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Indicator Legend Overlay */}
            <div className="absolute top-16 left-6 z-10 flex flex-wrap gap-x-4 gap-y-1 pointer-events-none">
                {settings.indicators.sma && legendData.sma && (
                    <div className="flex items-center gap-1.5 bg-[#f8fafc]/60 backdrop-blur-sm px-2 py-0.5 rounded border border-blue-100 shadow-sm">

                        <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                        <span className="text-[9px] font-black text-slate-400 uppercase">SMA (20)</span>
                        <span className="text-[10px] font-black text-blue-600">{formatPrice(legendData.sma.value)}</span>
                    </div>
                )}
                {settings.indicators.ema && legendData.ema && (
                    <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm px-2 py-0.5 rounded border border-purple-100 shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                        <span className="text-[9px] font-black text-slate-400 uppercase">EMA (9)</span>
                        <span className="text-[10px] font-black text-purple-600">{formatPrice(legendData.ema.value)}</span>
                    </div>
                )}
                {settings.indicators.rsi && legendData.rsi && (
                    <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm px-2 py-0.5 rounded border border-pink-100 shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-[#ec4899]" />
                        <span className="text-[9px] font-black text-slate-400 uppercase">RSI</span>
                        <span className="text-[10px] font-black text-pink-600">{formatPrice(legendData.rsi.value, 'indicator')}</span>
                    </div>
                )}
                {settings.indicators.macd && legendData.macd && (
                    <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm px-2 py-0.5 rounded border border-cyan-100 shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-[#2196F3]" />
                        <span className="text-[9px] font-black text-slate-400 uppercase">MACD</span>
                        <span className="text-[10px] font-black text-cyan-600">{formatPrice(legendData.macd.macd?.value, 'indicator')}</span>
                    </div>
                )}
                {settings.indicators.stoch && legendData.stoch && (
                    <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm px-2 py-0.5 rounded border border-green-100 shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                        <span className="text-[9px] font-black text-slate-400 uppercase">STOCH</span>
                        <span className="text-[10px] font-black text-green-600">{formatPrice(legendData.stoch.k?.value, 'indicator')}</span>
                    </div>
                )}

                {settings.indicators.bb && legendData.bb && (
                    <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm px-2 py-0.5 rounded border border-blue-100 shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase">BB</span>
                        <span className="text-[10px] font-black text-blue-600">{legendData.bb.middle?.value.toFixed(2)}</span>
                    </div>
                )}
                {settings.indicators.vwap && legendData.vwap && (
                    <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm px-2 py-0.5 rounded border border-amber-100 shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                        <span className="text-[9px] font-black text-slate-400 uppercase">VWAP</span>
                        <span className="text-[10px] font-black text-amber-600">{legendData.vwap.value.toFixed(2)}</span>
                    </div>
                )}
                {settings.showVolume && legendData.main && (
                    <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm px-2 py-0.5 rounded border border-slate-100 shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-slate-300" />
                        <span className="text-[9px] font-black text-slate-400 uppercase">Vol</span>
                        <span className="text-[10px] font-black text-slate-600">{(legendData.main.volume / 1000000).toFixed(2)}M</span>
                    </div>
                )}
            </div>

            {/* Click Tooltip Popup */}
            <AnimatePresence>
                {clickTooltip && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute z-[100] bg-white border border-slate-100 shadow-[0_15px_40px_rgba(0,0,0,0.15)] rounded-2xl p-4 w-52 pointer-events-auto"
                        style={{ 
                            left: Math.min(clickTooltip.x + 20, containerRef.current.clientWidth - 220), 
                            top: Math.min(clickTooltip.y + 20, containerRef.current.clientHeight - 180) 
                        }}
                    >
                        <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Snapshot Data</span>
                                <span className="text-[9px] font-black text-blue-600 uppercase">{typeof clickTooltip.time === 'string' ? clickTooltip.time : new Date(clickTooltip.time * 1000).toLocaleDateString()}</span>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setClickTooltip(null); }}
                                className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 transition-all shadow-sm border border-transparent hover:border-red-100"
                            >
                                <X size={14}/>
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            {[
                                { label: 'Open', val: clickTooltip.open, color: 'text-slate-700' },
                                { label: 'High', val: clickTooltip.high, color: 'text-green-600' },
                                { label: 'Low', val: clickTooltip.low, color: 'text-red-600' },
                                { label: 'Close', val: clickTooltip.close, color: 'text-slate-900 font-black' }
                            ].map((row, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{row.label}</span>
                                    <span className={`text-[10px] font-bold ${row.color}`}>{formatPrice(row.val)}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                )}
            </AnimatePresence>


            <div ref={containerRef} className={`w-full h-full rounded-[24px] overflow-hidden border-2 transition-all ${settings.theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-50 shadow-sm'} ${isActive ? 'border-blue-600 shadow-2xl' : ''}`} />
        </div>

    );
};

// 4. Settings Drawer Component
const SettingsDrawer = ({ isOpen, onClose, settings, setSettings, onSave, charts }) => {


    const [expandedSections, setExpandedSections] = useState(['chart', 'appearance']);

    const toggleSection = (id) => {
        setExpandedSections(prev => 
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const sections = [
        {
            id: 'chart',
            title: 'Chart Settings',
            icon: LineChart,
            items: [
                { label: 'Show Volume', type: 'toggle', key: 'showVolume' },
                { label: 'Show Grid', type: 'toggle', key: 'showGrid' }
            ]
        },

        {
            id: 'interaction',
            title: 'Interaction',
            icon: MousePointer,
            items: [
                { label: 'Sync Charts', type: 'toggle', key: 'syncCharts' },
                { label: 'Sync Crosshair', type: 'toggle', key: 'syncCrosshair' },
                { label: 'Auto Refresh', type: 'toggle', key: 'autoRefresh' },
                { label: 'Refresh Interval', type: 'select', key: 'refreshInterval', options: ['5s', '10s', '30s', '1min'] }
            ]
        },
        {
            id: 'appearance',
            title: 'Appearance',
            icon: Sun,
            items: [
                { label: 'Theme', type: 'select', key: 'theme', options: ['light', 'dark'] },
                { label: 'Crosshair', type: 'toggle', key: 'showCrosshair' }
            ]
        },
        {
            id: 'data',
            title: 'Data Settings',
            icon: RefreshCw,
            items: [
                { label: 'Exchange', type: 'select', key: 'defaultExchange', options: ['NSE', 'BSE'] },
                { label: 'Decimal Precision', type: 'select', key: 'precision', options: ['2', '3', '4'] }
            ]
        }




    ];    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute top-full right-0 mt-4 w-72 bg-white border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.12)] rounded-[32px] overflow-hidden z-[2000] flex flex-col"

                    style={{ maxHeight: 'calc(100vh - 120px)' }}
                >
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
                                <Sliders size={20}/>
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none mb-1">Settings</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Workstation Intelligence</p>
                            </div>

                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
                            <X size={18}/>
                        </button>
                    </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            <style>{`
                                .scrollbar-hide::-webkit-scrollbar {
                                    display: none;
                                }
                            `}</style>

                        {sections.map(section => (
                            <div key={section.id} className="bg-slate-50/50 rounded-2xl border border-slate-100/50 overflow-hidden transition-all">
                                <button 
                                    onClick={() => toggleSection(section.id)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-white transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg text-slate-400 group-hover:text-blue-600 shadow-sm border border-slate-50 transition-all">
                                            <section.icon size={16}/>
                                        </div>
                                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">{section.title}</span>
                                    </div>
                                    <ChevronDown size={16} className={`text-slate-300 transition-transform duration-300 ${expandedSections.includes(section.id) ? 'rotate-180' : ''}`}/>
                                </button>

                                <AnimatePresence>
                                    {expandedSections.includes(section.id) && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-4 pt-0 space-y-4">
                                                {section.items.map(item => {
                                                    if ((item.key === 'syncCharts' || item.key === 'syncCrosshair') && charts.length <= 1) {
                                                        return null;
                                                    }

                                                    return (
                                                        <div key={item.key} className="flex items-center justify-between px-2">
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-600 uppercase mb-0.5">{item.label}</p>
                                                                <p className="text-[8px] font-bold text-slate-400 tracking-tight">Configure behavior</p>
                                                            </div>
                                                                {item.type === 'toggle' ? (
                                                                    <button 
                                                                        onClick={() => setSettings({ ...settings, [item.key]: !settings[item.key] })}
                                                                        className={`w-11 h-6 rounded-full transition-all relative ${settings[item.key] ? 'bg-blue-600' : 'bg-slate-200'}`}
                                                                    >
                                                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${settings[item.key] ? 'left-6' : 'left-1'}`} />
                                                                    </button>
                                                                ) : (
                                                                    <select 
                                                                        value={settings[item.key]}
                                                                        onChange={(e) => {
                                                                            if (item.key === 'defaultExchange') {
                                                                                const exchange = e.target.value;
                                                                                const symbols = [...new Set(charts.map(c => c.symbol))];
                                                                                
                                                                                // Mock listings check for Indian stocks
                                                                                const EXCHANGE_LISTINGS = {
                                                                                    'TATAELXSI': ['NSE'],
                                                                                    'JDI': ['NSE', 'BSE'],
                                                                                    'RELIANCE': ['NSE', 'BSE'],
                                                                                    'INFY': ['NSE', 'BSE']
                                                                                };

                                                                                const unlisted = symbols.filter(s => {
                                                                                    const listings = EXCHANGE_LISTINGS[s] || ['NSE', 'BSE'];
                                                                                    return !listings.includes(exchange);
                                                                                });

                                                                                if (unlisted.length > 0) {
                                                                                    alert(`The particular company ${unlisted[0]} which you have selected isn't on the selected input of the exchange doesn't exists.`);
                                                                                    return;
                                                                                }


                                                                            }
                                                                            setSettings({ ...settings, [item.key]: e.target.value });
                                                                        }}
                                                                        className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-slate-700 outline-none focus:border-blue-400 shadow-sm transition-all cursor-pointer"
                                                                    >

                                                                    {item.options.map(opt => (
                                                                        <option key={opt} value={opt}>{opt.toUpperCase()}</option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};



const InvestorAdvancedCharts = () => {
    const [searchParams] = useSearchParams();
    const baseSymbol = searchParams.get('symbol') || 'JDI';
    const navigate = useNavigate();

    const [layout, setLayout] = useState('single');
    const [activeChartId, setActiveChartId] = useState(0);
    const [activePanel, setActivePanel] = useState(null);
    const [activeTool, setActiveTool] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [compareSearch, setCompareSearch] = useState('');
    const [selectedCompareSymbols, setSelectedCompareSymbols] = useState([baseSymbol]);
    const [noteInput, setNoteInput] = useState('');
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [notes, setNotes] = useState([
        { id: 1, content: "Strong support at $210 level. Looking for a breakout above $220.", createdAt: new Date(Date.now() - 86400000).toISOString() },
        { id: 2, content: "Earnings next week. Bullish sentiment in recent analyst reports.", createdAt: new Date(Date.now() - 172800000).toISOString() }
    ]);
    const [alerts, setAlerts] = useState([
        { id: 1, symbol: baseSymbol, targetPrice: 225.50, type: 'price', delivery: 'both', isActive: true },
        { id: 2, symbol: baseSymbol, targetPrice: 205.00, type: 'price', delivery: 'app', isActive: true }
    ]);
    const [alertValue, setAlertValue] = useState('');
    const [alertDelivery, setAlertDelivery] = useState('app');
    const [watchlist, setWatchlist] = useState(['AAPL', 'MSFT', 'RELIANCE']);
    const [companyInfo, setCompanyInfo] = useState(null);
    const [isInfoLoading, setIsInfoLoading] = useState(false);
    const [chartDataMap, setChartDataMap] = useState({});

    const [news, setNews] = useState([]);
    const [isNewsLoading, setIsNewsLoading] = useState(false);
    
    const [charts, setCharts] = useState([{ id: 0, symbol: baseSymbol, timeframe: '1D', indicators: { sma: true }, chartType: 'candlestick' }]);
    const [syncEnabled, setSyncEnabled] = useState(true);
    const [globalTimeframe, setGlobalTimeframe] = useState('1D');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [activeDropdown, setActiveDropdown] = useState(null); // 'indicators', 'chartType', 'interval'

    const [settings, setSettings] = useState({
        chartType: 'candlestick',
        showVolume: true,
        showGrid: true,
        theme: 'light',
        timezone: 'Auto',
        indicators: { sma: true, ema: false, rsi: false, macd: false, stoch: false, vwap: false, bb: false, volume: true, obv: false, atr: false },
        defaultTimeframe: '1D',
        customDateRangeEnabled: false,
        defaultAlertType: 'Price Alert',
        alertDelivery: 'both',
        notificationSound: true,
        defaultWatchlist: 'Default',
        autoAddStocks: false,
        showCrosshair: true,
        syncCharts: true,
        syncTimeframe: true,
        syncCrosshair: true,
        syncZoom: true,
        autoRefresh: true,
        refreshInterval: '5s',
        defaultExchange: 'NSE',
        precision: 2,
        currency: 'INR'
    });



    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);


    useEffect(() => {
        const fetchUserSettings = async () => {
            try {
                const res = await api.get('/user/settings');
                if (res.data.success) {
                    setSettings(prev => ({ ...prev, ...res.data.data }));
                }
            } catch (err) {
                console.log('Using local settings fallback');
                const saved = localStorage.getItem('radar_chart_settings');
                if (saved) { try { setSettings(JSON.parse(saved)); } catch(e) {} }
            }
        };
        fetchUserSettings();
    }, []);

    // Auto-save settings when they change
    useEffect(() => {
        const timer = setTimeout(async () => {
            localStorage.setItem('radar_chart_settings', JSON.stringify(settings));
            try {
                const token = localStorage.getItem('token');
                if (token) await api.post('/user/settings', settings);
            } catch (err) {
                console.error('Auto-save failed:', err);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [settings]);

    const dataCache = useRef({});


    useEffect(() => {
        const fetchAllChartsData = async () => {
            const symbolsToFetch = [...new Set(charts.map(c => c.symbol))];
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const intervalMap = {
                '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min',
                '1H': '1hour', '1D': '1day', '1W': '1week', '1M': '1month'
            };

            const newChartDataMap = { ...chartDataMap };
            let dataChanged = false;

            for (const symbol of symbolsToFetch) {
                const cacheKey = `${symbol}-${globalTimeframe}`;
                if (dataCache.current[cacheKey]) {
                    if (JSON.stringify(newChartDataMap[symbol]) !== JSON.stringify(dataCache.current[cacheKey])) {
                        newChartDataMap[symbol] = dataCache.current[cacheKey];
                        dataChanged = true;
                    }
                    continue;
                }

                try {
                    const res = await api.get(`/stocks/${symbol}/history?interval=${intervalMap[globalTimeframe] || '1day'}&exchange=${settings.defaultExchange}`);
                    const rawData = res.data?.data || [];
                    let formatted = rawData.length === 0 ? [] : rawData.map(d => ({
                        time: d.date || d.time,
                        open: d.open || 0, high: d.high || 0, low: d.low || 0, close: d.close || 0, volume: d.volume || 0
                    })).sort((a, b) => a.time - b.time);
                    dataCache.current[cacheKey] = formatted;
                    newChartDataMap[symbol] = formatted;
                    dataChanged = true;
                } catch (err) {
                    dataCache.current[cacheKey] = [];
                    newChartDataMap[symbol] = [];
                    dataChanged = true;
                }
            }

            if (dataChanged) {
                setChartDataMap(newChartDataMap);
            }
        };

        fetchAllChartsData();
    }, [charts, globalTimeframe, dateRange, settings.defaultExchange]);


    // Real-time Auto-Refresh Logic
    useEffect(() => {
        if (!settings.autoRefresh) return;

        const intervalMs = {
            '5s': 5000,
            '10s': 10000,
            '30s': 30000,
            '1min': 60000
        }[settings.refreshInterval] || 10000;

        const pollLiveData = async () => {
            const symbolsToFetch = [...new Set(charts.map(c => c.symbol))];
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            for (const symbol of symbolsToFetch) {
                try {
                    const res = await api.get(`/stocks/${symbol}/live`);
                    if (res.data.success && res.data.data) {
                        const newPoint = {
                            time: res.data.data.time,
                            open: res.data.data.open,
                            high: res.data.data.high,
                            low: res.data.data.low,
                            close: res.data.data.close,
                            volume: res.data.data.volume
                        };

                        setChartDataMap(prev => {
                            const currentData = prev[symbol] || [];
                            if (currentData.length > 0) {
                                const lastPoint = currentData[currentData.length - 1];
                                if (lastPoint.time === newPoint.time) {
                                    const updated = [...currentData];
                                    updated[updated.length - 1] = newPoint;
                                    return { ...prev, [symbol]: updated };
                                } else if (newPoint.time > lastPoint.time) {
                                    return { ...prev, [symbol]: [...currentData, newPoint] };
                                }
                            } else {
                                return { ...prev, [symbol]: [newPoint] };
                            }
                            return prev;
                        });
                    }
                } catch (err) {
                    // Fail silently for polling
                }
            }
        };

        const timer = setInterval(pollLiveData, intervalMs);
        return () => clearInterval(timer);
    }, [settings.autoRefresh, settings.refreshInterval, charts]);



    useEffect(() => {
        const fetchCompanyInfo = async () => {
            try {
                setIsInfoLoading(true);
                const searchSymbol = baseSymbol === 'JDI' ? 'JINDRILL' : baseSymbol;
                const res = await api.get(`/stocks/${searchSymbol}/fundamentals`);
                setCompanyInfo(res.data.data);
            } catch (err) {
                setCompanyInfo(null);
            } finally {
                setIsInfoLoading(false);
            }
        };
        fetchCompanyInfo();
    }, [baseSymbol]);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                setIsNewsLoading(true);
                const token = localStorage.getItem('token');
                const config = { headers: { Authorization: `Bearer ${token}` } };
                // Fetching news for the specific symbol
                const res = await api.get(`/stocks/${baseSymbol}/news`);
                setNews(res.data?.data || []);
            } catch (err) {
                // Fallback mock news if API fails
                setNews([]);
            } finally {
                setIsNewsLoading(false);
            }
        };
        fetchNews();
    }, [baseSymbol]);

    const [crosshairSync, setCrosshairSync] = useState(null);
    const [timeRangeSync, setTimeRangeSync] = useState(null);

    const activeIndicators = useMemo(() => {
        return MASTER_INDICATOR_REGISTRY.filter(i => settings.indicators[i.id]);
    }, [settings.indicators]);

    const toggleIndicator = (id) => {
        const isVolume = id === 'volume';
        const newVal = isVolume ? !settings.showVolume : !settings.indicators[id];
        
        if (isVolume) {
            setSettings(prev => ({ ...prev, showVolume: newVal }));
            updatePanel(activeChartId, { showVolume: newVal });
        } else {
            const updatedIndicators = { ...settings.indicators, [id]: newVal };
            setSettings(prev => ({ ...prev, indicators: updatedIndicators }));
            updatePanel(activeChartId, { indicators: updatedIndicators });
        }
    };

    const togglePanel = (panel) => {
        setActivePanel(activePanel === panel ? null : panel);
    };

    const handleSaveNote = () => {
        if (!noteInput.trim()) return;
        
        if (editingNoteId) {
            setNotes(notes.map(n => n.id === editingNoteId ? { ...n, content: noteInput, updatedAt: new Date().toISOString() } : n));
            setEditingNoteId(null);
        } else {
            const newNote = {
                id: Date.now(),
                content: noteInput,
                createdAt: new Date().toISOString()
            };
            setNotes([newNote, ...notes]);
        }
        setNoteInput('');
    };

    const handleEditNote = (note) => {
        setNoteInput(note.content);
        setEditingNoteId(note.id);
        const panel = document.querySelector('.custom-scrollbar');
        if (panel) panel.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteNote = (id) => {
        setNotes(notes.filter(n => n.id !== id));
        if (editingNoteId === id) {
            setEditingNoteId(null);
            setNoteInput('');
        }
    };

    const [editingAlertId, setEditingAlertId] = useState(null);

    const handleCreateAlert = () => {
        if (!alertValue.trim()) return;
        
        if (editingAlertId) {
            setAlerts(alerts.map(a => a.id === editingAlertId ? { ...a, condition: alertValue, delivery: alertDelivery } : a));
            setEditingAlertId(null);
        } else {
            const newAlert = {
                id: Date.now(),
                symbol: baseSymbol,
                condition: alertValue,
                type: 'custom',
                delivery: alertDelivery,
                isActive: true
            };
            setAlerts([newAlert, ...alerts]);
        }
        setAlertValue('');
    };

    const handleDeleteAlert = (id) => {
        setAlerts(alerts.filter(a => a.id !== id));
        if (editingAlertId === id) setEditingAlertId(null);
    };

    const handleEditAlert = (alert) => {
        setAlertValue(alert.condition || alert.targetPrice.toString());
        setAlertDelivery(alert.delivery);
        setEditingAlertId(alert.id);
        const panel = document.querySelector('.custom-scrollbar');
        if (panel) panel.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggleWatchlist = (symbol) => {
        if (watchlist.includes(symbol)) {
            setWatchlist(watchlist.filter(s => s !== symbol));
        } else {
            setWatchlist([symbol, ...watchlist]);
        }
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    const handleLayoutChange = (type, count, symbols = selectedCompareSymbols) => {
        const updated = Array.from({ length: count }, (_, i) => {
            const existing = charts[i];
            return {
                id: i,
                symbol: symbols[i] || symbols[0] || baseSymbol,
                timeframe: syncEnabled ? globalTimeframe : (existing?.timeframe || '1D'),
                indicators: syncEnabled ? settings.indicators : (existing?.indicators || settings.indicators),
                chartType: syncEnabled ? settings.chartType : (existing?.chartType || settings.chartType)
            };
        });
        setCharts(updated);
        setLayout(type);
        setActiveTool(null);
    };

    const updatePanel = (id, updates) => {
        setCharts(prev => prev.map(c => {
            if (c.id === id) return { ...c, ...updates };
            if (syncEnabled) return { ...c, ...updates }; // Sync updates if enabled
            return c;
        }));
    };

    return (
        <div className="dashboard-container investor-theme h-screen w-screen flex flex-col font-sans overflow-hidden transition-colors duration-500 bg-[#f8fafc]">
            
            {/* 1. Universal Command Header */}
            {/* Unified High-Fidelity Command Bar */}
            <header className="h-16 border border-slate-100 flex items-center justify-between px-4 shrink-0 z-[1001] mx-2 mt-2 rounded-xl shadow-sm bg-white shadow-slate-100/50 transition-all duration-300">
                {/* Left: Navigation & Active Symbol */}
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate(`/investor-stock/${baseSymbol}`)}
                        className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-all"
                    >
                        <ChevronLeft size={20}/>
                    </button>
                    <div className="flex items-center gap-2.5 shrink-0">
                        <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                            <img src="/radar-logo-final.jpg" alt="Radar Logo" className="w-10 h-10 rounded-full object-cover shadow-sm" />
                        </div>
                        <span className="brand-name text-xl font-black tracking-tight" style={{ color: '#3E84F6' }}>RADAR</span>
                    </div>
                    <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                    
                    <div className="flex items-center gap-3 ml-4 py-1">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white font-black text-sm shadow-xl shadow-blue-100 border-2 border-white shrink-0">
                            {baseSymbol[0]}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-800 leading-none tracking-tight">{baseSymbol}</span>
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em]">Verified Feed</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Center: Analytical Control Suite */}
                <div className="flex items-center gap-2">
                    {/* Timeframes */}
                    <div className="flex items-center gap-3">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] shrink-0">Range</span>
                        <div className="flex items-center gap-0.5 bg-slate-50 p-1 rounded-xl border border-slate-100 relative">
                            {['1D', '5D', '1M', '3M', '6M', '1Y', '5Y'].map(tf => (
                                <button key={tf} onClick={() => { setGlobalTimeframe(tf); setShowDatePicker(false); setDateRange({start:'', end:''}); }} className={`px-2.5 py-1.5 text-[10px] font-black rounded-lg transition-all ${globalTimeframe === tf && !dateRange.start ? 'text-blue-600 bg-white shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-white'}`}>{tf}</button>
                            ))}
                            <button 
                                onClick={() => setShowDatePicker(!showDatePicker)} 
                                className={`p-1.5 rounded-lg transition-all ml-0.5 ${dateRange.start ? 'text-blue-600 bg-white shadow-sm' : 'text-slate-400 hover:text-blue-600 hover:bg-white'}`}
                            >
                                <Calendar size={14}/>
                            </button>

                            {/* Custom Date Picker Popover */}
                            {showDatePicker && (
                                <div className="absolute top-full left-0 mt-3 w-64 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 z-[1002] animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Custom Range</h4>
                                        <button onClick={() => setShowDatePicker(false)} className="p-1 hover:bg-slate-100 rounded-md"><X size={12}/></button>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1 block">From</label>
                                            <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs font-bold outline-none focus:border-blue-200 focus:bg-white transition-all"/>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1 block">To</label>
                                            <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs font-bold outline-none focus:border-blue-200 focus:bg-white transition-all"/>
                                        </div>
                                        <button 
                                            onClick={() => { setGlobalTimeframe('CUSTOM'); setShowDatePicker(false); }}
                                            className="w-full bg-blue-600 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 mt-2"
                                        >
                                            Apply Range
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>


                    <div className="w-[1px] h-4 bg-slate-200 mx-1" />

                    {/* Tools Cluster */}
                    <div className="flex items-center gap-3">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] shrink-0">Data Sync</span>
                        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100">
                            {/* Interval */}
                            <div className="relative">
                                <button 
                                    onClick={() => setActiveDropdown(activeDropdown === 'interval' ? null : 'interval')}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${activeDropdown === 'interval' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:bg-white'}`}
                                >
                                    {globalTimeframe} <ChevronDown size={12}/>
                                </button>
                                {activeDropdown === 'interval' && (
                                    <div className="absolute top-full right-0 mt-3 w-32 bg-white border border-slate-200 shadow-2xl rounded-xl p-1.5 z-[1002] animate-in fade-in slide-in-from-top-2 duration-200">
                                        {['1m', '5m', '10m', '15m', '30m', '1h', '1d'].map(int => (
                                            <button key={int} onClick={() => { setGlobalTimeframe(int.toUpperCase()); setActiveDropdown(null); }} className="w-full text-left px-3 py-2 text-[10px] font-black text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-all uppercase">{int}</button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="w-[1px] h-3 bg-slate-200" />

                            {/* Chart Type */}
                            <div className="relative">
                                <button 
                                    onClick={() => setActiveDropdown(activeDropdown === 'chartType' ? null : 'chartType')}
                                    className={`p-1.5 rounded-lg transition-all ${activeDropdown === 'chartType' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-white'}`}
                                >
                                    <CandlestickChart size={14}/>
                                </button>
                                {activeDropdown === 'chartType' && (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-56 bg-white border border-slate-200 shadow-2xl rounded-2xl p-2 z-[1002] animate-in fade-in slide-in-from-top-2 duration-200">
                                        {['Standard', 'Variations', 'Simplified'].map(cat => (
                                            <div key={cat} className="mb-2 last:mb-0">
                                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1 px-3 py-1">{cat}</h4>
                                                {chartTypeRegistry.filter(type => type.category === cat).map(type => {
                                                    const Icon = type.icon;
                                                    return (
                                                        <button key={type.id} onClick={() => { 
                                                            if (syncEnabled) setSettings({...settings, chartType: type.id});
                                                            updatePanel(activeChartId, { chartType: type.id });
                                                            setActiveDropdown(null); 
                                                        }} className={`w-full flex items-center gap-3 px-3 py-2.5 text-[10px] font-black rounded-xl transition-all uppercase ${settings.chartType === type.id ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}>
                                                            <Icon size={14} className={settings.chartType === type.id ? 'text-blue-600' : 'text-slate-400'}/>
                                                            {type.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="w-[1px] h-3 bg-slate-200" />

                            {/* Indicators */}
                            <div className="relative">
                                <button 
                                    onClick={() => setActiveDropdown(activeDropdown === 'indicators' ? null : 'indicators')}
                                    className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${activeDropdown === 'indicators' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:bg-white'}`}
                                >
                                    Indicators
                                </button>
                                {activeDropdown === 'indicators' && (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 bg-white border border-slate-200 shadow-2xl rounded-2xl p-2 z-[1002] animate-in fade-in slide-in-from-top-2 duration-200">
                                        {['Trend', 'Momentum', 'Volume', 'Volatility'].map(cat => {
                                            const items = MASTER_INDICATOR_REGISTRY.filter(ind => ind.category === cat);
                                            if (items.length === 0) return null;
                                            return (
                                                <div key={cat} className="mb-2">
                                                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1 px-3 py-1">{cat}</h4>
                                                    {items.map(ind => {
                                                        const isActive = ind.id === 'volume' ? settings.showVolume : settings.indicators[ind.id];
                                                        return (
                                                            <div key={ind.id} className="w-full flex items-center justify-between px-3 py-2.5 text-[10px] font-black rounded-xl transition-all uppercase group hover:bg-slate-50">
                                                                <button onClick={() => toggleIndicator(ind.id)} className={`flex-1 flex items-center gap-2 text-left transition-all ${isActive ? 'text-blue-600' : 'text-slate-600'}`}>
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-blue-600' : 'bg-slate-200'}`} />
                                                                    <span>{ind.name}</span>
                                                                </button>
                                                                <div className="relative group/info">
                                                                    <Info size={12} className="text-slate-300 hover:text-blue-500 cursor-help transition-colors" />
                                                                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-900 text-white text-[9px] font-bold rounded-lg opacity-0 group-hover/info:opacity-100 pointer-events-none transition-all z-50 shadow-xl border border-white/10 normal-case">
                                                                        {ind.description}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right: Personal & View Utilities */}
                <div className="flex items-center gap-2">
                    {/* Layouts Selector */}
                    <div className="relative">
                        <button 
                            onClick={() => setActiveTool(activeTool === 'layout' ? null : 'layout')} 
                            className={`flex items-center justify-center p-2.5 rounded-xl transition-all duration-300 ${activeTool === 'layout' ? 'bg-white text-blue-600 shadow-lg shadow-blue-100 border-2 border-blue-600' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-50 border-2 border-transparent'}`}
                        >
                            <LayoutIcon size={20}/>
                        </button>
                        
                        {activeTool === 'layout' && (
                            <div className="absolute top-full right-0 mt-4 w-72 bg-white border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.12)] rounded-[24px] p-6 z-[1002] animate-in fade-in slide-in-from-top-3 duration-300">
                                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.05em] mb-6 px-1 border-b border-slate-50 pb-3">Workspace Layout</h4>
                                
                                <div className="space-y-6 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                                    {[
                                        { cat: 'Basic', items: [{ id: 'single', name: 'Single Focus', icon: Square, count: 1 }] },
                                        { cat: 'Split', items: [{ id: 'side', name: 'Vertical Split', icon: Columns2, count: 2 }, { id: 'stack', name: 'Horizontal Split', icon: Rows, count: 2 }] },
                                        { cat: 'Grid', items: [{ id: 'pro', name: 'Pro-T Grid', icon: LayoutIcon, count: 3 }, { id: 'quad', name: 'Quad Grid', icon: LayoutGrid, count: 4 }] },
                                        { cat: 'Advanced', items: [{ id: 'six', name: '6-Chart Hub', icon: GridIcon, count: 6 }, { id: 'eight', name: '8-Chart Terminal', icon: MoreHorizontal, count: 8 }] }
                                    ].map(group => (
                                        <div key={group.cat} className="space-y-2">
                                            <h5 className="text-[9px] font-black text-[#94a3b8] uppercase tracking-[0.1em] px-2 mb-3">{group.cat}</h5>
                                            <div className="flex flex-col gap-1">
                                                {group.items.map(l => (
                                                    <button 
                                                        key={l.id} 
                                                        onClick={() => { handleLayoutChange(l.id, l.count); setActiveTool(null); }} 
                                                        className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all duration-200 group ${layout === l.id ? 'bg-[#3E84F6]/5 text-[#3E84F6]' : 'text-slate-600 hover:bg-slate-50'}`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`transition-colors duration-200 ${layout === l.id ? 'text-[#3E84F6]' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                                                <l.icon size={16}/>
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase tracking-tight">{l.name}</span>
                                                        </div>
                                                        {layout === l.id && <Check size={14} className="text-[#3E84F6]" strokeWidth={3} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-[1px] h-6 bg-slate-100 mx-2" />

                    <div className="flex items-center gap-1">
                        <div className="relative">
                            <button 
                                onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
                                className={`p-2.5 rounded-xl transition-all duration-300 ${isSettingsOpen ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-50'}`}
                            >
                                <Settings size={20}/>
                            </button>
                            
                            <SettingsDrawer 
                                isOpen={isSettingsOpen} 
                                onClose={() => setIsSettingsOpen(false)} 
                                settings={settings} 
                                setSettings={setSettings}
                                charts={charts}
                            />
                        </div>

                        <button 
                            onClick={toggleFullScreen} 
                            className={`p-2.5 rounded-xl transition-all duration-300 ${isFullscreen ? 'text-blue-600 bg-blue-50 border border-blue-200' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-50'}`}
                        >
                            {isFullscreen ? <Minimize2 size={20}/> : <Maximize2 size={20}/>}
                        </button>

                    </div>

                </div>
            </header>

            <main className="flex-1 flex overflow-hidden min-h-0 relative p-2 gap-2">
                {/* 2. Intelligence Sidebar (Left) */}
                <aside className="w-18 border border-slate-100 bg-white rounded-xl flex flex-col items-center py-6 gap-6 shrink-0 overflow-hidden z-10 shadow-sm shadow-slate-100/50">
                    {[{ id: 'watchlist', icon: Star, label: 'Watchlist' }, 
                      { id: 'news', icon: Newspaper, label: 'News' }, 
                      { id: 'notes', icon: Edit3, label: 'Notes' },
                      { id: 'compare', icon: ArrowLeftRight, label: 'Compare' }].map(btn => (

                        <button 
                            key={btn.id} 
                            onClick={() => togglePanel(btn.id)} 
                            className={`group relative flex flex-col items-center gap-2.5 p-3 rounded-xl transition-all w-14 ${activePanel === btn.id ? 'text-blue-600 bg-blue-50/50 shadow-sm' : 'text-slate-300 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            <btn.icon size={22} className="group-hover:scale-110 transition-transform"/>
                            <span className="text-[8px] font-black uppercase tracking-tighter [writing-mode:vertical-lr] whitespace-nowrap">{btn.label}</span>
                        </button>
                    ))}
                </aside>

                <div 
                    className={`h-full bg-white border border-slate-100 rounded-xl shadow-sm transition-all duration-300 ease-in-out shrink-0 overflow-hidden flex flex-col ${activePanel ? 'w-80' : 'w-0 border-none'}`}
                >
                    <div className="w-80 h-full flex flex-col">
                        <div className="p-5 border-b border-slate-50 flex items-center justify-between shrink-0">
                            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">{activePanel}</h3>
                            <button onClick={() => setActivePanel(null)} className="p-1.5 hover:bg-slate-50 rounded-full transition-colors"><X size={16} className="text-slate-400"/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                            {activePanel === 'watchlist' && (
                                <div className="space-y-6">
                                    <div className="bg-blue-600 rounded-2xl p-6 shadow-xl shadow-blue-100 border border-blue-500 mb-2">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1">Active</h4>
                                                <h3 className="text-lg font-black text-white tracking-tight">{baseSymbol}</h3>
                                            </div>
                                            <div onClick={() => toggleWatchlist(baseSymbol)} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-all shadow-inner">
                                                <Star size={18} fill={watchlist.includes(baseSymbol) ? "white" : "none"} className="text-white"/>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {watchlist.map(sym => (
                                            <div key={sym} className="group flex items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-50 hover:bg-white hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50/20 transition-all cursor-pointer">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-black text-[10px]">{sym[0]}</div>
                                                    <h4 className="text-xs font-black text-slate-800">{sym}</h4>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-black text-slate-800">₹2,540.20</div>
                                                    <div className="text-[9px] font-bold text-green-500">+1.2%</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}



                            {activePanel === 'news' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-1 mb-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Market Intelligence</h4>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            <span className="text-[8px] font-black text-slate-400 uppercase">Live Feed</span>
                                        </div>
                                    </div>

                                    {isNewsLoading ? (
                                        <div className="space-y-4">
                                            {[1,2,3,4].map(i => (
                                                <div key={i} className="animate-pulse space-y-2 p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                                                    <div className="h-2 bg-slate-200 rounded w-1/4" />
                                                    <div className="h-3 bg-slate-200 rounded w-full" />
                                                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : news.length === 0 ? (
                                        <div className="text-center py-10">
                                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No news available for this symbol</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {news.map(item => (
                                                <div key={item.id} className="group p-4 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 transition-all shadow-sm cursor-pointer">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-wider">{item.source}</span>
                                                        <span className="text-[8px] font-bold text-slate-300 flex items-center gap-1"><Clock size={10}/> {item.time}</span>
                                                    </div>
                                                    <h3 className="text-xs font-black text-slate-800 leading-snug group-hover:text-blue-600 transition-colors">{item.title}</h3>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activePanel === 'compare' && (
                                <div className="space-y-6">
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-6">
                                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4">Add Comparison</h4>
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                                            <input 
                                                type="text" 
                                                value={compareSearch} 
                                                onChange={(e) => setCompareSearch(e.target.value)}
                                                placeholder="Search symbol (e.g. RELIANCE)..." 
                                                className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-bold outline-none focus:border-blue-200 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Selected Assets</h4>
                                        <div className="space-y-2">
                                            {['AAPL', 'MSFT', 'GOOGL', 'RELIANCE', 'TCS', 'HDFCBANK'].map(sym => {
                                                const isSelected = selectedCompareSymbols.includes(sym);
                                                return (
                                                    <div 
                                                        key={sym} 
                                                        onClick={() => {
                                                            const newSelection = isSelected 
                                                                ? selectedCompareSymbols.filter(s => s !== sym)
                                                                : (selectedCompareSymbols.length < 8 ? [...selectedCompareSymbols, sym] : selectedCompareSymbols);
                                                            
                                                            setSelectedCompareSymbols(newSelection);
                                                            
                                                            // Pass the exact count to create exactly that many sections
                                                            const count = newSelection.length;
                                                            let type = 'grid';
                                                            if (count <= 1) type = 'single';
                                                            else if (count === 2) type = 'side';
                                                            
                                                            handleLayoutChange(type, count || 1, newSelection);
                                                        }}
                                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                                                {sym[0]}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-black text-slate-800">{sym}</h4>
                                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">NSE INDIA</p>
                                                            </div>
                                                        </div>
                                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-200'}`}>
                                                            {isSelected && <Check size={12} className="text-white"/>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    
                                    {selectedCompareSymbols.length >= 8 && (
                                        <p className="text-[9px] font-bold text-amber-500 text-center px-4 italic leading-tight">Maximum 8 comparison charts supported in the high-density grid layout.</p>
                                    )}
                                </div>
                            )}

                            {activePanel === 'notes' && (
                                <div className="space-y-6">
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-6">
                                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4">Add Research Note</h4>
                                        <div className="space-y-4">
                                            <textarea 
                                                value={noteInput}
                                                onChange={(e) => setNoteInput(e.target.value)}
                                                placeholder="Write your market observations..."
                                                className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-bold outline-none focus:border-blue-200 transition-all min-h-[120px] resize-none leading-relaxed"
                                            />
                                            <button 
                                                onClick={handleSaveNote}
                                                className="w-full bg-blue-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                                            >
                                                <Save size={14}/>
                                                {editingNoteId ? 'Update Note' : 'Save Note'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Previous Notes</h4>
                                        {notes.length === 0 ? (
                                            <div className="text-center py-10">
                                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <Edit3 size={18} className="text-slate-200"/>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No notes yet</p>
                                            </div>
                                        ) : (
                                            notes.map(note => (
                                                <div key={note.id} className="group p-5 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 transition-all shadow-sm">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">
                                                            {new Date(note.id).toLocaleDateString()} • {new Date(note.id).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button onClick={() => handleEditNote(note)} className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-300 hover:text-blue-600 transition-all"><Edit3 size={12}/></button>
                                                            <button onClick={() => handleDeleteNote(note.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-500 transition-all"><Trash2 size={12}/></button>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {activePanel === 'info' && companyInfo && (
                                <div className="space-y-8">
                                    <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-100">{baseSymbol[0]}</div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-800 tracking-tight leading-tight">{companyInfo.name || baseSymbol}</h4>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{baseSymbol} • NSE INDIA</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Session Stats</h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { label: 'Open', val: '₹492.10', icon: Clock, color: 'text-blue-500' },
                                                { label: 'Prev Close', val: '₹485.90', icon: TrendingUp, color: 'text-green-500' },
                                                { label: 'Volume', val: '61.5M', icon: Activity, color: 'text-purple-500' }
                                            ].map((s, i) => (
                                                <div key={i} className="p-3 rounded-xl bg-white border border-slate-50 shadow-sm flex flex-col items-center text-center">
                                                    <s.icon size={12} className={`${s.color} mb-1.5`}/>
                                                    <p className="text-[8px] font-black text-slate-300 uppercase mb-1">{s.label}</p>
                                                    <p className="text-[10px] font-black text-slate-700">{s.val}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Key Metrics</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { label: 'Market Cap', val: '₹1,708 Cr', tag: 'Mid Cap', type: 'neutral' },
                                                { label: 'P/E Ratio', val: '9.2', tag: 'Undervalued', type: 'green' },
                                                { label: 'ROE', val: '14.7%', tag: 'Strong', type: 'green' },
                                                { label: 'Debt to Equity', val: '0.12', tag: 'Healthy', type: 'green' },
                                                { label: 'Revenue Growth', val: '12.4%', tag: 'Stable', type: 'neutral' },
                                                { label: 'Profit Margin', val: '11.4%', tag: 'Healthy', type: 'green' }
                                            ].map((m, i) => (
                                                <div key={i} className="p-4 rounded-2xl bg-white border border-slate-50 shadow-sm hover:border-blue-100 transition-all group">
                                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1.5">{m.label}</p>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-black text-slate-800">{m.val}</span>
                                                        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase ${m.type === 'green' ? 'bg-green-50 text-green-500' : 'bg-slate-50 text-slate-400'}`}>{m.tag}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">About Company</h4>
                                        <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100">
                                            <p className="text-xs font-bold text-slate-600 leading-relaxed italic">
                                                "Leading provider of offshore drilling services to major global and national oil companies, focusing on operational excellence and sustainable energy support."
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Core Terminal Workspace */}
                <div className="flex-1 flex flex-col min-w-0">

                    {/* Chart Container Area */}
                    <div className={`flex-1 min-h-0 relative overflow-hidden rounded-xl border shadow-sm transition-colors duration-300 ${settings.theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-[#f8fafc] border-slate-100 shadow-slate-100/50'}`}>

                        <div className={`h-full grid gap-[1px] transition-colors duration-300 ${settings.theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100'} ${
                            layout === 'stack' ? 'grid-cols-1 grid-rows-2' :
                            charts.length >= 7 ? 'grid-cols-4' : 
                            charts.length >= 5 ? 'grid-cols-3' : 
                            charts.length >= 3 ? 'grid-cols-2' : 
                            charts.length === 2 ? 'grid-cols-2' : 
                            'grid-cols-1'
                        }`} style={{
                            gridTemplateRows: layout === 'stack' ? 'repeat(2, 1fr)' : (charts.length > 4 ? 'repeat(2, 1fr)' : (charts.length > 2 ? 'repeat(2, 1fr)' : '1fr'))
                        }}>
                            {charts.map((c, idx) => {
                                let spanClass = '';
                                if (layout === 'pro' && idx === 0) spanClass = 'col-span-2'; // 1 large + 2 small
                                if (charts.length === 5 && idx === 4) spanClass = 'col-span-2';
                                if (charts.length === 7 && idx === 6) spanClass = 'col-span-2';
                                
                                return (
                                    <div 
                                        key={c.id} 
                                        onClick={() => setActiveChartId(c.id)}
                                        className={`h-full w-full relative group ${spanClass} ${activeChartId === c.id ? 'z-10' : ''}`}
                                    >
                                        <ChartPane 
                                            {...c} 
                                            data={chartDataMap[c.symbol] || []} 
                                            isActive={activeChartId === c.id} 
                                            settings={{...settings, chartType: c.chartType, indicators: c.indicators}} 
                                            onSelect={(id) => setActiveChartId(id)} 
                                            onCrosshairMove={(id, p) => {
                                                if (settings.syncCrosshair) setCrosshairSync(p);
                                            }} 
                                            onVisibleRangeChange={(id, r) => {
                                                if (settings.syncCharts) setTimeRangeSync(r);
                                            }} 
                                            externalCrosshair={settings.syncCrosshair ? crosshairSync : null} 
                                            externalRange={settings.syncCharts ? timeRangeSync : null} 
                                        />
                                        

                                        
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                
                {/* Global Command Center Drawer */}



            </main>
        </div>
    );
};

export default InvestorAdvancedCharts;
