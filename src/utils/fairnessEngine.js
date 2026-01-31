/* global google */

// --- Math Helpers ---
const toRad = (x) => (x * Math.PI) / 180;

/**
 * Haversine Distance (in meters)
 * Used for simulation when Distance Matrix API is skipped.
 */
const getDistance = (p1, p2) => {
    const R = 6378137; // Earth's mean radius in m
    const dLat = toRad(p2.lat - p1.lat);
    const dLong = toRad(p2.lng - p1.lng);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) *
        Math.sin(dLong / 2) * Math.sin(dLong / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Standard Deviation Calculator
 */
const getStandardDeviation = (array) => {
    if (array.length === 0) return 0;
    const n = array.length;
    const mean = array.reduce((a, b) => a + b) / n;
    return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
};

// --- Core Algorithm ---

/**
 * Calculates the geometric centroid (center of mass) for N users.
 */
export const calculateCentroid = (users) => {
    if (!users || users.length === 0) return null;
    const latSum = users.reduce((sum, u) => sum + u.pos.lat, 0);
    const lngSum = users.reduce((sum, u) => sum + u.pos.lng, 0);
    return {
        lat: latSum / users.length,
        lng: lngSum / users.length,
    };
};

/**
 * Fetches REAL candidates from Google Places API.
 * This guarantees valid land-based venues (no oceans).
 */
const fetchRealCandidates = async (centroid, mapInstance, category) => {
    if (!mapInstance) return [];

    const service = new window.google.maps.places.PlacesService(mapInstance);
    // FIX: 'type' must be a String, not an Array
    const request = {
        location: centroid,
        radius: 4000,
        type: category === 'dining' ? 'restaurant' : category,
        rankBy: window.google.maps.places.RankBy.PROMINENCE
    };

    console.log("[FairnessEngine] Requesting Places:", request);

    return new Promise((resolve) => {
        // Safety Timeout: 5 seconds max for Places API to respond
        const timeoutId = setTimeout(() => {
            console.warn("[FairnessEngine] Places Search timed out (5s). Returning empty candidates.");
            resolve([]);
        }, 5000);

        service.nearbySearch(request, (results, status) => {
            clearTimeout(timeoutId);
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                // Return top 15 results to process
                resolve(results.slice(0, 15));
            } else {
                console.warn("Places Search failed or found nothing:", status);
                resolve([]);
            }
        });
    });
};

/**
 * Generates the N x M Matrix of travel times.
 * USES SIMULATION (Haversine + Traffic Noise) to save API Quota.
 */
const calculateSimulatedTravelTimes = (users, venue) => {
    return users.map(user => {
        const distMeters = getDistance(user.pos, venue.geometry.location.toJSON());

        // Simulating driving speed:
        // Urban avg: 30 km/h approx = 8.33 m/s
        // + Random Traffic Noise (0.9x to 1.3x multiplier)
        const speed = 8.33;
        const trafficFactor = 0.9 + Math.random() * 0.4;

        const timeSeconds = distMeters / (speed * trafficFactor);
        const timeMinutes = Math.round(timeSeconds / 60);

        return {
            userId: user.id,
            distance: distMeters,
            duration: timeSeconds, // raw seconds
            durationMins: timeMinutes
        };
    });
};

/**
 * Scores a venue based on Multi-Party Fairness.
 * Formula: Score = (MaxCommute * 0.7) + (Variance * 0.3)
 * Lower is better.
 */
const scoreVenue = (travelTimes) => {
    const durations = travelTimes.map(t => t.durationMins);

    // 1. Max Commute (Minimize suffering)
    const maxCommute = Math.max(...durations);

    // 2. Variance (Minimize inequality)
    const variance = getStandardDeviation(durations);

    // 3. Composite Score
    // Weighting: 70% Max Commute, 30% Variance
    const score = (maxCommute * 0.7) + (variance * 0.3);

    return { score, maxCommute, variance };
};

