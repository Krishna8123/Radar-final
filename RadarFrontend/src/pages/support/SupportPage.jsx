import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Clock3,
  Landmark,
  Wallet,
  LineChart,
  ShieldAlert,
  Phone,
  Mail,
  MessageCircle,
  LogOut,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import FaqItem from './components/FaqItem';
import IssueModal from './components/IssueModal';
import StatusIndicator from './components/StatusIndicator';
import TermTooltip from './components/TermTooltip';
import './SupportPage.css';

const faqData = [
  {
    id: 'pending-order',
    icon: Clock3,
    question: 'Why is my order pending?',
    searchText: 'order pending exchange matching liquidity risk checks',
    answer: (
      <p>
        Pending status usually means exchange-side matching is not complete. It can happen due to low liquidity,
        price band restrictions, or temporary risk checks.
      </p>
    ),
  },
  {
    id: 'sl-not-triggered',
    icon: ShieldAlert,
    question: "Why didn't my stop-loss trigger?",
    searchText: 'stop loss trigger slippage fast movement',
    answer: (
      <p>
        Stop-loss triggers when market reaches the trigger condition. In fast movement, slippage may occur and fills can
        happen at the next available price.
      </p>
    ),
  },
  {
    id: 'margin-used-vs-available',
    icon: Landmark,
    question: 'What is margin used vs available margin?',
    searchText: 'margin used available funds collateral',
    answer: (
      <p>
        <TermTooltip term="Margin used is blocked collateral against open positions and active orders.">
          Margin Used
        </TermTooltip>{' '}
        is blocked funds for existing exposure, while{' '}
        <TermTooltip term="Available margin is remaining collateral that can be used to place new trades.">
          Available Margin
        </TermTooltip>{' '}
        is what remains for new orders.
      </p>
    ),
  },
  {
    id: 'chart-delayed',
    icon: LineChart,
    question: 'Why is chart data delayed?',
    searchText: 'chart data delayed throttling internet cache',
    answer: (
      <p>
        Delays can occur from data-vendor throttling, internet jitter, or browser caching. Confirm your connection and refresh
        chart streams.
      </p>
    ),
  },
  {
    id: 'pnl-mismatch',
    icon: Wallet,
    question: 'Why is P&L different between positions and holdings?',
    searchText: 'pnl p&l positions holdings mark to market charges',
    answer: (
      <p>
        <TermTooltip term="P&L is mark-to-market and can vary by product type, charges, and settlement cycle.">
          P&amp;L
        </TermTooltip>{' '}
        differs because intraday and delivery positions follow different valuation windows and charges.
      </p>
    ),
  },
];

const quickActions = [
  'Report Order Issue',
  'Chart Not Loading',
  'Deposit/Withdrawal Problem',
  'Account Access Issue',
];

const recentIssues = [
  { title: 'Intermittent chart delay on 1m candles', severity: 'medium', time: '12 min ago' },
  { title: 'UPI withdrawal verification timeout', severity: 'high', time: '32 min ago' },
  { title: 'Delayed push notification in watchlist alerts', severity: 'low', time: '1 hr ago' },
];

const ideas = [
  'Add order timeline tracking to show every execution step.',
  'Add margin health meter to warn before risky positions expand.',
  'Add issue category shortcuts so support tickets route faster.',
];

