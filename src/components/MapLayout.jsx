/* global google */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { GoogleMap, Marker, Polyline, DirectionsRenderer } from '@react-google-maps/api';

const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 40.7128, lng: -74.0060 };

const MapLayout = ({ users, results, hoveredResultId, setMapInstance, viewMode }) => {
    const [map, setMap] = useState(null);
    const [userDirections, setUserDirections] = useState({}); // { userId: directionResult }

    const options = useMemo(() => ({
        disableDefaultUI: false,
        zoomControl: true,
        // In Split Layout (Map=45% height), RIGHT_CENTER is vertically centered in the top half (~22% screen y).
        // This avoids the Search Bar (Top) and the Sidebar (Bottom). Safe zone.
        zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_CENTER },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }]
    }), []);

    const onLoad = useCallback((map) => {
        setMap(map);
        if (setMapInstance) setMapInstance(map);
    }, [setMapInstance]);

    const onUnmount = useCallback(() => setMap(null), []);

    // Auto-Fit Bounds (Split Layout Pattern)
    useEffect(() => {
        if (!map) return;

        const validUsers = users.filter(u => u.pos);
        if (validUsers.length === 0 && results.length === 0) return;

        // Debounce to allow UI transitions (500ms CSS slide) to finish
        const timerId = setTimeout(() => {
            // Force Map Resize so it acknowledges the new 45% height
            window.google.maps.event.trigger(map, "resize");

            const bounds = new window.google.maps.LatLngBounds();
            validUsers.forEach(u => bounds.extend(u.pos));
            results.forEach((r) => bounds.extend(r.geometry.location));

            // Standard comfortable padding since the Map container is now strictly only the visible area
            map.fitBounds(bounds, {
                top: 50,
                right: 50,
                bottom: 50,
                left: 50
            });

            // Handle single-point extreme zoom
            const listener = google.maps.event.addListenerOnce(map, "idle", () => {
                if (map.getZoom() > 15) {
                    map.setZoom(15);
                }
            });
        }, 550); // Wait 550ms for CSS transition (500ms) to complete

        return () => clearTimeout(timerId);

    }, [map, users, results, viewMode]);

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
