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
}

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Load events from Backend on mount
  // Load events from Backend
  const fetchEvents = () => {
    console.log("🔌 Connecting to Backend:", API_URL);
    fetch(`${API_URL}/events`)
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(err => console.error("Failed to fetch events:", err));
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setIsModalOpen(true);
  };

  const handleAddEvent = (data: { title: string; description: string; type: string; startTime?: string; endTime?: string }) => {
    if (!selectedLocation) {
      alert("Please click on the map to choose a location first!");
      return;
    }

    const newEvent = {
      ...data,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
    };

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

  return (
    <main className="flex min-h-screen flex-col items-center justify-between relative">
      <div className="z-10 w-full h-full font-mono text-sm lg:flex">
        <MapView
          events={events}
          onMapClick={handleMapClick}
          newLocation={selectedLocation}
          onDeleteEvent={handleDeleteEvent}
          onRefresh={fetchEvents}
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
      />
    </main>
  );
}
