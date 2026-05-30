import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import EmptyWatchlistState from './components/EmptyWatchlistState';
import WatchlistSummaryCards from './components/WatchlistSummaryCards';
import WatchlistToolbar from './components/WatchlistToolbar';
import WatchlistTable from './components/WatchlistTable';
import WatchlistMobileList from './components/WatchlistMobileList';
import ResearchSidebar from './components/ResearchSidebar';
import PriceAlertModal from './components/PriceAlertModal';
import { useTraderWatchlist } from './hooks/useTraderWatchlist';
import { getNseStatus } from './utils/marketStatus';
import { normalizeSymbol } from './utils/formatters';
import api from '../../../api/api';

const TraderResearchWatchlist = () => {
  const navigate = useNavigate();
  const [marketStatus, setMarketStatus] = useState(getNseStatus());
  const [emptyQuery, setEmptyQuery] = useState('');
  const [addQuery, setAddQuery] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertError, setAlertError] = useState('');
  const [alertNotice, setAlertNotice] = useState('');
  const [alertForm, setAlertForm] = useState({
    symbol: '',
    targetPrice: '',
    condition: 'above',
    currentPrice: null,
  });

  const {
    rows,
    selected,
    selectedSymbol,
    setSelectedSymbol,
    loading,
    adding,
    error,
    stats,
    load,
    addSymbol,
    removeSymbol,
    hasStocks,
  } = useTraderWatchlist();

  useEffect(() => {
    const timer = setInterval(() => setMarketStatus(getNseStatus()), 60000);
    return () => clearInterval(timer);
  }, []);

  const filteredRows = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        (row.symbol && String(row.symbol).toLowerCase().includes(q)) ||
        (row.name && String(row.name).toLowerCase().includes(q)),
    );
  }, [rows, filterQuery]);

  const handleAdd = async (raw) => {
    const ok = await addSymbol(raw);
    if (ok) {
      setEmptyQuery('');
      setAddQuery('');
    }
  };

  const openStockPage = (symbol) => {
    navigate(`/stocks/${encodeURIComponent(normalizeSymbol(symbol))}`);
  };

  const openAlertModal = (row) => {
    const sym = normalizeSymbol(row?.symbol || '');
    if (!sym) return;
    const price = Number(row?.price);
    setAlertError('');
    setAlertForm({
      symbol: sym,
      targetPrice: Number.isFinite(price) && price > 0 ? price.toFixed(2) : '',
      condition: 'above',
      currentPrice: Number.isFinite(price) ? price : null,
    });
    setAlertModalOpen(true);
  };

  const closeAlertModal = () => {
    setAlertModalOpen(false);
    setAlertError('');
  };

  const handleCreateAlert = async () => {
    const priceValue = Number.parseFloat(alertForm.targetPrice);
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setAlertError('Enter a valid target price.');
      return;
    }

    setAlertSaving(true);
    setAlertError('');

    try {
      const operator = alertForm.condition === 'below' ? 'lte' : 'gte';
      const name = `Price ${alertForm.condition === 'below' ? 'Below' : 'Above'} ${alertForm.symbol} ${priceValue}`;

      await api.post('/alerts/rules', {
        name,
        symbol: alertForm.symbol,
        assetType: 'STOCK',
        logic: 'ALL',
        conditions: [{ field: 'price', operator, value: priceValue }],
        severity: 'medium',
        active: true,
      });

      setAlertModalOpen(false);
      setAlertNotice(`Alert created for ${alertForm.symbol} at ₹${priceValue.toLocaleString('en-IN')}.`);
      setTimeout(() => setAlertNotice(''), 4000);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create alert.';
      setAlertError(msg);
    } finally {
      setAlertSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-96px)] bg-[#020617] px-4 py-6 text-slate-100 md:px-8">
      <div className="mx-auto max-w-[1840px] space-y-5">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <motion.div
              layout
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${
                marketStatus.isOpen
                  ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
                  : 'border-slate-600 bg-slate-900/80 text-slate-400'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${marketStatus.isOpen ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              {marketStatus.label}
            </motion.div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-400/80">
                RADAR Research Watchlist
              </p>
              <h1 className="text-xl font-black tracking-tight text-white md:text-2xl">
                Market research workspace
              </h1>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Technical analysis and intelligence — no order execution.
              </p>
              <p className="mt-2 inline-flex items-center rounded-full bg-amber-100/15 text-amber-200 border border-amber-300/30 px-3 py-1 text-[11px] font-bold shadow-sm">
                Note: free sources prioritized; extended coverage available via paid APIs.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-[11px] font-semibold text-slate-500">
              {marketStatus.detail}
            </span>
            <button
              type="button"
              onClick={load}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm font-semibold text-slate-200 hover:border-cyan-400/30"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            {/* Removed Add Stock button per UX request */}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-lg border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {alertNotice && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
            >
              {alertNotice}
            </motion.div>
          )}
        </AnimatePresence>

        {loading && !hasStocks && (
          <motion.div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
            Loading research watchlist…
          </motion.div>
        )}

        {!loading && !hasStocks && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-slate-800/60 bg-slate-950/30 backdrop-blur-sm"
          >
            <EmptyWatchlistState
              query={emptyQuery}
              onQueryChange={setEmptyQuery}
              onAdd={handleAdd}
              adding={adding}
            />
          </motion.div>
        )}

        {hasStocks && (
          <motion.div
            key="populated"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-5"
          >
            <WatchlistSummaryCards stats={stats} />

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <section className="overflow-visible rounded-xl border border-slate-800/90 bg-slate-950/40 backdrop-blur-sm">
                <WatchlistToolbar
                  filterQuery={filterQuery}
                  onFilterChange={setFilterQuery}
                  addQuery={addQuery}
                  onAddQueryChange={setAddQuery}
                  onAddSymbol={handleAdd}
                  adding={adding}
                  trackedCount={rows.length}
                />

                {filteredRows.length === 0 ? (
                  <p className="px-4 py-12 text-center text-sm text-slate-500">No symbols match your filter.</p>
                ) : (
                  <>
                    <WatchlistTable
                      rows={filteredRows}
                      selectedSymbol={selectedSymbol}
                      onSelect={setSelectedSymbol}
                      onOpen={openStockPage}
                      onRemove={removeSymbol}
                      onAlert={openAlertModal}
                    />
                    <WatchlistMobileList
                      rows={filteredRows}
                      selectedSymbol={selectedSymbol}
                      onSelect={setSelectedSymbol}
                      onOpen={openStockPage}
                      onRemove={removeSymbol}
                      onAlert={openAlertModal}
                    />
                  </>
                )}
              </section>

              <ResearchSidebar
                row={selected}
                onOpen={openStockPage}
                onRemove={removeSymbol}
                onAlert={openAlertModal}
              />
            </div>
          </motion.div>
        )}
      </div>

      <PriceAlertModal
        open={alertModalOpen}
        symbol={alertForm.symbol}
        currentPrice={alertForm.currentPrice}
        targetPrice={alertForm.targetPrice}
        condition={alertForm.condition}
        onTargetPriceChange={(value) => setAlertForm((prev) => ({ ...prev, targetPrice: value }))}
        onConditionChange={(value) => setAlertForm((prev) => ({ ...prev, condition: value }))}
        onClose={closeAlertModal}
        onSubmit={handleCreateAlert}
        loading={alertSaving}
        error={alertError}
      />
    </div>
  );
};

export default TraderResearchWatchlist;
