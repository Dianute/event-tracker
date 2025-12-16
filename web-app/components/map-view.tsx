'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import { Navigation } from 'lucide-react';
import ScoutControl from './scout-control';

// Custom Emoji Marker Helper
const createEmojiIcon = (emoji: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-md text-2xl border-2 border-white transform hover:scale-110 transition-transform">${emoji}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

const getEventIcon = (type: string) => {
  switch (type) {
    case 'food': return createEmojiIcon('🍔');
    case 'sports': return createEmojiIcon('⚽');
    case 'music': return createEmojiIcon('🎵');
    case 'arts': return createEmojiIcon('🎨');
    case 'learning': return createEmojiIcon('📚');
    case 'social':
    default:
      return createEmojiIcon('🍻');
  }
};

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
}

interface MapViewProps {
  events: Event[];
  onMapClick?: (lat: number, lng: number) => void;
  newLocation?: { lat: number; lng: number } | null;
  onDeleteEvent?: (id: string) => void;
}

// Helper to calculate distance in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

function EventCard({ event, userLocation, onClick }: { event: Event, userLocation: L.LatLng | null, onClick: () => void }) {
  const [status, setStatus] = useState<{ label: string; color: string; progress?: number; timeText?: string }>({ label: '', color: 'gray' });

  useEffect(() => {
    const updateStatus = () => {
      if (!event.startTime || !event.endTime) return;
      const now = new Date();
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      const duration = end.getTime() - start.getTime();
      const elapsed = now.getTime() - start.getTime();

      if (now < start) {
        // Future
        const diffMs = start.getTime() - now.getTime();
        const diffMins = Math.ceil(diffMs / 60000);
        if (diffMins < 60) {
          setStatus({ label: 'Starts soon', color: 'orange', timeText: `Starts in ${diffMins} min` });
        } else {
          setStatus({ label: 'Upcoming', color: 'blue', timeText: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
        }
      } else if (now >= start && now <= end) {
        // Live
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
    const interval = setInterval(updateStatus, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [event]);

  // Calculate distance
  const distanceText = userLocation
    ? `${Math.round(getDistance(userLocation.lat, userLocation.lng, event.lat, event.lng))}m away`
    : 'Locating...';

  return (
    <div
      onClick={onClick}
      className="bg-black/60 backdrop-blur-md rounded-xl p-4 shadow-2xl mb-3 border border-white/10 transition-all hover:scale-[1.02] hover:bg-black/70 group cursor-pointer"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{(getEventIcon(event.type).options.html as string)?.match(/>(.*?)</)?.[1]}</span>
          <div>
            <h4 className="font-bold text-white text-lg leading-tight group-hover:text-blue-200 transition-colors shadow-black drop-shadow-sm">{event.title}</h4>
            <p className="text-xs text-blue-300 font-semibold flex items-center gap-1 mt-1">
              <Navigation size={10} /> {distanceText}
            </p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide border
                    ${status.color === 'green' ? 'bg-green-500/20 text-green-300 border-green-500/50' :
            status.color === 'orange' ? 'bg-orange-500/20 text-orange-300 border-orange-500/50' :
              status.color === 'blue' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' : 'bg-gray-700/50 text-gray-400 border-gray-600'}`}>
          {status.label}
        </span>
      </div>

      {status.progress !== undefined && (
        <div className="w-full bg-white/10 rounded-full h-1.5 mb-2 overflow-hidden">
          <div className="bg-green-500 h-1.5 rounded-full transition-all duration-1000 shadow-[0_0_10px_#22c55e]" style={{ width: `${status.progress}%` }}></div>
        </div>
      )}

      <div className="text-xs text-gray-400 font-mono">
        {status.timeText}
      </div>
    </div>
  );
}

// Component to handle map clicks, new location marker, AND user location
function LocationMarker({ onMapClick, newLocation, onLocationFound }: {
  onMapClick?: (lat: number, lng: number) => void,
  newLocation: { lat: number; lng: number } | null,
  onLocationFound: (pos: L.LatLng) => void
}) {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const map = useMap();

  useEffect(() => {
    map.locate({ watch: true, enableHighAccuracy: true });

    function onLocation(e: L.LocationEvent) {
      setPosition((prev) => {
        // Only fly to location on the FIRST fix
        if (!prev) {
          map.flyTo(e.latlng, 15);
        }
        return e.latlng;
      });
      onLocationFound(e.latlng);
    }

    map.on("locationfound", onLocation);

    return () => {
      map.off("locationfound", onLocation);
      map.stopLocate();
    };
  }, [map, onLocationFound]);

  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return (
    <>
      {/* User's current location - Blue Pulse */}
      {position && (
        <>
          <Marker position={position} icon={L.divIcon({ className: 'user-marker', html: '<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_15px_#3b82f6] pulse-animation"></div>', iconSize: [16, 16] })}>
            <Popup className="custom-popup">You are here</Popup>
          </Marker>
          <Circle center={position} radius={800} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1, dashArray: '5, 5' }} />

          {/* Recenter Button */}
          <div className="fixed bottom-24 right-6 z-[1000]">
            <button
              onClick={() => position && map.flyTo(position, 15)}
              className="bg-black/80 hover:bg-black text-white p-3 rounded-full shadow-lg border border-white/20 transition-all active:scale-95 backdrop-blur-sm"
              title="Go to my location"
            >
              <Navigation size={20} className="text-blue-400" fill="currentColor" fillOpacity={0.2} />
            </button>
          </div>
        </>
      )}

      {/* New Event Location Selection - Ghost Marker */}
      {newLocation && (
        <Marker position={[newLocation.lat, newLocation.lng]} icon={createEmojiIcon('📍')} opacity={0.8}>
          <Popup className="custom-popup">New Event Location</Popup>
        </Marker>
      )}
    </>
  );
}

export default function MapView({ events, onMapClick, newLocation, onDeleteEvent }: MapViewProps) {
  const [mounted, setMounted] = useState(false);
  const [showHappeningNow, setShowHappeningNow] = useState(false);
  const [showScout, setShowScout] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<L.LatLng | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [mapTheme, setMapTheme] = useState<'dark' | 'light' | 'cyberpunk'>('dark');
  const [sortBy, setSortBy] = useState<'time' | 'distance'>('distance'); // Default to distance as requested

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-screen w-full bg-black flex items-center justify-center text-white">Initializing System...</div>;

  const now = new Date();

  // combined filter: Time AND Search
  const filteredEvents = events.filter(e => {
    // Time Filter
    const timeMatch = !showHappeningNow || (() => {
      if (!e.startTime || !e.endTime) return true;
      const start = new Date(e.startTime);
      const end = new Date(e.endTime);
      return now >= start && now <= end;
    })();

    // Search Filter
    const query = searchQuery.toLowerCase();
    const searchMatch = !searchQuery ||
      e.title.toLowerCase().includes(query) ||
      e.description.toLowerCase().includes(query) ||
      e.type.toLowerCase().includes(query);

    return timeMatch && searchMatch;
  })

    .sort((a, b) => {
      // Primary sort based on user selection
      if (sortBy === 'time') {
        const startA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const startB = b.startTime ? new Date(b.startTime).getTime() : 0;
        return startA - startB;
      } else {
        // Distance Sort
        if (!userLocation) return 0; // Fallback
        const distA = getDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
        const distB = getDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
        return distA - distB;
      }
    });

  // Cyberpunk checks
  const isCyber = mapTheme === 'cyberpunk';

  // TRON Logic
  const tileUrl = (mapTheme === 'light' || mapTheme === 'cyberpunk')
    ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

  return (
    <>
      <MapContainer
        center={[54.8985, 23.9036]} // Kaunas, Lithuania - better default for Lithuanian events
        zoom={13}
        scrollWheelZoom={true}
        className={`h-screen w-full z-0 bg-[#1a1a1a] ${isCyber ? 'cyberpunk-map' : ''}`}
        ref={setMap}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={tileUrl}
          className={isCyber ? 'cyberpunk-tiles' : ''}
        />

        {filteredEvents.map((event) => {
          const isPast = event.endTime && new Date(event.endTime) < now;
          const opacity = isPast ? 0.3 : 1;
          const grayscale = isPast ? 'grayscale(100%)' : 'none';

          // Use structured data
          const location = event.venue || (event.description ? event.description.split('\n')[0] : '');

          let displayDate = event.date || '';
          if (event.startTime) {
            const start = new Date(event.startTime);
            const timeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = start.toLocaleDateString([], { month: 'short', day: 'numeric' });
            displayDate = `${dateStr} • ${timeStr}`;
          } else if (event.description) {
            displayDate = event.description.split('\n')[1] || '';
          }

          const link = event.link || (event.description && event.description.split('\n')[2]?.startsWith('http') ? event.description.split('\n')[2] : '');

          return (
            <Marker
              key={event.id}
              position={[event.lat, event.lng]}
              icon={getEventIcon(event.type)}
              opacity={opacity}
            >
              <Popup className="custom-popup">
                <div className={`p-3 min-w-[240px] text-white rounded-lg border backdrop-blur-md ${isCyber ? 'bg-slate-900/90 border-pink-500' : 'bg-gray-800 border-gray-700'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl" style={{ filter: grayscale }}>{(getEventIcon(event.type).options.html as string)?.match(/>(.*?)</)?.[1]}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${isCyber ? 'text-cyan-400 border-cyan-500 bg-cyan-900/30' : 'text-blue-300 border-blue-700 bg-blue-900/20'}`}>{event.type}</span>
                    </div>
                    {onDeleteEvent && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this event?')) onDeleteEvent(event.id);
                        }}
                        className="text-gray-500 hover:text-red-500 transition-colors p-1"
                        title="Delete Event"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  <h3 className={`font-bold text-lg m-0 leading-tight mb-2 ${isCyber ? 'text-pink-100 drop-shadow-[0_0_5px_rgba(255,0,255,0.5)]' : 'text-white'}`}>{event.title}</h3>

                  {/* Structured Info */}
                  {location && (
                    <div className="flex items-start gap-2 text-xs text-gray-300 mb-1">
                      <span>📍</span>
                      <span className="opacity-90">{location}</span>
                    </div>
                  )}
                  {displayDate && (
                    <div className="flex items-start gap-2 text-xs text-gray-300 mb-3">
                      <span>📅</span>
                      <span className="opacity-90">{displayDate}</span>
                    </div>
                  )}

                  {!location && <p className="text-sm text-gray-300 m-0 mt-2 leading-relaxed">{event.description}</p>}

                  <div className="flex gap-2 mt-3">
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-1 text-center text-xs font-bold py-2 rounded-lg transition-all ${isCyber ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_10px_#00ffff]' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                      >
                        🌐 Tickets / Info
                      </a>
                    )}
                    {/* Maps Button */}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${event.lat},${event.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-3 py-2 rounded-lg transition-all flex items-center justify-center ${isCyber ? 'bg-slate-800 hover:bg-slate-700 text-pink-400 border border-pink-500/30' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
                      title="Open in Google Maps"
                    >
                      🗺️
                    </a>
                  </div>

                </div>
              </Popup>
            </Marker>
          );
        })}

        <LocationMarker
          onMapClick={onMapClick}
          newLocation={newLocation || null}
          onLocationFound={setUserLocation}
        />
      </MapContainer>

      {/* Top Controls Container */}
      <div className="fixed top-4 left-0 w-full z-[1000] flex flex-col items-center gap-3 px-4 pointer-events-none">
        {/* Search Bar */}
        <div className={`pointer-events-auto w-full max-w-md backdrop-blur-md rounded-2xl flex items-center px-4 py-2 ring-1 transition-all group focus-within:ring-opacity-100 
            ${isCyber
            ? 'bg-slate-900/80 ring-cyan-500/50 shadow-[0_0_20px_rgba(0,255,255,0.2)]'
            : 'bg-black/60 shadow-[0_0_20px_rgba(0,0,0,0.3)] ring-white/10 focus-within:ring-blue-500/50'}`}>
          <span className="text-xl mr-2 grayscale brightness-200">🔍</span>
          <input
            type="text"
            placeholder="Find tacos, jazz, parties..."
            className={`bg-transparent border-none outline-none placeholder-gray-400 w-full font-medium ${isCyber ? 'text-cyan-100' : 'text-white'}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-white">×</button>
          )}
        </div>

        {/* Filter Row - Scrollable keys on mobile */}
        <div className="flex gap-2 w-full max-w-md overflow-x-auto hide-scrollbar pointer-events-auto pb-2 justify-start md:justify-center">
          {/* Sort Toggle */}
          <button
            onClick={() => setSortBy(prev => prev === 'time' ? 'distance' : 'time')}
            className={`px-4 py-2 rounded-2xl shadow-lg font-bold text-sm transition-all transform hover:scale-105 whitespace-nowrap flex items-center gap-2 backdrop-blur-md flex-shrink-0
              ${isCyber
                ? 'bg-slate-900/80 text-cyan-400 border border-cyan-500/30 ring-1 ring-cyan-500/30'
                : 'bg-black/60 text-white ring-1 ring-white/10'
              }`}
          >
            {sortBy === 'time' ? '⏱️ Soonest' : '📍 Closest'}
          </button>

          {/* Filter Button */}
          <button
            onClick={() => setShowHappeningNow(!showHappeningNow)}
            className={`px-4 py-2 rounded-2xl shadow-lg font-bold text-sm transition-all transform hover:scale-105 whitespace-nowrap flex items-center gap-2 flex-shrink-0 ${showHappeningNow
              ? (isCyber ? 'bg-cyan-500 text-black ring-2 ring-cyan-300 shadow-[0_0_20px_#00ffff]' : 'bg-green-500 text-white ring-2 ring-green-300 shadow-[0_0_15px_#22c55e]')
              : (isCyber ? 'bg-slate-900/80 text-cyan-400 border border-cyan-500/30' : 'bg-black/60 text-white ring-1 ring-white/10')
              } backdrop-blur-md`}
          >
            {showHappeningNow ? (isCyber ? '⚡ Live' : '🟢 Live') : '⚪ All'}
          </button>

          {/* Scout Agent Button */}
          <button
            onClick={() => setShowScout(true)}
            className={`px-4 py-2 rounded-2xl shadow-lg font-bold text-sm transition-all transform hover:scale-105 whitespace-nowrap ring-1 backdrop-blur-md flex-shrink-0 ${isCyber ? 'bg-slate-900/80 text-yellow-400 border-yellow-500/50 ring-yellow-500/50' : 'bg-black/60 text-yellow-400 ring-white/10'}`}
          >
            🕵️‍♂️ Agent
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setMapTheme(prev => prev === 'dark' ? 'cyberpunk' : prev === 'cyberpunk' ? 'light' : 'dark')}
            className={`px-4 py-2 rounded-2xl shadow-lg font-bold text-sm transition-all transform hover:scale-105 whitespace-nowrap ring-1 backdrop-blur-md flex-shrink-0 ${isCyber ? 'bg-slate-900/80 text-pink-400 border-pink-500/50 ring-pink-500/50 shadow-[0_0_15px_rgba(255,0,255,0.3)]' : 'bg-black/60 text-white ring-white/10'}`}
          >
            {mapTheme === 'dark' ? '🌙' : mapTheme === 'light' ? '☀️' : '👾'}
          </button>
        </div>
      </div>

      {showScout && <ScoutControl onClose={() => setShowScout(false)} />}

      {/* Live Event List Overlay (Bottom Left) */}
      <div className="fixed bottom-0 left-0 md:bottom-6 md:left-6 z-[1000] w-full md:w-80 max-h-[50vh] md:max-h-[60vh] overflow-y-auto pointer-events-none flex flex-col hide-scrollbar p-4 md:p-0 bg-gradient-to-t from-black/80 to-transparent md:bg-none">
        {filteredEvents.slice(0, 20).map(event => (
          <div key={event.id} className="pointer-events-auto">
            <EventCard
              event={event}
              userLocation={userLocation}
              onClick={() => {
                if (map) {
                  map.flyTo([event.lat, event.lng], 16, { duration: 1.5 });
                }
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
}
