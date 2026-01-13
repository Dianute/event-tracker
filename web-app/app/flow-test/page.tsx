'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Calendar, Clock, MapPin, ChefHat, ArrowRight, Check, Type, Sparkles, Image as ImageIcon, LayoutTemplate } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

export default function FlowTestPage() {
    const { data: session } = useSession();
    const [step, setStep] = useState(1);

    // Step 1: Basics
    const [title, setTitle] = useState('');
    const [time, setTime] = useState<'lunch' | 'dinner' | 'custom'>('lunch');

    // Step 2: Menu
    const [menuText, setMenuText] = useState('');
    const [menuTheme, setMenuTheme] = useState<'chalkboard' | 'minimal' | 'elegant'>('chalkboard');
    const menuRef = useRef<HTMLDivElement>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    // Step 3: Launch
    const [isPublishing, setIsPublishing] = useState(false);

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const generateMenuImage = async () => {
        if (!menuRef.current) return;
        try {
            const blob = await htmlToImage.toBlob(menuRef.current, { pixelRatio: 2 });
            if (blob) {
                const url = URL.createObjectURL(blob);
                setGeneratedImage(url); // In real app, upload this
                handleNext();
            }
        } catch (e) {
            alert("Error creating menu preview");
        }
    };

    return (
        <div className="min-h-screen bg-[#050510] text-white font-sans flex items-center justify-center p-6">
            <div className="max-w-xl w-full">

                {/* Progress Bar */}
                <div className="flex justify-between mb-8 px-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`flex flex-col items-center gap-2 ${step >= i ? 'text-blue-400' : 'text-gray-600'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${step >= i ? 'border-blue-500 bg-blue-500/20' : 'border-gray-700 bg-gray-800'}`}>
                                {step > i ? <Check size={16} /> : i}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                {i === 1 ? 'Basics' : i === 2 ? 'Menu' : 'Launch'}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Step 1: Basics */}
                {step === 1 && (
                    <div className="bg-gray-800/50 border border-white/5 rounded-3xl p-8 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4">
                        <h1 className="text-3xl font-black mb-2">Create Food Event</h1>
                        <p className="text-gray-400 mb-8">Let's get people hungry. What are you planning?</p>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Event Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g. Taco Tuesday"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-xl font-bold focus:border-blue-500 focus:outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">When is it?</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        onClick={() => setTime('lunch')}
                                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${time === 'lunch' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-gray-900 border-gray-700 hover:border-gray-600'}`}
                                    >
                                        <Clock size={20} />
                                        <span className="font-bold text-sm">Today Lunch</span>
                                        <span className="text-[10px] opacity-70">12:00 - 14:00</span>
                                    </button>
                                    <button
                                        onClick={() => setTime('dinner')}
                                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${time === 'dinner' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-gray-900 border-gray-700 hover:border-gray-600'}`}
                                    >
                                        <Sparkles size={20} />
                                        <span className="font-bold text-sm">Tonight</span>
                                        <span className="text-[10px] opacity-70">18:00 - 21:00</span>
                                    </button>
                                    <button
                                        onClick={() => setTime('custom')}
                                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${time === 'custom' ? 'bg-pink-500/20 border-pink-500 text-pink-400' : 'bg-gray-900 border-gray-700 hover:border-gray-600'}`}
                                    >
                                        <Calendar size={20} />
                                        <span className="font-bold text-sm">Custom</span>
                                        <span className="text-[10px] opacity-70">Choose Date</span>
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleNext}
                                disabled={!title}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
                            >
                                Next Step <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Instant Menu */}
                {step === 2 && (
                    <div className="bg-gray-800/50 border border-white/5 rounded-3xl p-8 backdrop-blur-xl animate-in fade-in slide-in-from-right-4">
                        <h1 className="text-3xl font-black mb-2">What's Cooking?</h1>
                        <p className="text-gray-400 mb-8">Paste your menu items or specials.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Menu Style</label>
                                    <div className="flex gap-2">
                                        {['chalkboard', 'minimal', 'elegant'].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setMenuTheme(t as any)}
                                                className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${menuTheme === t ? 'bg-white text-black border-white' : 'bg-transparent text-gray-500 border-gray-700'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <textarea
                                    value={menuText}
                                    onChange={e => setMenuText(e.target.value)}
                                    placeholder={`Burger - $12\nFries - $5\nSoda - $3`}
                                    className="w-full h-48 bg-gray-900 border border-gray-700 rounded-xl p-4 font-mono text-sm focus:border-blue-500 focus:outline-none transition-colors resize-none"
                                />
                            </div>

                            {/* Live Preview (Hidden from user input flow but used for generation) */}
                            <div className="relative">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 text-center">Preview</label>
                                <div
                                    ref={menuRef}
                                    className={`w-full aspect-[4/5] rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-2xl overflow-hidden
                                        ${menuTheme === 'chalkboard' ? 'bg-[#1a1a1a] border-4 border-[#8B4513]' : ''}
                                        ${menuTheme === 'minimal' ? 'bg-white text-black' : ''}
                                        ${menuTheme === 'elegant' ? 'bg-[#0f172a] text-amber-100 border border-amber-500/20' : ''}
                                    `}
                                >
                                    <h2 className={`${menuTheme === 'chalkboard' ? 'font-serif text-3xl text-white/90 mb-6 border-b-2 border-white/20 pb-2' : 'font-bold text-2xl mb-6 tracking-widest'}`}>
                                        MENU
                                    </h2>
                                    <div className="whitespace-pre-wrap leading-loose font-medium opacity-90">
                                        {menuText || <span className="opacity-30 italic">Items will appear here...</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button onClick={handleBack} className="px-6 py-4 text-gray-400 font-bold hover:text-white">Back</button>
                            <button
                                onClick={generateMenuImage}
                                disabled={!menuText}
                                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                Generate & Next <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Launch */}
                {step === 3 && (
                    <div className="bg-gray-800/50 border border-white/5 rounded-3xl p-8 backdrop-blur-xl animate-in fade-in slide-in-from-right-4 text-center">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Sparkles size={40} className="text-green-400" />
                        </div>
                        <h1 className="text-3xl font-black mb-2">Ready to Launch!</h1>
                        <p className="text-gray-400 mb-8 max-w-sm mx-auto">Your event is ready to go live. We've attached your menu automatically.</p>

                        <div className="bg-black/30 p-4 rounded-2xl max-w-sm mx-auto mb-8 border border-white/10 flex gap-4 text-left">
                            <div className="w-20 h-20 bg-gray-700 rounded-lg overflow-hidden shrink-0">
                                {generatedImage && <img src={generatedImage} className="w-full h-full object-cover" />}
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">{title}</h3>
                                <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">{time === 'lunch' ? 'Today • 12:00' : 'Tonight • 18:00'}</p>
                                <p className="text-xs text-gray-500 line-clamp-2">Featuring: {menuText.split('\n')[0]}...</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={handleBack} className="px-6 py-4 text-gray-400 font-bold hover:text-white">Back</button>
                            <button
                                className="flex-1 py-4 bg-green-500 hover:bg-green-400 text-black font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                                onClick={() => alert("Simulated: Published Successfully!")}
                            >
                                <LayoutTemplate size={20} /> Publish Event
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
