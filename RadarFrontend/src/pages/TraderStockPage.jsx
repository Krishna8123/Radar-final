import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, TrendingUp, TrendingDown, Layers, Activity, AlertTriangle, Zap, BarChart2 } from 'lucide-react';
import { fetchTechnicalSummary } from '../api/technicalApi';
import api from '../api/api';
import TradeDecisionZone from '../components/trader/stockResearch/TradeDecisionZone';

const TraderChartPanel = lazy(() => import('../components/trader/stockResearch/TraderChartPanel'));

/* helpers */
const Card = ({ children, className = '' }) => (
  <div
    className={`rounded-xl p-5 ${className}`}
    style={{ background: '#0D1421', border: '1px solid rgba(255,255,255,0.07)' }}
  >
    {children}
  </div>
);

const Lbl = ({ children }) => (
  <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">{children}</div>
);

const Bar = ({ label, value, color = '#475569' }) => (
  <div className="mb-3.5 last:mb-0">
    <div className="mb-1.5 flex justify-between">
      <span className="text-[11px] text-slate-400">{label}</span>
      <span className="text-[11px] font-semibold text-slate-300">{value}%</span>
    </div>
    <div className="h-1 overflow-hidden rounded-full bg-white/5">
      <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
    </div>
  </div>
);

const Spark = ({ d, color = '#22d3ee' }) => {
  if (!d?.length) return null;
  const mx = Math.max(...d);
  const mn = Math.min(...d);
  const r = mx - mn || 1;
  const pts = d.map((v, i) => `${(i / (d.length - 1)) * 92},${30 - ((v - mn) / r) * 24}`).join(' ');
  return (
    <svg width={92} height={32} viewBox="0 0 92 32">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* watchlist */


const InsightsSection = () => {
  const items = [
    { text: 'Trend alignment positive across intraday and daily structures.', type: 'bull' },
    { text: 'Breakout confirmed with strong volume participation above avg.', type: 'bull' },
    { text: 'Price holding above breakout region with healthy follow-through.', type: 'bull' },
    { text: 'Momentum indicators aligned, not yet overextended.', type: 'neutral' },
    { text: 'Sector breadth constructive, supporting continuation.', type: 'neutral' },
    { text: 'Watch for weakness if RSI drops below 50 on daily.', type: 'caution' },
    { text: 'Sector underperforming index on relative strength basis.', type: 'bear' },
    { text: 'Pullbacks absorbed near short-term support zones.', type: 'bull' },
  ];
  const dot = { bull: '#10b981', bear: '#ef4444', caution: '#f59e0b', neutral: '#64748b' };
  const tag = { bull: 'Bullish', bear: 'Bearish', caution: 'Caution', neutral: 'Neutral' };
  const tc = { bull: 'text-emerald-500', bear: 'text-rose-500', caution: 'text-amber-500', neutral: 'text-slate-500' };
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl p-4" style={{ background: '#0D1421', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: dot[item.type] }} />
            <span className={`text-[9px] font-bold uppercase tracking-widest ${tc[item.type]}`}>{tag[item.type]}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">{item.text}</p>
        </div>
      ))}
    </div>
  );
};

