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

const MapLayout = ({ userA, userB, results, hoveredResultId, setMapInstance }) => {
    const [map, setMap] = useState(null);
    const [directionsA, setDirectionsA] = useState(null);
    const [directionsB, setDirectionsB] = useState(null);

    const onLoad = useCallback((map) => {
        setMap(map);
        if (setMapInstance) setMapInstance(map);
    }, [setMapInstance]);

    const onUnmount = useCallback(() => setMap(null), []);

    // Fit bounds
    useEffect(() => {
        if (map && userA && userB) {
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend(userA);
            bounds.extend(userB);
            results.forEach((r) => bounds.extend(r.geometry.location));
            map.fitBounds(bounds, { padding: 50 });
        }
    }, [map, userA, userB, results]);

    const hoveredResult = useMemo(() =>
        results.find(r => r.place_id === hoveredResultId),
        [results, hoveredResultId]);

    // Directions Fetching
    useEffect(() => {
        if (!hoveredResult || !userA || !userB) {
            setDirectionsA(null);
            setDirectionsB(null);
            return;
        }

        const service = new window.google.maps.DirectionsService();

        service.route({
            origin: userA, destination: hoveredResult.geometry.location, travelMode: window.google.maps.TravelMode.DRIVING
        }, (res, status) => {
            if (status === 'OK') setDirectionsA(res);
            else {
                console.warn("Dir A failed", status);
                setDirectionsA(null);
            }
        });

        service.route({
            origin: userB, destination: hoveredResult.geometry.location, travelMode: window.google.maps.TravelMode.DRIVING
        }, (res, status) => {
            if (status === 'OK') setDirectionsB(res);
            else {
                console.warn("Dir B failed", status);
                setDirectionsB(null);
            }
        });

    }, [hoveredResult, userA, userB]);

    return (
        <GoogleMap mapContainerStyle={mapContainerStyle} center={defaultCenter} zoom={11} onLoad={onLoad} onUnmount={onUnmount} options={options}>
            {userA && <Marker position={userA} icon={{ path: window.google.maps.SymbolPath.CIRCLE, fillColor: '#1a73e8', fillOpacity: 1, strokeWeight: 2, strokeColor: '#ffffff', scale: 20 }} label={{ text: 'You', color: 'white', fontWeight: '500', fontSize: '12px' }} zIndex={100} />}
            {userB && <Marker position={userB} icon={{ path: window.google.maps.SymbolPath.CIRCLE, fillColor: '#ea4335', fillOpacity: 1, strokeWeight: 2, strokeColor: '#ffffff', scale: 24 }} label={{ text: 'Friend', color: 'white', fontWeight: '500', fontSize: '11px' }} zIndex={100} />}

            {results.map(res => (
                <Marker key={res.place_id} position={res.geometry.location}
                    icon={{ url: hoveredResultId === res.place_id ? 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' }}
                    zIndex={hoveredResultId === res.place_id ? 90 : 10}
                />
            ))}

            {/* Directions Renderers (Real Lanes) */}
            {hoveredResult && directionsA && (
                <DirectionsRenderer directions={directionsA} options={{ suppressMarkers: true, preserveViewport: true, polylineOptions: { strokeColor: '#4285F4', strokeOpacity: 0.7, strokeWeight: 8 } }} />
            )}
            {hoveredResult && directionsB && (
                <DirectionsRenderer directions={directionsB} options={{ suppressMarkers: true, preserveViewport: true, polylineOptions: { strokeColor: '#EA4335', strokeOpacity: 0.7, strokeWeight: 8 } }} />
            )}

            {/* Fallback Polylines purposely removed. If API fails, show nothing. */}
        </GoogleMap>
    );
};
export default MapLayout;
