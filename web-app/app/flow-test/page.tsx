'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Calendar, Clock, MapPin, ChefHat, ArrowRight, Check, Type, Sparkles, Image as ImageIcon, LayoutTemplate, X, Maximize2, ChevronDown } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

export default function FlowTestPage() {
    const { data: session } = useSession();
    const [step, setStep] = useState(1);

    // Step 1: Basics
    const [title, setTitle] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [selectedLocation, setSelectedLocation] = useState(''); // ID of saved location
    const [venueName, setVenueName] = useState(''); // Text fallback
    const [userLocations, setUserLocations] = useState<any[]>([]);

    // Step 2: Menu
    const [menuText, setMenuText] = useState('');
    const [menuTheme, setMenuTheme] = useState<'chalkboard' | 'minimal' | 'elegant'>('chalkboard');
    const menuRef = useRef<HTMLDivElement>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false); // For enlargement state

    // Step 3: Launch
    const [isPublishing, setIsPublishing] = useState(false);

    // Helpers
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    useEffect(() => {
        // Fetch saved locations
        if (session?.user?.email) {
            fetch(`${API_URL}/api/user-locations`, { headers: { 'x-user-email': session.user.email } })
                .then(res => res.json())
                .then(data => { if (Array.isArray(data)) setUserLocations(data); })
                .catch(e => console.error(e));
        }

        // Default Times (Next Hour)
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        setEventDate(dateStr);

        now.setMinutes(0, 0, 0);
        now.setHours(now.getHours() + 1);
        setStartTime(now.toTimeString().slice(0, 5)); // HH:mm

        now.setHours(now.getHours() + 3);
        setEndTime(now.toTimeString().slice(0, 5)); // HH:mm
    }, [session]);

    const uploadImage = async (blob: Blob): Promise<string> => {
        const formData = new FormData();
        formData.append('image', blob, `menu-easy-${Date.now()}.png`);
        const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        return data.imageUrl;
    };

    const generateMenuImage = async () => {
        if (!menuRef.current) return;
        try {
            const blob = await htmlToImage.toBlob(menuRef.current, { pixelRatio: 2 });
            if (blob) {
                // Upload immediately to get URL
                const imageUrl = await uploadImage(blob);
                setGeneratedImage(imageUrl);
                handleNext();
            }
        } catch (e) {
            console.error(e);
            alert("Error creating menu preview");
        }
    };

    const handlePublish = async () => {
        if (!session?.user?.email) return alert("Please sign in first");
        setIsPublishing(true);

        const combinedStart = new Date(`${eventDate}T${startTime}`);
        const combinedEnd = new Date(`${eventDate}T${endTime}`);

        // Handle overnight events (if end < start, assume next day)
        if (combinedEnd < combinedStart) {
            combinedEnd.setDate(combinedEnd.getDate() + 1);
        }

        const newEvent = {
            title,
            description: `Event Menu:\n${menuText}`,
            imageUrl: generatedImage,
            venue: venueName,
            startTime: combinedStart.toISOString(),
            endTime: combinedEnd.toISOString(),
            type: 'food',
            userEmail: session.user.email,
            lat: 0, // In future, use lat/lng from saved ID
            lng: 0
        };

        try {
            const res = await fetch(`${API_URL}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEvent)
            });
            if (res.ok) {
                alert("Event Published Successfully!");
                window.location.href = '/dashboard';
            } else {
                throw new Error("Failed to publish");
            }
        } catch (e) {
            alert("Error: " + e);
        } finally {
            setIsPublishing(false);
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
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Event Timing</label>
                                <div className="space-y-4">
                                    {/* Date Picker */}
                                    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 flex items-center gap-3">
                                        <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><Calendar size={16} /></div>
                                        <div className="flex-1">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Date</p>
                                            <input
                                                type="date"
                                                value={eventDate}
                                                onChange={e => setEventDate(e.target.value)}
                                                className="w-full bg-transparent text-sm font-bold text-white focus:outline-none [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Clock size={16} /></div>
                                            <div className="flex-1">
                                                <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Starts</p>
                                                <input
                                                    type="time"
                                                    value={startTime}
                                                    onChange={e => setStartTime(e.target.value)}
                                                    className="w-full bg-transparent text-sm font-bold text-white focus:outline-none [color-scheme:dark]"
                                                />
                                            </div>
                                        </div>
                                        <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 flex items-center gap-3">
                                            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Clock size={16} /></div>
                                            <div className="flex-1">
                                                <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Ends</p>
                                                <input
                                                    type="time"
                                                    value={endTime}
                                                    onChange={e => setEndTime(e.target.value)}
                                                    className="w-full bg-transparent text-sm font-bold text-white focus:outline-none [color-scheme:dark]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Location</label>
                                <div className="space-y-3">
                                    {userLocations.length > 0 && (
                                        <div className="relative">
                                            <select
                                                value={selectedLocation}
                                                onChange={e => {
                                                    setSelectedLocation(e.target.value);
                                                    if (e.target.value) {
                                                        const loc = userLocations.find(l => l.id === e.target.value);
                                                        if (loc) setVenueName(loc.name);
                                                    } else {
                                                        setVenueName('');
                                                    }
                                                }}
                                                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm font-bold text-white focus:border-blue-500 outline-none appearance-none cursor-pointer"
                                            >
                                                <option value="">Select Saved Location...</option>
                                                {userLocations.map(loc => (
                                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                                <ChevronDown size={16} />
                                            </div>
                                        </div>
                                    )}
                                    <input
                                        type="text"
                                        value={venueName}
                                        onChange={e => { setVenueName(e.target.value); setSelectedLocation(''); }}
                                        placeholder="Or type venue name..."
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm font-bold focus:border-blue-500 focus:outline-none transition-colors placeholder:font-normal"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleNext}
                                disabled={!title || !venueName || !eventDate || !startTime || !endTime}
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
                                    <div className="relative">
                                        <select
                                            value={menuTheme}
                                            onChange={e => setMenuTheme(e.target.value as any)}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm font-bold text-white focus:border-blue-500 outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="chalkboard">Chalkboard (Rustic)</option>
                                            <option value="minimal">Minimal (Clean)</option>
                                            <option value="elegant">Elegant (Dark Premium)</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                            <ChevronDown size={16} />
                                        </div>
                                    </div>
                                </div>

                                <textarea
                                    value={menuText}
                                    onChange={e => setMenuText(e.target.value)}
                                    placeholder={`Burger - $12\nFries - $5\nSoda - $3`}
                                    className="w-full h-48 bg-gray-900 border border-gray-700 rounded-xl p-4 font-mono text-sm focus:border-blue-500 focus:outline-none transition-colors resize-none leading-relaxed"
                                />
                            </div>

                            {/* Live Preview */}
                            <div className="relative group cursor-pointer" onClick={() => setIsPreviewOpen(true)}>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 text-center pointer-events-none">Preview (Click to Enlarge)</label>

                                <div className="absolute top-10 right-2 z-10 bg-black/50 p-2 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Maximize2 size={16} />
                                </div>

                                <div
                                    ref={menuRef}
                                    className={`w-full aspect-[4/5] rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-2xl overflow-hidden transition-transform group-hover:scale-[1.02] duration-300
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
                                <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">
                                    {eventDate} • {startTime}
                                </p>
                                <p className="text-xs text-gray-500 line-clamp-2">{venueName}</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={handleBack} className="px-6 py-4 text-gray-400 font-bold hover:text-white">Back</button>
                            <button
                                className="flex-1 py-4 bg-green-500 hover:bg-green-400 text-black font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                                onClick={handlePublish}
                                disabled={isPublishing}
                            >
                                {isPublishing ? 'Publishing...' : <><LayoutTemplate size={20} /> Publish Event</>}
                            </button>
                        </div>
                    </div>
                )}

            </div>

            {/* Preview Modal */}
            {isPreviewOpen && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => setIsPreviewOpen(false)}>
                    <div className="relative max-w-3xl w-full max-h-screen overflow-hidden" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setIsPreviewOpen(false)}
                            className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors"
                        >
                            <X size={32} />
                        </button>
                        <div
                            className={`w-full aspect-[4/5] rounded-xl p-10 flex flex-col items-center justify-center text-center shadow-2xl
                                ${menuTheme === 'chalkboard' ? 'bg-[#1a1a1a] border-8 border-[#8B4513]' : ''}
                                ${menuTheme === 'minimal' ? 'bg-white text-black' : ''}
                                ${menuTheme === 'elegant' ? 'bg-[#0f172a] text-amber-100 border border-amber-500/20' : ''}
                            `}
                        >
                            <h2 className={`${menuTheme === 'chalkboard' ? 'font-serif text-5xl text-white/90 mb-8 border-b-4 border-white/20 pb-4' : 'font-bold text-4xl mb-8 tracking-widest'}`}>
                                MENU
                            </h2>
                            <div className="whitespace-pre-wrap leading-loose font-medium text-lg opacity-90">
                                {menuText || <span className="opacity-30 italic">Items will appear here...</span>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
