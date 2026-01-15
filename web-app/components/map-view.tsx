'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";
import L from 'leaflet';
import { Navigation, Search as SearchIcon, Moon, Sun, Zap, RotateCw, Plus, List, Calendar, Clock, Target, Globe, User, LogOut, LayoutDashboard, X } from 'lucide-react';

// Custom Emoji Marker Helper
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const createEmojiIcon = (emoji: string, theme: string, isNew?: boolean, isFinished?: boolean) => {
  // Theme-based Styles
  let containerClass = 'bg-white border-white text-black shadow-md'; // Default Light
  if (theme === 'cyberpunk') containerClass = 'bg-black/90 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)] rounded-xl'; // Neon Squircle
  else if (theme === 'dark') containerClass = 'bg-gray-900/90 border-gray-600 text-gray-200 shadow-xl'; // Dark Circle

  // Specific adjustments
  const shapeClass = theme === 'cyberpunk' ? 'rounded-xl' : 'rounded-full';
  const borderClass = theme === 'cyberpunk' ? 'border' : 'border-2';

  const animationClass = isNew && !isFinished ? 'animate-bounce-slow ring-4 ring-yellow-400 ring-offset-2 ring-offset-black' :
    isFinished ? 'grayscale opacity-50' : 'transform hover:scale-110';

  const newBadge = isNew && !isFinished ? '<div class="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg z-50 animate-pulse">NEW</div>' : '';

  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="relative flex items-center justify-center w-10 h-10 ${containerClass} ${shapeClass} ${borderClass} text-2xl transition-transform ${animationClass}">
            <span class="${theme === 'cyberpunk' ? 'drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : ''}">${emoji}</span>
            ${newBadge}
            ${isFinished ? '<div class="absolute -top-2 -right-2 bg-gray-600/90 text-[8px] text-white px-1 rounded shadow backdrop-blur-sm">ENDED</div>' : ''}
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

const createCustomImageIcon = (url: string, theme: string, isNew?: boolean, isFinished?: boolean) => {
  // Transparent container with a drop shadow for the image itself
  const containerClass = 'drop-shadow-xl hover:scale-110 transition-transform';

  const animationClass = isNew && !isFinished ? 'animate-bounce-slow' :
    isFinished ? 'grayscale opacity-50' : 'transform';

  return L.divIcon({
    className: 'custom-marker',
    // Removed: bg-*, border-*, rounded-full. Added: object-contain
    html: `<div class="relative flex items-center justify-center w-10 h-10 ${containerClass} ${animationClass}">
                <img src="${url}" class="w-full h-full object-contain filter drop-shadow-sm" alt="icon" />
                ${isFinished ? '<div class="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg"><div class="text-[8px] text-white font-bold uppercase rotate-45 border border-white px-1">Ended</div></div>' : ''}
                ${isNew && !isFinished ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div><div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>' : ''}
               </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

const getEventIcon = (type: string, theme: string, isNew?: boolean, isFinished?: boolean, customIconUrl?: string | null) => {
  if (customIconUrl) {
    return createCustomImageIcon(customIconUrl, theme, isNew, isFinished);
  }

  switch (type) {
    case 'food': return createEmojiIcon('🍔', theme, isNew, isFinished);
    case 'sports': return createEmojiIcon('⚽', theme, isNew, isFinished);
    case 'music': return createEmojiIcon('🎵', theme, isNew, isFinished);
    case 'arts': return createEmojiIcon('🎨', theme, isNew, isFinished);
    case 'learning': return createEmojiIcon('📚', theme, isNew, isFinished);
    case 'social':
    default:
      return createEmojiIcon('🍻', theme, isNew, isFinished);
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
  imageUrl?: string;
  createdAt?: string;
  userEmail?: string;
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





function LocationMarker({ onMapClick, newLocation, onLocationFound, onShowAuth }: {
  onMapClick?: (lat: number, lng: number) => void,
  newLocation: { lat: number; lng: number } | null,
  onLocationFound: (pos: L.LatLng) => void,
  onShowAuth?: () => void
}) {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const { data: session } = useSession();
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
      if (session) {
        if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
      } else {
        if (onShowAuth) onShowAuth();
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
        <Marker position={[newLocation.lat, newLocation.lng]} icon={createEmojiIcon('📍', 'default')} opacity={0.8}>
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
  // Analytics State
  const viewedEventsRef = useRef<Set<string>>(new Set());
  const formattedDistanceRef = useRef<string>('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  // Filters
  const [timeFilter, setTimeFilter] = useState<'all' | 'live' | 'today' | 'week'>('all'); // Replaces showHappeningNow
  const [selectedCategory, setSelectedCategory] = useState<string>('food');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  // Dynamic Categories
  const [categories, setCategories] = useState<{ id: string; label: string; icon: any; isFeatured?: boolean; customPinUrl?: string }[]>([
    { id: 'all', label: 'All', icon: <Globe size={16} /> }
  ]);
  const [featuredCategories, setFeaturedCategories] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Transform backend format to frontend format (icon -> emoji)
          // Default All + Server Data

          // Filter out inactive categories (isActive is true or undefined)
          const activeData = data.filter((c: any) => c.isActive !== false);

          const dynamicCats = activeData.map((c: any) => ({
            id: c.id,
            label: c.label,
            icon: c.emoji,
            isFeatured: c.isFeatured,
            customPinUrl: c.customPinUrl
          }));
          setCategories([{ id: 'all', label: 'All', icon: <Globe size={16} /> }, ...dynamicCats]);
          setFeaturedCategories(dynamicCats.filter((c: any) => c.isFeatured));
        }
      })
      .catch(err => console.error("Failed to load map categories", err));
  }, []);

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


  // 1. First Pass: Comprehensive Filtering
  const now = new Date();

  // 1. First Pass: Comprehensive Filtering
  // 1. First Pass: Time & Search Filter Only (For correct Counts)
  const timeFiltered = events.filter(e => {
    // A. Time Filter (Updated to use Browser Local Time for Local Correctness)
    const start = e.startTime ? new Date(e.startTime) : new Date(0);
    const end = e.endTime ? new Date(e.endTime) : new Date(8640000000000000);

    const timeMatch = (() => {
      // SPECIAL CATEGORY LOGIC: Food (Daily Menus)
      if (e.type === 'food') {
        // STRICT TIMING: User requested "Don't show menus 30 mins before".
        // Only show if it is strictly between Start and End.

        // Also ensure it is TODAY (already handled by start >= dayStart check implicitly if we only look at today's logic)
        // But the user said "it shows everything" for the week.
        // So we must enforce: Is this menu for TODAY?
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        dayEnd.setHours(4, 0, 0, 0); // Tomorrow 4am

        const isToday = start >= dayStart && start < dayEnd;
        if (!isToday) return false;

        // strict: now >= start && now <= end
        return now >= start && now <= end;
      }

      // ... (Standard Logic uses 'now') ...
      if (timeFilter === 'all') return true;
      if (timeFilter === 'today') {
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        return start >= dayStart && start < dayEnd;
      }
      if (timeFilter === 'week') {
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(dayStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return start >= dayStart && start < weekEnd;
      }
      if (timeFilter === 'live') {
        return now >= start && now <= end;
      }
      return true;
    })();

    // B. Category Filter
    const categoryMatch = selectedCategory === 'all' || e.type === selectedCategory;



    // D. Search Filter
    const query = searchQuery.toLowerCase();
    const searchMatch = !searchQuery ||
      e.title.toLowerCase().includes(query) ||
      e.description.toLowerCase().includes(query) ||
      e.type.toLowerCase().includes(query);

    // E. Bounds Filter - DISABLED by request (Always show full list)
    // const boundsMatch = ... 

    return timeMatch && searchMatch;
  });

  // 1-B. Category Filter (Applied AFTER Time Filter)
  const finalFiltered = timeFiltered.filter(e => {
    const categoryMatch = selectedCategory === 'all' || e.type === selectedCategory;
    return categoryMatch;
  });

  // 2. Second Pass: Anti-Overlap (Smart Pin De-Clutter) - Using Final Filtered
  const displayEvents = (() => {
    const result: Event[] = [];
    const foodOccupied = new Set<string>();

    // Initial Sort for De-Cluttering (Prioritize Live Food)
    const sorted = [...finalFiltered].sort((a, b) => { // Use finalFiltered
      // ... (Same as before for pin overlaps)
      if (a.type !== 'food' || b.type !== 'food') return 0;
      return (new Date(a.startTime || '').getTime()) - (new Date(b.startTime || '').getTime());
    });

    // ... (Food de-clutter logic) ...
    for (const e of sorted) {
      if (e.type === 'food') {
        const key = e.lat.toFixed(4) + ',' + e.lng.toFixed(4);
        if (foodOccupied.has(key)) continue;
        foodOccupied.add(key);
      }
      result.push(e);
    }
    return result;
  })();

  // Deduplication
  const uniqueEvents = new Map<string, Event>();
  displayEvents.forEach(e => {
    const key = `${e.title}|${e.startTime}`;
    if (!uniqueEvents.has(key)) uniqueEvents.set(key, e);
  });

  // --- SMART LIST SORTING ---
  const [mapCenter, setMapCenter] = useState<L.LatLng | null>(null);

  // Hook to track map center
  const MapEvents = () => {
    const map = useMap();
    useMapEvents({
      moveend: () => {
        setMapCenter(map.getCenter());
        // Update bounds if we were using them, but we aren't anymore for filtering
        setMapBounds(map.getBounds());
      },
      load: () => {
        setMapCenter(map.getCenter());
      }
    });
    return null;
  };

  let displayList = Array.from(uniqueEvents.values());

  // Sorting Strategy:
  // 1. FOCUS: Events near Map Center (if panned away from user)
  // 2. PROXIMITY: Events near User
  // 3. TIME: Live Now > Today > Future

  displayList.sort((a, b) => {
    const nowTime = Date.now();
    const aStart = a.startTime ? new Date(a.startTime).getTime() : 0;
    const bStart = b.startTime ? new Date(b.startTime).getTime() : 0;
    const aEnd = a.endTime ? new Date(a.endTime).getTime() : aStart + 1000 * 60 * 60;
    const bEnd = b.endTime ? new Date(b.endTime).getTime() : bStart + 1000 * 60 * 60;

    const isALive = nowTime >= aStart && nowTime < aEnd;
    const isBLive = nowTime >= bStart && nowTime < bEnd;

    let scoreA = aStart;
    let scoreB = bStart;

    // FOOD LOGIC: If it's Food & Live, ignore start time. All live food is equal in time.
    if (isALive && a.type === 'food') scoreA = nowTime;
    if (isBLive && b.type === 'food') scoreB = nowTime;

    if (isALive) scoreA -= 10000000000; // -10 Billion (Top Tier)
    if (isBLive) scoreB -= 10000000000;

    // 2. Map Focus Boost (If we have a center)
    if (mapCenter) {
      // Helper for safe coords
      const latA = a.lat || 0; const lngA = a.lng || 0;
      const latB = b.lat || 0; const lngB = b.lng || 0;

      const distA = getDistance(mapCenter.lat, mapCenter.lng, latA, lngA);
      const distB = getDistance(mapCenter.lat, mapCenter.lng, latB, lngB);

      scoreA += distA * 10;
      scoreB += distB * 10;
    }
    // 3. User Location Fallback
    else if (userLocation) {
      const latA = a.lat || 0; const lngA = a.lng || 0;
      const latB = b.lat || 0; const lngB = b.lng || 0;

      const distA = getDistance(userLocation.lat, userLocation.lng, latA, lngA);
      const distB = getDistance(userLocation.lat, userLocation.lng, latB, lngB);
      scoreA += distA * 5;
      scoreB += distB * 5;
    }

    return scoreA - scoreB;
  });

  // Re-create groupedEvents for markers (Fixes TS 'Cannot find name groupedEvents')
  const groupedEvents = new Map<string, Event[]>();
  displayList.forEach(e => {
    if (typeof e.lat !== 'number' || typeof e.lng !== 'number') return;
    const locKey = `${e.lat.toFixed(4)},${e.lng.toFixed(4)}`;
    if (!groupedEvents.has(locKey)) groupedEvents.set(locKey, []);
    groupedEvents.get(locKey)?.push(e);
  });

  const showingFallback = displayList.length === 0;

  if (showingFallback) {
    const fallbackEvents = events
      .filter(e => {
        const start = e.startTime ? new Date(e.startTime) : new Date(0);
        // Consistency: Apply same "Today Only" rule for Food in fallback
        if (e.type === 'food') {
          const dayStart = new Date(now);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayEnd.getDate() + 1);
          dayEnd.setHours(4, 0, 0, 0);
          return start >= dayStart && start < dayEnd;
        }
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

  // --- ANALYTICS: Track Impressions ---
  useEffect(() => {
    if (activeList.length === 0) return;

    const timeoutId = setTimeout(() => {
      const newViews: string[] = [];
      activeList.forEach(event => {
        if (!viewedEventsRef.current.has(event.id)) {
          viewedEventsRef.current.add(event.id);
          newViews.push(event.id);
        }
      });

      if (newViews.length > 0) {
        fetch(`${API_URL}/api/analytics/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventIds: newViews })
        }).catch(err => console.error("View track error", err));
      }
    }, 2000); // Debounce 2s (only count if they stay on screen/list for a bit)

    return () => clearTimeout(timeoutId);
  }, [activeList]);

  // Fetch user's saved locations from API
  const [userLocations, setUserLocations] = useState<any[]>([]);

  useEffect(() => {
    if (session?.user?.email) {
      fetch(`${API_URL}/api/user-locations`, {
        headers: { 'x-user-email': session.user.email }
      })
        .then(res => res.json())
        .then(data => setUserLocations(data))
        .catch(err => console.error('Failed to load locations:', err));
    }
  }, [session]);

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

          const category = categories.find(c => c.id === event.type);
          const customPinUrl = category?.customPinUrl;

          const markerIcon = isCluster ? L.divIcon({
            className: 'cluster-marker',
            html: `<div class="flex items-center justify-center w-12 h-12 ${isCyber ? 'bg-black/80 border-cyan-500 text-cyan-400 shadow-[0_0_15px_#22d3ee]' : 'bg-blue-600 text-white shadow-lg'} rounded-xl border-2 font-bold text-lg backdrop-blur-md">${group.length}</div>`,
            iconSize: [48, 48]
          }) : getEventIcon(event.type, mapTheme, false, !!isPast, customPinUrl);

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
          onShowAuth={() => setShowAuthModal(true)}
        />
      </MapContainer>

      {/* Top Floating Navigation */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[2000] flex items-center gap-2 max-w-[95vw] md:max-w-none">
        <div className={`flex items-center gap-1.5 px-3 py-2 rounded-full backdrop-blur-2xl border shadow-2xl transition-all duration-500
          ${mapTheme === 'cyberpunk' ? 'bg-black/60 border-cyan-500/50 shadow-cyan-500/20' :
            mapTheme === 'light' ? 'bg-white/70 border-gray-200' : 'bg-gray-900/40 border-white/10'}`}>

          <button
            onClick={() => { setShowList(!showList); setSelectedCluster(null); }}
            className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-all 
              ${showList
                ? (mapTheme === 'light' ? 'text-gray-900 bg-black/5' : 'text-white bg-white/20')
                : (mapTheme === 'light' ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white')}`}
            title={showList ? "Close List" : "List View"}
          >
            {showList ? <X size={20} /> : <List size={20} />}
          </button>

          <div className={`shrink-0 w-px h-6 mx-1 ${mapTheme === 'light' ? 'bg-gray-200' : 'bg-white/20'}`}></div>

          {/* Category Selector */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              className={`h-8 flex items-center justify-center rounded-full px-3 gap-2 transition-all border
                ${selectedCategory !== 'all'
                  ? 'text-blue-500 border-blue-500/30 bg-blue-500/10'
                  : (mapTheme === 'light' ? 'text-gray-600 border-transparent hover:bg-black/5' : 'text-white/80 border-transparent hover:bg-white/10')}`}
            >
              <span className="text-sm">
                {categories.find(c => c.id === selectedCategory)?.icon || <Globe size={16} />}
              </span>
              <span className="text-xs font-bold uppercase tracking-tight hidden sm:inline">
                {categories.find(c => c.id === selectedCategory)?.label}
              </span>
            </button>

            {showCategoryMenu && (
              <div className={`absolute top-full left-0 mt-3 w-48 backdrop-blur-xl border rounded-2xl shadow-2xl overflow-hidden py-1 z-[3000]
                ${mapTheme === 'light' ? 'bg-white/90 border-gray-200' : 'bg-[#0a0a0a]/90 border-white/10'}`}>
                {categories.map(cat => {
                  // Calculate Count (using timeFiltered to ignore current selection)
                  const count = cat.id === 'all'
                    ? timeFiltered.length
                    : timeFiltered.filter(e => e.type === cat.id).length;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setShowCategoryMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors group
                        ${selectedCategory === cat.id ? 'text-blue-500 bg-blue-500/5' : (mapTheme === 'light' ? 'text-gray-700 hover:bg-black/5' : 'text-gray-300 hover:bg-white/10')}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="shrink-0 w-5 flex justify-center">{cat.icon}</span>
                        <span className="font-medium">{cat.label}</span>
                      </div>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full transition-colors 
                        ${selectedCategory === cat.id
                          ? 'bg-blue-500 text-white'
                          : (mapTheme === 'light' ? 'bg-gray-200 text-gray-600 group-hover:bg-gray-300' : 'bg-white/10 text-gray-400 group-hover:bg-white/20')}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`shrink-0 w-px h-6 mx-1 ${mapTheme === 'light' ? 'bg-gray-200' : 'bg-white/20'}`}></div>

          {/* Search */}
          <div className={`flex items-center transition-all duration-300 ease-in-out shrink-0 ${isSearchOpen ? 'w-32 md:w-64 px-2' : 'w-10 justify-center'}`}>
            {isSearchOpen ? (
              <div className="flex items-center w-full relative">
                <input
                  autoFocus
                  type="text"
                  placeholder="Search tags..."
                  className={`bg-transparent border-none outline-none text-sm w-full font-medium placeholder-gray-400 min-w-0 pr-6 ${mapTheme === 'light' ? 'text-gray-900' : 'text-white'}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => !searchQuery && setIsSearchOpen(false)}
                />
                <button
                  onMouseDown={(e) => { e.preventDefault(); setSearchQuery(''); setIsSearchOpen(false); }}
                  className={`absolute right-0 transition-colors p-1 ${mapTheme === 'light' ? 'text-gray-400 hover:text-gray-900' : 'text-white/50 hover:text-white'}`}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button onClick={() => setIsSearchOpen(true)} className={`transition-colors ${mapTheme === 'light' ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'}`}>
                <SearchIcon size={20} />
              </button>
            )}
          </div>

          <div className={`shrink-0 w-px h-6 mx-1 ${mapTheme === 'light' ? 'bg-gray-200' : 'bg-white/20'}`}></div>

          {/* Time Filter */}
          <button
            key="time-btn"
            onClick={cycleTimeFilters}
            className={`h-8 flex items-center justify-center rounded-full font-bold text-xs transition-all border whitespace-nowrap gap-1.5 shrink-0
              ${timeFilter !== 'all'
                ? 'px-3 text-green-500 border-green-500/30 bg-green-500/10'
                : (mapTheme === 'light' ? 'w-8 text-gray-400 border-transparent hover:text-gray-900 hover:bg-black/5' : 'w-8 text-white/50 border-transparent hover:text-white hover:bg-white/10')}`}
            title="Filter by Time"
          >
            {timeFilter === 'all' ? <Clock size={20} /> : (
              <>
                {timeFilter === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>}
                {getTimeLabel()}
              </>
            )}
          </button>
        </div>

        <div className={`shrink-0 w-px h-6 mx-1 md:mx-2 ${mapTheme === 'light' ? 'bg-gray-200' : 'bg-white/20'}`}></div>

        {/* User Profile */}
        <div className="relative shrink-0 z-[2200]">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 rounded-full overflow-hidden border border-white/20 hover:border-blue-500 transition-all active:scale-95 flex items-center justify-center bg-black/40 text-gray-300 hover:text-white backdrop-blur-md"
              title={session ? `Logged in as ${session.user?.name || 'User'}` : "Menu"}
            >
              {session?.user?.image ? (
                <img src={session.user.image} alt="U" className="w-full h-full object-cover" />
              ) : session ? (
                <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {session.user?.name?.[0] || 'U'}
                </div>
              ) : (
                <User size={18} />
              )}
            </button>

            {showUserMenu && (
              <div className={`absolute top-full right-0 mt-4 w-64 backdrop-blur-2xl border rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden py-3 flex flex-col animate-in fade-in zoom-in-95 duration-200 ring-1
                ${mapTheme === 'light' ? 'bg-white/95 border-gray-200 ring-black/5' : 'bg-[#0a0a0a]/90 border-white/10 ring-white/5'}`}>
                {session ? (
                  <>
                    <div className={`px-4 py-3 border-b ${mapTheme === 'light' ? 'border-gray-100' : 'border-gray-800'}`}>
                      <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Signed in as</p>
                      <p className={`font-bold text-sm truncate ${mapTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>{session.user?.name || 'User'}</p>
                      <p className={`text-xs truncate ${mapTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>{session.user?.email}</p>
                    </div>
                    <div className="p-1">
                      {session.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL ? (
                        <a href="/admin" className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors group ${mapTheme === 'light' ? 'text-gray-700 hover:bg-black/5 hover:text-gray-900' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
                          <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors"><LayoutDashboard size={16} /></div>
                          Admin Panel
                        </a>
                      ) : (
                        <a href="/dashboard" className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors group ${mapTheme === 'light' ? 'text-gray-700 hover:bg-black/5 hover:text-gray-900' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
                          <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors"><LayoutDashboard size={16} /></div>
                          Business Dashboard
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-2">
                    <button onClick={() => setShowAuthModal(true)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-white hover:bg-white/10 rounded-xl transition-colors w-full text-left bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30">
                      <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-lg"><User size={16} /></div>
                      Sign In / Join
                    </button>
                  </div>
                )}

                <div className={`border-t mx-3 my-1 ${mapTheme === 'light' ? 'border-gray-100' : 'border-white/10'}`}></div>

                {/* Common: Theme Toggle */}
                <div className="p-1">
                  <button onClick={handleThemeChange} className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-colors w-full text-left group ${mapTheme === 'light' ? 'text-gray-700 hover:bg-black/5 hover:text-gray-900' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
                    <div className={`p-1.5 rounded-lg border transition-colors text-yellow-500 ${mapTheme === 'light' ? 'bg-black/5 border-black/5 group-hover:bg-black/10' : 'bg-white/5 border-white/5 group-hover:bg-white/10'}`}>
                      {mapTheme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                    </div>
                    <span className="flex-1">{mapTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${mapTheme === 'light' ? 'bg-gray-100 text-gray-400' : 'bg-gray-800 text-gray-400 group-hover:text-gray-300'}`}>Switch</span>
                  </button>
                </div>

                {session && (
                  <>
                    <div className={`border-t mx-2 my-1 ${mapTheme === 'light' ? 'border-gray-100' : 'border-gray-800'}`}></div>
                    <div className="p-1">
                      <button onClick={() => signOut()} className={`flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors w-full text-left group`}>
                        <div className="p-1.5 rounded-md bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors"><LogOut size={16} /></div>
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Featured Categories Quick Row */}
      {featuredCategories.length > 0 && (
        <div className="pointer-events-auto flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none animate-in fade-in slide-in-from-top-4 duration-500 pl-1">
          {featuredCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg backdrop-blur-md transition-all active:scale-95 whitespace-nowrap
                 ${selectedCategory === cat.id
                  ? (mapTheme === 'cyberpunk' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300 shadow-yellow-500/20' : 'bg-yellow-500 text-white border-yellow-600')
                  : (mapTheme === 'light' ? 'bg-white/90 border-gray-200 text-gray-700 hover:bg-gray-50' : 'bg-black/60 border-white/10 text-white hover:bg-white/10')}`}
            >
              <span className="text-lg drop-shadow-sm">{cat.icon}</span>
              <span className="font-bold text-sm uppercase tracking-wide">{cat.label}</span>
            </button>
          ))}
        </div>
      )}


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


        {
          displayList.slice(0, 20).map(event => (
            <div key={event.id} className="pointer-events-auto min-w-[85vw] h-20 md:h-auto md:min-w-0 md:w-full snap-center mr-3 md:mr-0 md:mb-3">
              <EventCard
                event={event}
                userLocation={userLocation}
                onClick={() => {
                  // Analytics: Track Click
                  fetch(`${API_URL}/api/analytics/click`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ eventId: event.id })
                  }).catch(err => console.error("Click track error", err));

                  if (map) {
                    map.flyTo([event.lat, event.lng], 16, { duration: 1.5 });
                  }
                  if (onEventSelect) onEventSelect(event);
                }}
              />
            </div>
          ))
        }
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
      {
        showList && (
          <div className={`fixed inset-0 z-[1500] pt-20 px-4 pb-24 overflow-y-auto animate-in fade-in slide-in-from-bottom-5 duration-200 
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

              {activeList.map(event => {
                const category = categories.find(c => c.id === event.type);
                return (
                  <div key={event.id} className="w-full">
                    <EventCard
                      event={event}
                      userLocation={userLocation}
                      variant="standard"
                      customIcon={category?.customPinUrl}
                      onClick={() => {
                        // Don't close list - preserve context for "Back" navigation
                        if (map) map.flyTo([event.lat, event.lng], 16);
                        if (onEventSelect) onEventSelect(event);
                      }}
                    />
                  </div>
                );
              })}

              {activeList.length === 0 && (
                <div className={`text-center mt-20 ${mapTheme === 'light' ? 'text-gray-400' : 'text-gray-600'}`}>No events found.</div>
              )}
            </div>
          </div>
        )
      }

      {/* Add Button - Visible to all, prompts login if needed */}
      <div className="fixed bottom-40 right-6 z-[1000]">
        <button
          onClick={() => {
            if (!session) {
              setShowAuthModal(true);
              return;
            }
            const loc = userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : undefined;
            if (onAddEventClick) onAddEventClick(loc);
          }}
          className="p-4 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/20 transition-all active:scale-95 backdrop-blur-sm group bg-blue-600 hover:bg-blue-500 text-white"
          title={session ? "Add New Event" : "Sign in to Add Event"}
        >
          <Plus size={24} className="transition-transform duration-300" />
        </button>
      </div>

      {/* Auth Modal (Final Design) */}
      {
        showAuthModal && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div onClick={() => setShowAuthModal(false)} className="absolute inset-0" />
            <div className="relative w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-xl p-8 shadow-2xl animate-in zoom-in-95 duration-300 ring-1 ring-white/5 text-center">

              <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
                <X size={20} />
              </button>

              <div className="pt-2 pb-6">
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Create your account</h3>
                <p className="text-sm text-gray-400">
                  Or <span className="text-blue-400 cursor-pointer hover:underline" onClick={() => signIn('google')}>sign in to your existing account</span>
                </p>
              </div>

              <button
                onClick={() => signIn('google')}
                className="w-full bg-[#131314] hover:bg-[#1b1b1c] border border-gray-600 rounded-full py-2.5 flex items-center justify-center gap-3 transition-colors group active:scale-[0.98]"
              >
                <div className="w-5 h-5 flex items-center justify-center bg-white rounded-full p-0.5 shrink-0">
                  <svg viewBox="0 0 24 24" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                </div>
                <span className="text-white font-medium text-sm font-roboto">Continue with Google</span>
              </button>

              <div className="mt-8 pt-6 border-t border-white/5 w-full">
                <p className="text-[10px] text-gray-600">
                  By continuing, you agree to our Terms of Service.
                </p>
              </div>

            </div>
          </div>
        )
      }
    </>
  );
}
