'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (eventData: { title: string; description: string; type: string; startTime: string; endTime: string; lat?: number; lng?: number; venue?: string }) => void;
    initialLocation: { lat: number; lng: number } | null;
    event?: any; // Event object for viewing
}

export default function EventModal({ isOpen, onClose, onSubmit, initialLocation, event }: EventModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('social');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [venue, setVenue] = useState('');
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Effect to reset or populate form
    useEffect(() => {
        if (isOpen) {
            if (event) {
                // VIEW MODE
                setTitle(event.title);
                setDescription(event.description);
                setType(event.type);
                setStartTime(event.startTime?.slice(0, 16) || '');
                setEndTime(event.endTime?.slice(0, 16) || '');
                setVenue(event.venue || event.location || '');
                setCurrentLocation({ lat: event.lat, lng: event.lng });
            } else {
                // CREATE MODE (Reset)
                setTitle('');
                setDescription('');
                setType('social');

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

    // Forward Geocode Effect (Search) - Only when NOT in view mode
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

    if (!isOpen) return null;

    const isReadOnly = !!event;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly) return;

        if (!currentLocation) {
            alert("Please select a location from the search or click the map!");
            return;
        }

        onSubmit({
            title,
            description,
            type,
            startTime,
            endTime,
            lat: currentLocation.lat,
            lng: currentLocation.lng,
            venue
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        {isReadOnly ? 'Event Details' : 'Create New Event'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="relative">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Location / Address</label>
                        <input
                            type="text"
                            required
                            readOnly={isReadOnly}
                            value={venue}
                            onChange={(e) => {
                                setVenue(e.target.value);
                                setIsSearching(true);
                            }}
                            placeholder="Search address or click on map..."
                            className={`w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all pl-8 ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                        />
                        <span className="absolute left-2.5 top-[34px] text-zinc-400">📍</span>

                        {!isReadOnly && suggestions.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                {suggestions.map((item, i) => (
                                    <div
                                        key={i}
                                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer text-sm truncate"
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
                                        {item.display_name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Event Title</label>
                        <input
                            type="text"
                            required
                            readOnly={isReadOnly}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
                        <textarea
                            required
                            readOnly={isReadOnly}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className={`w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Start Time</label>
                            <input
                                type="datetime-local"
                                required
                                readOnly={isReadOnly}
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className={`w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">End Time</label>
                            <input
                                type="datetime-local"
                                required
                                readOnly={isReadOnly}
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className={`w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Type</label>
                        <select
                            value={type}
                            disabled={isReadOnly}
                            onChange={(e) => setType(e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            <option value="social">Social / Hangout</option>
                            <option value="food">Food & Drink</option>
                            <option value="music">Live Music / Party</option>
                            <option value="arts">Arts & Culture</option>
                            <option value="learning">Class / Workshop</option>
                            <option value="sports">Sports / Activity</option>
                        </select>
                    </div>

                    {/* Action Buttons for View Mode */}
                    {isReadOnly && event?.link && (
                        <a href={event.link} target="_blank" rel="noopener noreferrer" className="block w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-center text-white font-medium rounded-xl shadow-lg transition-all">
                            🎟️ Get Tickets / More Info
                        </a>
                    )}

                    {!isReadOnly && (
                        <button
                            type="submit"
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Post Event
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}
