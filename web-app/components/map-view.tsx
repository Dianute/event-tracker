'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import { Navigation, Search as SearchIcon, Moon, Sun, Zap, RotateCw, Plus, List } from 'lucide-react';

// Custom Emoji Marker Helper
const createEmojiIcon = (emoji: string, isNew?: boolean, isFinished?: boolean) => {
  const animationClass = isNew && !isFinished ? 'animate-bounce-slow ring-4 ring-yellow-400 ring-offset-2 ring-offset-black' :
    isFinished ? 'animate-sand-drift' : 'transform hover:scale-110';

  const newBadge = isNew && !isFinished ? '<div class="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg z-50 animate-pulse">NEW</div>' : '';
  const finishedStyle = isFinished ? 'grayscale opacity-70' : '';

  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="relative flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-md text-2xl border-2 border-white transition-transform ${animationClass} ${finishedStyle}">
            ${emoji}
            ${newBadge}
            ${isFinished ? '<div class="absolute -top-2 -right-2 bg-gray-600 text-[8px] text-white px-1 rounded shadow">ENDED</div>' : ''}
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

const getEventIcon = (type: string, isNew?: boolean, isFinished?: boolean) => {
  switch (type) {
    case 'food': return createEmojiIcon('🍔', isNew, isFinished);
    case 'sports': return createEmojiIcon('⚽', isNew, isFinished);
    case 'music': return createEmojiIcon('🎵', isNew, isFinished);
    case 'arts': return createEmojiIcon('🎨', isNew, isFinished);
    case 'learning': return createEmojiIcon('📚', isNew, isFinished);
    case 'social':
    default:
      return createEmojiIcon('🍻', isNew, isFinished);
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
  createdAt?: string;
}

interface MapViewProps {
  events: Event[];
  onMapClick?: (lat: number, lng: number) => void;
  newLocation?: { lat: number; lng: number } | null;
  onDeleteEvent?: (id: string) => void;
  onRefresh?: () => void;
  onAddEventClick?: (location?: { lat: number; lng: number }) => void;
  onEventSelect?: (event: Event) => void;
  onThemeChange?: (theme: 'dark' | 'light' | 'cyberpunk') => void;
  onUserLocationUpdate?: (lat: number, lng: number) => void;
}

// ... (keep helpers)

// Helper to calculate distance in meters
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



// Helper to format distance text (km if > 1000m)
const formatDistance = (meters: number) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};

// EventCard moved to @/components/event-card.tsx
import EventCard from '@/components/event-card';
// function EventCardOld...





function LocationMarker({ onMapClick, newLocation, onLocationFound }: {
  onMapClick?: (lat: number, lng: number) => void,
  newLocation: { lat: number; lng: number } | null,
  onLocationFound: (pos: L.LatLng) => void
}) {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const map = useMap();

  useEffect(() => {
    function onLocation(e: L.LocationEvent) {
      setIsLocating(false);
      setPosition((prev) => {
        if (!prev) {
          map.flyTo(e.latlng, 15);
        }
        return e.latlng;
      });
      onLocationFound(e.latlng);
    }

    function onLocationError(e: L.ErrorEvent) {
      setIsLocating(false);
      console.warn("Location access denied or failed:", e.message);
    }

    map.on("locationfound", onLocation);
    map.on("locationerror", onLocationError);

    return () => {
      map.off("locationfound", onLocation);
      map.off("locationerror", onLocationError);
      map.stopLocate();
    };
  }, [map, onLocationFound]);

  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (buttonRef.current) {
      L.DomEvent.disableClickPropagation(buttonRef.current);
      L.DomEvent.disableScrollPropagation(buttonRef.current);
    }
  }, []);

  const handleLocate = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (position) {
      map.flyTo(position, 15);
    } else {
      setIsLocating(true);
      map.locate({ watch: true, enableHighAccuracy: true });
    }
  };

  // Auto-locate on mount
  useEffect(() => {
    // Only locate if we don't have a position yet
    if (!position) {
      setIsLocating(true);
      map.locate({ setView: false, maxZoom: 15, watch: true, enableHighAccuracy: true });
    }
  }, [map]);

  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return (
    <>
      {position && (
        <>
          <Marker position={position} icon={L.divIcon({ className: 'user-marker', html: '<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_15px_#3b82f6] pulse-animation"></div>', iconSize: [16, 16] })}>
            <Popup className="custom-popup">You are here</Popup>
          </Marker>
          <Circle
            center={position}
            radius={1000}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1, dashArray: '5, 5' }}
            interactive={false} // Prevent blocking clicks on markers below
          />
        </>
      )}

      <div ref={buttonRef} className="fixed bottom-24 right-6 z-[1000]">
        <button
          onClick={handleLocate}
          className={`p-3 rounded-full shadow-lg border border-white/20 transition-all active:scale-95 backdrop-blur-sm ${isLocating ? 'bg-blue-600 animate-pulse' : 'bg-black/80 hover:bg-black'} text-white`}
          title={position ? "Go to my location" : "Locate me"}
          disabled={isLocating}
        >
          <Navigation
            size={20}
            className={`transition-colors ${position ? "text-blue-400" : "text-white/50"}`}
            fill="currentColor"
            fillOpacity={0.2}
          />
        </button>
      </div>

      {newLocation && (
        <Marker position={[newLocation.lat, newLocation.lng]} icon={createEmojiIcon('📍')} opacity={0.8}>
          <Popup className="custom-popup">New Event Location</Popup>
        </Marker>
      )}
    </>
  );
}

