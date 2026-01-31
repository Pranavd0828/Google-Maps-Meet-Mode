# Google Maps "Meet Halfway" Mode 📍

A sophisticated React application that solves the classic coordination problem: *"Where should we meet?"*

This project extends the familiar Google Maps interface with a legitimate **Group Fairness Engine**. It calculates the optimal meeting point for *N* users by balancing travel times, avoiding geographic obstacles (like oceans), and sourcing high-quality venues via the Google Places API.

---

## 🚀 Key Features

### 1. Multi-User Fairness ("Party Mode")
Unlike simple "midpoint" tools that only work for two people, this app supports **unlimited users**. You can add 3, 4, or 10 friends, and the algorithm will find a location that is fair for the entire group.

### 2. Advanced Fairness Algorithm
We don't just pick the geographic center. We rank venues using a weighted fairness formula:
> **Score = (MaxCommute × 0.7) + (Variance × 0.3)**

*   **MaxCommute (70% weight):** Minimizes the "pain" for the person with the longest drive. We prioritize results where *no one* has to travel excessively far.
*   **Variance (30% weight):** Minimizes inequality. We prefer locations where everyone travels roughly the same amount of time.

### 3. "Ocean-Proof" Reliability (Land Snapping)
Simple geometric centroids often land in water (e.g., San Francisco Bay).
*   **Solution:** The engine performs a real-time `nearbySearch` at the mathematical centroid to find the nearest valid "Anchor Point" on land.
*   **Result:** You will never be told to meet in the middle of the ocean.

### 4. Cost Assurance & Safety
To prevent accidental overages on the Google Cloud bill, the app includes strict client-side protections:
*   **Daily Quota:** Limited to **100 searches/day** (resets locally at midnight).
*   **Kill Switch:** The app is hard-coded to expire on **April 20, 2026** (80-day trial).
*   **Smart Fallbacks:** If the API hangs (>5s), the app gracefully degrades to a simulation mode rather than crashing.

---

## 🛠️ Technical Implementation

### The Fairness Engine (`fairnessEngine.js`)
The core logic resides in a standalone utility that executes in four distinct phases:

1.  **Centroid Calculation:**
    Computes the geometric center of mass for all *N* user coordinates.
    `Centroid = (Σlat/N, Σlng/N)`

2.  **Candidate Fetching (The "Anchor" Step):**
    Instead of guessing coordinates, we query the **Google Places API** for real venues within a 4km radius of the centroid. This ensures every candidate is a real, accessible business.

3.  **Travel Time Simulation:**
    To save API quota (Cost: $0.00), we calculate travel times using the **Haversine Formula** combined with a "Traffic Noise" heuristic:
    *   *Base Speed:* 30km/h (Urban average)
    *   *Noise Factor:* Random multiplier (0.9x - 1.3x) to simulate real-world variability.

4.  **Scoring & Ranking:**
    Every venue generates a travel time vector `[t1, t2, ... tn]`. We compute the Score using the formula above and sort candidates ascending (lower score is better).

### Frontend Architecture
*   **Framework:** React 18 + Vite
*   **Styling:** Tailwind CSS (configured with Google's specific Design Tokens for fonts, shadows, and colors).
*   **Maps:** `@react-google-maps/api` for efficient, native-feeling map rendering.
*   **State Management:** React `useState` / `useCallback` for managing complex user lists and async API states.

---

## 💻 Setup & Installation

### Prerequisites
*   Node.js (v18+)
*   A valid **Google Maps API Key** with the following APIs enabled:
    *   Maps JavaScript API
    *   Places API
    *   Geometry API

### Installation
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Pranavd0828/Google-Maps-Meet-Mode.git
    cd Google-Maps-Meet-Mode
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment:**
    Create a `.env` file in the root directory:
    ```env
    VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
    ```

4.  **Run Locally:**
    ```bash
    npm run dev
    ```

---

## 🔒 Security Note
This repository does **not** contain any API keys.
*   The `.env` file is included in `.gitignore`.
*   The application implements **Referrer Restrictions** compatibility to ensure your key cannot be misused even if exposed on the client side.

---

## 📸 Usage

1.  **Enter Locations:** Type your location and your friend's location (or add more friends via the **+** button).
2.  **Select Category:** Choose between Dining, Coffee, Movies, etc.
3.  **Find Fair Point:** Click the button. The app will calculate the fairest middle ground.
4.  **View Results:** Hover over the sidebar cards to see the location on the map. The badges show exactly how long each person has to travel.
