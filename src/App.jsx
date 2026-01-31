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

  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState([]);
  const [userA, setUserA] = useState(null);
  const [userB, setUserB] = useState(null);
  const [hoveredResultId, setHoveredResultId] = useState(null);
  const [category, setCategory] = useState('restaurant');

  // We need the map instance for PlacesService
  const [mapInstance, setMapInstance] = useState(null);

  const toggleMeetMode = () => {
    setViewMode(prev => prev === 'standard' ? 'meet' : 'standard');
  };

  const handleCalculate = useCallback(async () => {
    if (!userA || !userB || !mapInstance) return;
    setIsCalculating(true);

    // Clear previous results
    setResults([]);

    // Safety timeout to prevent infinite buffering
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out")), 15000);
    });

    try {
      // Race the fairness engine against a 15s timeout
      const fairVenues = await Promise.race([
        runFairnessEngine(userA, userB, mapInstance, category),
        timeoutPromise
      ]);
      setResults(fairVenues);
    } catch (error) {
      console.error("Calculation failed", error);

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
  }, [userA, userB, mapInstance, category]);

  // Auto-trigger calculation when category changes
  useEffect(() => {
    if (userA && userB && mapInstance) {
      handleCalculate();
    }
  }, [category, handleCalculate]);

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
    <div className="flex h-screen w-full overflow-hidden bg-white font-sans text-gray-900 relative">

      {/* 1. The Google Maps Shell (Standard UI + Toggle) */}
      <GoogleMapsShell viewMode={viewMode} onToggleMeetMode={toggleMeetMode} />

      {/* 2. The Meet Sidebar (Slides in/out) */}
      <div
        className={`absolute top-0 left-0 bottom-0 z-30 transition-transform duration-500 ease-in-out ${viewMode === 'meet' ? 'translate-x-0 shadow-2xl' : '-translate-x-full shadow-none'
          }`}
      >
        <Sidebar
          userA={userA}
          setUserA={setUserA}
          userB={userB}
          setUserB={setUserB}
          isCalculating={isCalculating}
          onCalculate={handleCalculate}
          results={results}
          hoveredResultId={hoveredResultId}
          setHoveredResultId={setHoveredResultId}
          category={category}
          setCategory={setCategory}
        />
      </div>

      {/* 3. The Map (Background) */}
      {/* When in standard mode, it's just a full map. When in Meet mode, it's pushed or obscured slightly? 
          Actually, Google Maps keeps the map static and slides panels over. We do the same. */}
      <div className="flex-1 relative h-full w-full">
        <MapLayout
          userA={userA}
          userB={userB}
          results={results}
          hoveredResultId={hoveredResultId}
          setMapInstance={setMapInstance}
        />
      </div>
    </div>
  );
}

export default App;
