'use client';

import { useState, useEffect } from 'react';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { useSession } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function VerifyAdminAuth({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // --- HYBRID AUTH ---
    const { data: session, status } = useSession();

    useEffect(() => {
        const checkAuth = async () => {
            // Check Master Password first (Local)
            const stored = localStorage.getItem('admin_secret');
            if (stored) {
                try {
                    const res = await fetch(`${API_URL}/api/auth/verify`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password: stored })
                    });
                    if (res.ok) {
                        setIsAuthenticated(true);
                    } else {
                        localStorage.removeItem('admin_secret');
                    }
                } catch (e) {
                    console.error("Auth check failed", e);
                }
            }
            setIsLoading(false);
        };
        checkAuth();
    }, []);

    // Also authorize if NextAuth session exists
    useEffect(() => {
        if (status === 'authenticated') {
            setIsAuthenticated(true);
        }
    }, [status]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                localStorage.setItem('admin_secret', password);
                setIsAuthenticated(true);
            } else {
                setError('Incorrect password');
            }
        } catch (e) {
            setError('Connection error');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading || status === 'loading') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#050510] flex items-center justify-center p-6 text-white font-sans">
                <div className="w-full max-w-md">
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-blue-600/20 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(37,99,235,0.2)] border border-blue-500/30">
                            <Lock size={32} className="text-blue-500" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight mb-2">Admin Access</h1>
                        <p className="text-gray-400">Enter Master Password OR Log In</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="relative group">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Master Password"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-lg focus:outline-none focus:border-blue-500/50 focus:bg-blue-500/10 transition-all placeholder:text-gray-600 font-medium"
                                autoFocus
                            />
                            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5 pointer-events-none group-hover:ring-white/10 transition-all" />
                        </div>

                        {error && (
                            <div className="text-red-400 text-sm font-bold text-center bg-red-500/10 py-2 rounded-xl border border-red-500/20">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!password}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <span>Unlock Dashboard</span>
                            <ArrowRight size={18} />
                        </button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#050510] px-2 text-gray-500">Business Owner?</span>
                        </div>
                    </div>

                    <a
                        href="/auth/signin"
                        className="w-full bg-white text-black hover:bg-gray-200 font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        Sign In with Account
                    </a>
                </div>
            </div>
        );
    }

    // Authenticated: Render the actual admin page
    return <>{children}</>;
}
