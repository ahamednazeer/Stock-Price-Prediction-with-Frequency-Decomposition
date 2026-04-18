'use client';

import React from 'react';
import { Activity } from 'lucide-react';

export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
                <Activity size={24} className="absolute inset-0 m-auto text-blue-400 animate-pulse" />
            </div>
            <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                {message}
            </p>
        </div>
    );
}

export function ErrorDisplay({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div className="bg-red-950/30 border border-red-800/50 rounded-sm p-6 text-center">
            <p className="text-red-400 font-mono text-sm mb-3">{message}</p>
            {onRetry && (
                <button onClick={onRetry} className="btn-danger text-xs">
                    RETRY
                </button>
            )}
        </div>
    );
}
