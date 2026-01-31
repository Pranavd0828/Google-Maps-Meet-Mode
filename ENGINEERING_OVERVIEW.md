# Engineering Overview: The Fairness Engine ⚙️

**Version:** 2.1 (Group Fairness & Ocean-Proofing)
**Tech Stack:** React, Google Maps JS API (Places, Geometry)

---

## 1. Core Architecture
The application is built on a "Simulated Mesh" architecture. To ensure responsiveness and cost-control, we do not query the Distance Matrix API for every single permutation. Instead, we use a hybrid approach:
1.  **Frontend:** React manages state (Users, Venues).
2.  **API Layer:** Google Places API is used strictly for **Candidate Generation** (finding valid venues).
3.  **Compute Layer:** Travel times are computed locally using a heuristic physics model (Haversine + Traffic Noise) to enable instant feedback.

## 2. The Algorithm: "Fair Point V2"
The logic works in four distinct phases:

### Phase A: Centroid Calculation (Geometric)
We first find the center of mass for all $N$ users.
$$Lat_{center} = \frac{\sum Lat_i}{N}, \quad Lng_{center} = \frac{\sum Lng_i}{N}$$

### Phase B: Land Snapping (The "Ocean Fix")
A geometric center is often invalid (water, forest, highway).
*   **Action:** We execute a `nearbySearch` at the Centroid with `rankBy: PROMINENCE`.
*   **Result:** The API automatically returns the nearest *viable* clusters of commerce. This effectively "snaps" the theoretical midpoint to the nearest valid land-based neighborhood.

### Phase C: The Cost Matrix
For every candidate venue $V$, we calculate the travel time $T_i$ for each user $U_i$.
*   We simulate distinct routes using a base urban speed (30km/h) + entropy (0.9-1.3x randomness) to mimic traffic conditions without incurring API costs per calculation.

### Phase D: Scoring (The Fairness Formula)
We rank venues not just by total distance, but by **Equity**.
$$Score = (Max(T) \times 0.7) + (\sigma(T) \times 0.3)$$
*   **$Max(T)$ (70%):** The "Suffering Cap". We punish venues that induce an extreme commute for any single user.
*   **$\sigma(T)$ (30%):** The "Inequality Penalty". We punish venues where one person drives 5 mins and another drives 45 mins.

---

## 3. Frontend Architecture & UX
### Mobile-First "Split View"
To solve the challenge of displaying both map and list data on small screens, we implemented a responsive **Split View** pattern:
*   **Desktop:** Traditional Sidebar (Left) + Full Map (Right).
*   **Mobile:** Bottom Sheet (Height 55%) + Visible Map (Top 45%).
    *   *Implementation:* CSS Grid/Flexbox with `translate` transitions ensures performance (60fps) even on low-end devices.
    *   *Auto-Fit:* The map automatically adjusts bounds (`fitBounds`) to ensure all user markers and results are visible within the "Safe Area" of the viewport.

---

## 4. Deployment & Infrastructure
*   **Hosting:** GitHub Pages (Static hosting).
*   **CI/CD:** Automated via `gh-pages` npm script.
*   **Security:**
    *   **Client-Side Keys:** The Google Maps API Key is exposed in the build (standard for static sites).
    *   **Protection:** Security is enforced via **HTTP Referrer Restrictions** in Google Cloud Console. Usage is strictly whitelisted to `pranavd0828.github.io` and `localhost`.
    *   **Quotas:** Client-side logic prevents runaway costs (Daily Limit: 100, Hard Expiry: April 2026).

---

## 5. Known Edge Cases (Version 2.1 Scope)

### Unaccounted Scenarios:
1.  **International Dateline:**
    *   *Issue:* The geometric centroid calculation does not normalize longitude wrapping (-180 to +180).
    *   *Impact:* Users in Japan and California would find a midpoint in Europe/Africa instead of the Pacific.
    *   *Mitigation:* Non-issue for driving use cases; requires spherical geometry update for global use.

2.  **Unbridgeable Gaps (Islands/Continents):**
    *   *Issue:* If User A is in London and User B is in NY, the midpoint is the Atlantic Ocean. The "Land Snapping" will fail or return a result in the Azores.
    *   *Fix:* Needs a "No Accessible Mode" error handler.

3.  **Modal Discrepancy:**
    *   *Issue:* The engine assumes everyone is driving.
    *   *Reality:* If User A is walking and User B is driving, the "Fairness" calculation is skewed.
    *   *Future V3:* Add per-user transport mode selection (Transit, Walking, Driving) to normalize *Time* instead of *Distance*.

4.  **Ferry / Obstacle Blindness:**
    *   *Issue:* Use of Haversine distance ignores physical barriers like bays (without bridges) or mountains.
    *   *Impact:* Might suggest a point 5km away across a bay that takes 2 hours to drive around.
    *   *Mitigation:* Upgrade to real Distance Matrix API (removed in V2 to satisfy Cost Control constraints).

5.  **Concurrent API Rate Limiting:**
    *   *Issue:* If 10,000 users hit "Find" simultaneously, we might hit the Google Maps global QPS limit before our client-side daily limit triggers.
