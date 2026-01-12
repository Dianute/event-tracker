'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import EventModal from '@/components/event-modal';
import { useSession } from 'next-auth/react';

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
  const [userLocations, setUserLocations] = useState<any[]>([]);
  const { data: session } = useSession();

  // Load events from Backend on mount
  // Load events from Backend
  const [notification, setNotification] = useState<string | null>(null);
  const eventsRef = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light' | 'cyberpunk'>('dark');

  // Sound Helper
  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) { console.error("Audio error", e); }
  };

  const fetchEvents = () => {
    fetch(`${API_URL}/events`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Detect New Events
          if (!isFirstLoad.current) {
            const newCount = data.filter(e => !eventsRef.current.has(e.id)).length;
            if (newCount > 0) {
              setNotification(`${newCount} New Spot${newCount > 1 ? 's' : ''} Found!`);
              playNotificationSound();
              setTimeout(() => setNotification(null), 4000);
            }
          }

          setEvents(data);

          // Update Ref
          const newSet = new Set(data.map((e: any) => e.id));
          eventsRef.current = newSet;
          isFirstLoad.current = false;
        }
      })
      .catch(err => console.error("Failed to fetch events:", err));
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 10000); // 10s poll
    return () => clearInterval(interval);
  }, []);

  // Fetch user's saved locations
  const fetchLocations = () => {
    if (session?.user?.email) {
      fetch(`${API_URL}/api/user-locations`, {
        headers: { 'x-user-email': session.user.email }
      })
        .then(res => res.json())
        .then(data => setUserLocations(data))
        .catch(err => console.error('Failed to load locations:', err));
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [session]);

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

  const handleAddEvent = (data: { title: string; description: string; type: string; startTime?: string; endTime?: string; lat?: number; lng?: number; venue?: string; imageUrl?: string; userEmail?: string | null }) => {
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
        fetchLocations();
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
        userLocations={userLocations}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[5000] bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce-in pointer-events-none backdrop-blur-md bg-opacity-90 border border-white/20">
          <span className="text-xl">🔔</span>
          <span className="font-bold">{notification}</span>
        </div>
      )}
    </main>
  );
}


