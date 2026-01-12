'use client';

import { useState } from 'react';
import { User, Moon, Sun, Globe, X, LayoutDashboard, LogOut } from 'lucide-react';

export default function DesignLab() {
    return (
        <div className="min-h-screen bg-[#050505] text-white p-8 overflow-y-auto">
            <h1 className="text-4xl font-bold mb-2 tracking-tight">Design Laboratory</h1>
            <p className="text-gray-400 mb-12">Comparing 3 distinct aesthetic directions for the "Sign In" experience.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* VARIANT 1: CURRENT GLASSMORPHISM */}
                <VariantColumn
                    title="Variant A: Premium Glass"
                    description="Soft blurs, gentle borders. Current direction."
                >
                    <div className="relative h-96 w-full bg-[url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center rounded-xl overflow-hidden border border-white/10">
                        <div className="absolute top-4 right-4">
                            <GlassDropdown />
                        </div>
                        {/* Center Modal Preview */}
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                            <GlassModal />
                        </div>
                    </div>
                </VariantColumn>

                {/* VARIANT 2: DEEP MINIMAL (VOID) */}
                <VariantColumn
                    title="Variant B: The Void"
                    description="No borders. Deepest black. High contrast. Sharp shadows."
                >
                    <div className="relative h-96 w-full bg-[#111] rounded-xl overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/80 pointer-events-none" />
                        <div className="absolute top-4 right-4">
                            <VoidDropdown />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                            <VoidModal />
                        </div>
                    </div>
                </VariantColumn>


                {/* VARIANT 3: HYPER CLEAN (iOS style) */}
                <VariantColumn
                    title="Variant C: Hyper Clean"
                    description="White/Light gray accents. Heavy blur. Very Apple."
                >
                    <div className="relative h-96 w-full bg-[url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center rounded-xl overflow-hidden">
                        <div className="absolute top-4 right-4">
                            <CleanDropdown />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                            <CleanModal />
                        </div>
                    </div>
                </VariantColumn>

            </div>
        </div>
    );
}

function VariantColumn({ title, description, children }: { title: string, description: string, children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
                <p className="text-sm text-gray-400">{description}</p>
            </div>
            {children}
        </div>
    )
}

// --- VARIANT A: GLASS (Current) ---
function GlassDropdown() {
    return (
        <div className="w-64 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
            <div className="px-3 py-2 flex items-center gap-3 bg-blue-600/20 rounded-xl mb-2 border border-blue-500/20 text-blue-100">
                <User size={16} /> <span className="text-sm font-bold">Sign In / Join</span>
            </div>
            <div className="border-t border-white/10 my-1 mx-2"></div>
            <div className="px-3 py-2 flex items-center gap-3 text-gray-300 hover:bg-white/5 rounded-lg">
                <Moon size={16} /> <span className="text-sm">Dark Mode</span>
            </div>
        </div>
    )
}

function GlassModal() {
    return (
        <div className="w-full max-w-xs bg-[#0a0a0a]/90 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                <Globe size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Welcome Back</h3>
            <p className="text-xs text-gray-400 mb-6">Sign in to sync your world.</p>
            <button className="w-full bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
                <span>G</span> Continue with Google
            </button>
        </div>
    )
}

// --- VARIANT B: VOID (Sharp, No Borders) ---
function VoidDropdown() {
    return (
        <div className="w-64 bg-black rounded-lg p-3 shadow-[0_10px_40px_-10px_rgba(0,0,0,1)]">
            <div className="px-3 py-3 flex items-center gap-3 bg-white text-black rounded-md mb-2 font-black">
                <User size={16} /> <span className="text-sm">SIGN IN</span>
            </div>
            <div className="h-px bg-gray-900 my-2"></div>
            <div className="px-3 py-2 flex justify-between items-center text-gray-500 hover:text-white transition-colors">
                <span className="text-xs font-bold tracking-widest uppercase">Theme</span>
                <Moon size={14} />
            </div>
        </div>
    )
}

function VoidModal() {
    return (
        <div className="w-full max-w-xs bg-black rounded-none p-8 shadow-[0_20px_50px_rgba(0,0,0,1)] text-center border-t-4 border-white">
            <h3 className="text-2xl font-black text-white mb-8 tracking-tighter uppercase">Ident</h3>
            <button className="w-full bg-white text-black font-black py-4 px-6 flex items-center justify-between hover:bg-gray-200 transition-colors">
                <span>GOOGLE</span>
                <span className="text-xl">→</span>
            </button>
            <p className="text-[10px] text-gray-600 mt-6 uppercase tracking-widest">Secure Login</p>
        </div>
    )
}

// --- VARIANT C: CLEAN (Apple Style) ---
function CleanDropdown() {
    return (
        <div className="w-64 bg-white/10 backdrop-blur-3xl rounded-3xl p-2 shadow-lg ring-1 ring-white/20">
            <div className="px-4 py-3 flex items-center gap-3 bg-white/90 text-black rounded-2xl mb-1.5 font-semibold shadow-sm">
                <User size={18} /> <span className="text-sm">Sign In</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between text-white/90 hover:bg-white/10 rounded-2xl transition-colors cursor-pointer">
                <span className="text-sm font-medium">Dark Mode</span>
                <div className="w-10 h-6 bg-white/20 rounded-full p-1 flex justify-end"><div className="w-4 h-4 bg-white rounded-full shadow-sm"></div></div>
            </div>
        </div>
    )
}

function CleanModal() {
    return (
        <div className="w-full max-w-xs bg-white/5 backdrop-blur-3xl rounded-[2rem] p-6 shadow-2xl ring-1 ring-white/10 text-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-400 to-purple-500 rounded-full mx-auto mb-6 shadow-lg"></div>
            <button className="w-full bg-white text-black font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors shadow-lg">
                Continue with Google
            </button>
            <button className="mt-4 text-xs font-medium text-white/50 hover:text-white transition-colors">
                Cancel
            </button>
        </div>
    )
}