const ActivitySection = () => {
  const feed = [
    { time: '14:38', type: 'BREAKOUT', msg: 'Price broke above Rs 2,868 resistance with 1.8x volume surge', color: '#10b981', Icon: TrendingUp },
    { time: '13:52', type: 'VOL ALERT', msg: 'Unusual volume: 2.3x avg - institutional accumulation signal', color: '#22d3ee', Icon: Activity },
    { time: '12:15', type: 'CAUTION', msg: 'Fake breakout detected at Rs 2,875 - rejected at upper wick', color: '#f59e0b', Icon: AlertTriangle },
    { time: '11:30', type: 'SIGNAL', msg: 'EMA 20 crossed above EMA 50 - Golden Cross confirmed', color: '#a78bfa', Icon: Zap },
    { time: '10:45', type: 'ORB', msg: 'Opening range breakout - first 15m candle above prev high', color: '#22d3ee', Icon: BarChart2 },
    { time: '10:05', type: 'DIVERGENCE', msg: 'RSI divergence at open - price rose but RSI declined', color: '#f87171', Icon: TrendingDown },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {feed.map(({ time, type, msg, color, Icon }, i) => (
        <div key={i} className="flex gap-4 rounded-2xl border p-4" style={{ background: `${color}08`, borderColor: `${color}22` }}>
          <div className="flex flex-shrink-0 flex-col items-center gap-1.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${color}15` }}>
              <Icon size={15} style={{ color }} />
            </div>
            <span className="text-[9px] font-bold text-slate-600">{time}</span>
          </div>
          <div>
            <span className="mb-1 block text-[9px] font-black uppercase tracking-widest" style={{ color }}>{type}</span>
            <p className="text-xs leading-relaxed text-slate-300">{msg}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const PerformanceSection = ({ data }) => {
  const sparks = {
    '1D': [100, 99, 101, 100, 102, 101, 103],
    '1W': [100, 101, 103, 102, 104, 103, 106],
    '1M': [100, 103, 106, 105, 109, 108, 112],
    '6M': [100, 108, 115, 112, 120, 118, 123],
    '1Y': [100, 112, 125, 118, 134, 128, 140],
  };
  const dashboardCardStyle = {
    background: '#0B1D2A',
    borderRadius: '12px',
    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.24)',
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Object.entries(data.performanceBenchmarks ?? {}).map(([label, value]) => {
          const positive = String(value).startsWith('+');
          return (
            <div key={label} className="p-4 md:p-5" style={dashboardCardStyle}>
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8FA3B0]">{label}</div>
              <div className={`mt-2 text-3xl font-black leading-none ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>{value}</div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[10px] font-medium text-[#8FA3B0]">Return</div>
                  <div className="mt-1 text-xs text-slate-500">{positive ? 'Positive trend' : 'Negative trend'}</div>
                </div>
                <Spark d={sparks[label]} color={positive ? '#22c55e' : '#ef4444'} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="p-4 md:p-5" style={dashboardCardStyle}>
          <div className="text-base font-medium text-slate-100">Volatility</div>
          <div className="mt-4 divide-y divide-white/6">
            {[
              ['Beta', '1.12', 'text-slate-100'],
              ['ATR (14)', 'Rs 42.8', 'text-slate-100'],
              ['Max Drawdown', '-18.4%', 'text-rose-400'],
              ['Sharpe Ratio', '1.84', 'text-emerald-400'],
            ].map(([label, value, tone]) => (
              <div key={label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <span className="text-sm font-medium text-[#8FA3B0]">{label}</span>
                <span className={`text-lg font-black ${tone}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 md:p-5" style={dashboardCardStyle}>
          <div className="text-base font-medium text-slate-100">Alpha vs Nifty</div>
          <div className="mt-4 divide-y divide-white/6">
            {[
              ['1W Alpha', '+0.8%', 'text-emerald-400'],
              ['1M Alpha', '+1.4%', 'text-emerald-400'],
              ['6M Alpha', '+2.6%', 'text-emerald-400'],
              ['RS Rating', '1.46', 'text-cyan-400'],
            ].map(([label, value, tone]) => (
              <div key={label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <span className="text-sm font-medium text-[#8FA3B0]">{label}</span>
                <span className={`text-lg font-black ${tone}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const FundamentalsSection = ({ data }) => {
  const qRev = [8.2, 8.8, 9.1, 9.4, 9.7];
  const qPro = [0.62, 0.7, 0.74, 0.76, 0.79];
  const qtrs = ['Q2FY24', 'Q3FY24', 'Q4FY24', 'Q1FY25', 'Q2FY25'];
  const BarChart = ({ vals, color }) => {
    const mx = Math.max(...vals);
    return (
      <div className="mt-3 flex h-24 items-end gap-2">
        {vals.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[8px] font-bold text-slate-500">{v}</span>
            <div className="w-full rounded-t" style={{ height: `${(v / mx) * 60}px`, background: color, opacity: 0.55 + i * 0.1 }} />
            <span className="w-full truncate text-center text-[8px] text-slate-600">{qtrs[i]}</span>
          </div>
        ))}
      </div>
    );
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {[
          ['P/E', '28.4', '#94a3b8'],
          ['P/B', '3.12', '#94a3b8'],
          ['ROE', '18.2%', '#10b981'],
          ['ROCE', '14.8%', '#10b981'],
          ['D/E', '0.45', '#f59e0b'],
          ['Div%', '1.45%', '#22d3ee'],
        ].map(([l, v, c]) => (
          <div key={l} className="rounded-2xl border border-white/5 p-4 text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-500">{l}</div>
            <div className="text-xl font-black" style={{ color: c }}>{v}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card><Lbl>Quarterly Revenue (Rs T)</Lbl><BarChart vals={qRev} color="#22d3ee" /></Card>
        <Card><Lbl>Quarterly Profit (Rs T)</Lbl><BarChart vals={qPro} color="#10b981" /></Card>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Object.entries(data.fundamentals ?? {}).map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-white/5 p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</div>
            <div className="text-sm font-bold text-white">{String(v)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const KeyLevelsSignal = ({ keyLevels }) => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <Card>
      <Lbl>Key Price Levels</Lbl>
      <div className="space-y-2">
        {[
          { badge: 'R2', label: 'Resistance 2', value: keyLevels?.resistance?.r2, color: '#f87171', bg: 'rgba(239,68,68,0.07)' },
          { badge: 'R1', label: 'Resistance 1', value: keyLevels?.resistance?.r1, color: '#fca5a5', bg: 'rgba(239,68,68,0.10)' },
          { badge: 'S1', label: 'Support 1', value: keyLevels?.support?.s1, color: '#34d399', bg: 'rgba(16,185,129,0.10)' },
          { badge: 'S2', label: 'Support 2', value: keyLevels?.support?.s2, color: '#6ee7b7', bg: 'rgba(16,185,129,0.07)' },
        ].filter((r) => r.value).map(({ badge, label, value, color, bg }) => (
          <div key={label} className="flex items-center justify-between rounded-xl p-3" style={{ background: bg, border: `1px solid ${color}22` }}>
            <div className="flex items-center gap-3">
              <span className="rounded border px-2 py-0.5 text-[9px] font-black" style={{ color, borderColor: `${color}44`, background: `${color}15` }}>{badge}</span>
              <span className="text-xs font-semibold text-slate-400">{label}</span>
            </div>
            <span className="font-mono text-base font-black" style={{ color }}>Rs {value}</span>
          </div>
        ))}
      </div>
    </Card>
    <Card>
      <Lbl>Signal Strength</Lbl>
      <Bar label="Moving Averages (8/10)" value={80} color="#10b981" />
      <Bar label="Oscillators (5/6)" value={65} color="#22d3ee" />
      <Bar label="Chart Patterns (3/4)" value={72} color="#a78bfa" />
      <Bar label="Volume Analysis" value={85} color="#fb923c" />
      <div className="mt-4 border-t border-white/5 pt-3">
        <div className="mb-2 flex justify-between text-[9px] font-bold text-slate-500">
          <span>Sell 3</span><span>Neutral 5</span><span>Buy 12</span>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full" style={{ background: '#101828' }}>
          <div style={{ width: '15%', background: '#ef4444', opacity: 0.7 }} />
          <div style={{ width: '25%', background: '#64748b', opacity: 0.5 }} />
          <div style={{ width: '60%', background: '#10b981', opacity: 0.8 }} />
        </div>
      </div>
    </Card>
  </div>
);

const TABS = ['Insights', 'Activity', 'Performance', 'Fundamentals'];

// Fallback empty stock shape
const EMPTY_STOCK = {
  symbol: '', name: '', price: 0, changePercent: 0, volume: 0,
  atr: null, dayRange: null, sentiment: null, exchange: 'NSE',
};

export default function TraderStockPage({ overrideSymbol, onBack }) {
  const navigate = useNavigate();
  const { symbol: routeSymbol } = useParams();
  const symbol = overrideSymbol || routeSymbol || 'RELIANCE';
  const [loading, setLoading] = useState(true);
  const [stock, setStock] = useState({ ...EMPTY_STOCK, symbol });
  const [keyLevels, setKeyLevels] = useState({});
  const [tab, setTab] = useState('Insights');
  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    if (!symbol) return;
    let active = true;
    setLoading(true);

    Promise.allSettled([
      fetchTechnicalSummary('stock', symbol),
      api.get(`/market?symbols=${encodeURIComponent(symbol)}`).catch(() => null),
      api.get('/market?type=STOCK&limit=10').catch(() => null),
    ]).then(([techRes, mktRes, wlRes]) => {
      if (!active) return;

      const tech = techRes.status === 'fulfilled' ? techRes.value : null;
      const mktArr = mktRes?.status === 'fulfilled' ? (mktRes.value?.data?.data ?? mktRes.value?.data ?? []) : [];
      const mkt = Array.isArray(mktArr) ? mktArr[0] : mktArr;
      
      const wlArr = wlRes?.status === 'fulfilled' ? (wlRes.value?.data?.data ?? wlRes.value?.data ?? []) : [];

      const price = Number(mkt?.price ?? mkt?.ltp ?? tech?.indicators?.ema20 ?? 0);
      const changePercent = Number(mkt?.changePercent ?? mkt?.pChange ?? 0);

      setStock({
        symbol: symbol.replace(/\.(NS|BO)$/i, ''),
        name: mkt?.name ?? mkt?.companyName ?? `${symbol} Ltd.`,
        price,
        changePercent,
        volume: mkt?.volume ? `${(Number(mkt.volume) / 1e6).toFixed(2)}M` : '—',
        atr: tech?.indicators?.atr ? Number(tech.indicators.atr).toFixed(1) : '—',
        dayRange: mkt?.dayLow && mkt?.dayHigh ? `${mkt.dayLow} – ${mkt.dayHigh}` : '—',
        sentiment: tech?.score?.bias ?? '—',
        exchange: 'NSE',
      });

      setKeyLevels({
        support: { s1: tech?.indicators?.support ?? null, s2: null },
        resistance: { r1: tech?.indicators?.resistance ?? null, r2: null },
      });
      
      if (Array.isArray(wlArr)) {
        setWatchlist(wlArr.map(w => ({
          symbol: w.symbol.replace(/\.(NS|BO)$/i, ''),
          price: Number(w.price || w.ltp || 0),
          chg: Number(w.changePercent || w.pChange || 0)
        })));
      }

      setLoading(false);
    });

    return () => { active = false; };
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#050B14' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-300" />
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-200">Loading Terminal...</p>
        </div>
      </div>
    );
  }

  const pos = stock.changePercent >= 0;

  return (
    <div className="min-h-screen text-slate-200" style={{ background: '#050B14', fontFamily: 'Inter,system-ui,sans-serif' }}>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 px-5 py-2.5" style={{ background: '#0B1220' }}>
        <button onClick={onBack || (() => navigate('/dashboard'))} className="flex items-center gap-1.5 text-sm font-bold text-slate-400 transition-colors hover:text-white">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-4 text-xs font-bold">
          <span className="text-slate-500">NIFTY</span><span className="text-emerald-400">+0.75%</span>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-slate-500">BANKNIFTY</span><span className="text-rose-400">-0.21%</span>
          <div className="h-4 w-px bg-white/10" />
          <span className="flex items-center gap-1.5 text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />Live</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-3" style={{ background: '#0B1220' }}>
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-black text-white">{stock.symbol}</h1>
            <p className="text-[10px] font-semibold text-slate-500">{stock.name} · {stock.exchange} · Equity</p>
          </div>
          <div className={`flex items-center gap-1.5 text-2xl font-black ${pos ? 'text-emerald-400' : 'text-rose-400'}`}>
            {pos ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            ₹ {Number(stock.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            <span className="text-sm">{pos ? '+' : ''}{Number(stock.changePercent).toFixed(2)}%</span>
          </div>
        </div>
        <div className="flex items-center gap-5 text-[11px] font-semibold text-slate-400">
          {[['Vol', stock.volume], ['ATR', stock.atr], ['Range', stock.dayRange], ['Sentiment', stock.sentiment]].map(([l, v]) => (
            <div key={l}><span className="text-slate-600">{l}: </span><span className="text-slate-200">{v}</span></div>
          ))}
        </div>
      </div>

      <div className="flex" style={{ height: 'calc(100vh - 90px)' }}>
        <div className="hidden flex-shrink-0 flex-col overflow-y-auto border-r border-white/5 lg:flex" style={{ width: 240, background: '#0B1220', scrollbarWidth: 'none' }}>
          <div className="sticky top-0 border-b border-white/5 px-4 py-3" style={{ background: '#0B1220' }}>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500"><Layers size={11} />Watchlist</div>
          </div>
          <div className="space-y-1 p-2">
            {watchlist.map((w) => (
              <div
                key={w.symbol}
                onClick={() => navigate(`/stocks/${w.symbol}`)}
                className="cursor-pointer rounded-xl px-3 py-2.5 transition-all hover:bg-white/5"
                style={w.symbol === stock.symbol ? { background: 'rgba(34,211,238,0.07)', border: '1px solid rgba(34,211,238,0.18)' } : {}}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">{w.symbol}</div>
                    <div className="text-[10px] text-slate-500">NSE</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-white">{w.price.toFixed(2)}</div>
                    <div className={`text-[10px] font-bold ${w.chg >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{w.chg >= 0 ? '+' : ''}{w.chg.toFixed(2)}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1f2937 transparent' }}>
          <div className="space-y-5 pb-10">
            <Suspense
              fallback={
                <div className="px-4 pt-4">
                  <div className="flex items-center justify-center rounded-2xl" style={{ height: 560, background: '#0B1220', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-300" />
                  </div>
                </div>
              }
            >
              <TraderChartPanel symbol={stock.symbol} price={stock.price} />
            </Suspense>

            <div className="px-4 space-y-5">
              <TradeDecisionZone stock={stock} keyLevels={keyLevels} />
              <KeyLevelsSignal keyLevels={keyLevels} />

              <div className="overflow-hidden rounded-2xl" style={{ background: '#0B1220', boxShadow: '0 20px 60px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.04)' }}>
              <div className="flex overflow-x-auto border-b border-white/5" style={{ scrollbarWidth: 'none' }}>
                {TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className="flex-shrink-0 border-b-2 px-6 py-3.5 text-xs font-bold transition-all"
                    style={tab === t ? { borderColor: '#22d3ee', color: '#22d3ee', background: 'rgba(34,211,238,0.05)' } : { borderColor: 'transparent', color: '#475569' }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="p-6">
                {tab === 'Insights' && <InsightsSection />}
                {tab === 'Activity' && <ActivitySection />}
                {tab === 'Performance' && <PerformanceSection data={{}} />}
                {tab === 'Fundamentals' && <FundamentalsSection data={{}} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