// --- Quota Management ---
// Safety Limits to prevent runway costs
const DAILY_LIMIT = 100;
const EXPIRY_DATE = new Date("2026-04-20T23:59:59"); // 80 Days from Jan 30, 2026
const STORAGE_KEY = 'meet_mode_api_usage';

const checkQuota = () => {
    try {
        // 1. Check Global Project Expiry (Kill Switch)
        if (new Date() > EXPIRY_DATE) {
            console.warn("[FairnessEngine] Project Trial Expired.");
            throw new Error("PROJECT_EXPIRED");
        }

        // 2. Check Daily Limit
        const usageData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const today = new Date().toDateString();

        // Reset if new day
        if (usageData.date !== today) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: 0 }));
            return true;
        }

        if (usageData.count >= DAILY_LIMIT) {
            console.warn(`[FairnessEngine] Daily API Quota Exceeded (${usageData.count}/${DAILY_LIMIT})`);
            return false;
        }

        return true;
    } catch (e) {
        if (e.message === "PROJECT_EXPIRED") throw e; // Re-throw to be caught by App
        console.error("Quota check failed", e);
        return true; // Fail safe: allow call if storage fails
    }
};

const incrementQuota = () => {
    try {
        const usageData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const today = new Date().toDateString();
        const newCount = (usageData.date === today ? usageData.count : 0) + 1;

        localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: newCount }));
        console.log(`[FairnessEngine] API Call Recorded. Usage: ${newCount}/${DAILY_LIMIT}`);
    } catch (e) {
        console.error("Quota increment failed", e);
    }
};

/**
 * Main Fairness Engine (V2.1 - Group Fairness)
 */
export const runFairnessEngine = async (users, mapInstance, category = 'restaurant') => {
    try {
        console.log(`[FairnessEngine] Starting Group Algorithm for ${users.length} users...`);

        // 0. Check Quota (Cost Control)
        if (!checkQuota()) {
            throw new Error("DAILY_QUOTA_EXCEEDED");
        }

        // 1. Geometric Centroid
        const centroid = calculateCentroid(users);
        if (!centroid) return [];

        // 2. Fetch REAL Candidates (Solves Ocean Problem)
        incrementQuota(); // Count this as a paid API call
        let candidates = await fetchRealCandidates(centroid, mapInstance, category);

        // Fallback: If no real candidates found (e.g. desert), we might still be empty.
        // For V2.1 we assume the user picks land-based start points.
        if (candidates.length === 0) {
            console.warn("[FairnessEngine] No real venues found.");
            return [];
        }

        // 3. Process Matrix & Score
        const scoredVenues = candidates.map(venue => {
            // A. Calculate N travel times
            const userTravelTimes = calculateSimulatedTravelTimes(users, venue);

            // B. Apply Fairness Formula
            const { score, maxCommute, variance } = scoreVenue(userTravelTimes);

            // C. Format for UI
            // We attach specific data needed for the UI (times, etc)
            return {
                ...venue,
                fairnessScore: score,
                debug_stats: { maxCommute, variance },
                // Map 'userDirections' or similar metadata if needed
                travelTimes: userTravelTimes,
                // UI Helpers
                durationString: `${Math.round(maxCommute)} min max`, // Display worst case?
                // Legacy support for 'durationAString' / 'durationBString' (visuals only)
                durationAString: `${userTravelTimes[0].durationMins} min`,
                durationBString: `${userTravelTimes[1]?.durationMins || '?'} min`,
                // Use the first photo reference if available
                fallbackImage: null // UI handles photo via .photos[]
            };
        });

        // 4. Rank by Lowest Score (Best)
        scoredVenues.sort((a, b) => a.fairnessScore - b.fairnessScore);

        console.log("[FairnessEngine] Top Choice:", scoredVenues[0].name, scoredVenues[0].fairnessScore);

        return scoredVenues;

    } catch (error) {
        console.error("Fairness Engine V2.1 Failed:", error);
        return [];
    }
};
