# Refinement & Tweaks Plan

The following tasks have been broken down from the user's feedback and grouped logically. We will implement them one section at a time.

## Group 1: Routing API & Sidebar Framework
1. **Fix Optimize API Error (Done)**: The Google Routes API throws a 400 error due to `routing_preference: "UNSPECIFIED"`. Payload structure fixed.
2. **Sidebar Overlay Framework**: Create a robust sliding sidebar component that temporarily overlays on top of the existing sidebar to handle complex previews without cluttering the main UI.

## Group 2: Route Builder & Optimization Flow (Done)
3. **Optimize Sidebar Overlay**: Clicking "Optimize" or "Preview" will open the new sliding sidebar. It will show the previewed route order and render the corresponding polyline on the map.
4. **Manual Rearrangement in Overlay**: Users will be able to manually rearrange the order of the stops directly inside this overlay before finally clicking "Save". (Destructuring array mutation bug also fixed).

## Group 3: Magic Split Flow (Cancelled / Removed)
- User decided they didn't like the Magic Split feature, so it was completely removed from the app.

## Group 4: Route Management & Map Visualization (Completed)
8. **Directional Paths & Stop Ordering**: Polylines now render directional arrows pointing along the path of travel. Markers display circular sequence number badges (1, 2, 3...) when viewing a route or previewing in builder.
9. **Isolate Route on Map**: Selecting a saved route hides all other bucket list items from the map and auto-fits bounds to the route. A floating banner displays route details with a "✕ Show all" button.
10. **Edit & Delete Routes**: Added Delete (with confirmation and realtime sync) and Edit buttons to saved routes. Clicking Edit loads the route back into the Route Builder overlay with drag-and-drop stop reordering, live map syncing, name editing, and "Update Route".

## Group 5: Categories & Filtering (Completed)
11. **Display Categories in Bucket List**: The places in the bucket list visibly display what category they belong to with icons, category color badges, and ratings. Map markers display category icons when not viewing a route.
12. **Category Filtering (Global)**: Added an interactive category pill filter bar in the sidebar. Filtering by category filters the bucket list and automatically isolates the map to only locations in that category, with a floating "Showing [Category] places" indicator and bounds auto-fit.
13. **Category Filtering in Route Builder**: Added category filter pills and category-grouped optgroups to the Route Builder's "Add Stop" dropdown, allowing users to easily filter available locations by category (e.g. Food, Cafe, Attraction).