export default function SupportPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [openFaq, setOpenFaq] = useState('pending-order');
  const [activeIssueType, setActiveIssueType] = useState('');
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false);
  const [latencyMs, setLatencyMs] = useState(108);

  useEffect(() => {
    // Latency is now static or could be fetched from a health endpoint in the future
  }, []);

  const filteredFaqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqData;
    return faqData.filter((faq) => {
      const target = `${faq.question} ${faq.searchText || ''}`.toLowerCase();
      return target.includes(q);
    });
  }, [query]);

  const apiTone = latencyMs > 175 ? 'error' : latencyMs > 135 ? 'warn' : 'ok';

  const openIssueModal = (issueType) => {
    setActiveIssueType(issueType);
    setIsIssueModalOpen(true);
  };

  const signOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('mode');
    window.location.replace('/');
  };

  return (
    <div className="support-page">
      <motion.div className="support-shell" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="support-glass support-top">
          <div className="support-card-head" style={{ marginBottom: 0 }}>
            <div>
              <h1 className="support-title">Help &amp; Support</h1>
              <p className="support-subtitle">
                Get assistance for trading workflows, order execution, margin understanding, chart issues, and account access.
              </p>
            </div>
            <div className="support-side-actions">
              <Link to="/dashboard" className="support-btn support-btn-muted" style={{ textDecoration: 'none' }}>
                Back to Dashboard
              </Link>
              <button type="button" className="support-btn support-btn-muted" onClick={() => setIsSignOutConfirmOpen(true)}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><LogOut size={14} /> Sign Out</span>
              </button>
            </div>
          </div>

          <div className="support-search-wrap">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search issues (orders, margin, charts...)"
              aria-label="Search support issues"
            />
          </div>
        </div>

        <div className="support-main-grid">
          <div className="support-column">
            <motion.section className="support-glass support-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
              <div className="support-card-head">
                <h2>Frequently Asked Questions</h2>
                <span className="support-muted">{filteredFaqs.length} results</span>
              </div>
              <div className="support-faq-list">
                {filteredFaqs.length === 0 ? (
                  <div className="support-muted">No FAQ matched your search.</div>
                ) : (
                  filteredFaqs.map((item) => (
                    <FaqItem
                      key={item.id}
                      item={item}
                      isOpen={openFaq === item.id}
                      onToggle={() => setOpenFaq((prev) => (prev === item.id ? '' : item.id))}
                    />
                  ))
                )}
              </div>
            </motion.section>

            <motion.section className="support-glass support-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="support-card-head">
                <h3>Recent Issues</h3>
                <span className="support-muted">Last 24 hours</span>
              </div>
              <div className="support-recent-list">
                {recentIssues.map((issue) => (
                  <div key={issue.title} className="support-recent-item">
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700 }}>{issue.title}</div>
                      <div className="support-muted">{issue.time}</div>
                    </div>
                    <span className={`support-severity ${issue.severity}`}>{issue.severity}</span>
                  </div>
                ))}
              </div>
            </motion.section>
          </div>

          <div className="support-column">
            <motion.section className="support-glass support-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <div className="support-card-head">
                <h3>Quick Actions</h3>
              </div>
              <div className="support-actions-grid">
                {quickActions.map((action) => (
                  <button key={action} type="button" className="support-action-btn" onClick={() => openIssueModal(action)}>
                    {action}
                  </button>
                ))}
              </div>
            </motion.section>

            <motion.section className="support-glass support-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              <div className="support-card-head">
                <h3>Contact</h3>
              </div>
              <div className="support-contact-list">
                <div className="support-contact-card">
                  <span className="support-contact-icon"><MessageCircle size={16} /></span>
                  <div>
                    <p className="support-contact-title">Live Chat</p>
                    <p className="support-contact-meta">Avg response time: 2 min</p>
                  </div>
                </div>
                <div className="support-contact-card">
                  <span className="support-contact-icon"><Phone size={16} /></span>
                  <div>
                    <p className="support-contact-title">Mobile Support</p>
                    <p className="support-contact-meta">9391143994</p>
                  </div>
                </div>
                <div className="support-contact-card">
                  <span className="support-contact-icon"><Mail size={16} /></span>
                  <div>
                    <p className="support-contact-title">Email Support</p>
                    <p className="support-contact-meta">srinivasamannepula7@gmail.com</p>
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section className="support-glass support-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
              <div className="support-card-head">
                <h3>Ideas</h3>
                <span className="support-muted">Useful product enhancements</span>
              </div>
              <div className="support-recent-list">
                {ideas.map((idea, index) => (
                  <div key={idea} className="support-recent-item">
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700 }}>Idea {index + 1}</div>
                      <div className="support-muted">{idea}</div>
                    </div>
                    <span className="support-severity low">Suggested</span>
                  </div>
                ))}
              </div>
            </motion.section>

            <motion.section className="support-glass support-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="support-card-head">
                <h3>System Status</h3>
              </div>
              <div className="support-status-grid">
                <StatusIndicator label="Market Data" value="Operational" tone="ok" />
                <StatusIndicator label="Order Execution" value="Operational" tone="ok" />
                <StatusIndicator label="API Latency" value={`${latencyMs} ms`} tone={apiTone} />
              </div>
            </motion.section>
          </div>
        </div>
      </motion.div>

      <IssueModal
        isOpen={isIssueModalOpen}
        issueType={activeIssueType}
        onClose={() => setIsIssueModalOpen(false)}
      />

      {isSignOutConfirmOpen ? (
        <div className="support-modal-backdrop" onClick={() => setIsSignOutConfirmOpen(false)}>
          <motion.div
            className="support-modal"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="support-modal-head">
              <div>
                <p className="support-modal-kicker">Account</p>
                <h3 className="support-modal-title">Sign out now?</h3>
              </div>
            </div>
            <div className="support-success">
              <p>You will be logged out from this device and redirected to login.</p>
              <div className="support-form-actions" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="support-btn support-btn-muted" onClick={() => setIsSignOutConfirmOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="support-btn support-btn-primary" onClick={signOut}>
                  Yes, Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
