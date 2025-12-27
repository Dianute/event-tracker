'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (eventData: { title: string; description: string; type: string; startTime: string; endTime: string; lat?: number; lng?: number; venue?: string; imageUrl?: string }) => void;
    initialLocation: { lat: number; lng: number } | null;
    event?: any; // Event object for viewing
    theme?: 'dark' | 'light' | 'cyberpunk';
}

// Custom helper to format date range
const formatDateRange = (startStr: string, endStr: string) => {
    if (!startStr) return '';
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : null;

    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

    const dateText = start.toLocaleDateString([], dateOptions);
    const startTimeText = start.toLocaleTimeString([], timeOptions);

    if (end) {
        const endTimeText = end.toLocaleTimeString([], timeOptions);
        return `${dateText} • ${startTimeText} - ${endTimeText}`;
    }
    return `${dateText} • ${startTimeText}`;
};

import { Calendar, MapPin, Tag, ExternalLink, Clock, Camera, Image as ImageIcon } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Helper: Convert UTC string to Local 'YYYY-MM-DDTHH:mm' for Input
const toLocalISOString = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    // Determine offset in ms
    const offset = date.getTimezoneOffset() * 60000;
    // Create new date adjusted by offset
    const local = new Date(date.getTime() - offset);
    // Return ISO string sliced (removing Z and seconds)
    return local.toISOString().slice(0, 16);
};

// Helper: Strict Address Formatter
const formatAddress = (data: any, originalName?: string) => {
    if (!data || !data.address) return '';

    const parts = [];

    // 1. Venue Name (Only if explicitly provided and not redundant)
    if (originalName) {
        // clean up name
        const nameNode = originalName.split(',')[0];
        if (nameNode !== data.address.road && nameNode !== data.address.city &&
            nameNode !== data.address.town && nameNode !== data.address.pedestrian) {
            parts.push(nameNode);
        }
    }

    // 2. Road / Street (with House Number)
    let road = data.address.road || data.address.pedestrian;
    if (road && data.address.house_number) {
        road = `${road} ${data.address.house_number}`;
    }
    if (road) parts.push(road);

    // 3. City / Town
    const city = data.address.city || data.address.town || data.address.village || data.address.hamlet;
    if (city) parts.push(city);

    // 4. ZIP (Requested by user)
    if (data.address.postcode) parts.push(data.address.postcode);

    // 5. Country
    if (data.address.country) parts.push(data.address.country);

    // Fallback if parts is empty but we have a display_name
    if (parts.length === 0 && data.display_name) {
        return data.display_name.split(',').slice(0, 3).join(',');
    }

    return parts.join(', ');
};

