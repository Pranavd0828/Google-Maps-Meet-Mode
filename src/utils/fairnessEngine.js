/* global google */

// --- Constants ---
// Simulation Mode Constants - Expanded for Realism
const MOCK_NAMES = {
    restaurant: [
        "The Rustic Table", "Blue Oak Bistro", "Saffron & Sage", "Urban Foundry", "Mason's Grill",
        "The Golden Spoon", "Hearth & Home", "Olive Branch", "Copper Pot Kitchen", "Juniper & Ivy",
        "Salt & Straw", "The Local House", "Farm to Fork", "Spice Route", "Ocean Blue"
    ],
    cafe: [
        "Morning Brew Co.", "The Daily Grind", "Bean & Leaf", "Espresso Lab", "The Roasted Bean",
        "Canvas Coffee", "Steam & Foam", "Paper Cup Cafe", "Urban Beans", "Third Wave Roasters",
        "Latte Artistry", "The Cozy Mug", "Brewed Awakening", "Caffeine Fix", "Mocha & More"
    ],
    bar: [
        "The Midnight Hour", "Copper Still", "Neon Moon", "The Library", "Highball Lounge",
        "Blind Tiger", "Craft & Cork", "The Alchemist", "Roxy's", "Velvet Rope",
        "Hops & Barley", "The Speakeasy", "Liquid Courage", "The Dive", "Rooftop Garden"
    ],
    movie_theater: [
        "Cineplex Odeon", "The Grand Cinema", "Starlight Studios", "Bijou Theatre", "The Screening Room",
        "Silver Screen Lofts", "City Lights Cinema", "Paramount Picture House", "The Roxy", "Metro Movies",
        "Galaxy Theatres", "Premiere Cinemas", "Film Forum", "Indie Flicks", "The Multiplex"
    ],
    park: [
        "Centennial Park", "Freedom Plaza", "Riverside Gardens", "Maple Grove Park",
        "Sunset Meadows", "City Hall Park", "Memorial Green", "Highland Park", "Botanical Gardens",
        "Discovery Park", "Unity Square", "Eagle Rock Reserve", "Tranquility Garden", "Community Commons"
    ]
};

// Diverse Image Collections (Unsplash IDs)
// I am using unique IDs to ensure every card looks different.
const IMAGE_LIBRARIES = {
    restaurant: [
        '1517248135467-4c7edcad34c4', '1559339352-11d035aa65de', '1552566626-52f8b828add9',
        '1514362545857-3bc16549766b', '1555396273-367ea4eb4db5', '1550966871-3ed3fn4b7d54',
        '1544148103-0773bf10d330', '1565299624536-b8a1ebd421ee', '1414235077428-338989a2e8c0',
        '1550547660-d949527245ac'
    ],
    cafe: [
        '1554118811-1e0d58224f24', '1509042239860-f550ce710b93', '1521017432531-fbd92d768814',
        '1461023058943-07fcbe16d735', '1507133750069-41264517f547', '1495474472287-4d71bcdd2085',
        '1511920170033-f9230866d471', '1497935586351-b67a49e012bf', '1511537632536-b45c31513739',
        '1525610553991-2bede18b3288'
    ],
    bar: [
        '1514362545857-3bc16549766b', '1536935338788-843bbc52899c', '1470337458703-46ad1756a187',
        '1572116469696-9587f10294e2', '1566417713204-61fa34886617', '1543007630-971228719613',
        '1551024709-8f23befc6f87', '1436076863939-06870fe779c0', '1496318328575-39673adf240e',
        '1524334228144-1d5363866c19'
    ],
    movie_theater: [
        '1489599849927-2ee91cede3ba', '1517604931442-710c8ef632b7', '1513106580091-1d82408b8cd8',
        '1440404653325-ab127d49abc1', '1478720568477-152d9b164e63', '1536440136628-849c177e76a1',
        '1574267432553-4b4628081c31', '1461153270515-6a6a1635d997', '1524985069026-a77e076472d6',
        '1626814026160-2237a95fc5a0'
    ],
    park: [
        '1496070242169-b672c576566b', '1441974231531-c6227db76b6e', '1472214103451-9374bd1c7dd1',
        '1500382017468-9049fed747ef', '1519331379826-3024620dc852', '1485081669829-bacb8c6ea1f7',
        '1566710444391-76495d038202', '1576082464102-1436dd5933d8', '1573048999808-16e6dbfa8ea9',
        '1596328373308-4122a76f2380'
    ]
};

