import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DataCardProps {
    title: string;
    value: string | number;
    icon?: LucideIcon;
    trend?: 'up' | 'down' | 'neutral';
    subtitle?: string;
    className?: string;
}

export function DataCard({
    title,
    value,
    icon: Icon,
    trend,
    subtitle,
    className = '',
}: DataCardProps) {
    const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400';

    return (
        <div className={`bg-slate-800/40 border border-slate-700/60 rounded-sm p-6 transition-all duration-200 hover:border-slate-500 ${className}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-slate-500 text-xs uppercase tracking-wider font-mono mb-2">{title}</p>
                    <p className={`text-3xl font-bold font-mono text-slate-100 ${trend ? trendColor : ''}`}>
                        {value}
                    </p>
                    {subtitle && (
                        <p className={`text-xs font-mono mt-1 ${trendColor}`}>{subtitle}</p>
                    )}
                </div>
                {Icon && (
                    <div className="text-blue-400">
                        <Icon size={28} />
                    </div>
                )}
            </div>
        </div>
    );
}
