'use client';

import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Map as MapIcon, Calendar, User, LayoutDashboard, Settings } from "lucide-react";

export default function UserDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [status, router]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-[#050510] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050510] text-white font-sans p-6 pb-24">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-gray-800 pb-8 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-500 shadow-lg shadow-blue-500/20">
                            {session?.user?.image ? (
                                <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-blue-600 flex items-center justify-center text-xl font-bold">
                                    {session?.user?.name?.[0] || 'U'}
                                </div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
                                Welcome, {session?.user?.name?.split(' ')[0]}!
                            </h1>
                            <p className="text-gray-400 text-sm">Business Dashboard</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <a href="/" className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold text-sm transition-all flex items-center gap-2 border border-gray-700">
                            <MapIcon size={16} /> Open Map
                        </a>
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold text-sm transition-all flex items-center gap-2 border border-red-500/20"
                        >
                            <LogOut size={16} /> Sign Out
                        </button>
                    </div>
                </header>

                {/* Stats Grid (Placeholder) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl hover:border-blue-500/30 transition-all group">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                            <Calendar size={20} />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-1">0</h3>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Active Events</p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl hover:border-purple-500/30 transition-all group">
                        <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                            <User size={20} />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-1">0</h3>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Total Views</p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl hover:border-green-500/30 transition-all group">
                        <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400 mb-4 group-hover:scale-110 transition-transform">
                            <LayoutDashboard size={20} />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-1">Free</h3>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Current Plan</p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="bg-gray-900/30 border border-gray-800 rounded-3xl p-10 text-center">
                    <div className="inline-flex w-16 h-16 rounded-full bg-gray-800 items-center justify-center mb-4">
                        <Settings size={28} className="text-gray-600 animate-spin-slow" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Business Tools Coming Soon</h2>
                    <p className="text-gray-400 max-w-md mx-auto mb-6">
                        We are building powerful tools for you to manage your events, track analytics, and customize your profile directly from here.
                    </p>
                    <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]">
                        Join Waitlist
                    </button>
                </div>
            </div>
        </div>
    );
}