export default function EventModal({ isOpen, onClose, onSubmit, initialLocation, event, theme = 'dark' }: EventModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('social');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [venue, setVenue] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showControls, setShowControls] = useState(true);

    // Effect to reset or populate form
    useEffect(() => {
        if (isOpen) {
            if (event) {
                // VIEW MODE / EDIT MODE
                setTitle(event.title);
                setDescription(event.description);
                setType(event.type);
                // Convert UTC (DB) -> Local (Input)
                setStartTime(toLocalISOString(event.startTime));
                setEndTime(toLocalISOString(event.endTime));
                setVenue(event.venue || event.location || '');
                setImageUrl(event.imageUrl || '');
                setCurrentLocation({ lat: event.lat, lng: event.lng });
            } else {
                // CREATE MODE (Reset)
                setTitle('');
                setDescription('');
                setType('social');
                setImageUrl('');
                setIsUploading(false);

                // Times
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                setStartTime(now.toISOString().slice(0, 16));
                setEndTime(new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16));

                if (initialLocation) {
                    setCurrentLocation(initialLocation);
                    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${initialLocation.lat}&lon=${initialLocation.lng}&addressdetails=1`)
                        .then(res => res.json())
                        .then(data => {
                            const formatted = formatAddress(data);
                            if (formatted) setVenue(formatted);
                            else if (data.display_name) setVenue(data.display_name.split(',').slice(0, 3).join(', '));
                        })
                        .catch(err => console.error("Reverse geocode failed", err));
                } else {
                    setVenue('');
                    setCurrentLocation(null);
                }
            }
        }
    }, [isOpen, event, initialLocation]);

    // Forward Geocode Effect
    useEffect(() => {
        if (event) return;

        const delayDebounceFn = setTimeout(async () => {
            if (venue.length > 2 && isSearching) {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(venue)}&limit=5`);
                    const data = await res.json();
                    setSuggestions(data);
                } catch (e) {
                    console.error("Search failed", e);
                }
            } else {
                setSuggestions([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [venue, isSearching, event]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                setImageUrl(data.imageUrl);
            } else {
                alert("Upload failed");
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert("Upload error");
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;
    const isReadOnly = !!event;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly) return;
        if (!currentLocation) {
            alert("Please select a location from the search or click the map!");
            return;
        }

        // Convert Local Input Time to UTC for Storage
        const startUTC = new Date(startTime).toISOString();
        const endUTC = new Date(endTime).toISOString();

        onSubmit({
            title,
            description,
            type,
            startTime: startUTC,
            endTime: endUTC,
            lat: currentLocation.lat,
            lng: currentLocation.lng,
            venue,
            imageUrl
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Main Modal Container - Fullscreen "Story" Card */}
            <div className={`w-full h-[95vh] md:h-[85vh] md:max-h-[800px] md:max-w-[450px] md:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 relative
                ${theme === 'cyberpunk' ? 'bg-[#050510] border-cyan-500/30' :
                    theme === 'light' ? 'bg-white border-gray-200 text-gray-900' :
                        'bg-zinc-900 border-white/10 text-white'}
                ${!isReadOnly ? 'rounded-t-3xl md:rounded-3xl' : ''}`}>

                {/* --- VIEW MODE: Immersive Story Layout --- */}
                {isReadOnly ? (
                    <div
                        className="w-full h-full relative bg-black group cursor-pointer"
                        onClick={() => setShowControls(!showControls)}
                    >

                        {/* 1. Fullscreen Image Layer */}
                        <div className="absolute inset-0 z-0">
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt={title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
                                    <ImageIcon size={48} className="text-white/20" />
                                </div>
                            )}

                            {/* Gradient Overlays for Readability */}
                            <div className={`absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent h-32 pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`} /> {/* Top Fade */}
                            <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent top-1/3 pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`} /> {/* Bottom Deep Fade */}
                        </div>

                        {/* 2. Top Controls (Floating) */}
                        <div className={`absolute top-0 left-0 right-0 p-5 flex justify-between items-start z-50 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            {/* Category Badge */}
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className={`pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg backdrop-blur-xl border border-white/20 text-white
                                 ${type === 'music' ? 'bg-pink-500/50' :
                                        type === 'food' ? 'bg-orange-500/50' :
                                            type === 'sports' ? 'bg-green-600/50' :
                                                'bg-blue-600/50'}`}
                            >
                                <span className="text-sm shadow-black drop-shadow-md">{
                                    type === 'food' ? '🍔' :
                                        type === 'sports' ? '⚽' :
                                            type === 'music' ? '🎵' :
                                                type === 'arts' ? '🎨' :
                                                    type === 'learning' ? '📚' : '🍻'
                                }</span>
                                <span className="drop-shadow-md">{type}</span>
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); onClose(); }}
                                className="pointer-events-auto p-2.5 rounded-full bg-black/20 backdrop-blur-xl text-white border border-white/10 hover:bg-white/20 transition-all active:scale-95"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* 3. Bottom Content (Info Overlay) */}
                        <div className={`absolute bottom-0 left-0 right-0 z-40 p-6 pb-8 text-white flex flex-col gap-5 max-h-[65%] overflow-y-auto scrollbar-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

                            {/* Title */}
                            <div>
                                <h1 className="text-3xl font-black leading-tight drop-shadow-lg mb-1">
                                    {title}
                                </h1>
                            </div>

                            {/* Info Grid (Glassmorphism) */}
                            <div className="grid grid-cols-2 gap-3 shrink-0">
                                <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center text-center gap-1">
                                    <Clock className="text-blue-400 mb-1" size={20} />
                                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Time</p>
                                    <p className="text-xs font-semibold">{formatDateRange(startTime, endTime).split('•')[1] || 'TBA'}</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center text-center gap-1">
                                    <MapPin className="text-red-500 mb-1" size={20} />
                                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Location</p>
                                    <p className="text-xs font-semibold truncate w-full px-1">{venue ? venue.split(',')[0] : 'Unknown'}</p>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="prose prose-invert prose-sm max-w-none">
                                <p className="text-sm text-gray-200 leading-relaxed opacity-90 font-medium dropshadow-md">
                                    {description || 'No description provided.'}
                                </p>
                            </div>

                            {/* Action Button */}
                            {event?.link && (
                                <a
                                    href={event.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full py-4 bg-white text-black font-black rounded-xl text-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
                                >
                                    <span>GET TICKETS</span>
                                    <ExternalLink size={16} />
                                </a>
                            )}
                        </div>
                    </div>
                ) : (
                    // --- CREATE MODE: Standard Form ---
                    <>
                        {/* Create Mode Header (Image/Close) */}
                        <div className={`relative w-full h-40 border-b flex items-center justify-center overflow-hidden shrink-0 transition-colors
                             ${theme === 'cyberpunk' ? 'bg-cyan-950/20 border-cyan-500/20' :
                                theme === 'light' ? 'bg-gray-100 border-gray-200' :
                                    'bg-zinc-800/50 border-white/10'}`}>

                            <button
                                onClick={onClose}
                                className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors shadow-lg active:scale-90"
                            >
                                <X size={18} />
                            </button>

                            {imageUrl ? (
                                <>
                                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover bg-black/20" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setImageUrl(''); }}
                                        className="absolute bottom-3 right-3 p-1.5 bg-red-500 text-white rounded-full shadow-lg"
                                    >
                                        <X size={14} />
                                    </button>
                                </>
                            ) : (
                                <div className="flex gap-4">
                                    {/* Camera Button */}
                                    <label className="flex flex-col items-center gap-2 cursor-pointer group/cam">
                                        <div className="p-3.5 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 active:scale-90 transition-transform">
                                            <Camera size={24} />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Camera</span>
                                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                                    </label>

                                    {/* Gallery Button */}
                                    <label className="flex flex-col items-center gap-2 cursor-pointer group/gal">
                                        <div className="p-3.5 rounded-full bg-white dark:bg-white/10 shadow-sm border border-gray-100 dark:border-white/5 active:scale-90 transition-transform">
                                            <ImageIcon size={24} className="text-gray-500 dark:text-gray-400" />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Gallery</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                                    </label>
                                </div>
                            )}

                            {isUploading && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center flex-col gap-2 backdrop-blur-sm">
                                    <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                                    <span className="text-xs font-bold text-white">Uploading...</span>
                                </div>
                            )}
                        </div>

                        <div className="p-6 pt-4 pb-2">
                            <h2 className={`text-xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Create New Event</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 min-h-0 px-6 pb-6 overflow-y-auto space-y-4 scrollbar-thin">
                            {/* Where */}
                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Where</label>
                                <input
                                    type="text"
                                    required
                                    value={venue}
                                    placeholder="Search address..."
                                    onChange={(e) => { setVenue(e.target.value); setIsSearching(true); }}
                                    onFocus={() => {
                                        if (initialLocation && !venue) {
                                            setSuggestions(prev => [{
                                                display_name: "📍 Use Current Location",
                                                lat: String(initialLocation.lat),
                                                lon: String(initialLocation.lng),
                                                osm_id: 'current-loc'
                                            }]);
                                        }
                                    }}
                                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all pl-10 text-sm
                                        ${theme === 'cyberpunk' ? 'bg-cyan-950/20 border-cyan-500/30 text-cyan-100' :
                                            theme === 'light' ? 'bg-gray-50 border-gray-200 text-gray-900' :
                                                'bg-white/5 border-white/10 text-white'}`}
                                />
                                <MapPin className="absolute left-3.5 top-[34px] text-gray-400" size={16} />

                                {suggestions.length > 0 && (
                                    <div className={`absolute z-20 w-full mt-1 border rounded-xl shadow-xl max-h-48 overflow-y-auto
                                        ${theme === 'light' ? 'bg-white' : 'bg-zinc-800 border-zinc-700'}`}>
                                        {suggestions.map((item, i) => (
                                            <div key={i} className="p-3 cursor-pointer text-sm truncate flex items-center gap-2 hover:bg-white/10"
                                                onClick={async () => {
                                                    setVenue(item.display_name.split(',')[0]);
                                                    setCurrentLocation({ lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
                                                    setSuggestions([]);
                                                }}>
                                                <MapPin size={12} /> {item.display_name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* What */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">What</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    placeholder="Event Title"
                                    onChange={(e) => setTitle(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border outline-none text-sm font-medium
                                        ${theme === 'light' ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                                />
                            </div>

                            {/* When */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Start</label>
                                    <input type="datetime-local" required value={startTime} onChange={(e) => setStartTime(e.target.value)}
                                        className={`w-full px-3 py-3 rounded-xl border outline-none text-xs ${theme === 'light' ? 'bg-gray-50 text-gray-900' : 'bg-white/5 text-white'}`} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">End</label>
                                    <input type="datetime-local" required value={endTime} onChange={(e) => setEndTime(e.target.value)}
                                        className={`w-full px-3 py-3 rounded-xl border outline-none text-xs ${theme === 'light' ? 'bg-gray-50 text-gray-900' : 'bg-white/5 text-white'}`} />
                                </div>
                            </div>

                            {/* Category & Details */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Category</label>
                                <div className="flex flex-wrap gap-2">
                                    {[{ id: 'social', emoji: '🍻' }, { id: 'food', emoji: '🍔' }, { id: 'music', emoji: '🎵' }, { id: 'arts', emoji: '🎨' }, { id: 'sports', emoji: '⚽' }].map(cat => (
                                        <button key={cat.id} type="button" onClick={() => setType(cat.id)}
                                            className={`px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase ${type === cat.id ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-500 border-dashed border-gray-500'}`}>
                                            {cat.emoji} {cat.id}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Details..."
                                rows={2}
                                className={`w-full px-4 py-3 rounded-xl border outline-none text-sm resize-none
                                    ${theme === 'light' ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                            />

                            <button type="submit" className="w-full py-4 bg-blue-600 font-bold rounded-xl text-white hover:bg-blue-500 transition-colors shadow-lg">
                                Create Event
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
