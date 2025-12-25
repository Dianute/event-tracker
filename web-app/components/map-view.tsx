'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import { Navigation, Search as SearchIcon, Moon, Sun, Zap, RotateCw, Plus, List, X, ChevronRight } from 'lucide-react';

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
  const map = useMap();

  useEffect(() => {
    map.locate({ watch: true, enableHighAccuracy: true });

    function onLocation(e: L.LocationEvent) {
      setPosition((prev) => {
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

  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (buttonRef.current) {
      L.DomEvent.disableClickPropagation(buttonRef.current);
      L.DomEvent.disableScrollPropagation(buttonRef.current);
    }
  }, [position]);

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
          <Circle center={position} radius={1000} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1, dashArray: '5, 5' }} />

          <div ref={buttonRef} className="fixed bottom-24 right-6 z-[1000]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (position) map.flyTo(position, 15);
              }}
              className="bg-black/80 hover:bg-black text-white p-3 rounded-full shadow-lg border border-white/20 transition-all active:scale-95 backdrop-blur-sm"
              title="Go to my location"
            >
              <Navigation size={20} className="text-blue-400" fill="currentColor" fillOpacity={0.2} />
            </button>
          </div>
        </>
      )}

      {newLocation && (
        <Marker position={[newLocation.lat, newLocation.lng]} icon={createEmojiIcon('📍')} opacity={0.8}>
          <Popup className="custom-popup">New Event Location</Popup>
        </Marker>
      )}
    </>
  );
}

