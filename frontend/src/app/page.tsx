'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, TrendingUp, Waves, ArrowRight, BarChart3, Zap, Shield, Lock } from 'lucide-react';
import { useSessionContext } from 'supertokens-auth-react/recipe/session';
import { api, StockSummary } from '@/lib/api';

export default function LandingPage() {
    const router = useRouter();
    const session = useSessionContext();
    const [summaries, setSummaries] = useState<StockSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [apiOnline, setApiOnline] = useState(false);
    const isLoggedIn = !session.loading && session.doesSessionExist;

    useEffect(() => {
        async function init() {
            try {
                await api.health();
                setApiOnline(true);
                // Only fetch the 4 featured base indices for the ticker bar
                const featured = await api.getFeaturedStocks();
                const sums = await Promise.all(
                    featured.items.map((s) => api.getStockSummary(s.symbol).catch(() => ({
                        symbol: s.symbol,
                        name: s.name,
                        color: s.color,
                        current_price: 0,
                        change: 0,
                        change_pct: 0,
                    })))
                );
                setSummaries(sums);
            } catch {
                setApiOnline(false);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []);

    return (
        <div
            className="min-h-screen flex flex-col relative"
            style={{ backgroundImage: 'linear-gradient(to bottom right, #0f172a, #1e293b)' }}
        >
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <div className="scanlines" />

            {/* Ticker Bar */}
            {summaries.length > 0 && (
                <div className="relative z-10 bg-slate-900/90 border-b border-slate-800 overflow-hidden">
                    <div className="flex items-center animate-ticker whitespace-nowrap py-2">
                        {[...summaries, ...summaries].map((s, i) => (
                            <div key={i} className="flex items-center gap-3 px-6">
                                <span className="text-slate-400 font-mono text-xs uppercase tracking-wider">{s.name}</span>
                                <span className="text-slate-100 font-mono text-sm font-bold">
                                    ${s.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                                <span className={`font-mono text-xs font-bold ${s.change_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {s.change_pct >= 0 ? '+' : ''}{s.change_pct?.toFixed(2)}%
                                </span>
                                <div className="w-px h-4 bg-slate-700 ml-3" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
                <div className="w-full max-w-4xl mx-auto text-center animate-slide-up">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="relative">
                            <Activity size={48} className="text-blue-400" />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse-glow" />
                        </div>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-chivo font-bold uppercase tracking-wider mb-4">
                        <span className="text-gradient">StockFreq</span>{' '}
                        <span className="text-slate-100">AI</span>
                    </h1>

                    <p className="text-slate-400 text-lg mb-2 max-w-2xl mx-auto">
                        Stock Price Prediction using Deep Learning & Frequency Decomposition
                    </p>
                    <p className="text-slate-500 text-sm font-mono mb-10">
                        CNN-LSTM × EMD × CEEMD — Live Market Data from Yahoo Finance
                    </p>

                    {/* Feature Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                        <div className="bg-slate-900/90 border border-slate-700 rounded-sm p-6 backdrop-blur-md hover:border-blue-500/50 transition-all">
                            <TrendingUp size={32} className="text-blue-400 mx-auto mb-3" />
                            <h3 className="font-chivo font-bold uppercase tracking-wider text-sm mb-2">Deep Learning</h3>
                            <p className="text-slate-500 text-xs font-mono">CNN-LSTM & LSTM models trained on historical stock data</p>
                        </div>
                        <div className="bg-slate-900/90 border border-slate-700 rounded-sm p-6 backdrop-blur-md hover:border-purple-500/50 transition-all">
                            <Waves size={32} className="text-purple-400 mx-auto mb-3" />
                            <h3 className="font-chivo font-bold uppercase tracking-wider text-sm mb-2">Frequency Decomposition</h3>
                            <p className="text-slate-500 text-xs font-mono">EMD & CEEMD to extract intrinsic mode functions</p>
                        </div>
                        <div className="bg-slate-900/90 border border-slate-700 rounded-sm p-6 backdrop-blur-md hover:border-green-500/50 transition-all">
                            <BarChart3 size={32} className="text-green-400 mx-auto mb-3" />
                            <h3 className="font-chivo font-bold uppercase tracking-wider text-sm mb-2">Live Data</h3>
                            <p className="text-slate-500 text-xs font-mono">Real-time stock data from Yahoo Finance API</p>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        {isLoggedIn ? (
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="bg-blue-600 hover:bg-blue-500 text-white rounded-sm font-medium tracking-wide uppercase text-sm px-8 py-4 shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-150 inline-flex items-center gap-3 hover:gap-4"
                            >
                                <Zap size={18} />
                                Go to Dashboard
                                <ArrowRight size={18} />
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => router.push('/auth')}
                                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-sm font-medium tracking-wide uppercase text-sm px-8 py-4 shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-150 inline-flex items-center gap-3 hover:gap-4"
                                >
                                    <Lock size={18} />
                                    Sign In
                                    <ArrowRight size={18} />
                                </button>
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-sm font-medium tracking-wide uppercase text-sm px-8 py-4 border border-slate-600 transition-all duration-150 inline-flex items-center gap-3"
                                >
                                    <Zap size={18} />
                                    Launch Terminal
                                </button>
                            </>
                        )}
                    </div>

                    {/* Status Bar */}
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-green-400 animate-pulse-glow' : 'bg-red-400'}`} />
                            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                                {loading ? 'Connecting...' : apiOnline ? 'API Online' : 'API Offline'}
                            </span>
                        </div>
                        <div className="hidden sm:block w-px h-4 bg-slate-700" />
                        <div className="flex items-center gap-2">
                            <Shield size={12} className="text-green-400" />
                            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                                SuperTokens Security
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 border-t border-slate-800 py-4 px-6 flex items-center justify-between">
                <p className="text-xs text-slate-600 font-mono">
                    BASED ON: Rezaei et al. (2020) — Expert Systems with Applications
                </p>
                <p className="text-xs text-slate-600 font-mono">
                    S&P500 • DOW JONES • DAX • NIKKEI 225
                </p>
            </div>
        </div>
    );
}
