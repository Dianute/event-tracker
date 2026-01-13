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
  isTemplate?: boolean;
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
  const [notification, setNotification] = useState<{ message: string; event?: Event } | null>(null);
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
              setNotification({ message: `${newCount} New Spot${newCount > 1 ? 's' : ''} Found!` });
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

  // Check for Pending Template from Dashboard
  useEffect(() => {
    const templateData = sessionStorage.getItem('event_template');
    if (templateData) {
      try {
        const data = JSON.parse(templateData);

        // Determine Location: Prefer first saved location, then user geo, then null
        let startLoc = null;
        if (userLocations.length > 0) startLoc = { lat: userLocations[0].lat, lng: userLocations[0].lng };
        else if (userPos) startLoc = userPos;

        setSelectedLocation(startLoc);

        // Set as "Selected Event" but mark as template to allow editing
        setSelectedEvent({
          ...data,
          id: 'template-preview',
          type: 'food', // Default to food for menus
          lat: startLoc?.lat || 0,
          lng: startLoc?.lng || 0,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          isTemplate: true
        });

        setIsModalOpen(true);
        sessionStorage.removeItem('event_template'); // Consume
      } catch (e) {
        console.error("Failed to load template", e);
      }
    }
  }, [userLocations, userPos]); // Run when locations load logic might be ready

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

  // Helper: Haversine Distance
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleEventSelect = (event: any) => {
    setSelectedEvent(event);

    // Create Feed: Strictly Filtered & Sorted
    // 1. Filter: If it's FOOD, it MUST be valid for "Today" (00:00 - 04:00 tmrw) to appear in the scroll list.
    //    Exception: The selected event itself is always shown.
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1); todayEnd.setHours(4, 0, 0, 0);

    const filteredFeed = events.filter((e: any) => {
      if (e.id === event.id) return true; // Always show selected

      if (e.type === 'food') {
        const start = e.startTime ? new Date(e.startTime) : new Date(0);
        return start >= todayStart && start < todayEnd;
      }
      return true; // Show all other types
    });

    const sortedFeed = [...filteredFeed].sort((a, b) => {
      if (a.id === event.id) return -1; // Selected always first
      if (b.id === event.id) return 1;

      // Use safe coordinates (handle potential missing lat/lng)
      const latA = a.lat || 0; const lngA = a.lng || 0;
      const latB = b.lat || 0; const lngB = b.lng || 0;
      const centerLat = event.lat || 0; const centerLng = event.lng || 0;

      const distA = getDistance(centerLat, centerLng, latA, lngA);
      const distB = getDistance(centerLat, centerLng, latB, lngB);
      return distA - distB;
    });

    setFeedEvents(sortedFeed);
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

        // Custom Notification for Added Event
        setNotification({ message: 'Event Created:', event: savedEvent });
        playNotificationSound();
        setTimeout(() => setNotification(null), 5000);
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
        readOnly={!!selectedEvent && !selectedEvent.isTemplate}
        feed={feedEvents}
        userLocations={userLocations}
        onLocationsChange={fetchLocations}
      />

      {/* Notification Toast */}
      {/* Notification Toast */}
      {notification && (
        <div
          onClick={() => {
            if (notification.event) handleEventSelect(notification.event);
            setNotification(null);
          }}
          className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-[5000] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce-in cursor-pointer pointer-events-auto hover:scale-105 active:scale-95 transition-all border backdrop-blur-md
            ${currentTheme === 'cyberpunk'
              ? 'bg-black/80 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]'
              : currentTheme === 'light'
                ? 'bg-white/90 border-gray-200 text-gray-800 shadow-xl'
                : 'bg-gray-900/90 border-gray-700 text-white shadow-xl'
            }`}
        >
          <div className={`p-2 rounded-full ${currentTheme === 'cyberpunk' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-blue-500/20 text-blue-400'}`}>
            {notification.event ? <span className="text-xl">✨</span> : <span className="text-xl">🔔</span>}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-70">{notification.message}</p>
            {notification.event && (
              <p className="text-sm font-black truncate max-w-[200px]">{notification.event.title}</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}


