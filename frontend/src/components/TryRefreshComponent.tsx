"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Session from "supertokens-auth-react/recipe/session";
import SuperTokens from "supertokens-auth-react";

export const TryRefreshComponent = () => {
    const router = useRouter();
    const [didError, setDidError] = useState(false);

    useEffect(() => {
        void Session.attemptRefreshingSession()
            .then((hasSession) => {
                if (hasSession) {
                    router.refresh();
                } else {
                    SuperTokens.redirectToAuth();
                }
            })
            .catch(() => {
                setDidError(true);
            });
    }, [router]);

    if (didError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="bg-red-950/30 border border-red-800/50 rounded-sm p-8 text-center">
                    <p className="text-red-400 font-mono text-sm mb-4">
                        SESSION ERROR — AUTHENTICATION REQUIRED
                    </p>
                    <button
                        onClick={() => window.location.href = '/auth'}
                        className="bg-red-600 hover:bg-red-500 text-white rounded-sm font-medium tracking-wide uppercase text-sm px-6 py-2.5"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
            <div className="w-10 h-10 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">
                Refreshing session...
            </p>
        </div>
    );
};
