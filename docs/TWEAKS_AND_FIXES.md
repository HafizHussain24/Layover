# Refinement & Tweaks Plan

The following tasks have been broken down from the user's feedback and grouped logically. We will implement them one section at a time.

## Group 1: Routing API & Builder Flow Fixes
1. **Fix Optimize API Error**: The Google Routes API throws a 400 error due to `routing_preference: "UNSPECIFIED"`. We need to fix the payload structure (likely omitting it or using `ROUTING_PREFERENCE_UNSPECIFIED`).
2. **Preview Modal for Optimization**: Clicking "Optimize" in the Route Builder will not automatically save the route. Instead, it will open a small modal window showing the newly optimized route path and reordered stops for the user to review and manually confirm/save.
3. **Preview Modal for Magic Split**: "Magic Split" will also open a modal window displaying the generated multi-day itinerary (all the routes) rather than immediately saving them. The user can review the clusters and choose to accept (save) or discard them.

## Group 2: Route Management & Map Visualization
4. **Directional Paths & Stop Ordering**: When viewing a route on the map, the polyline needs directional indicators (arrows), and the markers need to show their sequence number (1, 2, 3...) so the path is clear even when doubling back.
5. **Isolate Route on Map**: When a route is selected from the list, the map should hide all other bucket list locations that are NOT part of that route.
6. **Edit & Delete Routes**: Add "Delete" and "Edit" functionality to saved routes. (Editing will load the route back into the Route Builder and remove the saved instance).

## Group 3: Categories & Filtering
7. **Display Categories in Bucket List**: The places in the bucket list need to visibly display what category they belong to (e.g., using icons, colors, or badges).
8. **Category Filtering (Global)**: Add a way to filter the bucket list by category. When a category filter is active, the map should also only display locations in that category.
9. **Category Filtering in Route Builder**: In the Route Builder's "Add Stop" dropdown, allow users to filter the available locations by category to make it easier to pick a restaurant, then an attraction, etc.
