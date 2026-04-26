import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BrainCircuit, ShieldAlert, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProfileHeader from './components/ProfileHeader';
import MetricsCard from './components/MetricsCard';
import RiskBar from './components/RiskBar';
import TimelineItem from './components/TimelineItem';
import InsightCard from './components/InsightCard';
import { fallbackQuotes, profileData } from './mockProfileData';
import './TraderProfilePage.css';

const TWELVE_DATA_API_BASE = 'https://api.twelvedata.com/price';
const WATCHLIST_SYMBOLS = ['AAPL', 'MSFT'];

const TraderProfilePage = () => {
  const navigate = useNavigate();
  const { profile } = useHeaderData();
  const [quotes, setQuotes] = useState(fallbackQuotes);
  const [quotesLoading, setQuotesLoading] = useState(true);

  const sessionScores = useMemo(
    () => [
      { key: 'Opening', value: profileData.sessionPerformance.opening },
      { key: 'Mid-day', value: profileData.sessionPerformance.midDay },
      { key: 'Closing', value: profileData.sessionPerformance.closing },
    ],
    []
  );

  useEffect(() => {
    const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY || 'demo';

    const fetchQuotes = async () => {
      try {
        const responses = await Promise.all(
          WATCHLIST_SYMBOLS.map(async (symbol) => {
            const response = await fetch(
              `${TWELVE_DATA_API_BASE}?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`
            );
            const data = await response.json();
            const parsed = Number(data?.price);
            return {
              symbol,
              price: Number.isFinite(parsed) ? parsed : null,
            };
          })
        );

        const valid = responses.filter((item) => Number.isFinite(item.price));
        setQuotes(valid.length ? valid : fallbackQuotes);
      } catch (_error) {
        setQuotes(fallbackQuotes);
      } finally {
        setQuotesLoading(false);
      }
    };

    fetchQuotes();
  }, []);

  return (
    <main className="trader-profile-page">
      <div className="trader-profile-shell">
        <ProfileHeader
          name={profile?.username || profileData.name}
          email={profile?.email || profileData.email}
          status={profileData.status}
          onBack={() => navigate('/dashboard/trader')}
        />

        <section className="profile-grid top-grid">
          <InsightCard title="Trader Personality" className="personality-card">
            <div className="personality-pills">
              <span className="profile-pill">Trading Style: {profileData.tradingStyle}</span>
              <span className="profile-pill">Risk Type: {profileData.riskType}</span>
            </div>
            <p className="profile-description">{profileData.description}</p>
            <p className="profile-pattern">Best Pattern: {profileData.bestPattern}</p>
          </InsightCard>

          <InsightCard title="Research Metrics" className="metrics-wrap">
            <div className="metrics-grid">
              <MetricsCard label="Total Signals" value={profileData.metrics.totalSignals} hint="Signals generated" />
              <MetricsCard label="Accuracy" value={profileData.metrics.accuracy} suffix="%" hint="Winning setup quality" />
              <MetricsCard label="Consistency" value={profileData.metrics.consistency} suffix="%" hint="Stable performance" />
              <MetricsCard label="Screens Analyzed" value={profileData.metrics.screensAnalyzed} hint="Universe coverage" />
            </div>
          </InsightCard>
        </section>

        <section className="profile-grid middle-grid">
          <InsightCard title="Risk Behavior" className="risk-card">
            <RiskBar value={profileData.riskScore} label={profileData.riskLevel} />
            <p className="risk-insight">
              <ShieldAlert size={16} />
              {profileData.riskInsight}
            </p>
          </InsightCard>

          <InsightCard title="Session Performance" className="session-card">
            <div className="session-list">
              {sessionScores.map((session) => (
                <div key={session.key} className="session-row">
                  <span>{session.key}</span>
                  <span>{session.value}%</span>
                </div>
              ))}
            </div>
            <p className="best-session">
              <TrendingUp size={16} />
              Best Session: {profileData.sessionPerformance.bestSession}
            </p>
          </InsightCard>
        </section>

        <section className="profile-grid lower-grid">
          <InsightCard title="Strengths" className="list-card">
            <ul className="bullet-list positive">
              {profileData.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </InsightCard>

          <InsightCard title="Weaknesses" className="list-card">
            <ul className="bullet-list warning">
              {profileData.weaknesses.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </InsightCard>

        </section>

        <section className="profile-grid bottom-grid">
          <InsightCard title="Activity Timeline" className="timeline-card">
            <ul className="timeline-list">
              {profileData.activityTimeline.map((entry) => (
                <TimelineItem key={`${entry.symbol}-${entry.time}`} {...entry} />
              ))}
            </ul>
          </InsightCard>

          <InsightCard title="Live Watchlist Snapshot" className="quotes-card">
            <p className="quotes-note">
              <Activity size={16} />
              {quotesLoading
                ? 'Fetching latest prices from Twelve Data...'
                : 'Using Twelve Data live price endpoint (fallback to mock if unavailable).'}
            </p>
            <div className="quote-list">
              {quotes.map((quote) => (
                <div className="quote-row" key={quote.symbol}>
                  <span>{quote.symbol}</span>
                  <strong>${Number(quote.price).toFixed(2)}</strong>
                </div>
              ))}
            </div>
            <p className="api-note">
              Set VITE_TWELVE_DATA_API_KEY in your .env for production usage.
            </p>
          </InsightCard>
        </section>

        <footer className="profile-footer-note">
          <BrainCircuit size={16} />
          Profile insights shown with mock data for frontend demonstration.
        </footer>
      </div>
    </main>
  );
};

export default TraderProfilePage;
