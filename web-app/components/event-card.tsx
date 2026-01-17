import { useState, useEffect } from 'react';
import { Navigation, Clock } from 'lucide-react';
import L from 'leaflet';

// Reusing helper from map-view (or duplicated for independence if needed, but best to export/import)
// For the design lab, we'll duplicate the helper to keep this component self-contained if we can't easily export map-view logic.
// Actually, let's keep it simple. We will pass formatted strings or handle logic internally.

interface Event {
    id: string;
    title: string;
    description: string;
    type: string;
    lat: number;
    lng: number;
    startTime?: string;
    endTime?: string;
    venue?: string;
    date?: string;
    link?: string;
    imageUrl?: string;
    createdAt?: string;
}

// Helper to format distance text (km if > 1000m)
const formatDistance = (meters: number) => {
    if (meters >= 1000) {
        return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
};

// Helper to calculate distance in meters (Haversine)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
}

// Helper for Icons (Simplified for Card)
const getEmoji = (type: string) => {
    switch (type) {
        case 'social': return '🍻';
        case 'food': return '🍔';
        case 'music': return '🎵';
        case 'arts': return '🎨';
        case 'learning': return '📚';
        case 'sports': return '⚽';
        default: return '📍';
    }
};

export default function EventCard({ event, userLocation, onClick, variant = 'standard', customIcon }: { event: Event, userLocation: any, onClick?: () => void, variant?: 'standard' | 'ticker' | 'compact' | 'visual', customIcon?: string | null }) {
    const [status, setStatus] = useState<{ label: string; color: string; progress?: number; timeText?: string }>({ label: '', color: 'gray' });

    useEffect(() => {
        const updateStatus = () => {
            if (!event.startTime || !event.endTime) return;

            // USE BROWSER TIME (Local)
            // This ensures that if the user is in the same timezone as the event (e.g. UK User viewing UK Event),
            // the status is 100% accurate.
            const now = new Date();

            // Browser parses 'YYYY-MM-DDTHH:mm' as Local Time by default.
            const start = new Date(event.startTime);
            const end = new Date(event.endTime);

            const duration = end.getTime() - start.getTime();
            const elapsed = now.getTime() - start.getTime();

            if (now < start) {
                // Future
                const diffMs = start.getTime() - now.getTime();
                const diffMins = Math.ceil(diffMs / 60000);
                const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

                if (diffMins < 60) {
                    // < 1 Hour -> "In X min"
                    const progressPercent = ((60 - diffMins) / 60) * 100;
                    setStatus({
                        label: `In ${diffMins} min`,
                        color: 'yellow',
                        // Display Time: Use the string directly from DB (already formatted) or slice
                        timeText: `Starts ${event.startTime?.slice(11, 16)}`,
                        progress: progressPercent
                    });
                } else if (diffHours < 24) {
                    // < 24 Hours -> "In X hr"
                    setStatus({
                        label: `In ${diffHours} hr`,
                        color: 'blue',
                        timeText: `Starts ${event.startTime?.slice(11, 16)}`
                    });
                } else {
                    // > 1 Day -> "In X days"
                    setStatus({
                        label: `In ${diffDays} days`,
                        color: 'purple',
                        timeText: `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                    });
                }
            } else if (now >= start && now <= end) {
                // Live -> Show Event Progress Bar
                const progress = (elapsed / duration) * 100;
                const elapsedMins = Math.floor(elapsed / 60000);
                const totalMins = Math.floor(duration / 60000);
                setStatus({
                    label: 'Live',
                    color: 'green',
                    progress,
                    timeText: `${elapsedMins}m / ${totalMins}m`
                });
            } else {
                // Past
                setStatus({ label: 'Ended', color: 'gray', timeText: 'Event ended' });
            }
        };

        updateStatus();
        const interval = setInterval(updateStatus, 60000);
        return () => clearInterval(interval);
    }, [event]);

    const distanceText = userLocation
        ? `${formatDistance(getDistance(userLocation.lat, userLocation.lng, event.lat, event.lng))} away`
        : 'Locating...';

    const renderIcon = (emojiClass = "text-2xl", imgClass = "w-8 h-8") => {
        if (customIcon) {
            return <img src={customIcon} alt="icon" className={`${imgClass} object-contain filter drop-shadow-md transition-transform group-hover:scale-110`} />;
        }
        return <span className={emojiClass}>{getEmoji(event.type)}</span>;
    };

    if (variant === 'standard') {
        return (
            <div
                onClick={onClick}
                className="relative overflow-hidden bg-black/60 backdrop-blur-md rounded-xl p-3 shadow-sm border border-white/10 transition-all hover:bg-white/10 group cursor-pointer w-full h-full flex flex-col justify-between"
            >
                {status.label && (
                    <div className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide border z-10
                        ${status.color === 'green' ? 'bg-green-500/20 text-green-300 border-green-500/50' :
                            status.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' :
                                status.color === 'purple' ? 'bg-purple-500/20 text-purple-300 border-purple-500/50' :
                                    status.color === 'blue' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' : 'bg-gray-700/50 text-gray-400 border-gray-600'}`}>
                        {status.label}
                    </div>
                )}

                {event.imageUrl && (
                    <div className="absolute inset-0 z-0 opacity-20">
                        <img src={event.imageUrl} alt="" className="w-full h-full object-cover grayscale" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
                    </div>
                )}

                <div className="relative z-10 flex items-start gap-3 mt-1">
                    <div className="shrink-0 pt-0.5 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                        {renderIcon("text-2xl", "w-8 h-8")}
                    </div>

                    <div className="flex-1 min-w-0 pr-8">
                        <h4 className={`font-bold text-sm leading-snug line-clamp-2 transition-colors shadow-black drop-shadow-sm ${status.label === 'Ended' ? 'text-gray-500 line-through' : 'text-white group-hover:text-blue-200'}`}>
                            {event.title}
                        </h4>

                        <div className="flex items-center gap-2 mt-1.5 text-[10px] font-medium">
                            {/* Time */}
                            <div className="flex items-center gap-1 text-gray-400">
                                <Clock size={10} className={status.color === 'gray' ? 'text-gray-500' : 'text-blue-400'} />
                                <span className={status.color === 'green' ? 'text-green-400' : status.color === 'yellow' ? 'text-yellow-400' : ''}>
                                    {status.color === 'green' ? 'Now' :
                                        status.color === 'yellow' ? 'Soon' :
                                            status.color === 'gray' ? 'Ended' : status.timeText}
                                </span>
                            </div>

                            {/* Distance */}
                            {userLocation && (
                                <p className="text-blue-300 flex items-center gap-1">
                                    <Navigation size={10} /> {distanceText}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {status.progress !== undefined && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20">
                        <div
                            className={`h-full transition-all duration-1000 shadow-[0_0_10px] ${status.color === 'yellow' ? 'bg-yellow-500 shadow-yellow-500' : 'bg-green-500 shadow-green-500'}`}
                            style={{ width: `${status.progress}%` }}
                        ></div>
                    </div>
                )}
            </div>
        );
    }

    // --- VARIANT 2: TICKER (Marquee Title) ---
    if (variant === 'ticker') {
        return (
            <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 shadow-2xl border border-white/10 w-full relative overflow-hidden group">
                <div className="flex items-center gap-3 mb-2">
                    <span className="shrink-0">{renderIcon("text-xl", "w-6 h-6")}</span>
                    <div className="flex-1 overflow-hidden whitespace-nowrap mask-linear-fade">
                        <h4 className="font-bold text-sm text-white animate-marquee inline-block">{event.title} &nbsp; • &nbsp; {event.title} &nbsp; • &nbsp; </h4>
                    </div>
                </div>

                <div className="flex justify-between items-center text-[10px]">
                    <span className="text-blue-300 flex items-center gap-1"><Navigation size={8} /> {distanceText}</span>
                    <span className={`px-1.5 py-0.5 rounded-full border ${status.color === 'green' ? 'text-green-300 border-green-500/30' : 'text-blue-300 border-blue-500/30'}`}>{status.label}</span>
                </div>
            </div>
        );
    }

    // --- VARIANT 3: COMPACT (Very small) ---
    if (variant === 'compact') {
        return (
            <div className="bg-black/80 backdrop-blur-md rounded-lg p-2 border border-white/5 w-full flex items-center gap-3">
                <div className={`w-1 h-8 rounded-full ${status.color === 'green' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-white truncate">{event.title}</h4>
                    <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                        <span>{status.timeText}</span>
                        <span>{distanceText}</span>
                    </div>
                </div>
                <span className="shrink-0">{renderIcon("text-lg", "w-5 h-5")}</span>
            </div>
        );
    }

    // --- VARIANT 4: VISUAL (Image Focus if available) ---
    if (variant === 'visual') {
        return (
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-0 border border-white/10 w-full relative overflow-hidden h-24 group">
                {/* Fake Background Image if none */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900/50 to-purple-900/50 opacity-50 group-hover:opacity-70 transition-opacity"></div>

                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent">
                    <div className="flex justify-between items-end">
                        <div>
                            <h4 className="font-bold text-sm text-white leading-tight shadow-md">{event.title}</h4>
                            <p className="text-[10px] text-gray-300">{status.timeText}</p>
                        </div>
                        <span className="text-2xl">{getEmoji(event.type)}</span>
                    </div>
                </div>

                {event.link && (
                    <a
                        href={event.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-3 right-3 z-20 px-3 py-1 bg-green-500 hover:bg-green-400 text-white text-[10px] font-bold uppercase rounded-full shadow-lg transition-transform active:scale-95 flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                    >
                        Ticket
                    </a>
                )}

                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-black/50 backdrop-blur border border-white/20 text-white`}>
                    {status.label}
                </div>
            </div>
        );
    }

    return null;
}
