'use client';

import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'supertokens-auth-react/recipe/session';
import { useSessionContext } from 'supertokens-auth-react/recipe/session';
import {
    LayoutDashboard,
    TrendingUp,
    Waves,
    Brain,
    Database,
    LogOut,
    Menu,
    Activity,
    ChevronRight,
    Shield,
} from 'lucide-react';

interface MenuItem {
    icon: React.ElementType;
    label: string;
    path: string;
}

interface DashboardLayoutProps {
    children: ReactNode;
}

const MIN_WIDTH = 60;
const COLLAPSED_WIDTH = 64;
const DEFAULT_WIDTH = 240;
const MAX_WIDTH = 320;

const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Overview', path: '/dashboard' },
    { icon: TrendingUp, label: 'Predictions', path: '/dashboard/predictions' },
    { icon: Waves, label: 'Decomposition', path: '/dashboard/decomposition' },
    { icon: Brain, label: 'Models', path: '/dashboard/models' },
    { icon: Database, label: 'Data Explorer', path: '/dashboard/data' },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
    const [isResizing, setIsResizing] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const [currentTime, setCurrentTime] = useState('');
    const sidebarRef = useRef<HTMLDivElement>(null);
    const session = useSessionContext();

    const handleSignOut = async () => {
        await signOut();
        router.push('/auth');
    };

    const userEmail = !session.loading && session.doesSessionExist
        ? (session.accessTokenPayload?.email as string || 'user@stockfreq.ai')
        : '';
    const userInitials = userEmail ? userEmail.substring(0, 2).toUpperCase() : 'SF';

    // Live clock
    useEffect(() => {
        const tick = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            }));
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, []);

    // Load saved width
    useEffect(() => {
        const savedWidth = localStorage.getItem('sidebarWidth');
        const savedHidden = localStorage.getItem('sidebarHidden');
        if (savedWidth) setSidebarWidth(parseInt(savedWidth));
        if (savedHidden === 'true') setIsHidden(true);
    }, []);

    // Save width
    useEffect(() => {
        if (!isResizing) {
            localStorage.setItem('sidebarWidth', sidebarWidth.toString());
            localStorage.setItem('sidebarHidden', isHidden.toString());
        }
    }, [sidebarWidth, isHidden, isResizing]);

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing && sidebarRef.current) {
            const newWidth = e.clientX;
            if (newWidth < MIN_WIDTH) {
                setIsHidden(true);
                setSidebarWidth(COLLAPSED_WIDTH);
            } else {
                setIsHidden(false);
                const clampedWidth = Math.min(MAX_WIDTH, Math.max(COLLAPSED_WIDTH, newWidth));
                setSidebarWidth(clampedWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    const isCollapsed = sidebarWidth < 150;
    const showLabels = sidebarWidth >= 150 && !isHidden;

    return (
        <div className="min-h-screen bg-slate-950 flex">
            <div className="scanlines" />

            {/* Sidebar */}
            <aside
                ref={sidebarRef}
                className={`bg-slate-900 border-r border-slate-800 h-screen sticky top-0 flex flex-col z-50 transition-all ${isResizing ? 'transition-none' : 'duration-200'
                    } ${isHidden ? 'w-0 overflow-hidden border-0' : ''}`}
                style={{ width: isHidden ? 0 : sidebarWidth }}
            >
                {/* Header */}
                <div className={`p-4 border-b border-slate-800 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <div className="relative">
                        <Activity size={28} className="text-blue-400 flex-shrink-0" />
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full pulse-ring" />
                    </div>
                    {showLabels && (
                        <div className="overflow-hidden">
                            <h1 className="font-chivo font-bold text-sm uppercase tracking-wider whitespace-nowrap">
                                StockFreq AI
                            </h1>
                            <p className="text-xs text-slate-500 font-mono">LIVE TERMINAL</p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden">
                    <ul className="space-y-1">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.path;
                            return (
                                <li key={item.path}>
                                    <button
                                        onClick={() => router.push(item.path)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-150 text-sm font-medium ${isCollapsed ? 'justify-center' : ''
                                            } ${isActive
                                                ? 'text-blue-400 bg-blue-950/50 border-l-2 border-blue-400'
                                                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                                            }`}
                                        title={isCollapsed ? item.label : undefined}
                                    >
                                        <Icon size={20} className="flex-shrink-0" />
                                        {showLabels && <span className="truncate">{item.label}</span>}
                                        {showLabels && isActive && (
                                            <ChevronRight size={14} className="ml-auto text-blue-400/60" />
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Bottom */}
                <div className="p-2 border-t border-slate-800">
                    {showLabels && (
                        <div className="px-3 py-2 mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse-glow" />
                                <span className="text-xs text-slate-500 font-mono">MARKET DATA LIVE</span>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleSignOut}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-sm transition-all duration-150 text-sm font-medium ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? 'Sign Out' : undefined}
                    >
                        <LogOut size={20} className="flex-shrink-0" />
                        {showLabels && 'Sign Out'}
                    </button>
                </div>

                {/* Resize Handle */}
                <div
                    className="absolute right-0 top-0 h-full w-1 cursor-ew-resize hover:bg-blue-500/50 active:bg-blue-500 transition-colors z-50"
                    onMouseDown={startResizing}
                    style={{ transform: 'translateX(50%)' }}
                />
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative z-10">
                {/* Header */}
                <div className="backdrop-blur-md bg-slate-950/80 border-b border-slate-700 sticky top-0 z-40">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-4">
                            {isHidden && (
                                <button
                                    onClick={() => { setIsHidden(false); setSidebarWidth(DEFAULT_WIDTH); }}
                                    className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                                    title="Show Sidebar"
                                >
                                    <Menu size={24} />
                                </button>
                            )}
                            <div>
                                <h2 className="font-chivo font-bold text-xl uppercase tracking-wider">
                                    Stock Price Prediction
                                </h2>
                                <p className="text-xs text-slate-400 font-mono mt-1">
                                    Deep Learning × Frequency Decomposition
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="hidden sm:flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">SYSTEM TIME</p>
                                    <p className="text-sm font-mono text-green-400">{currentTime}</p>
                                </div>
                                <div className="h-8 w-px bg-slate-700" />
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">DATA SOURCE</p>
                                    <p className="text-sm font-mono text-blue-400">YAHOO FINANCE</p>
                                </div>
                            </div>
                            <div className="h-8 w-px bg-slate-700" />
                            <div className="flex items-center gap-2">
                                <Shield size={14} className="text-green-400" />
                                <span className="text-xs text-slate-500 font-mono uppercase tracking-wider hidden md:inline">AUTHENTICATED</span>
                            </div>
                            <div className="h-9 w-9 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 text-white font-bold text-sm shadow-lg" title={userEmail}>
                                {userInitials}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <div className="p-6">
                    {children}
                </div>
            </main>

            {/* Overlay when resizing */}
            {isResizing && (
                <div className="fixed inset-0 z-[100] cursor-ew-resize" />
            )}
        </div>
    );
}
