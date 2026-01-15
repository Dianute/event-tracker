'use client';

import { useState } from 'react';
import VerifyAdminAuth from '@/components/VerifyAdminAuth';
import ScoutManager from '@/components/admin/ScoutManager';
import EventManager from '@/components/admin/EventManager';
import Link from 'next/link';
import { LayoutDashboard, Calendar, LogOut, Shield, Activity, Link as LinkIcon } from 'lucide-react';

import DashboardPage from '../dashboard/page';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'scout' | 'events' | 'dashboard'>('scout');

    return (
        <VerifyAdminAuth>
            <div className="flex min-h-screen bg-[#050510] text-gray-100 font-sans selection:bg-cyan-500/30">
                {/* Sidebar */}
                <aside className="w-20 lg:w-64 bg-black/40 border-r border-white/5 flex flex-col fixed h-full z-50 backdrop-blur-xl transition-all duration-300">
                    <div className="p-6 flex items-center gap-3 border-b border-white/5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
                            <Shield size={18} className="text-white" />
                        </div>
                        <span className="font-black text-xl tracking-tight hidden lg:block bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Nexus<span className="text-cyan-500">Admin</span>
                        </span>
                    </div>

                    <nav className="flex-1 p-4 space-y-2">
                        <button
                            onClick={() => setActiveTab('scout')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === 'scout' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <LayoutDashboard size={20} className={`transition-transform duration-300 ${activeTab === 'scout' ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span className="font-bold text-sm hidden lg:block">Scout Control</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('events')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === 'events' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <Calendar size={20} className={`transition-transform duration-300 ${activeTab === 'events' ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span className="font-bold text-sm hidden lg:block">Event Manager</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === 'dashboard' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <Activity size={20} className={`transition-transform duration-300 ${activeTab === 'dashboard' ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span className="font-bold text-sm hidden lg:block">User Dashboard</span>
                        </button>

                        <Link
                            href="/test-links"
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-gray-500 hover:text-white hover:bg-white/5"
                        >
                            <LinkIcon size={20} className="group-hover:scale-110 transition-transform duration-300" />
                            <span className="font-bold text-sm hidden lg:block">Link Checker</span>
                        </Link>
                    </nav>

                    <div className="p-4 border-t border-white/5">
                        <button
                            onClick={() => {
                                localStorage.removeItem('admin_secret');
                                window.location.reload();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors group"
                        >
                            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="font-bold text-sm hidden lg:block">Logout</span>
                        </button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 ml-20 lg:ml-64 p-8 lg:p-12 max-w-[1920px] mx-auto w-full">
                    <div className="max-w-7xl mx-auto">
                        {activeTab === 'scout' && <ScoutManager />}
                        {activeTab === 'events' && <EventManager />}
                        <div className={`bg-black/20 rounded-3xl border border-white/5 overflow-hidden min-h-[800px] ${activeTab === 'dashboard' ? '' : 'hidden'}`}>
                            {/* Pass minimal props if needed, but Page usually handles itself. 
                                We might need to strip the dashboard's own padding or layout if it clashes, 
                                but let's try direct embed first. */}
                            <DashboardPage />
                        </div>
                    </div>
                </main>
            </div>
        </VerifyAdminAuth>
    );
}
