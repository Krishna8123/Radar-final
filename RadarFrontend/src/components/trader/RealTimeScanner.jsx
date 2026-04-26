import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { hasAuthToken } from '../../api/api';
import {
  Zap,
  Bell,
  Play,
  Pause,
  Settings,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Target,
  Filter,
  Volume2,
  Percent,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';



const SCAN_TYPES = [
  { 
    id: 'price-breakout', 
    label: 'Price Breakout', 
    icon: TrendingUp,
    color: 'emerald',
    description: 'Stocks breaking resistance levels',
  },
  { 
    id: 'price-breakdown', 
    label: 'Price Breakdown', 
    icon: TrendingDown,
    color: 'rose',
    description: 'Stocks breaking support levels',
  },
  { 
    id: 'volume-spike', 
    label: 'Volume Spike', 
    icon: Volume2,
    color: 'cyan',
    description: '2x+ average volume increase',
  },
  { 
    id: 'rsi-extreme', 
    label: 'RSI Extremes', 
    icon: Activity,
    color: 'purple',
    description: 'RSI > 70 (overbought) or < 30 (oversold)',
  },
  { 
    id: 'gap-up', 
    label: 'Gap Up', 
    icon: TrendingUp,
    color: 'emerald',
    description: 'Opening gap up > 2%',
  },
  { 
    id: 'gap-down', 
    label: 'Gap Down', 
    icon: TrendingDown,
    color: 'rose',
    description: 'Opening gap down > 2%',
  },
  { 
    id: 'new-high', 
    label: '52-Week High', 
    icon: Target,
    color: 'amber',
    description: 'Reached new 52-week high',
  },
  { 
    id: 'new-low', 
    label: '52-Week Low', 
    icon: Target,
    color: 'orange',
    description: 'Reached new 52-week low',
  },
  { 
    id: 'pattern-bullish', 
    label: 'Bullish Patterns', 
    icon: BarChart3,
    color: 'emerald',
    description: 'Bull flags, cup & handle, ascending triangles',
  },
  { 
    id: 'pattern-bearish', 
    label: 'Bearish Patterns', 
    icon: BarChart3,
    color: 'rose',
    description: 'Bear flags, head & shoulders, descending triangles',
  },
];

const RealTimeScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [activeScanTypes, setActiveScanTypes] = useState(['price-breakout', 'volume-spike']);
  const [alerts, setAlerts] = useState([]);
  const [scanInterval, setScanInterval] = useState(30); // seconds
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(null);
  const scanTimerRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhGh+u4P6jYB8IQZzW6bRJIA==');
  }, []);

  const toggleScanType = useCallback((scanTypeId) => {
    setActiveScanTypes(prev => 
      prev.includes(scanTypeId)
        ? prev.filter(id => id !== scanTypeId)
        : [...prev, scanTypeId]
    );
  }, []);

  // Maps a backend alert object to our display shape
  const normalizeAlert = useCallback((raw, scanType) => {
    const scanConfig = SCAN_TYPES.find(s => s.id === scanType) || SCAN_TYPES[0];
    return {
      id: raw._id || raw.id || `${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Using random only as last resort fallback for ID
      timestamp: raw.createdAt ? new Date(raw.createdAt) : new Date(),
      symbol: String(raw.symbol || '').replace(/\.(NS|BO)$/i, ''),
      scanType,
      label: scanConfig.label,
      color: scanConfig.color,
      price: Number(raw.price ?? raw.currentPrice ?? 0),
      change: Number(raw.changePercent ?? raw.change ?? 0),
      volume: Number(raw.volume ?? 0),
      message: raw.message || raw.description || `${raw.symbol} triggered ${scanConfig.label}`,
      icon: scanConfig.icon,
    };
  }, []);

  const performScan = useCallback(async () => {
    try {
      setLastScanTime(new Date());

      if (!hasAuthToken()) {
        // Not logged in — show a placeholder notice but don't spam
        return;
      }

      const res = await api.get('/technical/alerts');
      const payload = res.data?.data ?? res.data;
      const rawAlerts = Array.isArray(payload) ? payload : [];

      // Filter by active scan types (map backend alert.type -> our scanType ids)
      const typeMap = {
        breakout: 'price-breakout',
        breakdown: 'price-breakdown',
        volume: 'volume-spike',
        'rsi-overbought': 'rsi-extreme',
        'rsi-oversold': 'rsi-extreme',
        'gap-up': 'gap-up',
        'gap-down': 'gap-down',
        '52w-high': 'new-high',
        '52w-low': 'new-low',
      };

      const newAlerts = rawAlerts
        .map(raw => {
          const scanType = typeMap[raw.type] || raw.type || activeScanTypes[0];
          return activeScanTypes.includes(scanType) ? normalizeAlert(raw, scanType) : null;
        })
        .filter(Boolean);

      if (newAlerts.length > 0) {
        setAlerts(prev => {
          const existingIds = new Set(prev.map(a => String(a.id)));
          const fresh = newAlerts.filter(a => !existingIds.has(String(a.id)));
          return [...fresh, ...prev].slice(0, 100);
        });

        if (soundEnabled && audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
        if (desktopNotifications && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('RADAR Scanner Alert', {
            body: `${newAlerts.length} new alert${newAlerts.length > 1 ? 's' : ''} detected!`,
            icon: '/radar-logo-final.jpg',
          });
        }
      }
    } catch (error) {
      console.warn('Scan fetch error:', error.message);
    }
  }, [activeScanTypes, soundEnabled, desktopNotifications, normalizeAlert]);

  const startScanning = useCallback(() => {
    setIsScanning(true);
    performScan(); // Initial scan
    
    scanTimerRef.current = setInterval(() => {
      performScan();
    }, scanInterval * 1000);
  }, [performScan, scanInterval]);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  const getColorClasses = (color) => ({
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    rose: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
    cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
    amber: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    orange: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
  }[color] || 'bg-slate-500/20 text-slate-300 border-slate-400/30');

  return (
    <div className="h-full bg-slate-950 flex flex-col">
      {}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Real-Time Scanner</h1>
            <p className="text-sm text-slate-400">
              {isScanning ? (
                <>
                  <span className="inline-flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Scanning {activeScanTypes.length} criteria every {scanInterval}s
                  </span>
                </>
              ) : (
                `${activeScanTypes.length} scan types selected`
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {}
          <button
            onClick={isScanning ? stopScanning : startScanning}
            disabled={activeScanTypes.length === 0}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              isScanning
                ? 'bg-rose-500 hover:bg-rose-600 text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isScanning ? (
              <>
                <Pause className="w-5 h-5" />
                Stop Scanning
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start Scanning
              </>
            )}
          </button>

          {}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all"
          >
            <Settings className="w-5 h-5" />
          </button>

          {}
          <div className="px-4 py-3 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <span className="font-semibold">{alerts.length}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {}
        <div className="w-80 bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
              Scan Criteria
            </h3>
            <p className="text-xs text-slate-500">
              Select one or more criteria to scan for
            </p>
          </div>

          <div className="space-y-2">
            {SCAN_TYPES.map(scanType => {
              const Icon = scanType.icon;
              const isActive = activeScanTypes.includes(scanType.id);
              
              return (
                <button
                  key={scanType.id}
                  onClick={() => toggleScanType(scanType.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    isActive
                      ? getColorClasses(scanType.color)
                      : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm mb-1">{scanType.label}</div>
                      <div className="text-xs opacity-80">{scanType.description}</div>
                    </div>
                    {isActive && (
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {}
        <div className="flex-1 overflow-y-auto p-6">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <AlertCircle className="w-16 h-16 text-slate-700 mb-4" />
              <h3 className="text-xl font-bold text-slate-400 mb-2">No Alerts Yet</h3>
              <p className="text-slate-500 max-w-md">
                {activeScanTypes.length === 0
                  ? 'Select scan criteria from the sidebar and start scanning'
                  : 'Click "Start Scanning" to begin monitoring the market'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">
                  Recent Alerts ({alerts.length})
                </h3>
                {lastScanTime && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Clock className="w-4 h-4" />
                    Last scan: {lastScanTime.toLocaleTimeString()}
                  </div>
                )}
              </div>

              <AnimatePresence initial={false}>
                {alerts.map(alert => {
                  const Icon = alert.icon;
                  const colorClasses = getColorClasses(alert.color);
                  
                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className={`p-4 rounded-xl border ${colorClasses} backdrop-blur-sm`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-slate-900/50">
                          <Icon className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-lg">{alert.symbol}</span>
                            <span className={`text-sm font-semibold ${
                              alert.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {alert.change >= 0 ? '+' : ''}{alert.change.toFixed(2)}%
                            </span>
                          </div>
                          
                          <div className="text-sm font-semibold mb-1">{alert.label}</div>
                          <div className="text-sm opacity-80">{alert.message}</div>
                          
                          <div className="flex items-center gap-4 mt-2 text-xs opacity-70">
                            <span>?{alert.price.toFixed(2)}</span>
                            <span>Vol: {(alert.volume / 1000000).toFixed(2)}M</span>
                            <span>{alert.timestamp.toLocaleTimeString()}</span>
                          </div>
                        </div>

                        <button className="px-4 py-2 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-all text-sm font-semibold">
                          View Chart
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl border border-slate-700 p-6 w-full max-w-md"
            >
              <h3 className="text-xl font-bold text-white mb-4">Scanner Settings</h3>
              
              <div className="space-y-4">
                {}
                <div>
                  <label className="text-sm font-semibold text-slate-300 mb-2 block">
                    Scan Interval
                  </label>
                  <select
                    value={scanInterval}
                    onChange={(e) => setScanInterval(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value={10}>10 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>1 minute</option>
                    <option value={300}>5 minutes</option>
                  </select>
                </div>

                {}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-300">Sound Alerts</span>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      soundEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        soundEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-300">Desktop Notifications</span>
                  <button
                    onClick={() => setDesktopNotifications(!desktopNotifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      desktopNotifications ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        desktopNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full mt-6 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-semibold transition-all"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RealTimeScanner;