export default function MapView({ events, onMapClick, newLocation, onDeleteEvent, onRefresh, onAddEventClick, onEventSelect, onThemeChange }: MapViewProps) {
  const [mounted, setMounted] = useState(false);
  const [showHappeningNow, setShowHappeningNow] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<L.LatLng | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [mapTheme, setMapTheme] = useState<'dark' | 'light' | 'cyberpunk'>('dark');
  const [sortBy, setSortBy] = useState<'time' | 'distance'>('distance');
  const [showList, setShowList] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<Event[] | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (map) {
      map.on('click', () => {
        setSelectedCluster(null);
      });
    }
  }, [map]);


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

  /* 
   * REPAIRED COMPONENT LOGIC 
   */
  const handleThemeChange = () => {
    const themes: ('dark' | 'light' | 'cyberpunk')[] = ['dark', 'light', 'cyberpunk'];
    const nextIndex = (themes.indexOf(mapTheme) + 1) % themes.length;
    const newTheme = themes[nextIndex];
    setMapTheme(newTheme);
    if (onThemeChange) onThemeChange(newTheme);
  };

  const handleClusterClick = (cluster: Event[]) => {
    setSelectedCluster(cluster);
  };

  // Sorting for the List View
  const displayList = Array.from(uniqueEvents.values()).sort((a, b) => {
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

  return (
    <>
      <MapContainer
        center={[54.8985, 23.9036]}
        zoom={13}
        zoomControl={false}
        className={`w-full h-full transition-colors duration-700 ${mapTheme === 'light' ? 'bg-gray-100' : 'bg-black'}`}
        ref={setMap}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={mapTheme === 'light' 
            ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            : mapTheme === 'cyberpunk'
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" // Dark base for cyberpunk
            : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          }
          className={mapTheme === 'cyberpunk' ? 'brightness-125 contrast-125 hue-rotate-15 invert filter sepia-[.3]' : ''}
        />

        {/* Render Markers from Grouped Events */}
        {Array.from(groupedEvents.entries()).map(([locKey, group]) => {
          const isCluster = group.length > 1;
          const event = group[0]; // Representative event
          if (!event) return null;
          
          const isPast = event.endTime && new Date(event.endTime) < now;
          const opacity = isPast ? 0.5 : 1;
          const isCyber = mapTheme === 'cyberpunk';
          
          const markerIcon = isCluster ? L.divIcon({
            className: 'cluster-marker',
            html: `<div class="flex items-center justify-center w-12 h-12 rounded-full shadow-lg border-2 font-bold text-lg transition-transform hover:scale-110 ${isCyber ? 'bg-slate-900 text-cyan-400 border-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-blue-600 text-white border-white'}">${group.length}</div>`,
            iconSize: [48, 48]
          }) : getEventIcon(event.type, false, !!isPast);

          return (
            <Marker
              key={locKey}
              position={[event.lat, event.lng]}
              icon={markerIcon}
              opacity={opacity}
              eventHandlers={{
                click: () => {
                  if (isCluster) {
                    handleClusterClick(group);
                  } else if (onEventSelect) {
                    onEventSelect(event);
                  }
                }
              }}
            >
              {/* No Popup for clusters anymore - we use the drawer */}
            </Marker>
          );
        })}

<LocationMarker
  onMapClick={onMapClick}
  newLocation={newLocation || null}
  onLocationFound={setUserLocation}
/>
            </MapContainer >


  {/* Cluster Drawer (Bottom Sheet) */ }
  < div className = {`fixed bottom-0 left-0 right-0 z-[2000] p-4 rounded-t-3xl transition-transform duration-300 transform 
          ${selectedCluster ? 'translate-y-0' : 'translate-y-full'}
          ${isCyber ? 'bg-slate-900 border-t border-cyan-500/50 shadow-[0_0_30px_rgba(0,0,0,0.8)]' :
      mapTheme === 'light' ? 'bg-white border-t border-gray-200 shadow-2xl' :
        'bg-gray-900 border-t border-gray-800 shadow-2xl'}`}
style = {{ maxHeight: '60vh' }}
            >
  { selectedCluster && (
    <div className="flex flex-col h-full max-h-[55vh]">
      {/* Handle Bar */}
      <div className="w-12 h-1.5 bg-gray-400/30 rounded-full self-center mb-4 shrink-0"></div>

      <div className="flex justify-between items-center mb-4 shrink-0">
        <h3 className={`font-bold text-lg ${mapTheme === 'preview-light' ? 'text-gray-900' : 'text-white'}`}>
          {selectedCluster.length} Events Here
        </h3>
        <button
          onClick={() => setSelectedCluster(null)}
          className="p-2 bg-gray-500/20 rounded-full hover:bg-gray-500/30"
        >
          <X size={20} className="text-white" />
        </button>
      </div>

      {/* Scrollable List */}
      <div className="overflow-y-auto space-y-3 pb-safe">
        {selectedCluster.map(evt => (
          <div key={evt.id} /* Reusing EventCard logic inline or simplified for drawer */
            onClick={() => {
              if (onEventSelect) onEventSelect(evt);
              setSelectedCluster(null);
            }}
            className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors
                                   ${isCyber ? 'bg-slate-800/50 border-cyan-500/20 hover:bg-slate-800' :
                mapTheme === 'light' ? 'bg-gray-50 border-gray-200 hover:bg-gray-100' :
                  'bg-gray-800/50 border-gray-700 hover:bg-gray-800'}`}
          >
            <div className="text-2xl">{getEmoji(evt.type)}</div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-bold text-sm truncate ${mapTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>{evt.title}</h4>
              <div className="flex gap-2 text-xs opacity-70 mt-1">
                <span>{new Date(evt.startTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span>•</span>
                <span className="capitalize">{evt.type}</span>
              </div>
            </div>
            <ChevronRight size={16} className="opacity-50" />
          </div>
        ))}
      </div>
    </div>
  )}
            </div >

  {/* Top Controls */ }
  < div className = "fixed top-4 left-0 right-0 z-[2100] flex justify-center px-4 pointer-events-none" >
    <div className="flex items-center gap-2 pointer-events-auto bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-lg transition-all">

      {/* List Toggle */}
      <button
        onClick={() => setShowList(!showList)}
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
            </div >

  {/* Live Event List (Bottom) */ }
  < div className = "fixed bottom-0 left-0 right-14 md:right-auto md:bottom-6 md:left-6 z-[1000] 
        flex flex - row md: flex - col
overflow - x - auto md: overflow - x - visible md: overflow - y - auto
snap - x snap - mandatory
gap - 0 md: gap - 0
px - 2 md: px - 0 md: w - 80
py - 3 md: py - 0
max - h - [50vh] md: max - h - [60vh]
hide - scrollbar pointer - events - none bg - gradient - to - t from - black / 80 via - black / 40 to - transparent md: bg - none">
{
  displayList.slice(0, 20).map(event => (
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
  ))
}
            </div >

  {/* Mobile List Toggle Button (Right Side) */ }
  < div className = "fixed bottom-0 right-0 w-14 h-auto md:hidden z-[1000] pointer-events-none flex flex-col justify-end pb-3 items-center" >
    <button
      onClick={() => setShowList(true)}
      className="pointer-events-auto w-10 h-20 bg-black/60 backdrop-blur-md border border-white/20 rounded-l-xl flex items-center justify-center active:scale-95 transition-all text-blue-300 hover:text-white shadow-xl"
      title="Open List"
    >
      <List size={24} />
    </button>
            </div >

  {/* Full List View Overlay */ }
{
  showList && (
    <div className={`fixed inset-0 z-[2000] pt-20 px-4 pb-24 overflow-y-auto animate-in fade-in slide-in-from-bottom-5 duration-200 
          ${mapTheme === 'cyberpunk' ? 'bg-[#050510]/95' : mapTheme === 'light' ? 'bg-gray-100/95' : 'bg-[#121212]/95'}`}>
      <div className="max-w-md mx-auto space-y-3">
        <div className={`flex justify-between items-center mb-4 sticky top-0 z-10 py-2 border-b backdrop-blur-md
               ${mapTheme === 'cyberpunk' ? 'bg-[#050510]/80 border-cyan-500/30' : mapTheme === 'light' ? 'bg-gray-100/80 border-gray-300' : 'bg-[#121212]/80 border-white/10'}`}>

          <h2 className={`text-xl font-bold ${mapTheme === 'cyberpunk' ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : mapTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
            All Events ({displayList.length})
          </h2>

          <div className="flex gap-2">
            <button
              onClick={() => setSortBy(prev => prev === 'time' ? 'distance' : 'time')}
              className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase transition-all
                      ${mapTheme === 'cyberpunk' ? (sortBy === 'time' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-pink-500/20 text-pink-300 border border-pink-500/50') :
                  mapTheme === 'light' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                    'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'}`}
            >
              {sortBy === 'time' ? 'Time' : 'Dist'}
            </button>
            <button
              onClick={() => setShowList(false)}
              className={`p-1 rounded-full transition-colors ${mapTheme === 'light' ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-200' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
            >
              <Plus size={24} className="rotate-45" />
            </button>
          </div>
        </div>

        {displayList.map(event => (
          <div key={event.id} className="w-full">
            <EventCard
              event={event}
              userLocation={userLocation}
              variant="standard"
              onClick={() => {
                setShowList(false);
                if (map) map.flyTo([event.lat, event.lng], 16);
                if (onEventSelect) onEventSelect(event);
              }}
            />
          </div>
        ))}

        {displayList.length === 0 && (
          <div className={`text-center mt-20 ${mapTheme === 'light' ? 'text-gray-400' : 'text-gray-600'}`}>No events found matching your filters.</div>
        )}
      </div>
    </div>
      {/* Cluster Drawer (Bottom Sheet) */ }
  <div className={`fixed bottom-0 left-0 right-0 z-[2000] p-4 rounded-t-3xl transition-transform duration-300 transform 
          ${selectedCluster ? 'translate-y-0' : 'translate-y-full'}
          ${mapTheme === 'cyberpunk' ? 'bg-slate-900 border-t border-cyan-500/50 shadow-[0_0_30px_rgba(0,0,0,0.8)]' :
      mapTheme === 'light' ? 'bg-white border-t border-gray-200 shadow-2xl' :
        'bg-gray-900 border-t border-gray-800 shadow-2xl'}`}
    style={{ maxHeight: '60vh' }}
  >
    {selectedCluster && (
      <div className="flex flex-col h-full max-h-[55vh]">
        {/* Handle Bar */}
        <div className="w-12 h-1.5 bg-gray-400/30 rounded-full self-center mb-4 shrink-0"></div>

        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className={`font-bold text-lg ${mapTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
            {selectedCluster.length} Events Here
          </h3>
          <button
            onClick={() => setSelectedCluster(null)}
            className="p-2 bg-gray-500/20 rounded-full hover:bg-gray-500/30"
          >
            <X size={20} className={` ${mapTheme === 'light' ? 'text-gray-900' : 'text-white'}`} />
          </button>
        </div>

        {/* Scrollable List */}
        <div className="overflow-y-auto space-y-3 pb-safe px-1">
          {selectedCluster.map(evt => (
            <div key={evt.id} className="w-full">
              <EventCard
                event={evt}
                userLocation={userLocation}
                variant="standard"
                onClick={() => {
                  if (onEventSelect) onEventSelect(evt);
                  setSelectedCluster(null);
                }}
              />
            </div>
          ))}
        </div>
      </div>
    )}
  </div>

  {/* Add Button */ }
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
