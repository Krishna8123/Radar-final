// This is the NEW TradingView-style Trader Dashboard
// Replace the existing TraderView function in Dashboard.jsx with this

function TraderView({ data, activeModule }) {
    const [bottomPanelTab, setBottomPanelTab] = useState("SCREENER");
    const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);

    if (activeModule && activeModule !== "DASHBOARD") {
        return (
            <div className="dashboard-layout flex items-center justify-center text-white h-screen">
                <div className="text-center opacity-50">
                    <h2 className="text-3xl font-bold mb-2">{activeModule}</h2>
                    <p className="font-mono text-sm">MODULE INITIALIZING...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="terminal-grid">
            {/* CHART AREA (Left/Center - 70% of screen) */}
            <div className="chart-area">
                {/* Chart Toolbar */}
                <div className="chart-toolbar">
                    <span className="text-[var(--text-primary)] font-mono text-sm font-bold">NIFTY 50</span>
                    <span className="text-[var(--accent-green)] font-mono text-xs">18,500 +92 (+0.5%)</span>
                    <div className="flex-1"></div>
                    <div className="flex gap-1">
                        {['1m', '5m', '15m', '1H', '1D'].map((tf) => (
                            <button
                                key={tf}
                                className={`px-2 py-1 text-[10px] font-mono ${tf === '15m'
                                        ? 'bg-[var(--accent-blue)] text-white'
                                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Chart Grid */}
                <div className="h-[calc(100%-35px)]">
                    <MultiChartGrid />
                </div>
            </div>

            {/* RIGHT SIDEBAR (300px fixed) */}
            <div className="right-sidebar">
                {/* Watchlist (Top 50%) */}
                <div className="flex-1 border-b border-[var(--border-color)]">
                    <div className="pane-header">
                        <span>WATCHLIST</span>
                        <Search size={12} className="text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]" />
                    </div>
                    <div className="h-[calc(100%-32px)] overflow-hidden">
                        <AdvancedWatchlist />
                    </div>
                </div>

                {/* Market Data (Bottom 50%) */}
                <div className="flex-1 flex flex-col">
                    <div className="pane-header">
                        <span>MARKET DATA</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                        <MarketBreadth />
                        <MarketSentiment />
                    </div>
                </div>
            </div>

            {/* BOTTOM PANEL (Collapsible) */}
            {isBottomPanelOpen && (
                <div className="bottom-panel">
                    {/* Tab Header */}
                    <div className="flex items-center h-[32px] bg-[var(--bg-primary)] border-b border-[var(--border-color)] px-3">
                        <div className="flex gap-4">
                            {['SCREENER', 'VOL SHOCKERS', 'HEATMAP'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setBottomPanelTab(tab)}
                                    className={`text-[11px] font-semibold px-2 py-1 ${bottomPanelTab === tab
                                            ? 'text-[var(--text-primary)] border-b-2 border-[var(--accent-blue)]'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1"></div>
                        <button
                            onClick={() => setIsBottomPanelOpen(false)}
                            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="h-[calc(100%-32px)] overflow-hidden">
                        {bottomPanelTab === 'SCREENER' && (
                            <div className="grid grid-cols-3 gap-0 h-full">
                                <div className="border-r border-[var(--border-color)]">
                                    <TechnicalScreeners />
                                </div>
                                <div className="border-r border-[var(--border-color)]">
                                    <FODashboard />
                                </div>
                                <div>
                                    <NewsFlash />
                                </div>
                            </div>
                        )}
                        {bottomPanelTab === 'VOL SHOCKERS' && (
                            <div className="grid grid-cols-2 gap-0 h-full">
                                <div className="border-r border-[var(--border-color)]">
                                    <VolumeShockers />
                                </div>
                                <div>
                                    <GapLists />
                                </div>
                            </div>
                        )}
                        {bottomPanelTab === 'HEATMAP' && (
                            <div className="h-full">
                                <SectorHeatmap />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Bottom Panel Toggle (when closed) */}
            {!isBottomPanelOpen && (
                <button
                    onClick={() => setIsBottomPanelOpen(true)}
                    className="fixed bottom-0 left-1/2 transform -translate-x-1/2 bg-[var(--bg-secondary)] border border-[var(--border-color)] px-4 py-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2"
                >
                    <ChevronUp size={12} />
                    SHOW PANEL
                </button>
            )}
        </div>
    );
}

// IMPORTANT: You also need to import ChevronUp at the top of Dashboard.jsx:
// import { ..., ChevronUp } from "lucide-react";
