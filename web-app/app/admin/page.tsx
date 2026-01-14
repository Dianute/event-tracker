'use client';

import { useState } from 'react';
import VerifyAdminAuth from '@/components/VerifyAdminAuth';
import ScoutManager from '@/components/admin/ScoutManager';
import EventManager from '@/components/admin/EventManager';
import UserManager from '@/components/admin/UserManager';
import ModerationManager from '@/components/admin/ModerationManager';
import Link from 'next/link';
import { LayoutDashboard, Calendar, LogOut, Shield, Activity, Users, CheckSquare } from 'lucide-react';

import DashboardPage from '../dashboard/page';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'scout' | 'events' | 'dashboard' | 'users' | 'moderation'>('scout');

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

                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto hide-scrollbar">
                        <div className="px-4 py-2 text-xs font-bold text-gray-600 uppercase tracking-widest hidden lg:block">System</div>
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

                        <div className="mt-6 px-4 py-2 text-xs font-bold text-gray-600 uppercase tracking-widest hidden lg:block">Moderation</div>

                        <button
                            onClick={() => setActiveTab('moderation')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === 'moderation' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <CheckSquare size={20} className={`transition-transform duration-300 ${activeTab === 'moderation' ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span className="font-bold text-sm hidden lg:block">Approval Queue</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('users')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === 'users' ? 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <Users size={20} className={`transition-transform duration-300 ${activeTab === 'users' ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span className="font-bold text-sm hidden lg:block">User Access</span>
                        </button>

                        <div className="mt-6 px-4 py-2 text-xs font-bold text-gray-600 uppercase tracking-widest hidden lg:block">Analytics</div>

                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === 'dashboard' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <Activity size={20} className={`transition-transform duration-300 ${activeTab === 'dashboard' ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span className="font-bold text-sm hidden lg:block">Live Dashboard</span>
                        </button>
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
                        {activeTab === 'users' && <UserManager />}
                        {activeTab === 'moderation' && <ModerationManager />}
                        {activeTab === 'dashboard' && (
                            <div className="bg-black/20 rounded-3xl border border-white/5 overflow-hidden min-h-[800px]">
                                <DashboardPage />
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </VerifyAdminAuth>
    );
}
