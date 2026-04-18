'use client';

import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
    Legend,
} from 'recharts';

interface StockChartProps {
    data: { date: string; close: number; predicted?: number; actual?: number; baseline?: number; lower?: number; upper?: number }[];
    color?: string;
    title?: string;
    showPrediction?: boolean;
    height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/95 border border-slate-700 rounded-sm p-3 shadow-xl backdrop-blur-sm">
                <p className="text-xs font-mono text-slate-400 mb-1">{label}</p>
                {payload.map((entry: any, idx: number) => (
                    <p key={idx} className="text-sm font-mono font-bold" style={{ color: entry.color }}>
                        {entry.name}: ${entry.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export function StockChart({ data, color = '#3b82f6', title, showPrediction = false, height = 350 }: StockChartProps) {
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length >= 2) return `${parts[1]}/${parts[0]?.slice(2)}`;
        return dateStr;
    };

    if (showPrediction) {
        return (
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-4">
                {title && (
                    <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        {title}
                    </h3>
                )}
                <ResponsiveContainer width="100%" height={height}>
                    <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.5} />
                        <XAxis
                            dataKey="date"
                            tickFormatter={formatDate}
                            stroke="#64748b"
                            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            stroke="#64748b"
                            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                            tickFormatter={(v) => `$${v.toLocaleString()}`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                        />
                        {data.some((point) => point.lower !== undefined && point.upper !== undefined) && (
                            <>
                                <Line
                                    type="monotone"
                                    dataKey="upper"
                                    stroke="#60a5fa"
                                    strokeWidth={1}
                                    dot={false}
                                    strokeDasharray="3 5"
                                    name="Upper Range"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="lower"
                                    stroke="#60a5fa"
                                    strokeWidth={1}
                                    dot={false}
                                    strokeDasharray="3 5"
                                    name="Lower Range"
                                />
                            </>
                        )}
                        <Line
                            type="monotone"
                            dataKey="actual"
                            stroke="#22c55e"
                            strokeWidth={2}
                            dot={false}
                            name="Actual"
                        />
                        <Line
                            type="monotone"
                            dataKey="predicted"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dot={false}
                            strokeDasharray="5 5"
                            name="Predicted"
                        />
                        <Line
                            type="monotone"
                            dataKey="baseline"
                            stroke="#94a3b8"
                            strokeWidth={1.5}
                            dot={false}
                            strokeDasharray="2 4"
                            name="Naive Baseline"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-4">
            {title && (
                <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    {title}
                </h3>
            )}
            <ResponsiveContainer width="100%" height={height}>
                <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.5} />
                    <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        stroke="#64748b"
                        tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        stroke="#64748b"
                        tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                        tickFormatter={(v) => `$${v.toLocaleString()}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="close"
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#gradient-${color.replace('#', '')})`}
                        name="Close"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