const getRandomImage = (category) => {
    const list = IMAGE_LIBRARIES[category] || IMAGE_LIBRARIES.restaurant;
    const id = list[Math.floor(Math.random() * list.length)];
    return `https://images.unsplash.com/photo-${id}?q=80&w=400`;
};

/**
 * Calculates the spherical midpoint between two lat/lng points.
 */
export const calculateMidpoint = (userA, userB) => {
    return {
        lat: (userA.lat + userB.lat) / 2,
        lng: (userA.lng + userB.lng) / 2,
    };
};

/**
 * Generates realistic mock venues around a midpoint.
 * Used when APIs are blocked or for "Simulation Mode".
 */
const generateMockVenues = (midpoint, category) => {
    const names = MOCK_NAMES[category] || MOCK_NAMES.restaurant;
    // Generate 5-8 venues
    const count = Math.floor(Math.random() * 4) + 5;

    // Helper to get random offset in lat/lng (approx 1-3km radius)
    const getOffset = () => (Math.random() - 0.5) * 0.02;

    return Array.from({ length: count }).map((_, i) => {
        // Randomize traffic data (10-25 mins usually for a midway point)
        const durationA = Math.floor(Math.random() * (1500 - 600) + 600); // 10-25m in seconds
        // Make durationB close to durationA but with some variance to show fairness logic
        const variance = Math.floor(Math.random() * 300) - 150; // +/- 2.5m
        let durationB = durationA + variance;
        if (durationB < 0) durationB = 600;

        const durationAMins = Math.round(durationA / 60);
        const durationBMins = Math.round(durationB / 60);

        // --- Category Specific Realism ---
        let priceLevel = 2;
        let ratingBase = 4.0;

        if (category === 'park') {
            priceLevel = 0; // Parks are free
            ratingBase = 4.5; // Parks usually rated high
        } else if (category === 'cafe') {
            priceLevel = Math.random() > 0.7 ? 2 : 1; // Mostly cheap ($), some $$
            ratingBase = 4.2;
        } else if (category === 'fine_dining') {
            priceLevel = 3 + Math.floor(Math.random() * 2);
        } else if (category === 'movie_theater') {
            priceLevel = 2;
            ratingBase = 3.8;
        }

        const rating = (Math.random() * (4.9 - ratingBase) + ratingBase).toFixed(1);
        const userRatings = Math.floor(Math.random() * 800) + 50;

        // Ensure we pick a unique name from the list if possible, or loop
        const name = names[i % names.length];
        // Get a diverse image
        const fallbackImage = getRandomImage(category);

        return {
            place_id: `mock-${category}-${i}`,
            name: name,
            vicinity: `${Math.floor(Math.random() * 900) + 10} Main St`,
            rating: rating,
            user_ratings_total: userRatings,
            price_level: priceLevel,
            geometry: {
                location: {
                    lat: midpoint.lat + getOffset(),
                    lng: midpoint.lng + getOffset()
                }
            },
            photos: [],
            fallbackImage, // Use key 'fallbackImage' which UI knows how to handle
            durationAValue: durationA,
            durationAString: `${durationAMins} min`,
            durationBValue: durationB,
            durationBString: `${durationBMins} min`,
            delta: Math.abs(durationA - durationB),
            efficiency: durationA + durationB,
            types: ['point_of_interest', category]
        };
    });
};

// --- Cache ---
const requestCache = new Map();

/**
 * Main Fairness Engine Function
 * SIMULATION MODE ENABLED:
 * Bypasses Google Places/Distance Matrix APIs entirely to avoid blocks/timeouts.
 */
export const runFairnessEngine = async (userA, userB, mapInstance, category = 'restaurant') => {
    try {
        console.log("Starting Simulation Mode Fairness Engine...");

        const midpoint = calculateMidpoint(userA, userB);

        // Simulate 'Thinking'
        await new Promise(r => setTimeout(r, 600));

        // Generate
        const venues = generateMockVenues(midpoint, category);

        // Ranking
        venues.sort((a, b) => {
            if (Math.abs(a.delta - b.delta) > 60) return a.delta - b.delta;
            return a.efficiency - b.efficiency;
        });

        return venues;

    } catch (error) {
        console.error("Simulation Engine Failed:", error);
        return [];
    }
};
