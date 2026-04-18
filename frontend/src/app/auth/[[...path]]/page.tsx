'use client';

import { useEffect, useState } from 'react';
import { redirectToAuth } from 'supertokens-auth-react';
import SuperTokens from 'supertokens-auth-react/ui';
import { EmailPasswordPreBuiltUI } from 'supertokens-auth-react/recipe/emailpassword/prebuiltui';
import { Activity } from 'lucide-react';

export default function Auth() {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (
            SuperTokens.canHandleRoute([EmailPasswordPreBuiltUI]) === false
        ) {
            redirectToAuth({ redirectBack: false });
        } else {
            setLoaded(true);
        }
    }, []);

    if (loaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
                style={{ backgroundImage: 'linear-gradient(to bottom right, #0f172a, #1e293b)' }}
            >
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
                <div className="scanlines" />

                <div className="relative z-10 w-full max-w-md mx-4">
                    <div className="bg-slate-900/90 border border-slate-700 rounded-sm p-8 backdrop-blur-md shadow-2xl">
                        {/* Logo header matching frontend-ref vibe */}
                        <div className="flex flex-col items-center mb-8">
                            <Activity size={48} className="text-blue-400 mb-4 animate-pulse" />
                            <h1 className="text-3xl font-chivo font-bold uppercase tracking-wider text-center text-white">
                                StockFreq AI
                            </h1>
                            <p className="text-slate-400 font-mono text-xs mt-2 uppercase tracking-widest">
                                Secure Terminal Access
                            </p>
                        </div>

                        {/* SuperTokens pre-built UI renders here (transparent) */}
                        <div className="w-full">
                            {SuperTokens.getRoutingComponent([EmailPasswordPreBuiltUI])}
                        </div>

                        {/* Footer */}
                        <div className="mt-8 pt-4 border-t border-slate-800 text-center">
                            <p className="text-[10px] text-slate-500 font-mono tracking-widest">
                                POWERED BY SUPERTOKENS<br/>INDUSTRY-STANDARD SECURITY
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
        </div>
    );
}