export default function MapView({ events, onMapClick, newLocation, onDeleteEvent, onRefresh, onAddEventClick, onEventSelect, onThemeChange, onUserLocationUpdate }: MapViewProps) {
  const [mounted, setMounted] = useState(false);
  const [showHappeningNow, setShowHappeningNow] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<L.LatLng | null>(null);

  // Propagate user location to parent
  useEffect(() => {
    if (userLocation && onUserLocationUpdate) {
      onUserLocationUpdate(userLocation.lat, userLocation.lng);
    }
  }, [userLocation, onUserLocationUpdate]);

  const [map, setMap] = useState<L.Map | null>(null);
  const [mapTheme, setMapTheme] = useState<'dark' | 'light' | 'cyberpunk'>('dark');
  const [sortBy, setSortBy] = useState<'time' | 'distance'>('distance');
  const [selectedCluster, setSelectedCluster] = useState<Event[] | null>(null);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-screen w-full bg-black flex items-center justify-center text-white">Initializing System...</div>;

  const now = new Date();

  const filteredEvents = events.filter(e => {
    const timeMatch = !showHappeningNow || (() => {
      if (!e.startTime || !e.endTime) return true;
      const start = new Date(e.startTime);
      const end = new Date(e.endTime);
      return now >= start && now <= end;
    })();

    const query = searchQuery.toLowerCase();
    const searchMatch = !searchQuery ||
      e.title.toLowerCase().includes(query) ||
      e.description.toLowerCase().includes(query) ||
      e.type.toLowerCase().includes(query);

    return timeMatch && searchMatch;
  });

  // Deduplication & Clustering
  const uniqueEvents = new Map<string, Event>();
  filteredEvents.forEach(e => {
    const key = `${e.title}|${e.startTime}`;
    if (!uniqueEvents.has(key)) uniqueEvents.set(key, e);
  });

  const groupedEvents = new Map<string, Event[]>();
  Array.from(uniqueEvents.values()).forEach(e => {
    // Safety check for invalid coordinates
    if (typeof e.lat !== 'number' || typeof e.lng !== 'number') return;

    const locKey = `${e.lat.toFixed(4)},${e.lng.toFixed(4)}`;
    if (!groupedEvents.has(locKey)) groupedEvents.set(locKey, []);
    groupedEvents.get(locKey)?.push(e);
  });

  const displayList = Array.from(uniqueEvents.values())
    .sort((a, b) => {
      if (sortBy === 'time') {
        const startA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const startB = b.startTime ? new Date(b.startTime).getTime() : 0;
        return startA - startB;
      } else {
        if (!userLocation) return 0;
        const distA = getDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
        const distB = getDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
        return distA - distB;
      }
    });

  const handleThemeChange = () => {
    setMapTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (onThemeChange) onThemeChange(next);
      return next;
    });
  };

  const isCyber = mapTheme === 'cyberpunk';
  const tileUrl = mapTheme === 'light'
    ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

  const activeList = selectedCluster || displayList;

  return (
    <>
      <MapContainer
        center={[54.8985, 23.9036]}
        zoom={13}
        scrollWheelZoom={true}
        zoomControl={false}
        className={`h-screen w-full z-0 bg-[#1a1a1a] ${isCyber ? 'cyberpunk-map' : ''}`}
        ref={setMap}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={tileUrl}
          className={isCyber ? 'cyberpunk-tiles' : ''}
        />

        {Array.from(groupedEvents.entries()).map(([key, group]) => {
          const event = group[0];
          const isCluster = group.length > 1;
          const isPast = event.endTime && new Date(event.endTime) < now;
          const opacity = isPast ? 0.3 : 1;
          const grayscale = isPast ? 'grayscale(100%)' : 'none';

          const location = event.venue || (event.description ? event.description.split('\n')[0] : '');
          let displayDate = event.date || '';
          if (event.startTime) {
            const start = new Date(event.startTime);
            displayDate = `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })} • ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          }
          const link = event.link || (event.description && event.description.split('\n')[2]?.startsWith('http') ? event.description.split('\n')[2] : '');

          const markerIcon = isCluster ? L.divIcon({
            className: 'cluster-marker',
            html: `<div class="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg border-2 border-white font-bold text-lg">${group.length}</div>`,
            iconSize: [48, 48]
          }) : getEventIcon(event.type, false, !!isPast);

          return (
            <Marker
              key={`${key}-${group.length}`}
              position={[event.lat, event.lng]}
              icon={markerIcon}
              opacity={opacity}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e.originalEvent);
                  console.log('Marker clicked:', event.title);

                  if (isCluster) {
                    if (map) map.flyTo([event.lat, event.lng], 16);
                    setSelectedCluster(group);
                    setShowList(true);
                  } else if (onEventSelect) {
                    onEventSelect(event);
                  }
                }
              }}
            >
              {/* No Popup for Cluster anymore, or only for non-cluster if needed? No, single event select opens modal directly. */}
            </Marker>
          );
        })}

        <LocationMarker
          onMapClick={onMapClick}
          newLocation={newLocation || null}
          onLocationFound={setUserLocation}
        />
      </MapContainer>


      {/* Top Controls */}
      <div className="fixed top-4 left-0 right-0 z-[2100] flex justify-center px-4 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-lg transition-all">

          {/* List Toggle */}
          <button
            onClick={() => { setShowList(!showList); setSelectedCluster(null); }}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${showList ? 'text-white bg-white/20' : 'text-white/80 hover:text-white'}`}
            title="List View"
          >
            <List size={20} />
          </button>

          <div className="w-px h-6 bg-white/20 mx-1"></div>

          {/* Search */}
          <div className={`flex items-center transition-all duration-300 ease-in-out ${isSearchOpen ? 'w-64 px-2' : 'w-10 justify-center'}`}>
            {isSearchOpen ? (
              <div className="flex items-center w-full">
                <input
                  autoFocus
                  type="text"
                  placeholder="Search events..."
                  className="bg-transparent border-none outline-none text-white text-sm w-full font-medium placeholder-gray-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => !searchQuery && setIsSearchOpen(false)}
                />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-white ml-1">×</button>}
              </div>
            ) : (
              <button onClick={() => setIsSearchOpen(true)} className="text-white/80 hover:text-white transition-colors">
                <SearchIcon size={20} />
              </button>
            )}
          </div>

          <div className="w-px h-6 bg-white/20 mx-1"></div>

          {/* Theme */}
          <button
            onClick={handleThemeChange}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all text-gray-300 hover:bg-white/10`}
            title="Toggle Theme"
          >
            {mapTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <div className="w-px h-6 bg-white/20 mx-1"></div>

          {/* Sort */}
          <button
            onClick={() => setSortBy(prev => prev === 'time' ? 'distance' : 'time')}
            className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-xs transition-all ${sortBy === 'time' ? 'text-blue-400 bg-blue-500/10' : 'text-gray-300 hover:bg-white/10'}`}
            title={sortBy === 'time' ? 'Sorted by Time' : 'Sorted by Distance'}
          >
            {sortBy === 'time' ? '⏱️' : '📍'}
          </button>

          {/* Live */}
          <button
            onClick={() => setShowHappeningNow(!showHappeningNow)}
            className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-xs transition-all ${showHappeningNow ? 'text-green-400 bg-green-500/10' : 'text-gray-300 hover:bg-white/10'}`}
            title="Toggle Live Events"
          >
            {showHappeningNow ? '🟢' : '⚪'}
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all text-gray-300 hover:text-white hover:bg-white/10`}
            title="Refresh Events"
          >
            <RotateCw size={16} />
          </button>

        </div>
      </div>

      {/* Live Event List (Bottom) */}
      <div className="fixed bottom-0 left-0 right-14 md:right-auto md:bottom-6 md:left-6 z-[1000] 
        flex flex-row md:flex-col 
        overflow-x-auto md:overflow-x-visible md:overflow-y-auto 
        snap-x snap-mandatory 
        gap-0 md:gap-0 
        px-2 md:px-0 md:w-80 
        py-3 md:py-0
        max-h-[50vh] md:max-h-[60vh] 
        hide-scrollbar pointer-events-none bg-gradient-to-t from-black/80 via-black/40 to-transparent md:bg-none">
        {displayList.slice(0, 20).map(event => (
          <div key={event.id} className="pointer-events-auto min-w-[85vw] h-20 md:h-auto md:min-w-0 md:w-full snap-center mr-3 md:mr-0 md:mb-3">
            <EventCard
              event={event}
              userLocation={userLocation}
              onClick={() => {
                if (map) {
                  map.flyTo([event.lat, event.lng], 16, { duration: 1.5 });
                }
                if (onEventSelect) onEventSelect(event);
              }}
            />
          </div>
        ))}
      </div>

      {/* Mobile List Toggle Button (Right Side) */}
      <div className="fixed bottom-0 right-0 w-14 h-auto md:hidden z-[1000] pointer-events-none flex flex-col justify-end pb-3 items-center">
        <button
          onClick={() => setShowList(true)}
          className="pointer-events-auto w-10 h-20 bg-black/60 backdrop-blur-md border border-white/20 rounded-l-xl flex items-center justify-center active:scale-95 transition-all text-blue-300 hover:text-white shadow-xl"
          title="Open List"
        >
          <List size={24} />
        </button>
      </div>

      {/* Full List View Overlay */}
      {showList && (
        <div className={`fixed inset-0 z-[2000] pt-20 px-4 pb-24 overflow-y-auto animate-in fade-in slide-in-from-bottom-5 duration-200 
          ${mapTheme === 'cyberpunk' ? 'bg-[#050510]/95' : mapTheme === 'light' ? 'bg-gray-100/95' : 'bg-[#121212]/95'}`}>
          <div className="max-w-md mx-auto space-y-3">
            <div className={`flex justify-between items-center mb-4 sticky top-0 z-10 py-2 border-b backdrop-blur-md
               ${mapTheme === 'cyberpunk' ? 'bg-[#050510]/80 border-cyan-500/30' : mapTheme === 'light' ? 'bg-gray-100/80 border-gray-300' : 'bg-[#121212]/80 border-white/10'}`}>

              <h2 className={`text-xl font-bold ${mapTheme === 'cyberpunk' ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : mapTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                {selectedCluster ? `Cluster Events (${selectedCluster.length})` : `All Events (${displayList.length})`}
              </h2>

              <div className="flex gap-2">
                {!selectedCluster && (
                  <button
                    onClick={() => setSortBy(prev => prev === 'time' ? 'distance' : 'time')}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase transition-all
                        ${mapTheme === 'cyberpunk' ? (sortBy === 'time' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-pink-500/20 text-pink-300 border border-pink-500/50') :
                        mapTheme === 'light' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                          'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'}`}
                  >
                    {sortBy === 'time' ? 'Time' : 'Dist'}
                  </button>
                )}
                <button
                  onClick={() => { setShowList(false); setSelectedCluster(null); }}
                  className={`p-1 rounded-full transition-colors ${mapTheme === 'light' ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-200' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
            </div>

            {activeList.map(event => (
              <div key={event.id} className="w-full">
                <EventCard
                  event={event}
                  userLocation={userLocation}
                  variant="standard"
                  onClick={() => {
                    setShowList(false);
                    setSelectedCluster(null);
                    if (map) map.flyTo([event.lat, event.lng], 16);
                    if (onEventSelect) onEventSelect(event);
                  }}
                />
              </div>
            ))}

            {activeList.length === 0 && (
              <div className={`text-center mt-20 ${mapTheme === 'light' ? 'text-gray-400' : 'text-gray-600'}`}>No events found.</div>
            )}
          </div>
        </div>
      )}

      {/* Add Button */}
      <div className="fixed bottom-40 right-6 z-[1000]">
        <button
          onClick={() => {
            const loc = userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : undefined;
            if (onAddEventClick) onAddEventClick(loc);
          }}
          className="p-4 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/20 transition-all active:scale-95 backdrop-blur-sm group bg-blue-600 hover:bg-blue-500 text-white"
          title="Add New Event"
        >
          <Plus size={24} className="transition-transform duration-300" />
        </button>
      </div>
    </>
  );
}
