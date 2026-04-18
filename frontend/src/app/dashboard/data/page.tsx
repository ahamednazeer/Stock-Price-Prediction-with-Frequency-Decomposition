'use client';

import React, { useEffect, useState } from 'react';
import { StockChart } from '@/components/StockChart';
import { LoadingSpinner, ErrorDisplay } from '@/components/StatusComponents';
import { api, StockInfo, StockData, StockDataPoint } from '@/lib/api';
import { Database, Download, RefreshCw, ArrowUpDown } from 'lucide-react';

const PERIOD_OPTIONS = [
    { value: '1mo', label: '1 Month' },
    { value: '3mo', label: '3 Months' },
    { value: '6mo', label: '6 Months' },
    { value: '1y', label: '1 Year' },
    { value: '2y', label: '2 Years' },
    { value: '5y', label: '5 Years' },
    { value: 'max', label: 'All Time' },
];

export default function DataExplorerPage() {
    const [stocks, setStocks] = useState<StockInfo[]>([]);
    const [selectedSymbol, setSelectedSymbol] = useState('^GSPC');
    const [period, setPeriod] = useState('1y');
    const [source, setSource] = useState<'live' | 'cache'>('live');
    const [stockData, setStockData] = useState<StockData | null>(null);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 25;

    useEffect(() => {
        api.getStocks().then(setStocks).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const loadData = async () => {
        setDataLoading(true);
        setError('');
        setPage(0);
        try {
            const data = await api.getStockData(selectedSymbol, period, source);
            setStockData(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load data');
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (selectedSymbol) loadData();
    }, [selectedSymbol, period, source]);

    if (loading) return <LoadingSpinner message="Loading..." />;

    const paginatedData = stockData?.data.slice().reverse().slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) || [];
    const totalPages = stockData ? Math.ceil(stockData.data.length / PAGE_SIZE) : 0;

    return (
        <div className="space-y-8 animate-slide-up">
            <div>
                <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                    <Database size={28} className="text-green-400" />
                    Data Explorer
                </h1>
                <p className="text-slate-500 mt-1">Browse and analyze stock price data — live or cached</p>
            </div>

            {/* Controls */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Symbol</label>
                        <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)} className="input-modern">
                            {stocks.map((s) => (
                                <option key={s.symbol} value={s.symbol}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Period</label>
                        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input-modern">
                            {PERIOD_OPTIONS.map((p) => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Source</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSource('live')}
                                className={`flex-1 py-2.5 px-3 rounded-sm font-mono text-xs font-bold uppercase tracking-wider transition-all ${source === 'live'
                                    ? 'bg-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                                    : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                Live
                            </button>
                            <button
                                onClick={() => setSource('cache')}
                                className={`flex-1 py-2.5 px-3 rounded-sm font-mono text-xs font-bold uppercase tracking-wider transition-all ${source === 'cache'
                                    ? 'bg-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                                    : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                Cache
                            </button>
                        </div>
                    </div>
                    <div className="flex items-end">
                        <button onClick={loadData} disabled={dataLoading} className="btn-success w-full flex items-center justify-center gap-2">
                            <RefreshCw size={14} className={dataLoading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {error && <ErrorDisplay message={error} onRetry={loadData} />}

            {stockData && (
                <div className="space-y-6 animate-scale-in">
                    {/* Chart */}
                    <StockChart
                        data={stockData.data.map((d) => ({ date: d.date, close: d.close }))}
                        color={stockData.color || '#22c55e'}
                        title={`${stockData.name} — ${source === 'live' ? 'Live Data' : 'Cached Data'}`}
                        height={350}
                    />

                    {/* Summary Bar */}
                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-4">
                        <div className="flex flex-wrap items-center gap-6 text-sm font-mono">
                            <span className="text-slate-500">RECORDS: <span className="text-slate-100 font-bold">{stockData.count?.toLocaleString()}</span></span>
                            {stockData.current_price && (
                                <>
                                    <span className="text-slate-700">|</span>
                                    <span className="text-slate-500">CURRENT: <span className="text-green-400 font-bold">${stockData.current_price?.toLocaleString()}</span></span>
                                    <span className="text-slate-700">|</span>
                                    <span className="text-slate-500">52W RANGE: <span className="text-red-400">${stockData.low_52w?.toLocaleString()}</span> — <span className="text-green-400">${stockData.high_52w?.toLocaleString()}</span></span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-900/50">
                                    <tr>
                                        {['Date', 'Open', 'High', 'Low', 'Close', 'Volume'].map((col) => (
                                            <th key={col} className="px-6 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">
                                                <div className="flex items-center gap-2">
                                                    {col}
                                                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {paginatedData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-3 text-sm font-mono text-slate-300">{row.date}</td>
                                            <td className="px-6 py-3 text-sm font-mono text-slate-400">{row.open ? `$${row.open.toLocaleString()}` : '—'}</td>
                                            <td className="px-6 py-3 text-sm font-mono text-green-400">{row.high ? `$${row.high.toLocaleString()}` : '—'}</td>
                                            <td className="px-6 py-3 text-sm font-mono text-red-400">{row.low ? `$${row.low.toLocaleString()}` : '—'}</td>
                                            <td className="px-6 py-3 text-sm font-mono text-slate-100 font-bold">${row.close?.toLocaleString()}</td>
                                            <td className="px-6 py-3 text-sm font-mono text-slate-400">{row.volume ? row.volume.toLocaleString() : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-6 py-3 bg-slate-900/30 border-t border-slate-700/50">
                            <span className="text-xs text-slate-500 font-mono">
                                Page {page + 1} of {totalPages} ({stockData.count} records)
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(Math.max(0, page - 1))}
                                    disabled={page === 0}
                                    className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                                    disabled={page >= totalPages - 1}
                                    className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
