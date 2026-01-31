import React, { useRef, useState } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { MapPin, Navigation, Search, Star, Clock, ArrowRight, X } from 'lucide-react';
import FairnessBar from './FairnessBar';

const Sidebar = ({
    userA,
    setUserA,
    userB,
    setUserB,
    isCalculating,
    onCalculate,
    results,
    hoveredResultId,
    setHoveredResultId,
    category = 'restaurant',
    setCategory,
}) => {
    const originARef = useRef(null);
    const originBRef = useRef(null);

    // Google Design Tokens
    const GOOGLE_BLUE = '#1a73e8';
    const TEXT_MAIN = '#202124';
    const TEXT_SEC = '#5f6368';
    const SHADOW_CARD = "0 1px 2px rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)";
    const SHADOW_HOVER = "0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)";

    const handlePlaceSelect = (ref, setFunction) => {
        if (ref.current) {
            const place = ref.current.getPlace();
            if (place.geometry && place.geometry.location) {
                setFunction({
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    address: place.formatted_address,
                });
            }
        }
    };

    return (
        <div className="w-[408px] h-full bg-white shadow-xl z-20 flex flex-col font-sans relative">

            {/* Header / Input Stack - Clean, no logo, just functionality */}
            <div className="p-4 bg-white z-20 relative border-b border-gray-100">
                <div className="relative flex flex-col gap-3">
                    {/* Connector Line */}
                    <div className="absolute left-[19px] top-[24px] bottom-[24px] w-0.5 border-l-2 border-dashed border-gray-300 z-0 opacity-50" />

                    {/* Input A (You) */}
                    <div className="group relative z-10">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-20">
                            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                            </div>
                        </div>
                        <Autocomplete
                            onLoad={(ref) => (originARef.current = ref)}
                            onPlaceChanged={() => handlePlaceSelect(originARef, setUserA)}
                            className="w-full"
                        >
                            <input
                                type="text"
                                placeholder="Starting point (You)"
                                className="w-full pl-10 pr-4 py-3 bg-white border border-transparent hover:border-gray-300 focus:border-blue-500 rounded-lg text-[15px] text-[#202124] placeholder:text-[#5f6368] focus:outline-none shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-all font-medium"
                            />
                        </Autocomplete>
                    </div>

                    {/* Input B (Friend) */}
                    <div className="group relative z-10">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-20">
                            <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                                <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                            </div>
                        </div>
                        <Autocomplete
                            onLoad={(ref) => (originBRef.current = ref)}
                            onPlaceChanged={() => handlePlaceSelect(originBRef, setUserB)}
                            className="w-full"
                        >
                            <input
                                type="text"
                                placeholder="Friend's location"
                                className="w-full pl-10 pr-4 py-3 bg-white border border-transparent hover:border-gray-300 focus:border-red-500 rounded-lg text-[15px] text-[#202124] placeholder:text-[#5f6368] focus:outline-none shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-all font-medium"
                            />
                        </Autocomplete>
                    </div>
                </div>

                <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {[
                        { id: 'restaurant', label: 'Dining', emoji: '🍽️' },
                        { id: 'cafe', label: 'Coffee', emoji: '☕' },
                        { id: 'bar', label: 'Drinks', emoji: '🍸' },
                        { id: 'movie_theater', label: 'Movies', emoji: '🎬' },
                        { id: 'park', label: 'Parks', emoji: '🌳' },
                    ].map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setCategory(cat.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all border ${category === cat.id
                                ? 'bg-[#e8f0fe] text-[#1967d2] border-[#e8f0fe]'
                                : 'bg-white text-[#3c4043] border-[#dadce0] hover:bg-[#f1f3f4]'
                                }`}
                        >
                            <span>{cat.emoji}</span>
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto bg-white">
                {isCalculating ? (
                    // Skeleton Loader - Minimalist
                    <div className="p-4 space-y-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse flex gap-4">
                                <div className="w-24 h-24 bg-gray-100 rounded-xl shrink-0" />
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                                    <div className="h-3 bg-gray-100 rounded w-full mt-2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : results.length > 0 ? (
                    <div className="pb-4">
                        <div className="px-4 py-3 text-[11px] font-bold text-[#5f6368] uppercase tracking-wider border-b border-gray-50 flex justify-between items-center">
                            <span>Top Recommendations</span>
                            <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full shadow-sm border border-green-100">{results.length} results</span>
                        </div>

                        {results.map((result, idx) => (
                            <div
                                key={result.place_id}
                                onMouseEnter={() => setHoveredResultId(result.place_id)}
                                onMouseLeave={() => setHoveredResultId(null)}
                                className={`group border-b border-gray-100 p-4 cursor-pointer transition-colors relative hover:bg-[#f8f9fa] ${hoveredResultId === result.place_id ? 'bg-[#f8f9fa]' : ''}`}
                            >
                                <div className="flex gap-4">
                                    {/* Image with Preloader/Lazy */}
                                    <div className="w-[104px] h-[104px] rounded-lg bg-gray-100 shrink-0 overflow-hidden shadow-sm relative">
                                        <img
                                            src={result.photos?.[0]?.getUrl() || result.fallbackImage}
                                            alt={result.name}
                                            loading="lazy"
                                            className="w-full h-full object-cover transition-opacity duration-500"
                                            onLoad={(e) => e.target.style.opacity = 1}
                                            style={{ opacity: 0 }} // Start invisible, fade in
                                        />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                        <div>
                                            <h3 className="text-[17px] text-[#202124] font-medium leading-tight truncate">
                                                {result.name}
                                            </h3>
                                            <div className="flex items-center gap-1 mt-1 text-[14px]">
                                                <span className="font-medium text-[#e7711b] flex items-center">
                                                    {result.rating} <Star className="w-3 h-3 fill-current ml-0.5" />
                                                </span>
                                                <span className="text-[#5f6368]">({result.user_ratings_total})</span>
                                                <span className="text-[#5f6368] mx-1">·</span>
                                                <span className="text-[#5f6368]">{result.vicinity?.split(',')[0]}</span>
                                            </div>
                                            <div className="text-[13px] text-[#5f6368] mt-0.5">
                                                {result.price_level ? '$'.repeat(result.price_level) : '$$'} · {category === 'cafe' ? 'Coffee Shop' : category === 'park' ? 'Park' : 'Restaurant'}
                                            </div>
                                        </div>

                                        {/* Travel Times - Compact */}
                                        <div className="flex items-center gap-3 mt-2 text-[12px] font-medium text-[#5f6368]">
                                            <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-2 py-1 rounded-md shadow-sm">
                                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                {result.durationAString}
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-2 py-1 rounded-md shadow-sm">
                                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                                {result.durationBString}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Navigation className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-[#5f6368] max-w-[200px] leading-relaxed">
                            Enter two locations to find the best place to meet halfway.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
