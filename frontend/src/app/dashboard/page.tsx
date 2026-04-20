'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DataCard } from '@/components/DataCard';
import { StockChart } from '@/components/StockChart';
import { LoadingSpinner, ErrorDisplay } from '@/components/StatusComponents';
import { api, StockInfo, StockSummary, StockData } from '@/lib/api';
import {
    LayoutDashboard,
    TrendingUp,
    TrendingDown,
    Brain,
    Database,
    ArrowUpRight,
    BarChart3,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    Search,
} from 'lucide-react';

const CARDS_PER_SLIDE = 4;

export default function DashboardOverview() {
    const [stocks, setStocks] = useState<StockInfo[]>([]);
    const [summaries, setSummaries] = useState<Record<string, StockSummary>>({});
    const [selectedStock, setSelectedStock] = useState<string>('^GSPC');
    const [stockData, setStockData] = useState<StockData | null>(null);
    const [models, setModels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(false);
    const [error, setError] = useState('');

    // Pagination / slider state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalStocks, setTotalStocks] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | ''>('');

    // Fetch a page of stocks
    const fetchPage = useCallback(async (page: number, search?: string) => {
        setSummaryLoading(true);
        setSlideDirection('');
        try {
            const res = await api.getStocks(page, CARDS_PER_SLIDE, search || undefined);
            setStocks(res.items);
            setTotalPages(res.pages);
            setTotalStocks(res.total);
            setCurrentPage(res.page);

            // Fetch summaries for just these visible stocks
            const sumsMap: Record<string, StockSummary> = { ...summaries };
            const toFetch = res.items.filter((s) => !sumsMap[s.symbol]);
            if (toFetch.length > 0) {
                const fetched = await Promise.all(
                    toFetch.map((s) =>
                        api.getStockSummary(s.symbol).catch(() => ({
                            symbol: s.symbol,
                            name: s.name,
                            color: s.color,
                            current_price: 0,
                            change: 0,
                            change_pct: 0,
                        }))
                    )
                );
                fetched.forEach((sum) => {
                    sumsMap[sum.symbol] = sum;
                });
                setSummaries(sumsMap);
            }
        } catch (err: any) {
            console.error('Failed to fetch stocks page:', err);
        } finally {
            setSummaryLoading(false);
        }
    }, [summaries]);

    // Initial load
    useEffect(() => {
        async function fetchData() {
            try {
                const modelList = await api.getModels();
                setModels(modelList);
                await fetchPage(1);
            } catch (err: any) {
                setError(err.message || 'Failed to connect to API');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load chart data when selected stock changes
    useEffect(() => {
        async function loadChart() {
            setChartLoading(true);
            try {
                const data = await api.getStockData(selectedStock, '1y', 'live');
                setStockData(data);
            } catch (err: any) {
                console.error('Chart load error:', err);
            } finally {
                setChartLoading(false);
            }
        }
        if (selectedStock) loadChart();
    }, [selectedStock]);

    const goToPage = (page: number, direction: 'left' | 'right') => {
        if (page < 1 || page > totalPages || summaryLoading) return;
        setSlideDirection(direction);
        fetchPage(page, searchQuery);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchQuery(searchInput);
        setCurrentPage(1);
        fetchPage(1, searchInput);
    };

    if (loading) return <LoadingSpinner message="Initializing Dashboard..." />;
    if (error) return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;

    const totalModels = models.reduce((sum, m) => sum + m.num_files, 0);
    const totalSizeMB = models.reduce((sum, m) => sum + m.total_size_mb, 0);

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                    <LayoutDashboard size={28} className="text-blue-400" />
                    Market Overview
                </h1>
                <p className="text-slate-500 mt-1">Live market data and system status</p>
            </div>

            {/* Search + Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Search */}
                <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search stocks..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="input-modern pl-9 w-full sm:w-64"
                        />
                    </div>
                    <button type="submit" className="btn-primary whitespace-nowrap">
                        Search
                    </button>
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchInput('');
                                setSearchQuery('');
                                fetchPage(1);
                            }}
                            className="btn-secondary whitespace-nowrap"
                        >
                            Clear
                        </button>
                    )}
                </form>

                {/* Slider navigation */}
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                        {totalStocks} stocks
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => goToPage(currentPage - 1, 'right')}
                            disabled={currentPage <= 1 || summaryLoading}
                            className="p-2 rounded-sm border border-slate-700 bg-slate-800/60 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            aria-label="Previous page"
                        >
                            <ChevronLeft size={18} className="text-slate-300" />
                        </button>

                        {/* Page dots */}
                        <div className="flex items-center gap-1 px-2">
                            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 7) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 4) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 3) {
                                    pageNum = totalPages - 6 + i;
                                } else {
                                    pageNum = currentPage - 3 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => goToPage(pageNum, pageNum > currentPage ? 'left' : 'right')}
                                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                                            pageNum === currentPage
                                                ? 'bg-blue-400 scale-125 shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                                                : 'bg-slate-600 hover:bg-slate-400'
                                        }`}
                                        aria-label={`Page ${pageNum}`}
                                    />
                                );
                            })}
                        </div>

                        <button
                            onClick={() => goToPage(currentPage + 1, 'left')}
                            disabled={currentPage >= totalPages || summaryLoading}
                            className="p-2 rounded-sm border border-slate-700 bg-slate-800/60 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            aria-label="Next page"
                        >
                            <ChevronRight size={18} className="text-slate-300" />
                        </button>
                    </div>
                    <span className="text-xs font-mono text-slate-500">
                        {currentPage}/{totalPages}
                    </span>
                </div>
            </div>

            {/* Stock Ticker Cards — Slider */}
            <div className="relative overflow-hidden">
                {summaryLoading && (
                    <div className="absolute inset-0 z-20 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center rounded-sm">
                        <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
                <div
                    className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-400 ${
                        slideDirection === 'left'
                            ? 'animate-slide-in-left'
                            : slideDirection === 'right'
                            ? 'animate-slide-in-right'
                            : ''
                    }`}
                    key={`page-${currentPage}-${searchQuery}`}
                >
                    {stocks.map((stock) => {
                        const s = summaries[stock.symbol] || {
                            symbol: stock.symbol,
                            name: stock.name,
                            color: stock.color,
                            current_price: 0,
                            change: 0,
                            change_pct: 0,
                        };
                        return (
                            <button
                                key={s.symbol}
                                onClick={() => setSelectedStock(s.symbol)}
                                className={`bg-slate-800/40 border rounded-sm p-5 transition-all duration-200 text-left hover:scale-[1.02] ${selectedStock === s.symbol
                                    ? 'border-blue-500/60 bg-blue-950/20'
                                    : 'border-slate-700/60 hover:border-slate-500'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <p className="text-slate-500 text-xs uppercase tracking-wider font-mono truncate max-w-[140px]">{s.name}</p>
                                        <p className="text-xs text-slate-600 font-mono">{s.symbol}</p>
                                    </div>
                                    <div className={`p-1.5 rounded ${s.change_pct >= 0 ? 'bg-green-950/50' : 'bg-red-950/50'}`}>
                                        {s.change_pct >= 0
                                            ? <TrendingUp size={16} className="text-green-400" />
                                            : <TrendingDown size={16} className="text-red-400" />
                                        }
                                    </div>
                                </div>
                                <p className="text-2xl font-bold font-mono text-slate-100">
                                    ${s.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs font-mono font-bold ${s.change_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {s.change >= 0 ? '+' : ''}{s.change?.toFixed(2)}
                                    </span>
                                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${s.change_pct >= 0
                                        ? 'text-green-400 bg-green-950/50'
                                        : 'text-red-400 bg-red-950/50'
                                        }`}>
                                        {s.change_pct >= 0 ? '+' : ''}{s.change_pct?.toFixed(2)}%
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* System Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <DataCard
                    title="Pre-trained Models"
                    value={totalModels}
                    icon={Brain}
                    subtitle={`${models.length} architectures`}
                />
                <DataCard
                    title="Model Storage"
                    value={`${totalSizeMB.toFixed(0)} MB`}
                    icon={Database}
                />
                <DataCard
                    title="Tracked Stocks"
                    value={totalStocks}
                    icon={BarChart3}
                    subtitle={`Page ${currentPage} of ${totalPages}`}
                />
                <DataCard
                    title="Decomposition"
                    value="EMD + CEEMD"
                    icon={Sparkles}
                    subtitle="Frequency analysis"
                />
            </div>

            {/* Main Chart & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart */}
                <div className="lg:col-span-2">
                    {chartLoading ? (
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-4">
                            <LoadingSpinner message={`Loading ${selectedStock} data...`} />
                        </div>
                    ) : stockData ? (
                        <StockChart
                            data={stockData.data.map((d) => ({ date: d.date, close: d.close }))}
                            color={stockData.color}
                            title={`${stockData.name} — 1 Year`}
                            height={380}
                        />
                    ) : null}
                </div>

                {/* Quick Actions + Stats */}
                <div className="space-y-6">
                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-6 relative overflow-hidden">
                        <Sparkles size={80} className="absolute -right-4 -top-4 text-slate-700/20" />
                        <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                            <ArrowUpRight size={16} />
                            Quick Actions
                        </h3>
                        <div className="grid grid-cols-1 gap-3 relative z-10">
                            <button
                                onClick={() => window.location.href = '/dashboard/predictions'}
                                className="bg-gradient-to-br from-blue-900/40 to-blue-950/60 border border-blue-700/30 hover:border-blue-600/50 rounded-sm px-4 py-3 text-blue-300 font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02] text-left"
                            >
                                ▶ Run Predictions
                            </button>
                            <button
                                onClick={() => window.location.href = '/dashboard/decomposition'}
                                className="bg-gradient-to-br from-purple-900/40 to-purple-950/60 border border-purple-700/30 hover:border-purple-600/50 rounded-sm px-4 py-3 text-purple-300 font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02] text-left"
                            >
                                ▶ Decompose Signal
                            </button>
                            <button
                                onClick={() => window.location.href = '/dashboard/data'}
                                className="bg-gradient-to-br from-green-900/40 to-green-950/60 border border-green-700/30 hover:border-green-600/50 rounded-sm px-4 py-3 text-green-300 font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02] text-left"
                            >
                                ▶ Explore Data
                            </button>
                        </div>
                    </div>

                    {/* Stock Stats */}
                    {stockData && (
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-6">
                            <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-4">
                                Statistics — {stockData.name}
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { label: '52W HIGH', value: `$${stockData.high_52w?.toLocaleString()}`, color: 'text-green-400' },
                                    { label: '52W LOW', value: `$${stockData.low_52w?.toLocaleString()}`, color: 'text-red-400' },
                                    { label: 'MEAN', value: `$${stockData.stats?.mean?.toLocaleString()}`, color: 'text-slate-100' },
                                    { label: 'STD DEV', value: `$${stockData.stats?.std?.toLocaleString()}`, color: 'text-yellow-400' },
                                ].map((stat) => (
                                    <div key={stat.label} className="flex items-center justify-between bg-slate-900/50 border border-slate-800/50 rounded-sm px-4 py-3 hover:bg-slate-800/50 transition-colors">
                                        <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">{stat.label}</span>
                                        <span className={`font-bold font-mono text-sm ${stat.color}`}>{stat.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
