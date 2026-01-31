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

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white font-sans text-gray-900 flex-col md:flex-row relative">

      {/* 1. The Google Maps Shell (Floating Controls: Search Bar + Buttons) */}
      {/* This sits on top of everything (z-50) because it's the global UI layer */}
      <GoogleMapsShell viewMode={viewMode} onToggleMeetMode={toggleMeetMode} />

      {/* 2. Sidebar Container (The "Bookshelf") */}
      {/* Mobile: Bottom 55% (when active). Desktop: Left 408px (when active). */}
      <div
        className={`relative z-20 bg-white shadow-xl transition-all duration-500 ease-in-out overflow-hidden
          order-2 md:order-1
          w-full md:w-auto
          ${viewMode === 'meet'
            ? 'h-[55%] md:h-full md:basis-[408px]'
            : 'h-0 md:h-full md:basis-0 md:w-0'
          }`}
      >
        <div className="h-full w-full md:w-[408px]">
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

      {/* 3. Map Container (The "Poster") */}
      {/* Mobile: Top 45% (when active). Desktop: Fills remaining space. */}
      {/* Crucial: It NEVER overlaps the Sidebar. It shrinks to fit. */}
      <div
        className={`relative z-0 bg-gray-100 transition-all duration-500 ease-in-out
           order-1 md:order-2
           w-full md:flex-1
           ${viewMode === 'meet' ? 'h-[45%] md:h-full' : 'h-full'}`}
      >
        <MapLayout
          users={users}
          results={results}
          hoveredResultId={hoveredResultId}
          setMapInstance={setMapInstance}
        />
      </div>
    </div>
  );
}

export default App;
