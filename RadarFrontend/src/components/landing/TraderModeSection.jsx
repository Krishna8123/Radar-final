import { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';
import Tilt from '../common/Tilt';
import LaptopTradingView from './LaptopTradingView';
import InvestorPortfolioView from './InvestorPortfolioView';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const DualModeSection = () => {
    const [mode, setMode] = useState('INVESTOR');
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [transitionData, setTransitionData] = useState(null);


    const content = {
        TRADER: {
            theme: {
                bg: '#020617',
                surface: '#0F172A',
                glow: '#38BDF8',
                text: '#FFFFFF'
            },
            title: "Built for Market Reading, Not Guesswork",
            description: "Radar gives traders a fast, structured view of live market data — so you can analyze, react, and decide with clarity.",
            features: [
                { title: "Minimal Friction Interface", text: "A clean, distraction-free layout that keeps your attention on price, volume, and structure — not unnecessary noise." },
                { title: "High-Density Market Visuals", text: "Candlesticks, indicators, and depth charts presented clearly, so complex data is easy to read at a glance." },
                { title: "Built for Analysis, Not Execution", text: "Radar is your research terminal — analyze deeply, validate ideas, then execute trades on your preferred brokerage." }
            ],
            Visual: LaptopTradingView,
            motionConfig: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
        },
        INVESTOR: {
            theme: {
                bg: '#0F2E2A',
                surface: '#163C37',
                glow: '#2BBFA3',
                text: '#FFFFFF'
            },
            title: "Built for Long-Term Investors",
            description: "See the bigger picture with clean market data, core fundamentals, and structured views designed for patient, informed investing.",
            features: [
                { title: "Clear Market Direction", text: "Understand how markets move over time with simplified trend views that highlight growth, stability, and momentum." },
                { title: "Essential Fundamentals", text: "Access key financial metrics and company health indicators without technical overlays or trading noise." },
                { title: "Designed for Understanding, Not Speed", text: "Radar helps you study, compare, and evaluate — so investment decisions come from clarity, not urgency." }
            ],
            Visual: InvestorPortfolioView,
            motionConfig: { duration: 0.8, ease: "easeOut" }
        }
    };

    const currentTheme = content[mode].theme;
    const CurrentVisual = content[mode].Visual;


    const TraderOverlayVisual = () => (
        <div className="flex gap-2 items-end h-32">
            {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                    key={i}
                    initial={{ height: 10, opacity: 0 }}
                    animate={{ height: [20, 60, 40, 80][i % 4], opacity: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.05, repeat: Infinity, repeatType: "reverse" }}
                    className="w-4 bg-[#1E5EFF] rounded-sm shadow-[0_0_10px_#1E5EFF]"
                />
            ))}
        </div>
    );

    const InvestorOverlayVisual = () => (
        <div className="relative w-40 h-32 flex items-end">
            <svg viewBox="0 0 100 80" className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: "#2BBFA3", stopOpacity: 0.5 }} />
                        <stop offset="100%" style={{ stopColor: "#2BBFA3", stopOpacity: 0 }} />
                    </linearGradient>
                </defs>
                <motion.path
                    d="M0,80 Q50,80 100,10"
                    fill="none"
                    stroke="#2BBFA3"
                    strokeWidth="4"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, ease: "easeInOut" }}
                />
                <motion.circle
                    cx="0" cy="0" r="6" fill="#fff" stroke="#2BBFA3" strokeWidth="2"
                    initial={{ offsetDistance: "0%" }}
                    animate={{ offsetDistance: "100%" }}
                    style={{ offsetPath: 'path("M0,80 Q50,80 100,10")' }}
                    transition={{ duration: 1.2, ease: "easeInOut" }}
                />
                <motion.path
                    d="M0,80 Q50,80 100,10 V80 H0 Z"
                    fill="url(#grad1)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                />
            </svg>
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/20" />
            <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-white/20" />
        </div>
    );

    const handleToggle = () => {
        if (isTransitioning) return;

        const nextMode = mode === 'TRADER' ? 'INVESTOR' : 'TRADER';

        setTransitionData({
            title: nextMode === 'TRADER' ? "TRADER MINDSET" : "INVESTOR MINDSET",
            desc: nextMode === 'TRADER' ? "High Velocity • Precision • Active" : "Long Term • Balanced • Strategic",
            bgLeft: nextMode === 'TRADER' ? content.TRADER.theme.bg : content.INVESTOR.theme.bg,
            bgRight: nextMode === 'TRADER' ? content.TRADER.theme.surface : content.INVESTOR.theme.surface,
            glow: nextMode === 'TRADER' ? content.TRADER.theme.glow : content.INVESTOR.theme.glow,
            animConfig: nextMode === 'TRADER'
                ? { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
                : { duration: 1.2, ease: [0.25, 0.1, 0.25, 1] },
            VisualComponent: nextMode === 'TRADER' ? TraderOverlayVisual : InvestorOverlayVisual
        });

        setIsTransitioning(true);

        const switchDelay = nextMode === 'TRADER' ? 400 : 800;
        const totalDuration = nextMode === 'TRADER' ? 1000 : 2000;

        setTimeout(() => {
            setMode(nextMode);
        }, switchDelay);

        setTimeout(() => {
            setIsTransitioning(false);
            setTransitionData(null);
        }, totalDuration);
    };

    return (
        <section id="trader-mode" className="min-h-screen flex flex-col justify-center relative overflow-hidden transition-colors duration-1000 animate-rotate-bg"
            style={{
                background: `linear-gradient(var(--angle), ${currentTheme.bg}, ${currentTheme.surface}, ${currentTheme.bg})`
            }}>

            { }
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        background: `radial-gradient(circle at 20% 50%, ${currentTheme.glow}15, transparent 40%)`
                    }}
                    className="absolute inset-0 transition-opacity duration-1000"
                />
            </div>

            <div className="container mx-auto px-6 lg:px-12 py-12 relative z-10">

                { }
                <div className="flex justify-center mb-16">
                    <div className="p-1 rounded-full flex gap-2 items-center relative backdrop-blur-md border transition-all duration-300"
                        style={{
                            backgroundColor: `${currentTheme.surface}80`,
                            borderColor: `${currentTheme.glow}40`
                        }}>
                        {['INVESTOR', 'TRADER'].map((m) => (
                            <button
                                key={m}
                                onClick={() => m !== mode && handleToggle()}
                                className={cn(
                                    "px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 relative z-10",
                                    mode === m ? "text-white" : "text-white/50 hover:text-white/80"
                                )}
                            >
                                {m}
                                {mode === m && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 rounded-full -z-10 shadow-[0_0_15px_rgba(0,0,0,0.3)]"
                                        style={{ backgroundColor: currentTheme.glow }}
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                { }
                <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24 min-h-[600px]">

                    { }
                    <motion.div
                        initial={false}
                        animate={{ opacity: isTransitioning ? 0 : 1, x: isTransitioning ? -20 : 0 }}
                        transition={{ duration: 0.4 }}
                        className="w-full lg:w-1/2 space-y-8"
                    >
                        <motion.div
                            key={mode + "-title"}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.1] font-['Plus_Jakarta_Sans']">
                                {content[mode].title}
                            </h2>
                            <motion.div
                                layoutId="underline"
                                className="w-20 h-1 mt-4 rounded-full"
                                style={{ background: `linear-gradient(to right, ${currentTheme.glow}, transparent)` }}
                            />
                        </motion.div>

                        <motion.p
                            key={mode + "-desc"}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="text-lg text-gray-400 leading-relaxed font-sans"
                        >
                            {content[mode].description}
                        </motion.p>

                        {mode === 'TRADER' ? (
                            <div className="flex flex-col gap-16 relative pl-6">
                                { }
                                <div className="absolute left-[47.5px] top-2 bottom-16 w-[1px] bg-gradient-to-b from-[#1E5EFF] via-[#38BDF8] to-transparent opacity-50" />

                                {content[mode].features.map((feature, idx) => (
                                    <motion.div
                                        key={mode + feature.title}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + (idx * 0.1), ...content[mode].motionConfig }}
                                        className="relative flex items-start gap-8 group"
                                    >
                                        <div className="flex-shrink-0 relative z-10">
                                            <div className="w-12 h-12 rounded-full border border-[#38BDF8]/50 bg-[#0B1C2D]/80 backdrop-blur-md flex items-center justify-center text-[#38BDF8] font-bold text-lg shadow-[0_0_20px_-5px_rgba(56,189,248,0.3)] group-hover:scale-110 group-hover:border-[#38BDF8] group-hover:shadow-[0_0_30px_-5px_rgba(56,189,248,0.5)] transition-all duration-300">
                                                {idx + 1}
                                            </div>
                                        </div>
                                        <div className="pt-1.5">
                                            <h3 className="text-2xl font-bold text-white mb-2 font-['Plus_Jakarta_Sans'] tracking-tight group-hover:text-[#38BDF8] transition-colors duration-300">
                                                {feature.title}
                                            </h3>
                                            <p className="text-[17px] text-slate-400 font-sans leading-relaxed max-w-lg group-hover:text-slate-300 transition-colors duration-300">
                                                {feature.text}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-16 relative pl-6">
                                { }
                                <div className="absolute left-[47.5px] top-2 bottom-16 w-[1px] bg-gradient-to-b from-[#2BBFA3] via-[#2BBFA3] to-transparent opacity-50" />

                                {content[mode].features.map((feature, idx) => (
                                    <motion.div
                                        key={mode + feature.title}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + (idx * 0.1), ...content[mode].motionConfig }}
                                        className="relative flex items-start gap-8 group"
                                    >
                                        <div className="flex-shrink-0 relative z-10">
                                            <div className="w-12 h-12 rounded-full border border-[#2BBFA3]/50 bg-[#0F2E2A]/80 backdrop-blur-md flex items-center justify-center text-[#2BBFA3] font-bold text-lg shadow-[0_0_20px_-5px_rgba(43,191,163,0.3)] group-hover:scale-110 group-hover:border-[#2BBFA3] group-hover:shadow-[0_0_30px_-5px_rgba(43,191,163,0.5)] transition-all duration-300">
                                                {idx + 1}
                                            </div>
                                        </div>
                                        <div className="pt-1.5">
                                            <h3 className="text-2xl font-bold text-white mb-2 font-['Plus_Jakarta_Sans'] tracking-tight group-hover:text-[#2BBFA3] transition-colors duration-300">
                                                {feature.title}
                                            </h3>
                                            <p className="text-[17px] text-slate-400 font-sans leading-relaxed max-w-lg group-hover:text-slate-300 transition-colors duration-300">
                                                {feature.text}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    { }
                    {}
                    <motion.div
                        initial={false}
                        animate={{
                            opacity: isTransitioning ? 0 : 1,
                            scale: isTransitioning ? 0.95 : 1,
                            x: isTransitioning ? 20 : 0
                        }}
                        transition={{ duration: 0.4 }}
                        className="w-full lg:w-1/2 relative perspective-1000"
                    >
                        <div className="w-full aspect-square lg:aspect-auto flex items-center justify-center">
                            <Tilt options={{
                                max: 15,
                                scale: 1.02,
                                speed: 1000,
                                perspective: 1000,
                                glare: true,
                                "max-glare": 0.5
                            }} className="w-full">
                                <CurrentVisual />
                            </Tilt>
                        </div>
                    </motion.div>

                </div>
            </div>

            { }
            <AnimatePresence>
                {isTransitioning && transitionData && (
                    <>
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: "0%" }}
                            exit={{ x: "-100%" }}
                            transition={transitionData.animConfig}
                            className="fixed inset-y-0 left-0 w-1/2 z-50 flex flex-col justify-center items-end pr-12 text-right shadow-2xl"
                            style={{
                                backgroundColor: transitionData.bgLeft,
                                zIndex: 60
                            }}
                        >
                            <motion.h2
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ delay: 0.2 }}
                                className="text-4xl font-black text-white/90 font-['Plus_Jakarta_Sans']"
                            >
                                {transitionData.title}
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-xl text-white/50 mt-2"
                            >
                                {transitionData.desc}
                            </motion.p>
                        </motion.div>

                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: "0%" }}
                            exit={{ x: "100%" }}
                            transition={transitionData.animConfig}
                            className="fixed inset-y-0 right-0 w-1/2 z-50 flex flex-col justify-center pl-12 shadow-2xl"
                            style={{
                                backgroundColor: transitionData.bgRight,
                                zIndex: 60
                            }}
                        >
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{ delay: 0.3 }}
                                className="opacity-100"
                            >
                                <transitionData.VisualComponent />
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </section>
    );
};

export default DualModeSection;
