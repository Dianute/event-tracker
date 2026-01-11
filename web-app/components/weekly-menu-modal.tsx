'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Camera, Upload, ArrowRight, Save } from 'lucide-react';

interface WeeklyMenuModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (events: any[]) => void;
    initialLocation?: { lat: number; lng: number } | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function WeeklyMenuModal({ isOpen, onClose, onSubmit, initialLocation }: WeeklyMenuModalProps) {
    // Common Details
    const [title, setTitle] = useState('Business Lunch');
    const [description, setDescription] = useState('Delicious daily lunch menu.');
    const [venue, setVenue] = useState('');
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);

    // Timing
    const [weekStart, setWeekStart] = useState('');
    const [timeStart, setTimeStart] = useState('11:00');
    const [timeEnd, setTimeEnd] = useState('14:00');

    // Images for Mon-Fri
    const [images, setImages] = useState<string[]>(['', '', '', '', '']);
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

    // Initial Setup
    useEffect(() => {
        if (isOpen) {
            // Set next Monday as default
            const d = new Date();
            d.setDate(d.getDate() + (1 + 7 - d.getDay()) % 7); // Calculate next Mon
            const s = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            setWeekStart(s);

            // Set Location if provided
            if (initialLocation) {
                setCoords(initialLocation);
                // Reverse geocode if needed (omitted for brevity, user can search)
            }
        }
    }, [isOpen, initialLocation]);

    // Venue Search Debounce
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (venue.length > 2 && isSearching) {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(venue)}&limit=5&addressdetails=1`);
                    const data = await res.json();
                    setSuggestions(data);
                } catch (e) { console.error(e); }
            } else { setSuggestions([]); }
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [venue, isSearching]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingIndex(index);
        const formData = new FormData();
        formData.append('image', file);
        try {
            const res = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                headers: {
                    'x-admin-password': localStorage.getItem('admin_secret') || ''
                },
                body: formData
            });
            const data = await res.json();
            console.log("Upload response:", data);
            if (data.success) {
                const newImages = [...images];
                newImages[index] = data.imageUrl;
                setImages(newImages);
            } else {
                alert("Upload error from server: " + (data.error || "Unknown"));
            }
        } catch (err: any) {
            console.error("Upload failed", err);
            alert("Upload failed: " + err.message);
        }
        finally { setUploadingIndex(null); }
    };

    const handleSubmit = () => {
        if (!venue) { alert("Please enter a location"); return; }
        if (!coords) { alert("Please select a valid location from the list"); return; }

        const events = [];
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const startObj = new Date(weekStart); // Monday

        for (let i = 0; i < 5; i++) {
            const currentDay = new Date(startObj);
            currentDay.setDate(startObj.getDate() + i);
            const dateStr = currentDay.toISOString().split('T')[0];

            // Only create event if image exists (User might skip days)
            // But user said "Monday to Friday", so assuming all.
            // If image is missing, maybe skip or use a placeholder? User wants "5 images".
            if (!images[i]) continue;

            events.push({
                title: title,
                description,
                type: 'food',
                startTime: `${dateStr}T${timeStart}:00.000Z`, // Simplified ISO construction
                endTime: `${dateStr}T${timeEnd}:00.000Z`,
                lat: coords.lat,
                lng: coords.lng,
                venue,
                imageUrl: images[i]
            });
        }

        if (events.length === 0) { alert("Please upload at least one menu image."); return; }
        onSubmit(events);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full h-[95vh] md:h-auto md:max-h-[85vh] md:max-w-2xl bg-[#050510] border border-gray-800 rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0a0a15]">
                    <div>
                        <h2 className="text-xl font-black text-white flex items-center gap-2">
                            <span className="text-2xl">🍔</span> Weekly Lunch Menu
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">Create 5 events (Mon-Fri) in one go.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">

                    {/* 1. Common Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Title</label>
                                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-blue-500/50 transition-colors" />
                            </div>

                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Where</label>
                                <input type="text" value={venue} placeholder="Search venue..."
                                    onChange={(e) => { setVenue(e.target.value); setIsSearching(true); setCoords(null); }}
                                    className="w-full px-4 py-3 pl-10 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-blue-500/50 transition-colors" />
                                <MapPin className="absolute left-3.5 top-[34px] text-gray-400" size={16} />
                                {suggestions.length > 0 && (
                                    <div className="absolute z-20 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                        {suggestions.map((item, i) => (
                                            <div key={i} className="p-3 cursor-pointer text-sm truncate hover:bg-white/10 text-gray-200"
                                                onClick={() => {
                                                    setVenue(item.display_name.split(',').slice(0, 3).join(','));
                                                    setCoords({ lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
                                                    setSuggestions([]);
                                                }}>
                                                {item.display_name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Week Starting (Monday)</label>
                                <div className="relative">
                                    <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-blue-500/50 transition-colors pl-10" />
                                    <Calendar className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">From</label>
                                    <input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)}
                                        className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none text-center font-bold" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">To</label>
                                    <input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)}
                                        className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none text-center font-bold" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description (Full Width) */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Description (Full Menu)</label>
                        <textarea
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            rows={3}
                            placeholder="Detailed menu list, prices, or special offers..."
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-blue-500/50 transition-colors resize-none text-sm overflow-hidden min-h-[80px]"
                        />
                    </div>

                    {/* 2. Menu Grid */}
                    <div>
                        <div className="flex justify-between items-end mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Daily Menus</label>
                            <span className="text-xs text-gray-400">Upload 5 images below</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, idx) => (
                                <div key={day} className="flex flex-col gap-2 group">
                                    <div className={`relative aspect-[3/4] rounded-xl border border-dashed border-white/10 bg-white/5 overflow-hidden transition-all ${images[idx] ? 'border-none' : 'hover:bg-white/10 hover:border-white/20'}`}>
                                        {images[idx] ? (
                                            <>
                                                <img src={images[idx]} alt={day} className="w-full h-full object-cover" />
                                                <button onClick={() => { const n = [...images]; n[idx] = ''; setImages(n); }}
                                                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors"><X size={12} /></button>
                                            </>
                                        ) : (
                                            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer text-gray-500 hover:text-white transition-colors">
                                                {uploadingIndex === idx ? <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" /> : <Upload size={20} />}
                                                <span className="text-[10px] font-bold mt-2 uppercase">Upload</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, idx)} disabled={uploadingIndex !== null} />
                                            </label>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm py-1 text-center">
                                            <span className="text-xs font-bold text-white uppercase">{day}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                        <div className="p-1.5 bg-blue-500 rounded-lg shrink-0 mt-0.5"><Clock size={14} className="text-white" /></div>
                        <div>
                            <p className="text-sm font-bold text-blue-200">Ready to Publish?</p>
                            <p className="text-xs text-blue-300/70 mt-0.5">This will create <strong>{images.filter(Boolean).length} separate events</strong> for the selected week. Each will have the same location and time, but unique daily images.</p>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-800 bg-[#0a0a15]">
                    <button onClick={handleSubmit} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-xl shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                        <Save size={20} />
                        <span>Publish {images.filter(Boolean).length} Events</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
