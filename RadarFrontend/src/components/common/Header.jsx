import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
    LayoutDashboard,
    Star,
    Filter,
    Newspaper,
    Search,
    Bell,
    CheckCircle,
    User,
    Settings,
    HelpCircle,
    Activity,
    TrendingUp,
    LogOut,
    Menu,
    GraduationCap,
    AlertTriangle,
    Briefcase,
    Target,
    Radar,
} from "lucide-react";
import { useHeaderData } from "../../hooks/useHeaderData";
import { fetchMarketData, fetchTrendingSearches, logSearchQuery } from "../../api/marketApi";
import { isValidSymbolSync } from "../../services/universeService";
import { updateUserMode } from "../../api/userApi";

const displaySymbol = (value) => String(value || '').replace(/\.(NS|BO)$/i, '');

const formatNotificationTime = (value) => {
    if (!value) return "Now";
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return value;
    const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
};

const Header = ({ activeModule, setActiveModule, onToggleMode }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const {
        profile,
        userInitial,
        userImage,
        notifications,
        unreadCount,
        isLoadingNotifications,
        isMarkingNotifications,
        markAllNotificationsRead,
        markSingleRead
    } = useHeaderData();

    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showDisclaimer, setShowDisclaimer] = useState(() => {
        return localStorage.getItem('hideDataDisclaimer') !== 'true';
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [trendingSearches, setTrendingSearches] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const searchContainerRef = useRef(null);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userMode");
        localStorage.removeItem("mode");
        navigate("/", { state: { skipPreloader: true } });
    };

    useEffect(() => {
        let isMounted = true;
        const loadTrending = async () => {
            const trends = await fetchTrendingSearches();
            if (isMounted) setTrendingSearches(trends.slice(0, 6));
        };
        loadTrending();
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        let isMounted = true;
        const query = searchQuery.trim();
        if (!query) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                setIsSearching(true);
                const response = await fetchMarketData({ search: query });
                if (isMounted) setSearchResults(Array.isArray(response) ? response.slice(0, 8) : []);
            } catch (error) {
                if (isMounted) setSearchResults([]);
            } finally {
                if (isMounted) setIsSearching(false);
            }
        }, 250);
        return () => { isMounted = false; clearTimeout(timer); };
    }, [searchQuery]);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
                setShowSearchDropdown(false);
                setHighlightedIndex(-1);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const openStockPage = (value) => {
        const symbol = String(value || '').trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
        if (!symbol) return;
        const mode = localStorage.getItem('mode') || 'INVESTOR';
        if (mode === 'INVESTOR') {
            navigate(`/investor/advanced-charts?symbol=${encodeURIComponent(symbol)}`);
        } else {
            navigate(`/stocks/${encodeURIComponent(symbol)}`);
        }
    };

    const navigateInvestorModule = (moduleId) => {
        if (moduleId === 'DASHBOARD') {
            navigate('/investor/dashboard');
            return;
        }

        navigate(`/investor/dashboard/${moduleId.toLowerCase()}`);
    };

    const handleSearchSelect = async (item) => {
        const raw = item?.symbol || item?.name || '';
        const symbol = displaySymbol(raw);
        if (!symbol) return;

        setSearchQuery(symbol);
        setShowSearchDropdown(false);
        if (setActiveModule) setActiveModule('WATCHLIST');
        openStockPage(symbol);
        if (symbol) await logSearchQuery(symbol);
    };

    const handleTrendingSelect = async (term) => {
        const symbol = displaySymbol(term);
        if (!symbol) return;

        setSearchQuery(symbol);
        setShowSearchDropdown(false);
        if (setActiveModule) setActiveModule('WATCHLIST');
        openStockPage(symbol);
        await logSearchQuery(symbol);
    };

    return (
        <>
            <header className="navbar rounded-[32px] mx-auto border border-white/40 shadow-xl relative z-[110] bg-white/95 backdrop-blur-xl px-10 py-3 flex items-center justify-between w-[96%] max-w-[1500px] mt-6">
                <div className="flex items-center gap-3 shrink-0">
                    <Link to="/" className="flex items-center gap-2.5" style={{ textDecoration: 'none' }}>
                        <img
                          src="/radar-icon.jpg"
                          alt="Radar Logo"
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <span className="text-xl font-black tracking-wider text-[#3E84F6]">
                          RADAR
                        </span>
                    </Link>
                </div>

                <div className="flex items-center gap-8 ml-4">
                    {[
                        { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
                        { id: 'WATCHLIST', label: 'Watchlist', icon: Star },
                        { id: 'SCREENERS', label: 'Screeners', icon: Filter },
                        { id: 'NEWS', label: 'News', icon: Newspaper },
                        { id: 'ACADEMY', label: 'Academy', icon: GraduationCap }
                    ].map((item) => (
                        <button
                            key={item.id}
                                onClick={() => {
                                    if (setActiveModule) {
                                        setActiveModule(item.id);
                                    }

                                    if (location.pathname.startsWith('/investor/dashboard')) {
                                        navigateInvestorModule(item.id);
                                        return;
                                    }

                                    navigate(item.id === 'DASHBOARD' ? '/investor/dashboard' : `/investor/dashboard/${item.id.toLowerCase()}`);
                                }}
                            className="flex items-center gap-2.5 text-[13px] font-black tracking-tight transition-all duration-300 opacity-100 hover:text-blue-700"
                            style={{ color: '#3E84F6' }}
                        >
                            <item.icon size={20} strokeWidth={2.5} />
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Right Side: Search & Actions */}
                <div className="flex items-center gap-4 flex-1 justify-end">
                    {/* Compact Search Bar */}
                    <div className="relative hidden md:block max-w-[320px] w-full" ref={searchContainerRef}>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400">
                            <Search size={18} strokeWidth={2.5} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search stocks..."
                            value={searchQuery}
                            onFocus={() => setShowSearchDropdown(true)}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={async (e) => {
                                const usingSearchResults = searchQuery.trim().length > 0;
                                const optionsLength = usingSearchResults ? searchResults.length : trendingSearches.length;
                                if (e.key === 'ArrowDown' && optionsLength > 0) {
                                    e.preventDefault();
                                    setHighlightedIndex((prev) => (prev + 1) % optionsLength);
                                } else if (e.key === 'ArrowUp' && optionsLength > 0) {
                                    e.preventDefault();
                                    setHighlightedIndex((prev) => (prev - 1 + optionsLength) % optionsLength);
                                } else if (e.key === 'Enter') {
                                    if (usingSearchResults) {
                                        if (searchResults.length > 0 && highlightedIndex >= 0) {
                                            await handleSearchSelect(searchResults[highlightedIndex]);
                                        } else {
                                            await handleTrendingSelect(searchQuery.trim().toUpperCase());
                                        }
                                    } else if (!usingSearchResults && trendingSearches.length > 0) {
                                        await handleTrendingSelect(trendingSearches[Math.max(0, highlightedIndex)]);
                                    }
                                }
                            }}
                            className="w-full rounded-full py-2 pl-10 pr-4 text-xs font-semibold focus:outline-none transition-all bg-white border border-blue-100/50 text-blue-900 focus:border-[#3E84F6] focus:shadow-sm placeholder:text-blue-300"
                        />
                        {showSearchDropdown && (
                            <div className="absolute top-11 left-0 right-0 bg-white border border-blue-100 rounded-xl shadow-xl overflow-hidden z-[120]">
                                {isSearching ? (
                                    <div className="px-4 py-3 text-xs font-semibold text-slate-500">Searching...</div>
                                ) : searchQuery.trim().length > 0 ? (
                                    searchResults.length > 0 ? (
                                        searchResults.map((item, idx) => (
                                            <button key={idx} onClick={() => handleSearchSelect(item)} className={`w-full text-left px-4 py-3 border-b border-blue-50 ${highlightedIndex === idx ? 'bg-blue-50' : 'hover:bg-blue-50'}`}>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-black text-slate-800">{displaySymbol(item.symbol)}</p>
                                                        <p className="text-[10px] text-slate-500">{item.name}</p>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-[#3E84F6]">{item.type}</span>
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <button onClick={() => handleTrendingSelect(searchQuery.trim().toUpperCase())} className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors">
                                            <p className="text-xs font-black text-slate-800">Search for '{searchQuery.toUpperCase()}'</p>
                                            <p className="text-[10px] text-slate-500">Press Enter to navigate directly</p>
                                        </button>
                                    )
                                ) : (
                                    <div className="px-4 py-3">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Trending</p>
                                        <div className="flex flex-wrap gap-2">
                                            {trendingSearches.map((term, idx) => (
                                                <button key={idx} onClick={() => handleTrendingSelect(term)} className={`px-2 py-1 rounded-full text-[10px] font-bold ${highlightedIndex === idx ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                                                    {term}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Profile Button Only */}
                    <div className="flex items-center gap-2 border-l border-blue-100/30 pl-4">
                        <div className="relative">
                            <div onClick={() => setIsProfileOpen(!isProfileOpen)} className="w-9 h-9 rounded-full bg-[#3E84F6] text-white flex items-center justify-center text-xs font-black cursor-pointer hover:scale-110 transition-all shadow-lg shadow-blue-500/20 overflow-hidden">
                                {(profile?.profilePicture || userImage) ? (
                                    <img 
                                        src={profile?.profilePicture || userImage} 
                                        alt="Profile" 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                    />
                                ) : null}
                                <span style={{ display: (profile?.profilePicture || userImage) ? 'none' : 'flex' }}>
                                    {userInitial}
                                </span>
                            </div>
                            {isProfileOpen && (
                                <div className="absolute right-0 top-12 w-[320px] bg-white border border-slate-100 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
                                    {/* Header Section with Avatar */}
                                    <div className="px-6 py-5 bg-[#F8FAFF] flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/20 flex-shrink-0 overflow-hidden">
                                        {(profile?.profilePicture || userImage) ? (
                                            <img 
                                                src={profile?.profilePicture || userImage} 
                                                alt="Profile" 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                            />
                                        ) : null}
                                        <span style={{ display: (profile?.profilePicture || userImage) ? 'none' : 'flex' }}>
                                            {userInitial}
                                        </span>
                                    </div>
                                        <div className="overflow-hidden">
                                            <p className="text-base font-black text-slate-900 leading-tight">{profile?.username || 'User'}</p>
                                            <p className="text-xs text-slate-500 font-bold mt-1">{profile?.email || 'user@radar.com'}</p>
                                        </div>
                                    </div>

                                    <div className="h-px bg-slate-100 w-full"></div>

                                    {/* Menu Links */}
                                    <div className="py-2.5 bg-white">
                                        <Link 
                                            to="/investor/profile" 
                                            onClick={() => setIsProfileOpen(false)} 
                                            className="group flex items-center gap-4 px-6 py-3 text-sm font-bold text-[#475569] hover:bg-slate-50 transition-all"
                                        >
                                            <User size={18} className="text-[#64748b]" /> My Profile
                                        </Link>
                                        <Link 
                                            to="/investor/settings" 
                                            onClick={() => setIsProfileOpen(false)} 
                                            className="group flex items-center gap-4 px-6 py-3 text-sm font-bold text-[#475569] hover:bg-slate-50 transition-all"
                                        >
                                            <Settings size={18} className="text-[#64748b]" /> Settings
                                        </Link>
                                        <Link
                                            to="/investor/support"
                                            onClick={() => setIsProfileOpen(false)}
                                            className="group flex items-center gap-4 px-6 py-3 text-sm font-bold text-[#475569] hover:bg-slate-50 transition-all"
                                        >
                                            <HelpCircle size={18} className="text-[#64748b]" /> Help & Support
                                        </Link>
                                    </div>

                                    <div className="h-px bg-slate-50 w-full"></div>

                                    {/* Interface Toggle Section */}
                                    <div className="px-6 py-6 bg-[#F8FAFC]">
                                        <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.1em] text-center mb-4">
                                            CHOOSE YOUR INTERFACE
                                        </p>
                                        <div className="relative bg-[#E2E8F0]/50 p-1.5 rounded-full flex items-center h-[48px]">
                                            <button 
                                                onClick={() => {
                                                    localStorage.setItem('mode', 'INVESTOR');
                                                    updateUserMode('INVESTOR').catch(() => {});
                                                    setIsProfileOpen(false);
                                                    navigate('/investor/dashboard');
                                                }}
                                                className="relative z-10 flex-1 flex items-center justify-center gap-2 h-full bg-white rounded-full shadow-md text-xs font-black text-[#2563EB]"
                                            >
                                                <Activity size={16} /> Investor
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    localStorage.setItem('mode', 'TRADER');
                                                    updateUserMode('TRADER').catch(() => {});
                                                    setIsProfileOpen(false);
                                                    navigate('/trader/dashboard');
                                                }}
                                                className="relative z-10 flex-1 flex items-center justify-center gap-2 h-full text-xs font-bold text-[#94A3B8]"
                                            >
                                                <TrendingUp size={16} /> Trader
                                            </button>
                                        </div>
                                    </div>

                                    <div className="h-px bg-slate-100 w-full"></div>

                                    {/* Footer / Sign Out */}
                                    <div className="bg-[#F8FAFF]">
                                        <button 
                                            onClick={() => {
                                                setIsProfileOpen(false);
                                                setShowLogoutModal(true);
                                            }} 
                                            className="w-full flex items-center gap-4 px-6 py-4 text-sm font-black text-slate-900 hover:bg-blue-50 transition-all"
                                        >
                                            <LogOut size={18} className="text-[#2563EB]" /> Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {(() => {
                const currentPath = location.pathname.toLowerCase();
                const isInvestorPage = currentPath.includes('investor');
                const isExceptedPage = currentPath.includes('settings') || currentPath.includes('profile') || currentPath.includes('support') || currentPath.includes('help');
                const shouldRenderDisclaimer = isInvestorPage && !isExceptedPage && showDisclaimer;
                
                if (!shouldRenderDisclaimer) return null;

                return (
                    <div className="w-[96%] max-w-[1500px] mx-auto mt-4 bg-[#FEFBF0] border border-[#FDEFC8] rounded-[20px] px-6 py-4 flex items-center justify-between gap-4 text-[#B07D2B] shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={18} className="text-[#E2A03F] flex-shrink-0" />
                            <p className="text-xs md:text-[13px] font-medium leading-relaxed">
                                <span className="font-bold text-[#8A5A16]">Data Disclaimer:</span> Market values and metrics may show slight discrepancies compared to direct exchange feeds due to our current data provider (Yahoo Finance) aggregation delays.
                            </p>
                        </div>
                        <button 
                            onClick={() => {
                                setShowDisclaimer(false);
                                localStorage.setItem('hideDataDisclaimer', 'true');
                            }}
                            className="text-[#E2A03F] hover:text-[#8A5A16] transition-colors p-1 flex-shrink-0"
                        >
                            <span className="text-base font-bold leading-none">✕</span>
                        </button>
                    </div>
                );
            })()}

            {showLogoutModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center">
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"><LogOut size={32} /></div>
                        <h3 className="text-xl font-bold mb-2">Sign Out?</h3>
                        <p className="text-sm text-slate-500 mb-6">Are you sure you want to log out of RADAR?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold">Cancel</button>
                            <button onClick={handleLogout} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Logout</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Header;
