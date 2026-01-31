import React, { useState } from 'react';
import { Menu, Search, X, Mic, MapPin, ArrowRight, Users } from 'lucide-react';

const GoogleMapsShell = ({ viewMode, onToggleMeetMode }) => {

    // Google Maps Standard Styling Constants
    const SB_SHADOW = "0 2px 4px rgba(0,0,0,0.2), 0 -1px 0px rgba(0,0,0,0.02)";
    const PILL_SHADOW = "0 1px 2px rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)";

    const shellClass = `absolute inset-0 pointer-events-none z-10 transition-all duration-500 ease-[cubic-bezier(0.4,0.0,0.2,1)] ${viewMode === 'meet' ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'
        }`;

    // Toggle Button: Positioned exactly where "Sign In" would be, but functional
    const toggleButtonClass = `pointer-events-auto absolute top-[12px] right-[12px] z-50 transition-all duration-300 flex items-center gap-2 cursor-pointer h-[48px]
        ${viewMode === 'meet'
            ? 'bg-white text-gray-700 shadow-md border border-gray-200 hover:bg-gray-50 px-4 rounded-full right-[440px]'
            : 'bg-[#1a73e8] hover:bg-[#1557b0] text-white px-6 rounded-full font-medium text-[15px] tracking-tight shadow-md'
        }`;

    return (
        <>
            {/* The Floating UI Shell (Standard Mode) */}
            <div className={shellClass}>
                {/* Top Left Search Stack */}
                <div className="absolute top-[12px] left-[12px] pointer-events-auto flex flex-col gap-3">

                    {/* Search Bar - Pixel Perfect Match & Responsive */}
                    <div
                        className="bg-white rounded-[24px] w-[calc(100vw-70px)] sm:w-[392px] h-[48px] flex items-center px-4 transition-all duration-200"
                        style={{ boxShadow: SB_SHADOW }}
                    >
                        <div className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors mr-2 hidden sm:block">
                            <Menu className="w-[20px] h-[20px] text-[#5f6368]" />
                        </div>
                        <div className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors mr-1 sm:hidden">
                            <Search className="w-[20px] h-[20px] text-[#5f6368]" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search Google Maps"
                            className="flex-1 text-[15px] outline-none text-[#202124] placeholder:text-[#5f6368] font-normal font-sans bg-transparent min-w-0"
                        />
                        <div className="flex items-center gap-1 border-l border-[#dadce0] pl-3 ml-1 hidden sm:flex">
                            <div className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors">
                                <Search className="w-[20px] h-[20px] text-[#1a73e8]" strokeWidth={2.5} />
                            </div>
                            <div className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors">
                                <ArrowRight className="w-[20px] h-[20px] text-[#1a73e8] rotate-[-45deg]" strokeWidth={2.5} />
                            </div>
                        </div>
                    </div>

                    {/* Category Pills - Responsive (Full Width Scroll) */}
                    <div className="relative w-screen -ml-[12px] sm:ml-0 sm:w-full">
                        <div className="flex gap-3 overflow-x-auto w-full pl-[12px] pr-[12px] sm:pl-1 sm:pr-4 scrollbar-hide pt-1">
                            {['Restaurants', 'Hotels', 'Things to do', 'Museums', 'Transit', 'Pharmacies', 'ATMs'].map((cat, i) => (
                                <button
                                    key={i}
                                    className="bg-white px-[14px] py-[6px] rounded-[18px] text-[14px] font-medium text-[#3c4043] hover:bg-[#f1f3f4] whitespace-nowrap pointer-events-auto transition-colors duration-200 border border-transparent flex-shrink-0"
                                    style={{ boxShadow: "0 1px 2px rgba(60,64,67,0.3), 0 2px 6px 2px rgba(60,64,67,0.15)" }}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* The "Meet Halfway" Toggle Button */}
            <button
                onClick={onToggleMeetMode}
                className={toggleButtonClass}
            >
                {viewMode === 'meet' ? (
                    <>
                        <X className="w-4 h-4" />
                        <span className="font-semibold text-sm">Close Meet Mode</span>
                    </>
                ) : (
                    <>
                        <span className="font-medium">Try Meet Mode</span>
                    </>
                )}
            </button>
        </>
    );
};

export default GoogleMapsShell;
