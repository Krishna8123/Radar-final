import React, { useState } from 'react';
import { Filter, Globe, Star, FlaskConical, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Tilt from '../common/Tilt';


const InvestorModeSection = () => {
    const [activeIndex, setActiveIndex] = useState(0);

    const cards = [
        {
            title: "Signal Intelligence",
            subtitle: "Signal over noise. Always.",
            description: "Radar filters markets in real time to surface only high-impact signals that matter.",
            icon: Filter,
            iconColor: "text-blue-400",
            gradientFrom: "from-blue-400",
            sectionBg: "bg-blue-950",
            glow: "bg-blue-500",
            subFeatures: [
                { title: "Real-Time Filtering", desc: "Instantly separates high-probability setups from market noise." },
                { title: "Smart Recognition", desc: "Identifies complex patterns across multiple timeframes automatically." },
                { title: "Actionable Data", desc: "Delivers clear buy/sell signals with predefined entry and exit points." }
            ]
        },
        {
            title: "Unified Markets",
            subtitle: "One view. Every asset.",
            description: "Track stocks, crypto, and forex together — without switching tools or contexts.",
            icon: Globe,
            iconColor: "text-indigo-400",
            gradientFrom: "from-indigo-400",
            sectionBg: "bg-indigo-950",
            glow: "bg-indigo-500",
            subFeatures: [
                { title: "Cross-Asset View", desc: "Monitor Stocks, Crypto, and Forex in a single, unified dashboard." },
                { title: "Seamless Context", desc: "Switch between asset classes without losing your analytical setup." },
                { title: "Global Coverage", desc: "Access data from major global exchanges and decentralized markets." }
            ]
        },
        {
            title: "Smart Watchlists",
            subtitle: "Prepared before markets move.",
            description: "Dynamic watchlists that adapt to price action, trends, and your focus.",
            icon: Star,
            iconColor: "text-amber-400",
            gradientFrom: "from-amber-400",
            sectionBg: "bg-amber-950",
            glow: "bg-amber-500",
            subFeatures: [
                { title: "Dynamic Updates", desc: "Watchlists that automatically reorder based on market movement." },
                { title: "Trend Awareness", desc: "High-momentum assets bubble to the top of your list instantly." },
                { title: "Custom Criteria", desc: "Build lists based on specific technical or fundamental conditions." }
            ]
        },
        {
            title: "Paper Trading",
            subtitle: "Practice without pressure.",
            description: "Test strategies, learn behavior, and build confidence — without risking capital.",
            icon: FlaskConical,
            iconColor: "text-emerald-400",
            gradientFrom: "from-emerald-400",
            sectionBg: "bg-emerald-950",
            glow: "bg-emerald-500",
            subFeatures: [
                { title: "Risk-Free Execution", desc: "Execute trades in a live simulation environment with zero risk." },
                { title: "Strategy Testing", desc: "Validate your thesis and refine your edge before committing capital." },
                { title: "Performance Metrics", desc: "Track win rates and P&L just like a real portfolio account." }
            ]
        },
        {
            title: "Learn & Grow",
            subtitle: "Clarity before complexity.",
            description: "Investor-focused learning, fundamentals, and guided insights — built into the platform.",
            icon: GraduationCap,
            iconColor: "text-pink-400",
            gradientFrom: "from-pink-400",
            sectionBg: "bg-pink-950",
            glow: "bg-pink-500",
            subFeatures: [
                { title: "Curated Content", desc: "Bite-sized educational modules tailored to your experience level." },
                { title: "Contextual Insights", desc: "Learn 'why' a move happened, not just 'what' happened." },
                { title: "Fundamental Data", desc: "Deep dive into financial health and core metrics easily." }
            ]
        }
    ];

    return (
        <section id="features-section" className={`relative w-full py-10 px-4 sm:px-6 lg:px-8 overflow-hidden flex flex-col items-center justify-center min-h-screen transition-colors duration-1000 ease-in-out ${cards[activeIndex].sectionBg}`}>

            {}
            <div className="absolute inset-0 bg-black/10 pointer-events-none" />

            { }
            <motion.div
                animate={{
                    background: cards[activeIndex].glow.includes('#') ? cards[activeIndex].glow : `var(--${cards[activeIndex].glow.split('-')[1]}-500)`
                }}
                className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[130px] opacity-20 pointer-events-none transition-colors duration-1000`}
            />

            <div className="max-w-7xl mx-auto relative z-10 w-full flex flex-col items-center">

                { }
                <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center mb-6 px-4">
                    <motion.h2
                        className="text-3xl md:text-5xl font-bold tracking-tight text-white mx-auto whitespace-nowrap"
                    >
                        More Ways Radar Helps You To <span className={`text-transparent bg-clip-text bg-gradient-to-r ${cards[activeIndex].gradientFrom} to-white transition-all duration-700`}>Stay Ahead</span>
                    </motion.h2>
                    <p className="text-base md:text-lg text-white/70 max-w-2xl mx-auto leading-normal mt-2">
                        Radar is built as a system — each capability working together to support better decisions.
                    </p>
                </div>

                { }
                <div className="relative w-full max-w-4xl h-[400px] flex items-center justify-center perspective-[1000px] -mt-4">

                    { }
                    <div
                        className="absolute left-0 top-0 h-full w-1/6 z-30 cursor-pointer rounded-l-3xl"
                        onClick={() => setActiveIndex((prev) => (prev - 1 + cards.length) % cards.length)}
                    />
                    <div
                        className="absolute right-0 top-0 h-full w-1/6 z-30 cursor-pointer rounded-r-3xl"
                        onClick={() => setActiveIndex((prev) => (prev + 1) % cards.length)}
                    />

                    { }
                    <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeIndex}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="absolute w-full max-w-2xl pointer-events-auto"
                            >
                                <Tilt options={{ max: 10, scale: 1.02, speed: 1000, glare: true, "max-glare": 0.2 }} className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center text-center">
                                    { }
                                    <div className="relative mb-6">
                                        <div className={`absolute inset-0 ${cards[activeIndex].glow} blur-2xl opacity-20 rounded-full`} />
                                        <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-inner">
                                            {React.createElement(cards[activeIndex].icon, { size: 48, className: `${cards[activeIndex].iconColor} drop-shadow-md` })}
                                        </div>
                                    </div>

                                    { }
                                    <h3 className="text-3xl md:text-4xl font-bold text-white mb-3">{cards[activeIndex].title}</h3>
                                    <h4 className={`text-base md:text-lg font-medium ${cards[activeIndex].iconColor} mb-4`}>{cards[activeIndex].subtitle}</h4>
                                    <p className="text-slate-300 leading-relaxed text-base md:text-lg max-w-lg">
                                        {cards[activeIndex].description}
                                    </p>

                                    { }
                                    <div className="mt-8 flex items-center justify-center gap-2 z-40">
                                        {cards.map((_, idx) => (
                                            <div
                                                key={idx}
                                                onClick={(e) => { e.stopPropagation(); setActiveIndex(idx); }}
                                                className={`rounded-full transition-all duration-300 cursor-pointer ${idx === activeIndex
                                                    ? `h-3 w-12 ${cards[activeIndex].glow.replace('bg-', 'bg-')}`
                                                    : 'h-3 w-3 bg-white/20 hover:bg-white/40'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </Tilt>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                { }
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center max-w-5xl w-full">
                    <AnimatePresence mode="wait">
                        {cards[activeIndex].subFeatures.map((feature, idx) => (
                            <motion.div
                                key={`${activeIndex}-${idx}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ delay: idx * 0.1, duration: 0.2 }}
                                className="p-5 rounded-2xl bg-black/20 border border-white/5 backdrop-blur-sm"
                            >
                                <h5 className={`font-bold text-base mb-2 ${cards[activeIndex].iconColor}`}>{feature.title}</h5>
                                <p className="text-white/70 text-sm leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

            </div>
        </section>
    );
};

export default InvestorModeSection;
