'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (eventData: { title: string; description: string; type: string; startTime: string; endTime: string; lat?: number; lng?: number; venue?: string }) => void;
    initialLocation: { lat: number; lng: number } | null;
}

export default function EventModal({ isOpen, onClose, onSubmit, initialLocation }: EventModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('social');

    // Default start time: Now (rounded to minutes)
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const [startTime, setStartTime] = useState(now.toISOString().slice(0, 16));

    // Default end time: Now + 2 hours
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const [endTime, setEndTime] = useState(twoHoursLater.toISOString().slice(0, 16));

    // Address & Location State
    const [venue, setVenue] = useState(''); // Also used as "Address"
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // 1. When modal opens with initialLocation (Map Click), reverse geocode it
    import { useEffect } from 'react'; // Allow import inside (Next.js/React rules might prefer top level but sticking to chunk rules)
    // Actually, I should check if useEffect is imported. It is imported in line 3? No, line 3 has useState.
    // Let's assume I need to add useEffect to the top import.
    // I will add the logic here and fix imports in a separate chunk or trust the previous view.
    // View showed: import { useState } from 'react';. I need to add useEffect.

    // Reverse Geocode Effect
    useEffect(() => {
        if (isOpen && initialLocation) {
            setCurrentLocation(initialLocation);
            // Reverse Geocode
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${initialLocation.lat}&lon=${initialLocation.lng}`)
                .then(res => res.json())
                .then(data => {
                    if (data.display_name) {
                        setVenue(data.display_name);
                    }
                })
                .catch(err => console.error("Reverse geocode failed", err));
        } else if (isOpen && !initialLocation) {
            // Reset if opened without location (Plus button)
            setVenue('');
            setCurrentLocation(null);
        }
    }, [isOpen, initialLocation]);

    // Forward Geocode Effect (Search)
    useEffect(() => {
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
    }, [venue, isSearching]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // If we don't have a location, we can't submit (unless we allow location-less events, but map view requires them)
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

        // Reset form
        setTitle('');
        setDescription('');
        setVenue('');
        setSuggestions([]);
        setCurrentLocation(null);
        setType('social');
        // Reset times
        const currentNow = new Date();
        currentNow.setMinutes(currentNow.getMinutes() - currentNow.getTimezoneOffset());
        setStartTime(currentNow.toISOString().slice(0, 16));
        setEndTime(new Date(currentNow.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16));

        onClose();
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Create New Event</h2>
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
                            value={venue}
                            onChange={(e) => {
                                setVenue(e.target.value);
                                setIsSearching(true);
                            }}
                            placeholder="Search address or click on map..."
                            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all pl-8"
                        />
                        <span className="absolute left-2.5 top-[34px] text-zinc-400">📍</span>

                        {suggestions.length > 0 && (
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
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Sourdough Tasting"
                            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
                        <textarea
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What's happening? When? Where?"
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Start Time</label>
                            <input
                                type="datetime-local"
                                required
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">End Time</label>
                            <input
                                type="datetime-local"
                                required
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                            <option value="social">Social / Hangout</option>
                            <option value="food">Food & Drink</option>
                            <option value="music">Live Music / Party</option>
                            <option value="arts">Arts & Culture</option>
                            <option value="learning">Class / Workshop</option>
                            <option value="sports">Sports / Activity</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Post Event
                    </button>
                </form>
            </div>
        </div>
    );
}
