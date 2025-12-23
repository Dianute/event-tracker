'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (eventData: { title: string; description: string; type: string; startTime: string; endTime: string; lat?: number; lng?: number; venue?: string; imageUrl?: string }) => void;
    initialLocation: { lat: number; lng: number } | null;
    event?: any; // Event object for viewing
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

export default function EventModal({ isOpen, onClose, onSubmit, initialLocation, event }: EventModalProps) {
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
                    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${initialLocation.lat}&lon=${initialLocation.lng}`)
                        .then(res => res.json())
                        .then(data => { if (data.display_name) setVenue(data.display_name); })
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
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white dark:bg-[#121212] rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-white/10 flex flex-col max-h-[90vh]">

                {/* Header Image or Upload Area */}
                {!isReadOnly ? (
                    // Create Mode: Upload Area
                    <div className="relative w-full h-40 bg-gray-100 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0 group cursor-pointer transition-colors hover:bg-gray-200 dark:hover:bg-white/10">
                        {imageUrl ? (
                            <>
                                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setImageUrl('');
                                    }}
                                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-3 w-full h-full justify-center">
                                <div className="flex gap-4">
                                    {/* Camera Button - Direct Launch */}
                                    <label className="flex flex-col items-center gap-2 cursor-pointer group/cam">
                                        <div className="p-3.5 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 group-hover/cam:scale-110 transition-transform">
                                            <Camera size={24} />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover/cam:text-blue-600 transition-colors">
                                            Camera
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={handleImageUpload}
                                            disabled={isUploading}
                                        />
                                    </label>

                                    {/* Gallery Button - File Picker */}
                                    <label className="flex flex-col items-center gap-2 cursor-pointer group/gal">
                                        <div className="p-3.5 rounded-full bg-white dark:bg-white/10 shadow-sm border border-gray-100 dark:border-white/5 group-hover/gal:scale-110 transition-transform">
                                            <ImageIcon size={24} className="text-gray-500 dark:text-gray-400" />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover/gal:text-gray-800 dark:group-hover/gal:text-white transition-colors">
                                            Gallery
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleImageUpload}
                                            disabled={isUploading}
                                        />
                                    </label>
                                </div>

                                {isUploading && (
                                    <span className="text-xs font-bold text-blue-500 animate-pulse mt-1">
                                        Uploading...
                                    </span>
                                )}
                            </div>

                        )}
                    </div>
                ) : imageUrl && (
                    // View Mode: Display Image (Instagram/Story Style)
                    <div className="relative w-full bg-black shrink-0 group overflow-hidden">
                        {/* Blurred Background for Fill */}
                        <div
                            className="absolute inset-0 opacity-50 blur-2xl scale-110 transition-opacity duration-700"
                            style={{
                                backgroundImage: `url(${imageUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                        />

                        {/* Main Image - Contain to show full content */}
                        <div className="relative w-full min-h-[300px] max-h-[60vh] flex items-center justify-center bg-transparent backdrop-blur-sm/20">
                            <img
                                src={imageUrl}
                                alt={title}
                                className="w-auto h-auto max-w-full max-h-[60vh] object-contain shadow-2xl drop-shadow-2xl"
                            />
                        </div>

                        {/* Expand Button (Optional, visual cue) */}
                        <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-md p-1.5 rounded-full text-white/70 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ImageIcon size={14} />
                        </div>
                    </div>
                )}


                <div className="flex items-start justify-between p-6 pb-2">
                    <div className="flex-1 pr-4">
                        {isReadOnly && (
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 border bg-opacity-10
                                ${type === 'music' ? 'text-pink-600 bg-pink-100 border-pink-200 dark:text-pink-400 dark:bg-pink-500/10 dark:border-pink-500/20' :
                                    type === 'food' ? 'text-orange-600 bg-orange-100 border-orange-200 dark:text-orange-400 dark:bg-orange-500/10 dark:border-orange-500/20' :
                                        type === 'sports' ? 'text-green-600 bg-green-100 border-green-200 dark:text-green-400 dark:bg-green-500/10 dark:border-green-500/20' :
                                            'text-blue-600 bg-blue-100 border-blue-200 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20'}`}>
                                <Tag size={10} /> {type}
                            </div>
                        )}
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                            {isReadOnly ? title : 'Create New Event'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 -mt-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10 rounded-full transition-all">
                        <X size={24} />
                    </button>
                </div>

                {isReadOnly ? (
                    // --- VIEW MODE ---
                    <div className="p-6 pt-2 overflow-y-auto space-y-6">

                        {/* Time & Location */}
                        <div className="space-y-3 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/5">
                            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                                <Calendar className="text-blue-500 shrink-0" size={20} />
                                <div>
                                    <p className="font-semibold text-sm text-gray-900 dark:text-white">Date & Time</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateRange(startTime, endTime)}</p>
                                </div>
                            </div>

                            <div className="w-full h-px bg-gray-200 dark:bg-white/10"></div>

                            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                                <MapPin className="text-red-500 shrink-0" size={20} />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate text-gray-900 dark:text-white">{venue || 'Unknown Location'}</p>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${currentLocation?.lat},${currentLocation?.lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                                    >
                                        Open in Maps <ExternalLink size={10} />
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                About Event
                            </h3>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {description || 'No description provided.'}
                            </p>
                        </div>

                        {/* Action Link */}
                        {event?.link && (
                            <a
                                href={event.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 dark:shadow-blue-900/20 transition-all transform active:scale-95 group"
                            >
                                <span>Get Tickets / Info</span>
                                <ExternalLink size={18} className="group-hover:translate-x-1 transition-transform" />
                            </a>
                        )}
                    </div>
                ) : (
                    // --- CREATE MODE (Existing Form) ---
                    <form onSubmit={handleSubmit} className="p-6 pt-2 overflow-y-auto space-y-4">
                        <div className="relative">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Where</label>
                            <input
                                type="text"
                                required
                                value={venue}
                                onChange={(e) => {
                                    setVenue(e.target.value);
                                    setIsSearching(true);
                                }}
                                placeholder="Search address or click on map..."
                                onFocus={() => {
                                    if (initialLocation) {
                                        setSuggestions(prev => {
                                            if (prev.some(s => s.osm_id === 'current-loc')) return prev;
                                            return [{
                                                display_name: "📍 Use Current Location",
                                                lat: String(initialLocation.lat),
                                                lon: String(initialLocation.lng),
                                                osm_id: 'current-loc'
                                            }, ...prev];
                                        });
                                    }
                                }}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all pl-10 text-sm text-zinc-900 dark:text-white placeholder-gray-400"
                            />
                            <MapPin className="absolute left-3.5 top-[34px] text-gray-400" size={16} />

                            {suggestions.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                    {suggestions.map((item, i) => (
                                        <div
                                            key={i}
                                            className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer text-sm truncate flex items-center gap-2 text-gray-700 dark:text-gray-200"
                                            onClick={() => {
                                                setVenue(item.display_name);
                                                setCurrentLocation({
                                                    lat: parseFloat(item.lat),
                                                    lng: parseFloat(item.lon)
                                                });
                                                setSuggestions([]);
                                                setIsSearching(false);
                                            }}
                                        >
                                            <MapPin size={12} className="text-gray-400" /> {item.display_name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">What</label>
                            <input
                                type="text"
                                required
                                value={title}
                                placeholder="Event Title"
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium text-zinc-900 dark:text-white placeholder-gray-400"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Details</label>
                            <textarea
                                value={description}
                                placeholder="Describe the event..."
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm resize-none text-zinc-900 dark:text-white placeholder-gray-400"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Start</label>
                                <div className="relative">
                                    <input
                                        type="datetime-local"
                                        required
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full px-3 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs text-zinc-900 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">End</label>
                                <div className="relative">
                                    <input
                                        type="datetime-local"
                                        required
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full px-3 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs text-zinc-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Category</label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: 'social', label: 'Social', emoji: '🍻' },
                                    { id: 'food', label: 'Food', emoji: '🍔' },
                                    { id: 'music', label: 'Music', emoji: '🎵' },
                                    { id: 'arts', label: 'Arts', emoji: '🎨' },
                                    { id: 'learning', label: 'Learn', emoji: '📚' },
                                    { id: 'sports', label: 'Sport', emoji: '⚽' }
                                ].map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setType(cat.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all
                                            ${type === cat.id
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 transform scale-105'
                                                : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20'
                                            }`}
                                    >
                                        <span className="text-sm">{cat.emoji}</span>
                                        <span>{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 dark:shadow-blue-900/20 transition-all transform hover:scale-[1.01] active:scale-[0.98] mt-2"
                        >
                            Create Event
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
