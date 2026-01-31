import React, { useState, useCallback, useEffect } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import Sidebar from './components/Sidebar';
import MapLayout from './components/MapLayout';
import GoogleMapsShell from './components/GoogleMapsShell';
import { Loader2 } from 'lucide-react';

const libraries = ['places', 'geometry'];

import { runFairnessEngine } from './utils/fairnessEngine';

function App() {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries,
  });

  // State: View Mode ('standard' = Google Maps, 'meet' = Our App)
  const [viewMode, setViewMode] = useState('standard');

  // State: Multi-User Support (V2)
  const [users, setUsers] = useState([
    { id: 'you', label: 'You', color: '#1a73e8', pos: null },
    { id: 'friend-1', label: 'Friend 1', color: '#ea4335', pos: null }
  ]);

  // Legacy mapping for compatibility (temporary)
  const userA = users[0].pos;
  const userB = users[1] ? users[1].pos : null;

  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState([]);
  const [hoveredResultId, setHoveredResultId] = useState(null);
  const [category, setCategory] = useState('restaurant');

  // We need the map instance for PlacesService
  const [mapInstance, setMapInstance] = useState(null);

  const toggleMeetMode = () => {
    setViewMode(prev => prev === 'standard' ? 'meet' : 'standard');
  };

  const handleCalculate = useCallback(async () => {
    // Only calculate if we have at least 2 users with positions
    const validUsers = users.filter(u => u.pos !== null);
    if (validUsers.length < 2) return;

    setIsCalculating(true);
    setResults([]);

    // Safety timeout to prevent infinite buffering
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out")), 15000);
    });

    try {
      // Race the fairness engine against a 15s timeout
      const fairVenues = await Promise.race([
        runFairnessEngine(validUsers, mapInstance, category),
        timeoutPromise
      ]);
      setResults(fairVenues);
    } catch (error) {
      console.error("Calculation failed", error);

      // 1. EXPIRY ERROR (80-Day Limit)
      if (error.message === 'PROJECT_EXPIRED') {
        setResults([{
          place_id: 'project-expired',
          name: 'Trial Period Expired',
          vicinity: 'The 80-day trial for this app has ended. No more searches allowed.',
          rating: 0,
          user_ratings_total: 0,
          price_level: 0,
          geometry: { location: { lat: (userA.lat + userB.lat) / 2, lng: (userA.lng + userB.lng) / 2 } },
          photos: [],
          fallbackImage: 'https://images.unsplash.com/photo-1533035353717-3f6a98939cb4?q=80&w=400', // Time/Clock image
          durationAString: 'Ended',
          durationBString: 'Ended',
          travelTimes: [],
          types: ['point_of_interest']
        }]);
        return;
      }

      // 2. DAILY QUOTA ERROR
      if (error.message === 'DAILY_QUOTA_EXCEEDED') {
        setResults([{
          place_id: 'quota-limit',
          name: 'Daily Limit Reached',
          vicinity: 'You have used your 100 free searches for today.',
          rating: 0,
          user_ratings_total: 0,
          price_level: 0,
          geometry: { location: { lat: (userA.lat + userB.lat) / 2, lng: (userA.lng + userB.lng) / 2 } },
          photos: [],
          fallbackImage: 'https://images.unsplash.com/photo-1623018035782-b269248df916?q=80&w=400', // Lock/Stop image
          durationAString: 'Limit',
          durationBString: 'Hit',
          travelTimes: [], // No badges
          types: ['point_of_interest']
        }]);
        return;
      }

      // FALLBACK: Show Geographic Midpoint
      const midLat = (userA.lat + userB.lat) / 2;
      const midLng = (userA.lng + userB.lng) / 2;

      setResults([{
        place_id: 'timeout-fallback',
        name: 'Geographic Midpoint (Timeout)',
        vicinity: 'Search timed out, showing exact middle.',
        rating: 5.0,
        user_ratings_total: 1,
        price_level: 0,
        geometry: { location: { lat: midLat, lng: midLng } },
        photos: [],
        fallbackImage: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?q=80&w=400',
        durationAValue: 0, durationAString: 'N/A',
        durationBValue: 0, durationBString: 'N/A',
        delta: 0, efficiency: 0,
        types: ['point_of_interest']
      }]);

    } finally {
      setIsCalculating(false);
    }
  }, [users, mapInstance, category, userA, userB]); // userA, userB added for fallback logic

  // Manual calculation only (per user request)
  // We explicitly Removed the auto-calc useEffect here to prevent "finding" while adding friends.

  const handleAddUser = () => {
    const nextId = users.length;
    const colors = ['#fbbc04', '#34a853', '#a142f4', '#f06292', '#26c6da']; // Google-ish palette
    const color = colors[(nextId - 2) % colors.length];

    setUsers([
      ...users,
      { id: `friend-${nextId}`, label: `Friend ${nextId}`, color: color, pos: null }
    ]);
  };

  const handleRemoveUser = (indexToRemove) => {
    if (users.length <= 2) return; // Min 2 users
    setUsers(users.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUpdateUserPos = (index, newPos) => {
    setUsers(prev => {
      const next = [...prev];
      next[index] = { ...next[index], pos: newPos };
      return next;
    });
  };

  if (loadError) {
    return <div className="flex h-screen items-center justify-center text-red-500">Error loading Google Maps</div>;
  }

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-google-blue" />
      </div>
    );
  }

  const handleZoomIn = () => {
    if (mapInstance) {
      mapInstance.setZoom(mapInstance.getZoom() + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapInstance) {
      mapInstance.setZoom(mapInstance.getZoom() - 1);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full overflow-hidden bg-white font-sans text-gray-900 relative">

      {/* 1. Global Shell (Overlays) */}
      <GoogleMapsShell viewMode={viewMode} onToggleMeetMode={toggleMeetMode} />

      {/* 2. Sidebar Container (Strict Split) */}
      {/* Mobile: Bottom 55dvh. Desktop: Left 400px. No overlap. */}
      <div
        className={`relative z-20 bg-white shadow-xl overflow-hidden
          order-2 md:order-1
          flex-none
          w-full md:w-auto
          ${viewMode === 'meet'
            ? 'h-[55dvh] md:h-full md:w-[400px]'
            : 'h-0 md:h-full md:w-0'
          }`}
      >
        <div className="h-full w-full md:w-[400px]">
          {/* Pass explicit height to Sidebar if needed, but h-full works */}
          <Sidebar
            users={users}
            onUpdateUserPos={handleUpdateUserPos}
            onAddUser={handleAddUser}
            onRemoveUser={handleRemoveUser}
            isCalculating={isCalculating}
            onCalculate={handleCalculate}
            results={results}
            hoveredResultId={hoveredResultId}
            setHoveredResultId={setHoveredResultId}
            category={category}
            setCategory={setCategory}
          />
        </div>
      </div>

      {/* 3. Map Container (Strict Split) */}
      {/* Mobile: Top 45dvh. Desktop: Remaining width. */}
      <div
        className={`relative z-0 bg-gray-100
           order-1 md:order-2
           flex-none md:flex-auto
           w-full md:w-auto
           ${viewMode === 'meet' ? 'h-[45dvh] md:h-full' : 'h-[100dvh]'}`}
      >
        <MapLayout
          users={users}
          results={results}
          hoveredResultId={hoveredResultId}
          setMapInstance={setMapInstance}
          viewMode={viewMode}
        />

        {/* CUSTOM ZOOM CONTROLS (Guaranteed Visible) */}
        {/* Placed relative to the Map Container, so on mobile it sits in the top 45dvh block. */}
        {/* Right-Bottom of the MAP (not screen). */}
        <div className="absolute bottom-6 right-4 flex flex-col gap-2 z-50 pointer-events-auto">
          <button
            onClick={handleZoomIn}
            className="w-10 h-10 bg-white rounded shadow-md flex items-center justify-center text-gray-600 hover:text-black hover:bg-gray-50 focus:outline-none"
            aria-label="Zoom In"
          >
            <div className="text-2xl font-light pb-1">+</div>
          </button>
          <button
            onClick={handleZoomOut}
            className="w-10 h-10 bg-white rounded shadow-md flex items-center justify-center text-gray-600 hover:text-black hover:bg-gray-50 focus:outline-none"
            aria-label="Zoom Out"
          >
            <div className="text-2xl font-light pb-1">-</div>
          </button>
        </div>

      </div>
    </div>
  );
}

export default App;
