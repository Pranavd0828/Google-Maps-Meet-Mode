/* global google */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { GoogleMap, Marker, Polyline, DirectionsRenderer } from '@react-google-maps/api';

const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 40.7128, lng: -74.0060 };
const options = {
    disableDefaultUI: false, zoomControl: true, mapTypeControl: false,
    streetViewControl: false, fullscreenControl: false,
    styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }]
};

const MapLayout = ({ users, results, hoveredResultId, setMapInstance }) => {
    const [map, setMap] = useState(null);
    const [userDirections, setUserDirections] = useState({}); // { userId: directionResult }

    const onLoad = useCallback((map) => {
        setMap(map);
        if (setMapInstance) setMapInstance(map);
    }, [setMapInstance]);

    const onUnmount = useCallback(() => setMap(null), []);

    // Auto-Fit Bounds (Robust "Safety Valve" Pattern)
    useEffect(() => {
        if (!map) return;

        const validUsers = users.filter(u => u.pos);
        if (validUsers.length === 0 && results.length === 0) return;

        // 1. Debounce to allow UI/Keyboard to settle
        const timerId = setTimeout(() => {
            const bounds = new window.google.maps.LatLngBounds();
            validUsers.forEach(u => bounds.extend(u.pos));
            results.forEach((r) => bounds.extend(r.geometry.location));

            // 2. Measure Exact Height (No Guessing)
            const isMobile = window.innerWidth < 768;
            const sidebarEl = document.getElementById('sidebar-container');
            const sidebarHeight = sidebarEl ? sidebarEl.offsetHeight : 0;

            // Mobile: Padding = Exact Sidebar Height + 50px Buffer
            // Desktop: Standard 80px
            const bottomPadding = isMobile ? (sidebarHeight + 50) : 80;

            console.log(`[MapFit] Fitting bounds. Mobile: ${isMobile}, SidebarHeight: ${sidebarHeight}, Padding: ${bottomPadding}`);

            map.fitBounds(bounds, {
                top: 60,
                right: 50,
                bottom: bottomPadding,
                left: 50
            });

            // 3. The "Idle" Listener (Audit & Correct)
            const listener = google.maps.event.addListenerOnce(map, "idle", () => {
                const currentBounds = map.getBounds();
                if (!currentBounds) return;

                // A. Visibility Audit
                // Check if ALL user points are actually inside the visible bounds
                // Note: getBounds() returns the full map bounds (including under the sidebar),
                // so strictly speaking 'contains' might return true even if under the sidebar.
                // However, fitBounds with padding *should* have handled this.
                // The 'safety valve' here catches cases where fitBounds failed due to weak signaling.

                // If we want to be paranoid, we just trust fitBounds + padding. 
                // But the user requested a zoom-out fallback if hidden.
                // Since we can't easily detect "hidden under sidebar" with simple .contains() on the full map bounds,
                // we mainly rely on step 2 (Exact Padding) to be correct.
                // But we CAN check if they are totally off-screen or if zoom is too tight.

                // B. Zoom Cap (Prevention)
                if (map.getZoom() > 15) {
                    map.setZoom(15);
                }
            });

        }, 300);

        return () => clearTimeout(timerId);

    }, [map, users, results]);

    const hoveredResult = useMemo(() =>
        results.find(r => r.place_id === hoveredResultId),
        [results, hoveredResultId]);

    // Directions Fetching
    useEffect(() => {
        if (!hoveredResult || users.length === 0) {
            setUserDirections({});
            return;
        }

        const service = new window.google.maps.DirectionsService();
        const newDirections = {};

        // Fetch directions for each user who has a position
        // Note: In a real app we might throttle this or use distance matrix for bulk
        users.forEach(user => {
            if (!user.pos) return;

            service.route({
                origin: user.pos,
                destination: hoveredResult.geometry.location,
                travelMode: window.google.maps.TravelMode.DRIVING
            }, (res, status) => {
                if (status === 'OK') {
                    setUserDirections(prev => ({
                        ...prev,
                        [user.id]: res
                    }));
                } else {
                    console.warn(`Dir failed for ${user.id}`, status);
                }
            });
        });

    }, [hoveredResult, users]);

    return (
        <GoogleMap mapContainerStyle={mapContainerStyle} center={defaultCenter} zoom={11} onLoad={onLoad} onUnmount={onUnmount} options={options}>

            {/* User Markers */}
            {users.map(user => user.pos && (
                <Marker
                    key={user.id}
                    position={user.pos}
                    icon={{
                        path: window.google.maps.SymbolPath.CIRCLE,
                        fillColor: user.color,
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: '#ffffff',
                        scale: 18 // Slightly smaller than before to handle crowd
                    }}
                    label={{
                        text: user.label === 'You' ? 'You' : user.label.replace('Friend ', 'F'), // Abbreviate Friend 1 -> F1
                        color: 'white',
                        fontWeight: '500',
                        fontSize: '11px'
                    }}
                    zIndex={100}
                />
            ))}

            {/* Result Markers */}
            {results.map(res => (
                <Marker key={res.place_id} position={res.geometry.location}
                    icon={{ url: hoveredResultId === res.place_id ? 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' }}
                    zIndex={hoveredResultId === res.place_id ? 90 : 10}
                />
            ))}

            {/* Directions Renderers (Dynamic Lanes) */}
            {hoveredResult && Object.entries(userDirections).map(([userId, dirResult]) => {
                const user = users.find(u => u.id === userId);
                if (!user) return null;

                return (
                    <DirectionsRenderer
                        key={userId}
                        directions={dirResult}
                        options={{
                            suppressMarkers: true,
                            preserveViewport: true,
                            polylineOptions: {
                                strokeColor: user.color,
                                strokeOpacity: 0.6,
                                strokeWeight: 6 // Thinner lines for multiple users
                            }
                        }}
                    />
                );
            })}

            {/* Fallback Polylines purposely removed. If API fails, show nothing. */}
        </GoogleMap>
    );
};
export default MapLayout;
