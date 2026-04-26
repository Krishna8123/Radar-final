import HeroSection from '../components/landing/HeroSection';
import GlobalAssetSection from '../components/landing/GlobalAssetSection';
import TraderModeSection from '../components/landing/TraderModeSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import MarketTable from '../components/landing/MarketTable';
import NewsFeed from '../components/landing/NewsFeed';
import NewsSentiment from '../components/landing/NewsSentiment';
import WatchlistHub from '../components/landing/WatchlistHub';

import Preloader from '../components/common/Preloader';


const Navbar = () => (
    <div className="absolute top-6 left-0 right-0 z-50 flex justify-center px-4">
        <nav className="w-full max-w-7xl flex justify-between items-center backdrop-blur-xl bg-gradient-light rounded-2xl pl-6 pr-3 py-2 border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all duration-300">
            { }
            <div className="flex items-center gap-3">
                <div className="relative">
                    <img
                        src="/radar-logo-final.jpg"
                        alt="Radar Logo"
                        className="h-8 w-auto rounded-full object-contain"
                    />
                </div>
                <span className="text-xl font-black text-gradient-dark tracking-tighter font-['Plus_Jakarta_Sans']">RADAR</span>
            </div>

            { }
            <div className="hidden lg:flex items-center gap-8 text-sm font-bold text-gradient-dark absolute left-1/2 -translate-x-1/2">
                <a href="#global-assets" className="hover-text-teal transition-colors duration-300">Edge</a>
                <a href="#trader-mode" className="hover-text-teal transition-colors duration-300">Platform</a>
                <a href="#features-section" className="hover-text-teal transition-colors duration-300">Insights</a>
            </div>

            { }
            <div className="flex items-center gap-2">
                <a href="/login" className="btn-gradient-light px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-white/10">
                    <span className="text-gradient-dark">Log In</span>
                </a>
            </div>
        </nav>
    </div>
);


const Footer = () => (
    <footer className="relative z-10 pt-20 pb-10 border-t border-[#6FFFE9]/10 bg-[#348E87]">
        <div className="max-w-[95vw] mx-auto px-6 grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1">
                <div className="flex items-center gap-2 mb-6">
                    <img src="/radar-logo-final.jpg" alt="Radar Logo" className="h-8 w-auto rounded-full object-contain" />
                    <span className="text-xl font-bold text-white tracking-widest">RADAR</span>
                </div>
                <p className="text-white/50 text-sm leading-relaxed">
                    Radar is a real-time market research platform for observing and analyzing global markets in one structured interface.
                </p>
            </div>

            <div>
                <h4 className="text-white font-bold mb-6">Product</h4>
                <ul className="space-y-4 text-sm text-white/50">
                    <li><a href="#" className="hover:text-[#6FFFE9] transition-colors">Trade Center</a></li>
                    <li><a href="#" className="hover:text-[#6FFFE9] transition-colors">Pro Mode</a></li>
                    <li><a href="#" className="hover:text-[#6FFFE9] transition-colors">Live Pulse</a></li>
                    <li><a href="#" className="hover:text-[#6FFFE9] transition-colors">APIs</a></li>
                </ul>
            </div>

            <div>
                <h4 className="text-white font-bold mb-6">Resources</h4>
                <ul className="space-y-4 text-sm text-white/50">
                    <li><a href="#" className="hover:text-[#6FFFE9] transition-colors">Learning Lab</a></li>
                    <li><a href="#" className="hover:text-[#6FFFE9] transition-colors">Market Circle</a></li>
                    <li><a href="#" className="hover:text-[#6FFFE9] transition-colors">Documentation</a></li>
                    <li><a href="#" className="hover:text-[#6FFFE9] transition-colors">Ask Pulse AI</a></li>
                </ul>
            </div>

            <div>
                <h4 className="text-white font-bold mb-6">Support</h4>
                <ul className="space-y-4 text-sm text-white/50">
                    <li><a href="#" className="hover:text-[#6FFFE9] transition-colors">Help Center</a></li>
                    <li><a href="#" className="hover:text-[#6FFFE9] transition-colors">Security</a></li>
                    <li><a href="#" className="hover:text-[#6FFFE9] transition-colors">Contact Us</a></li>
                </ul>
            </div>
        </div>

        <div className="max-w-[95vw] mx-auto px-6 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/30">
            <p>Â© 2026 Radar Financial Analytics. All rights reserved.</p>
            <div className="flex gap-6">
                <a href="#" className="hover:text-white">Privacy Policy</a>
                <a href="#" className="hover:text-white">Terms of Service</a>
            </div>
        </div>
    </footer>
);



export default function Home() {
    return (
        <Preloader>
            <div className="min-h-screen custom-blue-gradient text-gray-900 font-sans selection:bg-radar-cyan selection:text-radar-dark overflow-x-hidden">
                <Navbar />

                <main className="pt-20">
                    <HeroSection />
                    <GlobalAssetSection />
                    <TraderModeSection />
                    <FeaturesSection />

                    <section id="live-pulse" className="relative py-24">
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute -top-20 left-1/4 w-64 h-64 rounded-full bg-[#42C0A5]/10 blur-3xl" />
                            <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-[#289dbc]/10 blur-3xl" />
                        </div>

                        <div className="relative z-10 max-w-[95vw] mx-auto px-6">
                            <div className="max-w-3xl mb-10">
                                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-3">Live Pulse Terminal</h2>
                                <p className="text-white/70 text-base md:text-lg leading-relaxed">
                                    Unified live snapshot of movers, headlines, sentiment, and watchlist activity, refreshed continuously from backend feeds.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                                <div className="xl:col-span-7">
                                    <MarketTable />
                                </div>
                                <div className="xl:col-span-5">
                                    <WatchlistHub />
                                </div>
                                <div className="xl:col-span-7">
                                    <NewsFeed />
                                </div>
                                <div className="xl:col-span-5">
                                    <NewsSentiment className="bg-[#0b1d21] rounded-3xl border border-white/10 p-6 h-full flex flex-col" />
                                </div>
                            </div>
                        </div>
                    </section>
                </main>

                <Footer />
            </div>
        </Preloader>
    );
}
