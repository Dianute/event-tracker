'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Camera, Image as ImageIcon, Clock, MapPin, ExternalLink, Calendar, Tag, Plus, Minus, Navigation, Maximize2, Phone, ChevronLeft, ChevronRight, Share2, Copy, Check, Info, ZoomIn, ZoomOut } from 'lucide-react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useSession } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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
    if (!data || !data.address) return data.display_name?.split(',').slice(0, 3).join(',') || '';

    const parts = [];

    // 1. Street + Number
    let road = data.address.road || data.address.pedestrian || data.address.footway || data.address.path;
    const number = data.address.house_number;

    if (road) {
        if (number) parts.push(`${road} ${number}`);
        else parts.push(road);
    }

    // 2. City & Zip
    const city = data.address.city || data.address.town || data.address.village || data.address.hamlet;
    const zip = data.address.postcode;

    if (city) {
        if (zip) parts.push(`${zip} ${city}`);
        else parts.push(city);
    }

    // 3. Country
    if (data.address.country) parts.push(data.address.country);

    // Fallback logic
    if (parts.length === 0 && data.display_name) {
        return data.display_name.split(',').slice(0, 3).join(', ');
    }

    return parts.join(', ');
};

// Helper Component: Single Slide in the Feed
function EventFeedSlide({ event, theme, onClose, onZoom, userLocation }: { event: any, theme: string, onClose: () => void, onZoom: (url: string) => void, userLocation?: { lat: number, lng: number } | null }) {
    const [showControls, setShowControls] = useState(true);

    const title = event.title;
    const description = event.description;
    const type = event.type;
    const imageUrl = event.imageUrl;
    const venue = event.venue || event.location || '';

    // Parse Dates
    const startObj = new Date(event.startTime);
    const endObj = new Date(event.endTime);
    // Local Date String
    const date = startObj.getFullYear() + '-' + String(startObj.getMonth() + 1).padStart(2, '0') + '-' + String(startObj.getDate()).padStart(2, '0');
    // Format Time
    const formatTime = (d: Date) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    const timeStart = formatTime(startObj);
    const timeEnd = formatTime(endObj);
    const isOvernight = timeEnd < timeStart;

    // Derived Distance
    const distanceText = (userLocation && event.lat && event.lng)
        ? getDistance(userLocation.lat, userLocation.lng, event.lat, event.lng)
        : null;

    return (
        <div className="w-full h-full relative bg-black group cursor-pointer overflow-hidden" onClick={() => setShowControls(!showControls)}>

            {/* 1. Image Layer (Absolute, Fixed, Top Aligned) */}
            <div className="absolute inset-0 z-0 flex items-start justify-center bg-black">
                {imageUrl ? (
                    <>
                        {/* Ambient Blur Background */}
                        <div className="absolute inset-0 z-0">
                            <img src={imageUrl} alt="" className="w-full h-full object-cover blur-3xl opacity-40 scale-110" />
                        </div>

                        {/* Main Image - Top Aligned, Contained, No Padding */}
                        <img src={imageUrl} alt={title}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!showControls) {
                                    setShowControls(true);
                                } else {
                                    onZoom(imageUrl);
                                }
                            }}
                            className={`relative z-10 w-full h-full cursor-zoom-in transition-all duration-300 ${showControls ? 'object-contain object-top' : 'object-contain object-center bg-black/90'}`}
                        />
                    </>
                ) : (
                    <div className={`w-full h-full flex items-center justify-center ${theme === 'light' ? 'bg-gray-100' : 'bg-zinc-900'}`}>
                        <ImageIcon size={48} className="text-white/20" />
                    </div>
                )}

                {/* Gradient Helper for Text legibility - Stronger Fade */}
                <div className={`absolute bottom-0 left-0 right-0 h-4/5 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none transition-opacity duration-300 z-20 ${showControls ? 'opacity-100' : 'opacity-0'}`} />
            </div>

            {/* 2. Top Controls - pointer-events-none ensures clicks pass to image unless hitting buttons */}
            <div className={`absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50 transition-opacity duration-300 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <div onClick={(e) => e.stopPropagation()} className={`pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg backdrop-blur-xl border border-white/20 text-white bg-black/50`}>
                    <span className="drop-shadow-md">{type}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="pointer-events-auto p-2.5 rounded-full bg-black/20 backdrop-blur-xl text-white border border-white/10 hover:bg-white/20 transition-all active:scale-95 text-center flex items-center justify-center shadow-lg">
                    <X size={22} />
                </button>
            </div>



            {/* 3. Bottom Content (Absolute Overlays) */}
            <div
                onClick={(e) => e.stopPropagation()}
                className={`absolute bottom-0 left-0 right-0 z-40 p-6 pb-20 md:pb-8 text-white flex flex-col gap-4 max-h-[60%] overflow-y-auto scrollbar-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
                {/* Zoom Hint Button (Above Title) */}
                {/* Zoom Hint Button (Icon Only - Bigger) */}
                <button
                    onClick={(e) => { e.stopPropagation(); onZoom(imageUrl); }}
                    className="self-start mb-2 pointer-events-auto bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/10 rounded-full p-2.5 flex items-center justify-center transition-all duration-300 active:scale-95"
                    title="Enlarge Image"
                >
                    <Maximize2 size={24} className="text-white drop-shadow-md" />
                </button>

                <div><h1 className="text-3xl font-black leading-tight drop-shadow-xl mb-1 text-white">{title}</h1></div>
                <div className="flex flex-col gap-2 shrink-0">
                    <div className="flex items-center gap-3 text-sm font-medium text-gray-200">
                        <div className="p-2 rounded-full bg-white/10 backdrop-blur-md"><Clock size={16} className="text-blue-400" /></div>
                        <span className="drop-shadow-md">{date} • {timeStart} - {timeEnd} {isOvernight ? '(+1 day)' : ''}</span>
                    </div>
                    {/* Location Row (Clickable) */}
                    <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-3 text-sm font-medium text-gray-200 hover:text-white transition-colors group/loc"
                    >
                        <div className="p-2 rounded-full bg-white/10 backdrop-blur-md group-hover/loc:bg-white/20 transition-colors">
                            <MapPin size={16} className="text-red-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="underline decoration-white/30 underline-offset-4 drop-shadow-md pr-4 leading-snug">
                                {venue || 'Unknown Location'}
                            </span>
                            {distanceText && (
                                <span className="text-xs font-bold text-blue-400 flex items-center gap-1 mt-0.5">
                                    <Navigation size={10} /> {distanceText} away
                                </span>
                            )}
                        </div>
                    </a>

                    {/* Phone Button (if phone exists) */}
                    {event.phone && (
                        <a
                            href={`tel:${event.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-3 text-sm font-medium text-gray-200 hover:text-white transition-colors group/phone"
                        >
                            <div className="p-2 rounded-full bg-white/10 backdrop-blur-md group-hover/phone:bg-white/20 transition-colors">
                                <Phone size={16} className="text-green-500" />
                            </div>
                            <span className="underline decoration-white/30 underline-offset-4 drop-shadow-md">
                                {event.phone}
                            </span>
                        </a>
                    )}
                </div>
                {description && (
                    <div className="prose prose-invert prose-sm max-w-none">
                        <p className="text-sm text-gray-300 leading-relaxed font-medium drop-shadow-md">{description}</p>
                    </div>
                )}

                {/* Action Button */}
                {event?.link && (
                    <a
                        href={event.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full py-3.5 bg-white text-black font-black rounded-xl text-center shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 shrink-0"
                    >
                        <span>GET TICKETS</span>
                        <ExternalLink size={16} />
                    </a>
                )}
            </div>
        </div>
    );
}

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (eventData: { title: string; description: string; type: string; startTime: string; endTime: string; lat?: number; lng?: number; venue?: string; imageUrl?: string; phone?: string; userEmail?: string | null }) => void;
    initialLocation: { lat: number; lng: number } | null;
    userLocation?: { lat: number; lng: number } | null;
    event?: any; // Event object for viewing or editing
    theme?: 'dark' | 'light' | 'cyberpunk';
    readOnly?: boolean;
    feed?: any[];
    savedLocations?: { venue: string; lat: number; lng: number }[];
    userLocations?: any[]; // Persistent saved locations from API
    onLocationsChange?: () => void;
}

export default function EventModal({ isOpen, onClose, onSubmit, initialLocation, userLocation, event, theme = 'dark', readOnly = false, feed = [], savedLocations = [], userLocations = [], onLocationsChange }: EventModalProps) {

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('social');

    // NEW Date/Time States
    const [date, setDate] = useState(''); // YYYY-MM-DD
    const [timeStart, setTimeStart] = useState('12:00'); // HH:mm
    const [timeEnd, setTimeEnd] = useState('14:00'); // HH:mm
    const [isAllDay, setIsAllDay] = useState(false);

    const [venue, setVenue] = useState('');
    const [phone, setPhone] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showControls, setShowControls] = useState(true);

    // Zoom & Scroll State
    const [isFullImage, setIsFullImage] = useState(false);
    const [zoomedImage, setZoomedImage] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const { data: session } = useSession();

    // Dropdown state for saved locations
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);

    // Derived distance (Legacy use)
    const distanceString = (event && userLocation && event.lat && event.lng)
        ? getDistance(userLocation.lat, userLocation.lng, event.lat, event.lng)
        : null;

    // Overnight Helper for Form
    const isOvernight = !isAllDay && timeEnd < timeStart;

    // Effect to reset or populate form
    useEffect(() => {
        if (isOpen) {
            setIsFullImage(false); // Reset zoom on open
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

                // Check All Day Heuristic
                const isFullDay = (formatTime(startObj) === '00:00' && formatTime(endObj) === '00:00') ||
                    (formatTime(startObj) === '00:00' && formatTime(endObj) === '23:59');
                setIsAllDay(isFullDay);

                setVenue(event.venue || event.location || '');
                setPhone(event.phone || '');
                setImageUrl(event.imageUrl || '');
                setCurrentLocation({ lat: event.lat, lng: event.lng });
            } else {
                // CREATE MODE (Reset)
                setTitle('');
                setDescription('');
                setType('social');
                setImageUrl('');
                setPhone('');
                setIsUploading(false);
                setIsSearching(false);
                setZoomedImage('');

                // Default: Today
                const now = new Date();
                const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                setDate(todayStr);

                // Default Time: Next full hour
                const nextHour = now.getHours() + 1;
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

    // Auto-save form data to localStorage (prevents data loss when switching tabs)
    useEffect(() => {
        if (!event && isOpen) {
            // Only auto-save in CREATE mode
            const formData = {
                title, description, type, venue, date, timeStart, timeEnd, isAllDay,
                currentLocation, imageUrl
            };
            localStorage.setItem('event-form-draft', JSON.stringify(formData));
        }
    }, [title, description, type, venue, date, timeStart, timeEnd, isAllDay, currentLocation, imageUrl, event, isOpen]);

    // Restore draft on modal open (CREATE mode only) - Run once per modal open
    const draftRestored = useRef(false);
    useEffect(() => {
        if (isOpen && !event && !draftRestored.current) {
            const draft = localStorage.getItem('event-form-draft');
            if (draft) {
                try {
                    const data = JSON.parse(draft);
                    // Only restore if fields are empty (don't override template clicks)
                    if (!title && data.title) setTitle(data.title);
                    if (!description && data.description) setDescription(data.description);
                    if (data.type) setType(data.type);
                    if (!venue && data.venue && !initialLocation) setVenue(data.venue);
                    if (data.date) setDate(data.date);
                    if (data.timeStart) setTimeStart(data.timeStart);
                    if (data.timeEnd) setTimeEnd(data.timeEnd);
                    if (data.isAllDay !== undefined) setIsAllDay(data.isAllDay);
                    if (data.currentLocation && !initialLocation) setCurrentLocation(data.currentLocation);
                    if (data.imageUrl) setImageUrl(data.imageUrl);
                    draftRestored.current = true;
                } catch (e) {
                    console.error('Failed to restore draft:', e);
                }
            }
        }

        // Reset flag when modal closes
        if (!isOpen) {
            draftRestored.current = false;
        }
    }, [isOpen, event, initialLocation]);

    // Feed Scroll Logic
    useEffect(() => {
        if (isOpen && readOnly && event && scrollRef.current) {
            const el = document.getElementById(`slide-${event.id}`);
            if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
    }, [isOpen, readOnly, event]);

    // Forward Geocode Effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (venue.length > 2 && isSearching) {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(venue)}&limit=5&addressdetails=1`);
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

    const handleDeleteLocation = async (id: string, name: string) => {
        if (!confirm(`Delete saved location "${name}"?`)) return;

        try {
            const res = await fetch(`${API_URL}/api/user-locations/${id}`, {
                method: 'DELETE',
                headers: { 'x-user-email': session?.user?.email || '' }
            });
            if (res.ok) {
                if (onLocationsChange) onLocationsChange();
                // If we viewed this location in dropdown, close it? No need.
            } else {
                alert("Failed to delete location.");
            }
        } catch (e) {
            console.error("Delete failed", e);
        }
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
                headers: { 'x-admin-password': localStorage.getItem('admin_secret') || '' },
                body: formData
            });
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Prop readOnly check (edit mode safety)
        if (readOnly) return;

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

        // Helper to format for DB (Local ISO - maintains "Face Value" of time)
        const formatForDB = (dateObj: Date) => {
            const offset = dateObj.getTimezoneOffset() * 60000; // Offset in ms
            const localTime = new Date(dateObj.getTime() - offset);
            return localTime.toISOString().slice(0, -1); // Remove 'Z'
        };

        onSubmit({
            title, description, type,
            startTime: formatForDB(startDateTime),
            endTime: formatForDB(endDateTime),
            lat: finalLat!, lng: finalLng!, venue, imageUrl, phone,
            userEmail: session?.user?.email
        });

        // Clear draft on successful submission
        localStorage.removeItem('event-form-draft');
        onClose();
    };

    const handleQuickDate = (mode: 'today' | 'tmrw') => {
        const d = new Date();
        if (mode === 'tmrw') d.setDate(d.getDate() + 1);
        const s = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        setDate(s);
    };

    if (!isOpen) return null;

    // View/Edit Mode Logic
    const isEditMode = !readOnly;
    const activeFeed = (readOnly && feed && feed.length > 0) ? feed : (event ? [event] : []);

    return (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            {/* GLOBAL ZOOM OVERLAY */}
            {isFullImage && (zoomedImage || imageUrl) && (
                <div className="fixed inset-0 z-[3000] bg-black flex items-center justify-center animate-in fade-in duration-200"
                    onClick={() => setIsFullImage(false)}>

                    {/* Fixed Close Button (Always Visible) */}
                    <button onClick={(e) => { e.stopPropagation(); setIsFullImage(false); setZoomedImage(''); }}
                        className="absolute top-6 right-6 z-[3020] p-3 rounded-full bg-black/50 text-white backdrop-blur-md border border-white/20 active:scale-90 transition-transform hover:bg-red-500/50">
                        <X size={28} />
                    </button>

                    <TransformWrapper
                        initialScale={1}
                        minScale={1}
                        maxScale={5}
                        centerOnInit
                        doubleClick={{ mode: 'reset' }}
                    >
                        {({ zoomIn, zoomOut }) => (
                            <>
                                <div className="absolute top-6 right-20 z-[3010] flex gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); zoomOut(); }}
                                        className="p-3 rounded-full bg-black/50 text-white backdrop-blur-md border border-white/20 active:scale-90 transition-transform hover:bg-white/10 hidden md:block">
                                        <Minus size={24} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); zoomIn(); }}
                                        className="p-3 rounded-full bg-black/50 text-white backdrop-blur-md border border-white/20 active:scale-90 transition-transform hover:bg-white/10 hidden md:block">
                                        <Plus size={24} />
                                    </button>
                                </div>
                                <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                                    <img
                                        src={zoomedImage || imageUrl}
                                        alt="Zoom"
                                        className="max-w-full max-h-full object-contain p-2"
                                    // Removed stopPropagation so clicking image also closes (Tap to Dismiss)
                                    />
                                </TransformComponent>
                            </>
                        )}
                    </TransformWrapper>
                </div>
            )}

            {/* Main Modal Container */}
            <div className={`w-full h-[98dvh] md:h-[85vh] md:max-h-[800px] md:max-w-[450px] md:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 relative
                ${theme === 'cyberpunk' ? 'bg-[#050510] border-cyan-500/30' :
                    theme === 'light' ? 'bg-white border-gray-200 text-gray-900' :
                        'bg-zinc-900 border-white/10 text-white'}
                ${isEditMode ? 'rounded-t-3xl md:rounded-3xl' : ''}`}>

                {isEditMode ? (
                    // --- EDIT / CREATE FORM ---
                    <>
                        {/* HEADER IMAGE */}
                        <div className={`relative w-full h-40 border-b flex items-center justify-center overflow-hidden shrink-0 transition-colors
                             ${theme === 'cyberpunk' ? 'bg-cyan-950/20 border-cyan-500/20' : theme === 'light' ? 'bg-gray-100 border-gray-200' : 'bg-zinc-800/50 border-white/10'}`}>
                            <button
                                onClick={onClose}
                                className="absolute top-5 right-5 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-all active:scale-95"
                            >
                                <X size={28} />
                            </button>
                            {imageUrl ? (
                                <>
                                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover bg-black/20" />
                                    <button onClick={(e) => { e.stopPropagation(); setImageUrl(''); }} className="absolute bottom-3 right-3 p-1.5 bg-red-500 text-white rounded-full shadow-lg"><X size={14} /></button>
                                </>
                            ) : (
                                <div className="w-full h-full flex">
                                    <label className="flex-1 h-full flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors border-r border-white/5 relative group">
                                        <div className={`p-4 rounded-full transition-transform duration-300 group-hover:scale-110 group-active:scale-95 ${theme === 'cyberpunk' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-blue-500/10 text-blue-500'}`}>
                                            <Camera size={32} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Camera</span>
                                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                                    </label>

                                    <label className="flex-1 h-full flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors relative group">
                                        <div className={`p-4 rounded-full transition-transform duration-300 group-hover:scale-110 group-active:scale-95 ${theme === 'light' ? 'bg-gray-200 text-gray-600' : 'bg-purple-500/10 text-purple-500'}`}>
                                            <ImageIcon size={32} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Gallery</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                                    </label>
                                </div>
                            )}
                            {isUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center flex-col gap-2 backdrop-blur-sm"><div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" /><span className="text-xs font-bold text-white">Uploading...</span></div>}
                        </div>

                        <div className="p-6 pt-4 pb-2 flex items-center justify-between">
                            <h2 className={`text-xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Create New Event</h2>

                            {/* Saved Spots - Two Buttons: Last Used + Dropdown */}
                            {!event && userLocations.length > 0 && (
                                <div className="flex gap-2 items-center">
                                    {/* Button 1: Last Used Location (Quick Access) */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const firstLoc = userLocations[0];
                                            setTitle(firstLoc.name);
                                            setVenue(firstLoc.venue);
                                            setPhone(firstLoc.phone || '');
                                            if (firstLoc.lat && firstLoc.lng) setCurrentLocation({ lat: firstLoc.lat, lng: firstLoc.lng });
                                            localStorage.removeItem('event-form-draft');
                                        }}
                                        className="px-3 py-1.5 rounded-full border border-dashed border-gray-500 text-gray-500 text-[10px] font-bold uppercase hover:border-blue-500 hover:text-blue-500 transition-all"
                                    >
                                        {userLocations[0].name}
                                    </button>

                                    {/* Button 2: Dropdown for Other Locations */}
                                    {userLocations.length > 1 && (
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                                                className="px-3 py-1.5 rounded-full border border-dashed border-gray-500 text-gray-500 text-[10px] font-bold uppercase hover:border-blue-500 hover:text-blue-500 transition-all"
                                            >
                                                More ▼
                                            </button>

                                            {showLocationDropdown && (
                                                <div className="absolute right-0 mt-2 w-56 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50">
                                                    {userLocations.slice(1).map(loc => (
                                                        <div key={loc.id} className="group flex items-center w-full hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 relative">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setTitle(loc.name);
                                                                    setVenue(loc.venue);
                                                                    setPhone(loc.phone || '');
                                                                    if (loc.lat && loc.lng) setCurrentLocation({ lat: loc.lat, lng: loc.lng });
                                                                    setShowLocationDropdown(false);
                                                                    localStorage.removeItem('event-form-draft');
                                                                }}
                                                                className="flex-1 text-left px-4 py-2.5 text-sm text-gray-300 truncate pr-8"
                                                            >
                                                                {loc.name}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteLocation(loc.id, loc.name);
                                                                }}
                                                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-gray-600 hover:text-red-400 opacity-60 group-hover:opacity-100 transition-all"
                                                                title="Delete Location"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 min-h-0 px-6 pb-6 overflow-y-auto space-y-4 scrollbar-thin">
                            {/* FORM FIELDS */}
                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Where</label>
                                <input type="text" required value={venue} placeholder="Search address..." onChange={(e) => { setVenue(e.target.value); setIsSearching(true); setCurrentLocation(null); }}
                                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all pl-10 text-sm ${theme === 'light' ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                                    onFocus={() => { if (!venue) setIsSearching(true); }} // Trigger suggestions on focus if empty
                                />
                                <MapPin className="absolute left-3.5 top-[34px] text-gray-400" size={16} />

                                {/* SMART LOCATION PICKER: Show Saved Locations if Search is empty/start */}
                                {(isSearching && !venue && savedLocations.length > 0) && (
                                    <div className={`absolute z-20 w-full mt-1 border rounded-xl shadow-xl max-h-48 overflow-y-auto ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-zinc-800 border-zinc-700'}`}>
                                        <div className="p-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-opacity-50 backdrop-blur-sm sticky top-0 flex justify-between">
                                            <span>My Locations</span>
                                        </div>
                                        {savedLocations.map((loc: any, i) => ( // Use 'any' to access ID
                                            <div key={i} className={`group relative p-3 cursor-pointer text-sm truncate flex items-center gap-2 transition-colors ${theme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-200 hover:bg-white/10'}`}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    setVenue(loc.venue);
                                                    setCurrentLocation({ lat: loc.lat, lng: loc.lng });
                                                    setIsSearching(false);
                                                }}>
                                                <MapPin size={12} className="text-green-500 shrink-0" />
                                                <span className="truncate pr-6">{loc.venue}</span>
                                                {loc.id && ( // Only show delete if ID exists (it should for saved locations)
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent selection
                                                            handleDeleteLocation(loc.id, loc.venue);
                                                        }}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 opacity-60 group-hover:opacity-100 transition-all"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {suggestions.length > 0 && (
                                    <div className={`absolute z-20 w-full mt-1 border rounded-xl shadow-xl max-h-48 overflow-y-auto ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-zinc-800 border-zinc-700'}`}>
                                        {suggestions.map((item, i) => (
                                            <div key={i} className={`p-3 cursor-pointer text-sm truncate flex items-center gap-2 transition-colors ${theme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-200 hover:bg-white/10'}`}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    const cleanParams = formatAddress(item);
                                                    setVenue(cleanParams);
                                                    setCurrentLocation({ lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
                                                    setSuggestions([]);
                                                }}>
                                                <MapPin size={12} /> {formatAddress(item)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Phone Field */}
                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Phone (Optional)</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    placeholder="+370 600 12345"
                                    onChange={(e) => setPhone(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all pl-10 text-sm ${theme === 'light' ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                                />
                                <Phone className="absolute left-3.5 top-[34px] text-gray-400" size={16} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">What</label>
                                <input type="text" required value={title} placeholder="Event Title" onChange={(e) => setTitle(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border outline-none text-sm font-medium ${theme === 'light' ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`} />
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <div className="flex items-center gap-3">
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">When</label>
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

                            <button type="submit" className="w-full py-4 bg-blue-600 font-bold rounded-xl text-white hover:bg-blue-500 transition-colors shadow-lg">{event ? 'Update Event' : 'Create Event'}</button>
                        </form>
                    </>
                ) : (
                    <div
                        ref={scrollRef}
                        className="w-full h-full overflow-y-auto snap-y snap-mandatory hide-scrollbar"
                    >
                        {activeFeed.map((evt) => (
                            <div key={evt.id} id={`slide-${evt.id}`} className="w-full h-full snap-start flex-shrink-0 relative">
                                <EventFeedSlide
                                    event={evt}
                                    theme={theme}
                                    userLocation={userLocation}
                                    onClose={onClose}
                                    onZoom={(url) => { setZoomedImage(url); setIsFullImage(true); }}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
