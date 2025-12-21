'use client';

import { useState } from 'react';
import EventCard from '@/components/event-card';

export default function DesignLab() {
    // Mock Data
    const mockLocation = { lat: 54.8985, lng: 23.9036 };
    const getMockEvent = (offsetMinutes = 10) => {
        const now = new Date();
        const start = new Date(now.getTime() + offsetMinutes * 60000); // Starts in X mins
        const end = new Date(start.getTime() + 60 * 60000); // Lasts 1 hour
        return {
            id: Math.random().toString(),
            title: "Super Long Event Title That Should Definitely Wrap To Two Lines Or Specifically Be Handled By The UI Layout",
            description: "Test description",
            type: 'music',
            lat: 54.91, // Nearby
            lng: 23.92,
            startTime: start.toISOString(),
            endTime: end.toISOString()
        };
    };

    const upcomingEvent = getMockEvent(45); // Starts in 45m (Orange bar)
    const liveEvent = getMockEvent(-15);    // Started 15m ago (Green bar)
    const shortTitleEvent = { ...getMockEvent(120), title: "Short Title" };

    return (
        <div className="min-h-screen bg-[#121212] text-white p-8">
            <h1 className="text-3xl font-bold mb-8 text-blue-500">🧪 UI Design Lab</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

                {/* OPTION 1: Minimalist (Current) */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold border-b border-white/20 pb-2">1. Minimalist (Current)</h2>
                    <p className="text-sm text-gray-400">Floating badge, 2-line title, clean stats.</p>
                    <div className="space-y-4">
                        <EventCard event={upcomingEvent} userLocation={mockLocation} variant="standard" />
                        <EventCard event={liveEvent} userLocation={mockLocation} variant="standard" />
                        <EventCard event={shortTitleEvent} userLocation={mockLocation} variant="standard" />
                    </div>
                </div>

                {/* OPTION 2: Ticker / Marquee */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold border-b border-white/20 pb-2">2. News Ticker</h2>
                    <p className="text-sm text-gray-400">Single line, scrolling text. Very organized.</p>
                    <div className="space-y-4">
                        <EventCard event={upcomingEvent} userLocation={mockLocation} variant="ticker" />
                        <EventCard event={liveEvent} userLocation={mockLocation} variant="ticker" />
                    </div>
                </div>

                {/* OPTION 3: Compact List */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold border-b border-white/20 pb-2">3. Compact List</h2>
                    <p className="text-sm text-gray-400">Dense information, timeline style color bars.</p>
                    <div className="space-y-4">
                        <EventCard event={upcomingEvent} userLocation={mockLocation} variant="compact" />
                        <EventCard event={liveEvent} userLocation={mockLocation} variant="compact" />
                    </div>
                </div>

                {/* OPTION 4: Visual / Image */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold border-b border-white/20 pb-2">4. Visual / Poster</h2>
                    <p className="text-sm text-gray-400">Focus on background/texture. Magazine style.</p>
                    <div className="space-y-4">
                        <EventCard event={upcomingEvent} userLocation={mockLocation} variant="visual" />
                        <EventCard event={liveEvent} userLocation={mockLocation} variant="visual" />
                    </div>
                </div>

            </div>

            <div className="mt-12 p-4 bg-gray-900 rounded-xl border border-white/10">
                <h3 className="font-bold text-lg mb-2">Instructions</h3>
                <p className="text-gray-400">Navigate to <span className="text-blue-400 font-mono">/design-lab</span> to view these live.</p>
            </div>
        </div>
    );
}
