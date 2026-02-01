import React, { useRef, useState } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { MapPin, Navigation, Search, Star, Clock, ArrowRight, X } from 'lucide-react';
import FairnessBar from './FairnessBar';

const Sidebar = ({
    users,
    onUpdateUserPos,
    onAddUser,
    onRemoveUser,
    isCalculating,
    onCalculate,
    results,
    hoveredResultId,
    setHoveredResultId,
    category = 'restaurant',
    setCategory,
    sheetMode,
    setSheetMode
}) => {
    const originRefs = useRef([]);
    const [touchStart, setTouchStart] = useState(null);

    // Draggable Sheet Handlers (Mobile Only)
    const handleTouchStart = (e) => {
        setTouchStart(e.targetTouches[0].clientY);
    };

    const handleTouchEnd = (e) => {
        if (!touchStart) return;
        const touchEnd = e.changedTouches[0].clientY;
        const diff = touchEnd - touchStart;

        // If swipe down > 50px, go to mid. If swipe up > 50px, go to full.
        if (diff > 50) setSheetMode('mid');
        if (diff < -50) setSheetMode('full');

        setTouchStart(null);
    };

    const handleResultClick = (result) => {
        // Highlighting is already handled by hover/selection state in parent
        // but physically snap the sheet down to show the map
        setSheetMode('mid');
    };

    // Google Design Tokens
    const GOOGLE_BLUE = '#1a73e8';
    const TEXT_MAIN = '#202124';
    const TEXT_SEC = '#5f6368';
    const SHADOW_CARD = "0 1px 2px rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)";
    const SHADOW_HOVER = "0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)";

    const handlePlaceSelect = (index) => {
        const ref = originRefs.current[index];
        if (ref) {
            const place = ref.getPlace();
            if (place.geometry && place.geometry.location) {
                onUpdateUserPos(index, {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    address: place.formatted_address,
                });
            }
        }
    };

    return (
        <div id="sidebar-container" className="w-full md:w-[408px] h-full bg-white shadow-xl z-20 flex flex-col font-sans relative">

            {/* Mobile Drag Handle */}
            <div
                className="md:hidden w-full h-8 flex items-center justify-center cursor-ns-resize shrink-0"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* Header / Input Stack */}
            <div className="p-4 bg-white z-20 relative border-b border-gray-100 flex-shrink-0">
                {/* Scrollable Input Area (Mobile specific restriction) */}
                <div className="max-h-[140px] md:max-h-none overflow-y-auto pr-1 scrollbar-hide py-1">
                    <div className="relative flex flex-col gap-3">
                        {/* Dynamic Connector Line */}
                        <div className="absolute left-[19px] top-[24px] bottom-[24px] w-0.5 border-l-2 border-dashed border-gray-300 z-0 opacity-50" />

                        {users.map((user, index) => (
                            <div key={user.id} className="group relative z-10 flex items-center gap-2">
                                {/* Icon Indicator */}
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-20">
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center bg-opacity-20" style={{ backgroundColor: user.color + '33' }}>
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: user.color }} />
                                    </div>
                                </div>

                                {/* Input Field */}
                                <Autocomplete
                                    onLoad={(ref) => (originRefs.current[index] = ref)}
                                    onPlaceChanged={() => handlePlaceSelect(index)}
                                    className="w-full"
                                >
                                    <input
                                        type="text"
                                        placeholder={index === 0 ? "Starting point (You)" : `Friend ${index}'s location`}
                                        className="w-full pl-10 pr-9 py-3 bg-white border border-transparent hover:border-gray-300 focus:border-blue-500 rounded-lg text-[15px] text-[#202124] placeholder:text-[#5f6368] focus:outline-none shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-all font-medium"
                                    />
                                </Autocomplete>

                                {/* Remove Button (only for Friend 2+) */}
                                {index > 1 && (
                                    <button
                                        onClick={() => onRemoveUser(index)}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors absolute right-2 top-1/2 -translate-y-1/2"
                                        title="Remove this friend"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Button Row & Categories - Pinned below inputs */}
                <div className="mt-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={onAddUser}
                            className="flex items-center gap-2 text-[#1a73e8] font-medium text-[14px] hover:bg-blue-50 py-2 px-3 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        >
                            <div className="w-5 h-5 rounded-full border border-[#1a73e8] border-dashed flex items-center justify-center">
                                <span className="text-lg leading-none mb-0.5">+</span>
                            </div>
                            Add friend
                        </button>

                        <button
                            onClick={onCalculate}
                            disabled={isCalculating || users.filter(u => u.pos).length < 2}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-[14px] shadow-sm transition-all ${isCalculating || users.filter(u => u.pos).length < 2
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-[#1a73e8] text-white hover:bg-[#1557b0] shadow-md hover:shadow-lg'
                                }`}
                        >
                            {isCalculating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Finding...</span>
                                </>
                            ) : (
                                <>
                                    <Search className="w-4 h-4" strokeWidth={2.5} />
                                    <span>Find Fair Point</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Categories */}
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
                            onClick={() => {
                                setCategory(cat.id);
                                // Auto-trigger search for seamless filtering (if users exist)
                                if (users.filter(u => u.pos).length >= 2) {
                                    // Small timeout to allow state to set
                                    setTimeout(onCalculate, 0);
                                }
                            }}
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

                        {results.map((result, idx) => {
                            // Helper to get friendly category name
                            const getCategoryLabel = () => {
                                if (category === 'movie_theater') return 'Movie Theater';
                                if (category === 'bar') return 'Bar';
                                if (category === 'cafe') return 'Coffee Shop';
                                if (category === 'park') return 'Park';
                                return 'Restaurant';
                            };

                            return (
                                <div
                                    key={result.place_id}
                                    onMouseEnter={() => setHoveredResultId(result.place_id)}
                                    onMouseLeave={() => setHoveredResultId(null)}
                                    onClick={() => handleResultClick(result)}
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
                                                    {result.price_level ? '$'.repeat(result.price_level) : '$$'} · {getCategoryLabel()}
                                                </div>
                                            </div>

                                            {/* Travel Times - Compact */}
                                            {/* Travel Times - Dynamic N-User Grid */}
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {result.travelTimes && result.travelTimes.map((time) => {
                                                    const user = users.find(u => u.id === time.userId);
                                                    if (!user) return null;
                                                    return (
                                                        <div key={time.userId} className="flex items-center gap-1.5 bg-white border border-gray-200 px-2 py-1 rounded-md shadow-sm text-[11px] font-medium text-[#5f6368]">
                                                            <div
                                                                className="w-2 h-2 rounded-full shrink-0"
                                                                style={{ backgroundColor: user.color }}
                                                            />
                                                            {time.durationMins} min
                                                        </div>
                                                    );
                                                })}
                                                {/* Fallback for legacy results without travelTimes array */}
                                                {(!result.travelTimes && result.durationAString) && (
                                                    <>
                                                        <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-2 py-1 rounded-md shadow-sm text-[11px] font-medium text-[#5f6368]">
                                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                            {result.durationAString}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-2 py-1 rounded-md shadow-sm text-[11px] font-medium text-[#5f6368]">
                                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                                            {result.durationBString}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
