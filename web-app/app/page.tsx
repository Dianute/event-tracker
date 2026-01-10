'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import EventModal from '@/components/event-modal';

// We need to import MapView dynamically to avoid SSR issues with Leaflet
// MapView accepts events, onMapClick, and newLocation props
// We use 'any' for the dynamic component props to avoid strict type issues with dynamic imports temporarily
const MapView = dynamic<any>(() => import('@/components/map-view'), {
  ssr: false,
  loading: () => <div className="h-screen w-full flex items-center justify-center bg-gray-50">Loading Map...</div>
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>(undefined);
  const [feedEvents, setFeedEvents] = useState<Event[]>([]);

  // Load events from Backend on mount
  // Load events from Backend
  const fetchEvents = () => {
    console.log("🔌 Connecting to Backend:", API_URL);
    fetch(`${API_URL}/events`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setEvents(data);
        else console.error("Invalid API response:", data);
      })
      .catch(err => console.error("Failed to fetch events:", err));
  };

  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light' | 'cyberpunk'>('dark');

  useEffect(() => {
    fetchEvents();
    // Poll for updates every 60 seconds (to catch deleted events)
    const interval = setInterval(fetchEvents, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setIsModalOpen(true);
    setSelectedEvent(undefined); // Ensure we are cleaner
  };

  const handlePlusClick = (location?: { lat: number; lng: number }) => {
    // Open modal. If location provided (e.g. user location), use it.
    setSelectedLocation(location || null);
    setIsModalOpen(true);
    setSelectedEvent(undefined);
  };

  const handleEventSelect = (event: any) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleAddEvent = (data: { title: string; description: string; type: string; startTime?: string; endTime?: string; lat?: number; lng?: number; venue?: string; imageUrl?: string }) => {
    const newEvent = {
      ...data,
      // Use data.lat/lng if provided (from address search), otherwise fall back to selectedLocation
      lat: data.lat || selectedLocation?.lat,
      lng: data.lng || selectedLocation?.lng,
      venue: data.venue,
      imageUrl: data.imageUrl,
    };

    if (!newEvent.lat || !newEvent.lng) {
      alert("Location is missing!");
      return;
    }

    // Save to Backend
    fetch(`${API_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEvent)
    })
      .then(res => res.json())
      .then(savedEvent => {
        setEvents([...events, savedEvent]);
        setSelectedLocation(null);
      })
      .catch(err => console.error("Failed to save event:", err));
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLocation(null); // Clear selection if cancelled
    setSelectedEvent(undefined);
  };

  const handleDeleteEvent = (id: string) => {
    fetch(`${API_URL}/events/${id}`, { method: 'DELETE' })
      .then(res => {
        if (res.ok) {
          setEvents(prev => prev.filter(e => e.id !== id));
        }
      })
      .catch(err => console.error("Error deleting:", err));
  };

  const handleUserLocationUpdate = (lat: number, lng: number) => {
    setUserPos(prev => {
      // Prevent Loop: Only update if changed significantly
      if (prev && Math.abs(prev.lat - lat) < 0.0001 && Math.abs(prev.lng - lng) < 0.0001) {
        return prev;
      }
      return { lat, lng };
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between relative">
      <div className="z-10 w-full h-full font-mono text-sm lg:flex">
        <MapView
          events={events}
          onMapClick={handleMapClick}
          newLocation={selectedLocation}
          onDeleteEvent={handleDeleteEvent}
          onRefresh={fetchEvents}
          onAddEventClick={handlePlusClick}
          onEventSelect={handleEventSelect}
          onThemeChange={setCurrentTheme}
          onUserLocationUpdate={handleUserLocationUpdate}
          onViewEventsChange={setFeedEvents}
        />
      </div>

      {/* Floating Action Button - Optional now, but good for "Quick Add" at center */}
      <div className="fixed bottom-6 right-6 z-[1000] hidden md:block">
        <div className="bg-white/80 backdrop-blur text-xs p-2 rounded-lg shadow mb-2 text-center text-gray-600">
          Click map to add event
        </div>
      </div>

      <EventModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleAddEvent}
        initialLocation={selectedLocation}
        userLocation={userPos}
        event={selectedEvent}
        theme={currentTheme}
        readOnly={!!selectedEvent}
        feed={feedEvents}
      />

    </main>
  );
}


