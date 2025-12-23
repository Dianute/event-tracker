'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Tag, ExternalLink, Clock, Camera, Image as ImageIcon } from 'lucide-react';

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (eventData: { title: string; description: string; type: string; startTime: string; endTime: string; lat?: number; lng?: number; venue?: string; imageUrl?: string }) => void;
    initialLocation: { lat: number; lng: number } | null;
    event?: any; // Event object for viewing
    theme?: 'dark' | 'light' | 'cyberpunk';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Helper: Convert UTC string to Local 'YYYY-MM-DDTHH:mm' for Input
const toLocalISOString = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const offset = date.getTimezoneOffset() * 60000;
    const local = new Date(date.getTime() - offset);
    return local.toISOString().slice(0, 16);
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

    // Search Handler helper
    const handleLocationSearch = async (query: string) => {
        setVenue(query);
        if (query.length > 2) {
            setIsSearching(true);
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
                const data = await res.json();
                setSuggestions(data.slice(0, 5));
            } catch (err) {
                console.error("Search failed", err);
            }
            setIsSearching(false);
        } else {
            setSuggestions([]);
        }
    };

    const selectLocation = (place: any) => {
        setVenue(place.display_name);
        setCurrentLocation({ lat: parseFloat(place.lat), lng: parseFloat(place.lon) });
        setSuggestions([]);
    };

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
            alert("Error uploading image");
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

        const startUTC = new Date(startTime).toISOString();
        const endUTC = new Date(endTime).toISOString();

        onSubmit({
            title, description, type,
            startTime: startUTC, endTime: endUTC,
            lat: currentLocation.lat, lng: currentLocation.lng,
            venue, imageUrl
        });
        onClose();
    };

    // THEME STYLES
    const isCyber = theme === 'cyberpunk';
    const isLight = theme === 'light';

    const bgClass = isCyber ? 'bg-[#050510] border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.2)]' : isLight ? 'bg-white border-gray-200' : 'bg-[#121212] border-white/10';
    const textClass = isCyber ? 'text-cyan-50' : isLight ? 'text-gray-900' : 'text-white';
    const labelClass = isCyber ? 'text-cyan-400' : isLight ? 'text-gray-500' : 'text-gray-400';

    // Dynamic Input Styles - Replacing hardcoded dark: classes
    const inputClass = isCyber
        ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-100 placeholder-cyan-700/50 focus:border-cyan-400 focus:ring-cyan-400/20'
        : isLight
            ? 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white'
            : 'bg-white/5 border-white/10 text-white placeholder-white/20 focus:border-white/30';

    const buttonPrimaryClass = isCyber
        ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)] border border-cyan-400/50'
        : isLight
            ? 'bg-blue-600 hover:bg-blue-500 text-white'
            : 'bg-white text-black hover:bg-gray-200';

    const uploadAreaClass = isCyber
        ? 'bg-cyan-900/10 hover:bg-cyan-900/20 border-b border-cyan-500/30'
        : isLight
            ? 'bg-gray-100 hover:bg-gray-200 border-b border-gray-200'
            : 'bg-white/5 hover:bg-white/10 border-b border-white/10';

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200 overflow-y-auto">
            <div className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border flex flex-col my-auto relative ${bgClass}`}>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className={`absolute top-4 right-4 z-50 p-2 rounded-full backdrop-blur-md transition-colors 
                        ${isCyber ? 'bg-black/40 text-cyan-400 hover:bg-cyan-900/50' : 'bg-black/20 text-white hover:bg-black/40'}`}
                >
                    <X size={20} />
                </button>

                {/* CONTENT */}
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    {/* Header Image or Upload Area */}
                    {!isReadOnly ? (
                        <div className={`relative w-full h-40 flex items-center justify-center overflow-hidden shrink-0 group cursor-pointer transition-colors ${uploadAreaClass}`}>
                            {imageUrl ? (
                                <>
                                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setImageUrl(''); }}
                                        className="absolute top-2 right-12 p-1 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-3 w-full h-full justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                                    <div className="flex gap-4">
                                        <label className="flex flex-col items-center gap-2 cursor-pointer group/cam">
                                            <div className={`p-3.5 rounded-full shadow-lg transition-transform group-hover/cam:scale-110 
                                                ${isCyber ? 'bg-cyan-600 text-white shadow-cyan-500/30' : 'bg-blue-600 text-white shadow-blue-500/30'}`}>
                                                <Camera size={24} />
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${labelClass}`}>Camera</span>
                                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                                        </label>

                                        <label className="flex flex-col items-center gap-2 cursor-pointer group/gal">
                                            <div className={`p-3.5 rounded-full shadow-sm border transition-transform group-hover/gal:scale-110
                                                ${isCyber ? 'bg-cyan-950/50 border-cyan-500/30' : isLight ? 'bg-white border-gray-200' : 'bg-white/10 border-white/5'}`}>
                                                <ImageIcon size={24} className={isCyber ? 'text-cyan-400' : isLight ? 'text-gray-500' : 'text-gray-400'} />
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${labelClass}`}>Gallery</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                                        </label>
                                    </div>
                                    {isUploading && <span className="text-xs font-bold text-blue-500 animate-pulse mt-1">Uploading...</span>}
                                </div>
                            )}
                        </div>
                    ) : imageUrl && (
                        <div className="w-full h-64 shrink-0 relative">
                            {/* Image background with blur for portrait photos */}
                            <div
                                className="absolute inset-0 bg-cover bg-center blur-xl opacity-50 transform scale-110"
                                style={{ backgroundImage: `url(${imageUrl})` }}
                            />
                            <div className="absolute inset-0 bg-black/20" /> {/* Dimmer */}
                            <img
                                src={imageUrl}
                                alt={event.title}
                                className="absolute inset-0 w-full h-full object-contain z-10"
                            />
                        </div>
                    )}

                    <div className="p-6 space-y-5 overflow-y-auto">
                        {/* Edit Mode Header */}
                        {!isReadOnly && (
                            <h2 className={`text-xl font-bold mb-2 ${textClass}`}>New Event</h2>
                        )}

                        {/* Title */}
                        <div className="space-y-1.5">
                            <label className={`text-xs font-bold uppercase tracking-widest ml-1 ${labelClass}`}>Event Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Techno Bunker Party"
                                className={`w-full p-3 rounded-xl border outline-none transition-all font-medium ${inputClass}`}
                                readOnly={isReadOnly}
                            />
                        </div>

                        {/* Category Buttons */}
                        <div className="space-y-2">
                            <label className={`text-xs font-bold uppercase tracking-widest ml-1 ${labelClass}`}>Category</label>
                            <div className="flex flex-wrap gap-2">
                                {['social', 'music', 'tech', 'art', 'food', 'sports'].map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => !isReadOnly && setType(cat)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all
                                            ${type === cat
                                                ? (isCyber ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]' : isLight ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white text-black border-white')
                                                : (isCyber ? 'bg-transparent border-cyan-900/50 text-cyan-700 hover:border-cyan-700' : isLight ? 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200' : 'bg-transparent border-white/10 text-gray-500 hover:border-white/30')
                                            } ${isReadOnly ? 'cursor-default' : ''}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <label className={`text-xs font-bold uppercase tracking-widest ml-1 ${labelClass}`}>Description (Optional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What's happening?"
                                className={`w-full p-3 rounded-xl border outline-none transition-all min-h-[80px] resize-none ${inputClass}`}
                                readOnly={isReadOnly}
                            />
                        </div>

                        {/* Time Row */}
                        {!isReadOnly ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className={`text-xs font-bold uppercase tracking-widest ml-1 ${labelClass}`}>Starts</label>
                                    <div className="relative">
                                        <Calendar size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${labelClass}`} />
                                        <input
                                            type="datetime-local"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className={`w-full p-3 pl-10 rounded-xl border outline-none transition-all text-sm ${inputClass} [color-scheme:${isLight ? 'light' : 'dark'}]`}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className={`text-xs font-bold uppercase tracking-widest ml-1 ${labelClass}`}>Ends</label>
                                    <div className="relative">
                                        <Clock size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${labelClass}`} />
                                        <input
                                            type="datetime-local"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className={`w-full p-3 pl-10 rounded-xl border outline-none transition-all text-sm ${inputClass} [color-scheme:${isLight ? 'light' : 'dark'}]`}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={`flex items-center gap-2 text-sm font-medium p-3 rounded-lg border ${isLight ? 'bg-gray-50 border-gray-200 text-gray-700' : 'bg-white/5 border-white/5 text-gray-300'}`}>
                                <Clock size={16} className="text-blue-400" />
                                {formatDateRange(event?.startTime, event?.endTime)}
                            </div>
                        )}

                        {/* Location */}
                        <div className="space-y-1.5 relative">
                            <label className={`text-xs font-bold uppercase tracking-widest ml-1 ${labelClass}`}>Location</label>
                            <div className="relative">
                                <MapPin size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${labelClass}`} />
                                <input
                                    type="text"
                                    value={venue}
                                    onChange={(e) => handleLocationSearch(e.target.value)}
                                    placeholder="Search or tap map..."
                                    className={`w-full p-3 pl-10 rounded-xl border outline-none transition-all text-sm ${inputClass}`}
                                    readOnly={isReadOnly}
                                />
                                {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent"></div>}
                            </div>

                            {/* Suggestions Dropdown */}
                            {suggestions.length > 0 && (
                                <div className={`absolute left-0 right-0 top-full mt-2 rounded-xl shadow-2xl z-50 overflow-hidden border ${isLight ? 'bg-white border-gray-100' : 'bg-[#1a1a1a] border-white/10'}`}>
                                    {suggestions.map((place, i) => (
                                        <div
                                            key={i}
                                            onClick={() => selectLocation(place)}
                                            className={`p-3 text-sm cursor-pointer border-b last:border-0 transition-colors ${isLight ? 'border-gray-100 hover:bg-gray-50 text-gray-800' : 'border-white/5 hover:bg-white/5 text-gray-300'}`}
                                        >
                                            {place.display_name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* View External Link */}
                        {isReadOnly && (event.link || (event.description && event.description.split('\n')[2]?.startsWith('http'))) && (
                            <a
                                href={event.link || event.description.split('\n')[2]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold uppercase tracking-widest transition-all mt-4"
                            >
                                View Source / Tickets <ExternalLink size={16} />
                            </a>
                        )}

                        {/* Submit Button */}
                        {!isReadOnly && (
                            <button
                                type="submit"
                                className={`w-full p-4 rounded-xl font-bold uppercase tracking-widest transition-all mt-4 active:scale-[0.98] ${buttonPrimaryClass}`}
                            >
                                Create Event
                            </button>
                        )}

                    </div>
                </form>
            </div>
        </div>
    );
}
