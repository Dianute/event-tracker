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
            {/* Main Modal Container - Fullscreen on Mobile, Card on Desktop */}
            <div className={`w-full h-[95vh] md:h-auto md:max-h-[85vh] md:max-w-lg md:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 relative
                ${theme === 'cyberpunk' ? 'bg-[#050510] border-cyan-500/30' :
                    theme === 'light' ? 'bg-white border-gray-200 text-gray-900' :
                        'bg-zinc-900 border-white/10 text-white'}
                ${!isReadOnly ? 'rounded-t-3xl md:rounded-3xl' : ''}`}>

                {/* --- VIEW MODE: Split Screen Layout --- */}
                {isReadOnly ? (
                    <div className="flex flex-col h-full relative">
                        {/* 1. TOP SECTION: Immersive Image (45% Height) */}
                        <div className="relative h-[45%] shrink-0 w-full overflow-hidden bg-black group">
                            {/* Blurry Background */}
                            <div
                                className="absolute inset-0 opacity-60 blur-2xl scale-110"
                                style={{
                                    backgroundImage: `url(${imageUrl || '/api/placeholder/400/320'})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center'
                                }}
                            />

                            {/* Main Image */}
                            <div className="absolute inset-0 flex items-center justify-center p-4">
                                <img
                                    src={imageUrl || '/api/placeholder/400/320'}
                                    alt={title}
                                    className="w-full h-full object-contain drop-shadow-2xl"
                                />
                            </div>

                            {/* Floating Top Controls */}
                            <div className="absolute top-4 left-0 right-0 px-4 flex justify-between items-start z-10">
                                {/* Category Badge */}
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg backdrop-blur-md border
                                     ${type === 'music' ? 'bg-pink-500/80 text-white border-pink-400/30' :
                                        type === 'food' ? 'bg-orange-500/80 text-white border-orange-400/30' :
                                            type === 'sports' ? 'bg-green-600/80 text-white border-green-500/30' :
                                                'bg-blue-600/80 text-white border-blue-500/30'}`}>
                                    <span className="text-xs">{
                                        type === 'food' ? '🍔' :
                                            type === 'sports' ? '⚽' :
                                                type === 'music' ? '🎵' :
                                                    type === 'arts' ? '🎨' :
                                                        type === 'learning' ? '📚' : '🍻'
                                    }</span>
                                    {type}
                                </div>

                                {/* Close Button */}
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* 2. BOTTOM SECTION: Info Panel (55% Height) */}
                        <div className={`flex-1 relative flex flex-col w-full -mt-6 rounded-t-3xl z-10 shadow-[0_-5px_20px_rgba(0,0,0,0.2)]
                            ${theme === 'cyberpunk' ? 'bg-[#0a0a15]' :
                                theme === 'light' ? 'bg-white' :
                                    'bg-zinc-900'}`}>

                            {/* Drag Handle (Visual Cue) */}
                            <div className="w-full flex justify-center pt-3 pb-1">
                                <div className={`w-12 h-1.5 rounded-full opacity-20 ${theme === 'light' ? 'bg-black' : 'bg-white'}`} />
                            </div>

                            <div className="flex-1 flex flex-col px-6 pb-6 overflow-hidden">
                                {/* Header: Title */}
                                <div className="mb-5 text-center">
                                    <h2 className={`text-2xl font-black leading-tight mb-1
                                        ${theme === 'cyberpunk' ? 'text-cyan-50 drop-shadow-[0_0_5px_rgba(34,211,238,0.3)]' :
                                            theme === 'light' ? 'text-gray-900' :
                                                'text-white'}`}>
                                        {title}
                                    </h2>
                                </div>

                                {/* Metadata Grid (Compact) */}
                                <div className="grid grid-cols-2 gap-3 mb-5 shrink-0">
                                    <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center gap-1.5 shadow-sm
                                        ${theme === 'cyberpunk' ? 'bg-cyan-950/20 border-cyan-500/30 text-cyan-100' :
                                            theme === 'light' ? 'bg-gray-50 border-gray-100' :
                                                'bg-white/5 border-white/5'}`}>
                                        <Clock className={theme === 'cyberpunk' ? 'text-cyan-400' : 'text-blue-500'} size={18} />
                                        <div>
                                            <p className={`text-[10px] font-bold uppercase tracking-wide opacity-60 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>Time</p>
                                            <p className={`text-xs font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                                                {formatDateRange(startTime, endTime).split('•')[1] || 'TBA'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center gap-1.5 shadow-sm
                                        ${theme === 'cyberpunk' ? 'bg-pink-950/20 border-pink-500/30 text-pink-100' :
                                            theme === 'light' ? 'bg-gray-50 border-gray-100' :
                                                'bg-white/5 border-white/5'}`}>
                                        <MapPin className={theme === 'cyberpunk' ? 'text-pink-500' : 'text-red-500'} size={18} />
                                        <div className="w-full px-1">
                                            <p className={`text-[10px] font-bold uppercase tracking-wide opacity-60 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>Location</p>
                                            <p className={`text-xs font-semibold truncate w-full ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                                                {venue ? venue.split(',')[0] : 'Unknown'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Description (Scrollable) */}
                                <div className={`flex-1 overflow-y-auto mb-4 pr-1 scrollbar-thin
                                    ${theme === 'light' ? 'scrollbar-thumb-gray-200' : 'scrollbar-thumb-white/10'}`}>
                                    <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 opacity-80 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                        About
                                    </h3>
                                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                                        {description || 'No description provided.'}
                                    </p>
                                </div>

                                {/* Bottom Action Button */}
                                {event?.link && (
                                    <a
                                        href={event.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`w-full py-3.5 flex items-center justify-center gap-2 rounded-xl font-bold shadow-lg transition-transform active:scale-95 shrink-0
                                            ${theme === 'cyberpunk' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-cyan-500/20' :
                                                'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30'}`}
                                    >
                                        <span>Get Tickets / Info</span>
                                        <ExternalLink size={16} />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    // --- CREATE MODE: Standard Scrollable Form ---
                    <>
                        {/* Create Mode Header (Image/Close) */}
                        <div className={`relative w-full h-40 border-b flex items-center justify-center overflow-hidden shrink-0 transition-colors
                             ${theme === 'cyberpunk' ? 'bg-cyan-950/20 border-cyan-500/20' :
                                theme === 'light' ? 'bg-gray-100 border-gray-200' :
                                    'bg-zinc-800/50 border-white/10'}`}>

                            <button
                                onClick={onClose}
                                className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors"
                            >
                                <X size={18} />
                            </button>

                            {imageUrl ? (
                                <>
                                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
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

                        <form onSubmit={handleSubmit} className="px-6 pb-6 overflow-y-auto space-y-4 scrollbar-thin">
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
                                                    // (Optional: Trigger full reverse geocode here for strict format)
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
