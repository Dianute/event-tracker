'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useRef } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";
import L from 'leaflet';
import { Navigation, Search as SearchIcon, Moon, Sun, Zap, RotateCw, Plus, List, Calendar, Clock, Target, Globe, User, LogOut, LayoutDashboard } from 'lucide-react';

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
  onViewEventsChange?: (events: Event[]) => void;
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
      // Save for next reload
      localStorage.setItem('last_lat', e.latlng.lat.toString());
      localStorage.setItem('last_lng', e.latlng.lng.toString());
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

// Component to track map bounds
function MapBoundsHandler({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) {
  const map = useMap();

  useEffect(() => {
    // Initial bounds
    if (map) {
      onBoundsChange(map.getBounds());
    }
  }, [map, onBoundsChange]);

  useMapEvents({
    moveend: () => onBoundsChange(map.getBounds()),
    zoomend: () => onBoundsChange(map.getBounds()),
  });

  return null;
}

export default function MapView({ events, onMapClick, newLocation, onDeleteEvent, onRefresh, onAddEventClick, onEventSelect, onThemeChange, onUserLocationUpdate, onViewEventsChange }: MapViewProps) {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  // Filters
  const [timeFilter, setTimeFilter] = useState<'all' | 'live' | 'today' | 'week'>('all'); // Replaces showHappeningNow
  const [radiusFilter, setRadiusFilter] = useState<number | null>(null); // Replaces sortBy (sorts by dist when active)

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<L.LatLng | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);


  // Propagate user location to parent
  useEffect(() => {
    if (userLocation && onUserLocationUpdate) {
      onUserLocationUpdate(userLocation.lat, userLocation.lng);
    }
  }, [userLocation, onUserLocationUpdate]);



  const [map, setMap] = useState<L.Map | null>(null);
  const [mapTheme, setMapTheme] = useState<'dark' | 'light' | 'cyberpunk'>('dark');
  const [selectedCluster, setSelectedCluster] = useState<Event[] | null>(null);
  const [showList, setShowList] = useState(false);

  const [defaultCenter, setDefaultCenter] = useState<[number, number] | null>(null);

  useEffect(() => {
    setMounted(true);
    // instant load from storage
    const lat = localStorage.getItem('last_lat');
    const lng = localStorage.getItem('last_lng');
    if (lat && lng) {
      setDefaultCenter([parseFloat(lat), parseFloat(lng)]);
    } else {
      setDefaultCenter([54.8985, 23.9036]); // Default Kaunas
    }
  }, []);



  const now = new Date();

  const filteredEvents = events.filter(e => {
    // Time Filter Logic
    const start = e.startTime ? new Date(e.startTime) : new Date(0); // Default to past if missing
    const end = e.endTime ? new Date(e.endTime) : new Date(8640000000000000); // Default to far future

    const timeMatch = (() => {
      if (timeFilter === 'all') return true;
      if (timeFilter === 'live') return now >= start && now <= end;
      if (timeFilter === 'today') {
        const tomorrow4am = new Date(now);
        tomorrow4am.setDate(tomorrow4am.getDate() + 1);
        tomorrow4am.setHours(4, 0, 0, 0);
        return start < tomorrow4am && end > now;
      }
      if (timeFilter === 'week') {
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return start < nextWeek && end > now;
      }
      return true;
    })();

    // Radius Filter Logic
    const radiusMatch = (() => {
      if (!radiusFilter || !userLocation) return true;
      const dist = getDistance(userLocation.lat, userLocation.lng, e.lat, e.lng);
      return dist <= radiusFilter;
    })();

    const query = searchQuery.toLowerCase();
    const searchMatch = !searchQuery ||
      e.title.toLowerCase().includes(query) ||
      e.description.toLowerCase().includes(query) ||
      e.type.toLowerCase().includes(query);

    // Viewport Filter Logic
    if (mapBounds) {
      if (typeof e.lat !== 'number' || typeof e.lng !== 'number') return false;
      if (!mapBounds.contains([e.lat, e.lng])) {
        return false;
      }
    }

    return timeMatch && radiusMatch && searchMatch;
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



  // Smart Sort: Distance if user location known, otherwise Time
  const smartSortBy = userLocation || radiusFilter ? 'distance' : 'time';

  let displayList = Array.from(uniqueEvents.values());

  if (smartSortBy === 'distance') {
    // Explicit Distance Sort
    displayList.sort((a, b) => {
      if (!userLocation) return 0;
      const distA = getDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
      const distB = getDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
      return distA - distB;
    });
  } else {
    // Default Time Sort (with Local Priority)
    if (userLocation) {
      const LOCAL_RADIUS = 25000; // 25km
      const localEvents: Event[] = [];
      const farEvents: Event[] = [];

      displayList.forEach(e => {
        const dist = getDistance(userLocation.lat, userLocation.lng, e.lat, e.lng);
        if (dist <= LOCAL_RADIUS) localEvents.push(e);
        else farEvents.push(e);
      });

      const sortByTime = (a: Event, b: Event) => {
        const startA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const startB = b.startTime ? new Date(b.startTime).getTime() : 0;
        return startA - startB;
      };

      localEvents.sort(sortByTime);
      farEvents.sort(sortByTime);

      displayList = [...localEvents, ...farEvents];
    } else {
      // No location? Just pure time sort
      displayList.sort((a, b) => {
        const startA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const startB = b.startTime ? new Date(b.startTime).getTime() : 0;
        return startA - startB;
      });
    }
  }

  // Fallback Logic: If current view is empty, show upcoming global events
  const showingFallback = displayList.length === 0;

  if (showingFallback) {
    const fallbackEvents = events
      .filter(e => {
        const start = e.startTime ? new Date(e.startTime) : new Date(0);
        return start >= now;
      })
      .sort((a, b) => {
        const startA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const startB = b.startTime ? new Date(b.startTime).getTime() : 0;
        return startA - startB;
      })
      .slice(0, 10);

    // Only replace if we found something to show
    if (fallbackEvents.length > 0) {
      displayList.push(...fallbackEvents);
    }
  }

  // Function to cycle radius
  const cycleRadiusFilters = () => {
    if (!userLocation) {
      alert("Please enable location to use distance filters.");
      // Ideally this would trigger map.locate() again but simple alert is ok for now logic-wise
      return;
    }
    if (radiusFilter === null) setRadiusFilter(1000); // 1km
    else if (radiusFilter === 1000) setRadiusFilter(5000); // 5km
    else if (radiusFilter === 5000) setRadiusFilter(10000); // 10km
    else setRadiusFilter(null); // Back to World
  };

  const getRadiusLabel = () => {
    if (radiusFilter === 1000) return '1 km';
    if (radiusFilter === 5000) return '5 km';
    if (radiusFilter === 10000) return '10 km';
    return 'World';
  }

  // Function to cycle time
  const cycleTimeFilters = () => {
    if (timeFilter === 'all') setTimeFilter('live');
    else if (timeFilter === 'live') setTimeFilter('today');
    else if (timeFilter === 'today') setTimeFilter('week');
    else setTimeFilter('all');
  }

  const getTimeLabel = () => {
    if (timeFilter === 'live') return 'Live';
    if (timeFilter === 'today') return 'Today';
    if (timeFilter === 'week') return 'Week';
    return 'All';
  }

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

  // Propagate active list to parent for Feed View (Debounced)
  const prevFeedIds = useRef('');
  useEffect(() => {
    const currentIds = activeList.map(e => e.id).join(',');
    if (onViewEventsChange && currentIds !== prevFeedIds.current) {
      onViewEventsChange(activeList);
      prevFeedIds.current = currentIds;
    }
  }, [activeList, onViewEventsChange]);

  if (!mounted || !defaultCenter) return <div className="h-screen w-full bg-black flex items-center justify-center text-white">Initializing System...</div>;

  return (
    <>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        zoomControl={false}
        className={`h-screen w-full z-0 bg-[#1a1a1a] ${isCyber ? 'cyberpunk-map' : ''}`}
        ref={setMap}
      >
        <MapBoundsHandler onBoundsChange={setMapBounds} />
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
        {/* Unified Pill Container */}
        <div className="flex items-center pointer-events-auto bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-lg max-w-full">

          {/* Scrollable Section (Filters & Search) */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar max-w-full">
            {/* List Toggle */}
            <button
              onClick={() => { setShowList(!showList); setSelectedCluster(null); }}
              className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-all ${showList ? 'text-white bg-white/20' : 'text-white/80 hover:text-white'}`}
              title="List View"
            >
              <List size={20} />
            </button>

            <div className="shrink-0 w-px h-6 bg-white/20 mx-1"></div>

            {/* Search */}
            <div className={`flex items-center transition-all duration-300 ease-in-out shrink-0 ${isSearchOpen ? 'w-32 md:w-64 px-2' : 'w-10 justify-center'}`}>
              {isSearchOpen ? (
                <div className="flex items-center w-full">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search..."
                    className="bg-transparent border-none outline-none text-white text-sm w-full font-medium placeholder-gray-400 min-w-0"
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
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-all text-gray-300 hover:bg-white/10 shrink-0`}
              title="Toggle Theme"
            >
              {mapTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <div className="w-px h-6 bg-white/20 mx-1"></div>

            {/* Radius Filter */}
            <button
              key="radius-btn"
              onClick={cycleRadiusFilters}
              className={`h-8 px-3 flex items-center justify-center rounded-full font-bold text-xs transition-all border whitespace-nowrap shrink-0
                    ${radiusFilter ? 'text-blue-300 border-blue-500/30 bg-blue-500/10' : 'text-gray-400 border-transparent hover:bg-white/10'}`}
              title="Filter by Radius"
            >
              {getRadiusLabel()}
            </button>

            {/* Time Filter */}
            <button
              key="time-btn"
              onClick={cycleTimeFilters}
              className={`h-8 px-3 flex items-center justify-center rounded-full font-bold text-xs transition-all border whitespace-nowrap gap-1.5 shrink-0
                    ${timeFilter !== 'all' ? 'text-green-300 border-green-500/30 bg-green-500/10' : 'text-gray-400 border-transparent hover:bg-white/10'}`}
              title="Filter by Time"
            >
              {timeFilter === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>}
              {getTimeLabel()}
            </button>

            {/* Refresh */}
            <button
              onClick={onRefresh}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-all text-gray-300 hover:text-white hover:bg-white/10 shrink-0`}
              title="Refresh Events"
            >
              <RotateCw size={16} />
            </button>
          </div>

          <div className="w-px h-6 bg-white/20 mx-1 md:mx-2 shrink-0"></div>

          {/* User Profile (Static Side) */}
          <div className="relative shrink-0 z-[2200]">
            {session ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 rounded-full overflow-hidden border border-white/20 hover:border-blue-500 transition-all active:scale-95"
                  title={`Logged in as ${session.user?.name || 'User'}`}
                >
                  {session.user?.image ? (
                    <img src={session.user.image} alt="U" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      {session.user?.name?.[0] || 'U'}
                    </div>
                  )}
                </button>

                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-3 w-56 bg-[#0a0a0a] border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden py-2 flex flex-col animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/50">
                    <div className="px-4 py-3 border-b border-gray-800">
                      <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Signed in as</p>
                      <p className="font-bold text-white text-sm truncate">{session.user?.name || 'User'}</p>
                      <p className="text-xs text-gray-400 truncate">{session.user?.email}</p>
                    </div>
                    <div className="p-1">
                      {session.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL ? (
                        <a
                          href="/admin"
                          className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors group"
                        >
                          <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                            <LayoutDashboard size={16} />
                          </div>
                          Admin Panel
                        </a>
                      ) : (
                        <a
                          href="/dashboard"
                          className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors group"
                        >
                          <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                            <LayoutDashboard size={16} />
                          </div>
                          Business Dashboard
                        </a>
                      )}
                    </div>
                    <div className="border-t border-gray-800 mx-2 my-1"></div>
                    <div className="p-1">
                      <button
                        onClick={() => signOut()}
                        className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors w-full text-left group"
                      >
                        <div className="p-1.5 rounded-md bg-red-500/10 text-red-400 group-hover:bg-red-500 group-hover:text-white transition-colors">
                          <LogOut size={16} />
                        </div>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => signIn()}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-all text-gray-300 hover:text-white hover:bg-white/10"
                title="Sign In"
              >
                <User size={18} />
              </button>
            )}
          </div>
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
                    // Don't close list - preserve context for "Back" navigation
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
