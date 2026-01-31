import React, { useEffect, useState } from 'react';
import { Sparkles, AlertTriangle, Clock } from 'lucide-react';

const FairnessBar = ({ durationAValue, durationBValue }) => {
    // Animation state to make the bars grow on mount
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        // Trigger animation shortly after mount
        const timer = setTimeout(() => setAnimate(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const totalTime = durationAValue + durationBValue;
    if (!totalTime) return null;

    const pctA = (durationAValue / totalTime) * 100;
    const pctB = (durationBValue / totalTime) * 100;

    // Calculate deviation from 50%
    const deviation = Math.abs(pctA - 50);

    let StatusIcon = null;
    let statusText = "";
    let statusColor = "text-gray-400";

    if (deviation <= 5) {
        StatusIcon = Sparkles;
        statusText = "Perfectly Fair";
        statusColor = "text-emerald-500";
    } else if (deviation > 15) {
        StatusIcon = AlertTriangle;
        statusText = "Unbalanced";
        statusColor = "text-amber-500";
    } else {
        statusText = "Fair enough";
        statusColor = "text-blue-500";
    }

    return (
        <div className="w-full">
            <div className="flex items-center justify-between text-[11px] font-semibold tracking-wide uppercase text-gray-400 mb-2">
                <span className={deviation <= 15 ? 'text-gray-600' : 'text-gray-400'}>Travel Time Split</span>
                {StatusIcon && (
                    <span className={`flex items-center gap-1 ${statusColor} normal-case`}>
                        <StatusIcon className="w-3 h-3" /> {statusText}
                    </span>
                )}
            </div>

            <div className="relative h-2.5 w-full rounded-full overflow-hidden flex bg-gray-100 shadow-inner">
                <div
                    className="h-full bg-gradient-to-r from-google-blue to-blue-400 transition-all duration-1000 ease-out relative"
                    style={{ width: animate ? `${pctA}%` : '0%' }}
                />
                <div
                    className="h-full bg-gradient-to-r from-red-400 to-google-red transition-all duration-1000 ease-out relative"
                    style={{ width: animate ? `${pctB}%` : '0%' }}
                />
                {/* Center tick */}
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/80 z-10 -ml-[1px] shadow-[0_0_2px_rgba(0,0,0,0.2)]" />
            </div>

            <div className="flex justify-between mt-2 text-xs font-medium">
                <div className="flex items-center gap-1.5 text-gray-700">
                    <div className="w-2 h-2 rounded-full bg-google-blue" />
                    You: {Math.round(durationAValue / 60)} min
                </div>
                <div className="flex items-center gap-1.5 text-gray-700">
                    Friend: {Math.round(durationBValue / 60)} min
                    <div className="w-2 h-2 rounded-full bg-google-red" />
                </div>
            </div>
        </div>
    );
};

export default FairnessBar;
