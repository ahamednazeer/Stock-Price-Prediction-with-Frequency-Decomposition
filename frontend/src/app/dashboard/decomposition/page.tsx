'use client';

import React, { useEffect, useState } from 'react';
import { LoadingSpinner, ErrorDisplay } from '@/components/StatusComponents';
import { api, StockInfo, DecompositionResult } from '@/lib/api';
import { Waves, Play, Layers } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

const IMF_COLORS = [
    '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
    '#a855f7', '#ec4899', '#14b8a6', '#f97316',
    '#6366f1', '#84cc16',
];

export default function DecompositionPage() {
    const [stocks, setStocks] = useState<StockInfo[]>([]);
    const [selectedSymbol, setSelectedSymbol] = useState('^GSPC');
    const [method, setMethod] = useState<'emd' | 'ceemd'>('emd');
    const [result, setResult] = useState<DecompositionResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [decomposing, setDecomposing] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        api.getStocks().then(setStocks).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const runDecomposition = async () => {
        setDecomposing(true);
        setError('');
        setResult(null);
        try {
            const res = await api.decompose(selectedSymbol, method, '5y');
            setResult(res);
        } catch (err: any) {
            setError(err.message || 'Decomposition failed');
        } finally {
            setDecomposing(false);
        }
    };

    if (loading) return <LoadingSpinner message="Loading..." />;

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length >= 2) return `${parts[1]}/${parts[0]?.slice(2)}`;
        return dateStr;
    };

    return (
        <div className="space-y-8 animate-slide-up">
            <div>
                <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                    <Waves size={28} className="text-purple-400" />
                    Frequency Decomposition
                </h1>
                <p className="text-slate-500 mt-1">
                    Decompose stock price signals into Intrinsic Mode Functions (IMFs)
                </p>
            </div>

            {/* Controls */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-6">
                <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Layers size={16} />
                    Decomposition Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                            Stock Symbol
                        </label>
                        <select
                            value={selectedSymbol}
                            onChange={(e) => setSelectedSymbol(e.target.value)}
                            className="input-modern"
                        >
                            {stocks.map((s) => (
                                <option key={s.symbol} value={s.symbol}>
                                    {s.name} ({s.symbol})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                            Method
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setMethod('emd')}
                                className={`flex-1 py-2.5 px-4 rounded-sm font-mono text-sm font-bold uppercase tracking-wider transition-all ${method === 'emd'
                                    ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                                    : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                EMD
                            </button>
                            <button
                                onClick={() => setMethod('ceemd')}
                                className={`flex-1 py-2.5 px-4 rounded-sm font-mono text-sm font-bold uppercase tracking-wider transition-all ${method === 'ceemd'
                                    ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                                    : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                CEEMD
                            </button>
                        </div>
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={runDecomposition}
                            disabled={decomposing}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                            style={{ boxShadow: '0 0 10px rgba(168,85,247,0.5)', backgroundColor: '#7c3aed' }}
                        >
                            {decomposing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Decomposing...
                                </>
                            ) : (
                                <>
                                    <Play size={16} />
                                    Decompose
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {error && <ErrorDisplay message={error} onRetry={runDecomposition} />}

            {/* Results */}
            {result && (
                <div className="space-y-4 animate-scale-in">
                    {/* Summary */}
                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-4">
                        <div className="flex items-center gap-6 text-sm font-mono">
                            <span className="text-slate-500">METHOD: <span className="text-purple-400 font-bold">{result.method}</span></span>
                            <span className="text-slate-700">|</span>
                            <span className="text-slate-500">IMFs: <span className="text-slate-100 font-bold">{result.num_imfs}</span></span>
                            <span className="text-slate-700">|</span>
                            <span className="text-slate-500">DATA POINTS: <span className="text-slate-100 font-bold">{result.data_points?.toLocaleString()}</span></span>
                        </div>
                    </div>

                    {/* IMF Charts */}
                    {result.imfs.map((imf, idx) => (
                        <div key={idx} className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-4">
                            <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: IMF_COLORS[idx % IMF_COLORS.length] }} />
                                {imf.name}
                            </h3>
                            <ResponsiveContainer width="100%" height={150}>
                                <LineChart data={imf.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.3} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={formatDate}
                                        stroke="#64748b"
                                        tick={{ fontSize: 9, fontFamily: 'JetBrains Mono' }}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        stroke="#64748b"
                                        tick={{ fontSize: 9, fontFamily: 'JetBrains Mono' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#0f172a',
                                            border: '1px solid #334155',
                                            borderRadius: '2px',
                                            fontFamily: 'JetBrains Mono',
                                            fontSize: 11,
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke={IMF_COLORS[idx % IMF_COLORS.length]}
                                        strokeWidth={1.5}
                                        dot={false}
                                        name={imf.name}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
