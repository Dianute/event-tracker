'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (eventData: { title: string; description: string; type: string; startTime: string; endTime: string; lat?: number; lng?: number; venue?: string; imageUrl?: string }) => void;
    initialLocation: { lat: number; lng: number } | null;
    userLocation?: { lat: number; lng: number } | null;
    event?: any; // Event object for viewing or editing
    theme?: 'dark' | 'light' | 'cyberpunk';
    readOnly?: boolean;
}

// Custom Helper: Haversine Distance
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    if (d < 1) return Math.round(d * 1000) + ' m';
    return d.toFixed(1) + ' km';
};

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

export default function EventModal({ isOpen, onClose, onSubmit, initialLocation, userLocation, event, theme = 'dark', readOnly = false }: EventModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('social');

    // NEW Date/Time States
    const [date, setDate] = useState(''); // YYYY-MM-DD
    const [timeStart, setTimeStart] = useState('12:00'); // HH:mm
    const [timeEnd, setTimeEnd] = useState('14:00'); // HH:mm
    const [isAllDay, setIsAllDay] = useState(false);

    const [venue, setVenue] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showControls, setShowControls] = useState(true);

    // Derived distance
    const distanceString = (event && userLocation && event.lat && event.lng)
        ? getDistance(userLocation.lat, userLocation.lng, event.lat, event.lng)
        : null;

    // Helper: Smart Date + 1 Day for Overnight display
    const isOvernight = !isAllDay && timeEnd < timeStart;

    // Effect to reset or populate form
    useEffect(() => {
        if (isOpen) {
            if (event) {
                // VIEW / EDIT MODE
                setTitle(event.title);
                setDescription(event.description);
                setType(event.type);

                // Parse Start/End into Date + Time
                const startObj = new Date(event.startTime);
                const endObj = new Date(event.endTime);

                // Convert to LOCAL YYYY-MM-DD
                const localDate = startObj.getFullYear() + '-' + String(startObj.getMonth() + 1).padStart(2, '0') + '-' + String(startObj.getDate()).padStart(2, '0');
                setDate(localDate);

                // Convert to LOCAL HH:mm
                const formatTime = (d: Date) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
                setTimeStart(formatTime(startObj));
                setTimeEnd(formatTime(endObj));

                // Check All Day Heuristic (00:00 to 23:59 or 00:00 next day)
                const isFullDay = (formatTime(startObj) === '00:00' && formatTime(endObj) === '00:00') ||
                    (formatTime(startObj) === '00:00' && formatTime(endObj) === '23:59');
                setIsAllDay(isFullDay);

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
                setIsSearching(false);

                // Default: Today
                const now = new Date();
                const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                setDate(todayStr);

                // Default Time: Next full hour
                const nextHour = now.getHours() + 1;
                /*
                  If it's 23:00, nextHour is 24 -> 00:00 next day.
                  But for simplified inputs, let's just clamp or wrap visually?
                  Let's just use 12:00 default if it's late.
                 */
                const startH = (nextHour > 23) ? 9 : nextHour;
                const endH = (startH + 2) % 24;

                setTimeStart(String(startH).padStart(2, '0') + ':00');
                setTimeEnd(String(endH).padStart(2, '0') + ':00');
                setIsAllDay(false);

                if (initialLocation) {
                    setCurrentLocation(initialLocation);
                    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${initialLocation.lat}&lon=${initialLocation.lng}&addressdetails=1`)
                        .then(res => res.json())
                        .then(data => {
                            const formatted = formatAddress(data);
                            setIsSearching(false);
                            if (formatted) setVenue(formatted);
                            else if (data.display_name) setVenue(data.display_name);
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
            const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) setImageUrl(data.imageUrl);
            else alert("Upload failed");
        } catch (err) {
            console.error("Upload error:", err);
            alert("Upload error");
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    // Explicit ReadOnly check. If event exists but readOnly is false -> Edit Mode
    const isReadOnly = !!event && readOnly;
    const isEditMode = !!event && !readOnly;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly) return;

        let finalLat = currentLocation?.lat;
        let finalLng = currentLocation?.lng;

        // Validation: If no hard location selected, try to geocode the text input
        if (!finalLat || !finalLng) {
            if (!venue.trim()) { alert("Please enter a location."); return; }
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(venue)}&limit=1`);
                const data = await res.json();
                if (data && data.length > 0) {
                    finalLat = parseFloat(data[0].lat);
                    finalLng = parseFloat(data[0].lon);
                } else {
                    alert("We couldn't find that address. Please select a suggestion or click the map.");
                    return;
                }
            } catch (err) {
                console.error("Geocode error", err);
                alert("Error finding location.");
                return;
            }
        }

        // --- CONSTRUCT FINAL DATES ---
        const startDateTime = new Date(`${date}T${isAllDay ? '00:00' : timeStart}`);
        let endDateTime = new Date(`${date}T${isAllDay ? '23:59' : timeEnd}`);

        // Handle Overnight (If End Time is earlier than Start, add 1 Day)
        if (!isAllDay && timeEnd < timeStart) {
            endDateTime.setDate(endDateTime.getDate() + 1);
        }

        onSubmit({
            title, description, type,
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
            lat: finalLat!, lng: finalLng!, venue, imageUrl
        });
        onClose();
    };

    const handleQuickDate = (mode: 'today' | 'tmrw') => {
        const d = new Date();
        if (mode === 'tmrw') d.setDate(d.getDate() + 1);
        const s = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        setDate(s);
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Main Modal Container */}
            <div className={`w-full h-[95vh] md:h-[85vh] md:max-h-[800px] md:max-w-[450px] md:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 relative
                ${theme === 'cyberpunk' ? 'bg-[#050510] border-cyan-500/30' :
                    theme === 'light' ? 'bg-white border-gray-200 text-gray-900' :
                        'bg-zinc-900 border-white/10 text-white'}
                ${!isReadOnly ? 'rounded-t-3xl md:rounded-3xl' : ''}`}>

                {/* VIEW MODE from original code is omitted here for brevity if unchanged? NO, I must include it. 
                   Wait, the user wants me to EDIT it. I should keep the View Mode (isReadOnly) part.
                   I will paste simplified View Mode code from before or keep it if I can.
                   Actually, line 288 in original was View Mode.
                   I should keep it.
                */}
                {isReadOnly ? (
                    <div className="w-full h-full relative bg-black group cursor-pointer" onClick={() => setShowControls(!showControls)}>
                        {/* 1. Fullscreen Image Layer */}
                        <div className="absolute inset-0 z-0">
                            {imageUrl ? (
                                <img src={imageUrl} alt={title} className={`w-full h-full transition-all duration-300 ${showControls ? 'object-cover' : 'object-contain bg-black/50'}`} />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center ${theme === 'light' ? 'bg-gray-100' : 'bg-zinc-900'}`}>
                                    <ImageIcon size={48} className="text-white/20" />
                                </div>
                            )}
                            <div className={`absolute inset-0 bg-gradient-to-b from-black/60 via-transparent h-32 pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`} />
                            <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent top-1/3 pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`} />
                        </div>

                        {/* 2. Top Controls */}
                        <div className={`absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <div onClick={(e) => e.stopPropagation()} className={`pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg backdrop-blur-xl border border-white/20 text-white bg-blue-600/50`}>
                                <span className="drop-shadow-md">{type}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="pointer-events-auto p-2.5 rounded-full bg-black/20 backdrop-blur-xl text-white border border-white/10 hover:bg-white/20 transition-all active:scale-95">
                                <X size={22} />
                            </button>
                        </div>

                        {/* 3. Bottom Content */}
                        <div className={`absolute bottom-0 left-0 right-0 z-40 p-6 pb-8 text-white flex flex-col gap-5 max-h-[65%] overflow-y-auto scrollbar-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <div><h1 className="text-3xl font-black leading-tight drop-shadow-lg mb-1">{title}</h1></div>
                            <div className="flex flex-col gap-2 shrink-0">
                                <div className="flex items-center gap-3 text-sm font-medium text-gray-100">
                                    <div className="p-2 rounded-full bg-white/10 backdrop-blur-md"><Clock size={16} className="text-blue-400" /></div>
                                    {/* Ideally reuse formatDateRange logic properly or reconstruct */}
                                    <span className="drop-shadow-md">{date} • {timeStart} - {timeEnd} {isOvernight ? '(+1 day)' : ''}</span>
                                </div>
                                {/* Location Row (Clickable) */}
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-3 text-sm font-medium text-gray-100 hover:text-white transition-colors group/loc"
                                >
                                    <div className="p-2 rounded-full bg-white/10 backdrop-blur-md group-hover/loc:bg-white/20 transition-colors">
                                        <MapPin size={16} className="text-red-500" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="underline decoration-white/30 underline-offset-4 drop-shadow-md truncate pr-4">
                                            {venue ? venue.split(',')[0] : 'Unknown Location'}
                                        </span>
                                        {distanceString && (
                                            <span className="text-[10px] font-bold text-blue-300 mt-0.5 animate-pulse">
                                                {distanceString} away
                                            </span>
                                        )}
                                    </div>
                                </a>
                            </div>
                            <div className="prose prose-invert prose-sm max-w-none"><p className="text-sm text-gray-200 leading-relaxed opacity-90 font-medium dropshadow-md">{description || 'No description provided.'}</p></div>

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
                        <div className={`relative w-full h-40 border-b flex items-center justify-center overflow-hidden shrink-0 transition-colors
                             ${theme === 'cyberpunk' ? 'bg-cyan-950/20 border-cyan-500/20' : theme === 'light' ? 'bg-gray-100 border-gray-200' : 'bg-zinc-800/50 border-white/10'}`}>
                            <button onClick={onClose} className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors shadow-lg active:scale-90"><X size={18} /></button>
                            {imageUrl ? (
                                <>
                                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover bg-black/20" />
                                    <button onClick={(e) => { e.stopPropagation(); setImageUrl(''); }} className="absolute bottom-3 right-3 p-1.5 bg-red-500 text-white rounded-full shadow-lg"><X size={14} /></button>
                                </>
                            ) : (
                                <div className="flex gap-4">
                                    <label className="flex flex-col items-center gap-2 cursor-pointer group/cam">
                                        <div className={`p-3.5 rounded-full shadow-lg active:scale-90 transition-transform ${theme === 'cyberpunk' ? 'bg-cyan-600 shadow-cyan-500/30 text-white' : 'bg-blue-600 text-white shadow-blue-500/30'}`}><Camera size={24} /></div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Camera</span>
                                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                                    </label>
                                    <label className="flex flex-col items-center gap-2 cursor-pointer group/gal">
                                        <div className={`p-3.5 rounded-full shadow-sm border active:scale-90 transition-transform ${theme === 'light' ? 'bg-gray-50 border-gray-200 text-gray-700' : 'bg-white/10 border-white/5 text-gray-400'}`}><ImageIcon size={24} /></div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Gallery</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                                    </label>
                                </div>
                            )}
                            {isUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center flex-col gap-2 backdrop-blur-sm"><div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" /><span className="text-xs font-bold text-white">Uploading...</span></div>}
                        </div>

                        <div className="p-6 pt-4 pb-2"><h2 className={`text-xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Create New Event</h2></div>

                        <form onSubmit={handleSubmit} className="flex-1 min-h-0 px-6 pb-6 overflow-y-auto space-y-4 scrollbar-thin">
                            {/* Where */}
                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Where</label>
                                <input type="text" required value={venue} placeholder="Search address..." onChange={(e) => { setVenue(e.target.value); setIsSearching(true); setCurrentLocation(null); }}
                                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all pl-10 text-sm ${theme === 'light' ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`} />
                                <MapPin className="absolute left-3.5 top-[34px] text-gray-400" size={16} />
                                {suggestions.length > 0 && (
                                    <div className={`absolute z-20 w-full mt-1 border rounded-xl shadow-xl max-h-48 overflow-y-auto ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-zinc-800 border-zinc-700'}`}>
                                        {suggestions.map((item, i) => (
                                            <div key={i} className={`p-3 cursor-pointer text-sm truncate flex items-center gap-2 transition-colors ${theme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-200 hover:bg-white/10'}`}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    setVenue(item.display_name);
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
                                <input type="text" required value={title} placeholder="Event Title" onChange={(e) => setTitle(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border outline-none text-sm font-medium ${theme === 'light' ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`} />
                            </div>

                            {/* --- NEW DATE / TIME SECTION --- */}
                            <div className="space-y-4">
                                {/* Date Row */}
                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <div className="flex items-center gap-3">
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">When</label>

                                            {/* All Day Toggle (Moved Here) */}
                                            <button type="button"
                                                className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full border transition-all ${isAllDay ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-transparent border-transparent text-gray-400 hover:bg-white/5'}`}
                                                onClick={() => setIsAllDay(!isAllDay)}>
                                                <div className={`w-6 h-3 rounded-full p-0.5 transition-colors duration-300 ${isAllDay ? 'bg-blue-500' : 'bg-gray-400'}`}>
                                                    <div className={`w-2 h-2 bg-white rounded-full transition-transform duration-300 ${isAllDay ? 'translate-x-3' : 'translate-x-0'}`} />
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider">All Day</span>
                                            </button>
                                        </div>

                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => handleQuickDate('today')} className="text-[10px] font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors uppercase">Today</button>
                                            <button type="button" onClick={() => handleQuickDate('tmrw')} className="text-[10px] font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors uppercase">Tmrw</button>
                                        </div>
                                    </div>
                                    <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
                                        className={`w-full px-4 py-3 rounded-xl border outline-none text-sm font-medium ${theme === 'light' ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`} />
                                </div>

                                {/* Timer Row (Only if Not All Day) */}
                                {!isAllDay && (
                                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Start Time</label>
                                            <input type="time" required value={timeStart} onChange={(e) => setTimeStart(e.target.value)}
                                                className={`w-full px-4 py-3 rounded-xl border outline-none text-lg font-bold text-center ${theme === 'light' ? 'bg-gray-50 text-gray-900' : 'bg-white/5 text-white'}`} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex justify-between">
                                                <span>End Time</span>
                                                {isOvernight && <span className="text-pink-500 text-[10px] font-bold">+1 Day</span>}
                                            </label>
                                            <input type="time" required value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)}
                                                className={`w-full px-4 py-3 rounded-xl border outline-none text-lg font-bold text-center ${theme === 'light' ? 'bg-gray-50 text-gray-900' : 'bg-white/5 text-white'} ${isOvernight ? 'border-pink-500/50 text-pink-100' : ''}`} />
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* --- END DATE / TIME SECTION --- */}

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

                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details..." rows={2}
                                className={`w-full px-4 py-3 rounded-xl border outline-none text-sm resize-none ${theme === 'light' ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`} />

                            <button type="submit" className="w-full py-4 bg-blue-600 font-bold rounded-xl text-white hover:bg-blue-500 transition-colors shadow-lg">{isEditMode ? 'Update Event' : 'Create Event'}</button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
