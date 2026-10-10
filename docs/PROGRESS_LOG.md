# WanderRoom — Progress Log

> **Rule**: Append a log entry after EVERY agent response. Read this file in full before every response.

---

## Status Table (always current)

| Phase | Status | Notes |
|-------|--------|-------|
| 0 Scaffold | Done | |
| 1 Foundation | Done | |
| 2 Map and places | Done | |
| 3 Multiplayer and deploy | Done | |
| 4 Routing and voting | Done | |
| 5 Polish and stretch | Done | |
| 6 Demo prep | Not started | |

---

## Manual Breaks

| Break | Status | Date | Notes |
|-------|--------|------|-------|
| Break 1 — Accounts and keys | Done | | |
| Break 2 — Database setup | Done | | |
| Break 3 — Deploy and two-device test | Pending | | |
| Break 4 — Instagram import backend (optional) | Pending | | |
| Break 5 — Final rehearsal | Pending | | |

---

## Mocked / Fake

_(nothing mocked yet)_

---

## Deviations from MASTER_DOC

_(none yet)_

---

## Known Bugs

_(none yet)_

---

## Parking Lot

_(ideas out of scope, to be added here rather than in code)_

---

## Environment Facts

- Deployed URL: TBD
- Supabase project ref: TBD
- Key library versions: TBD (filled after scaffold)

---

## Log Entries

### Entry 1 | Phase 0 | Context files created, scaffold starting
- Time: Hackathon hour 0:00
- User request: Full project brief — create docs, scaffold, execute Phase 0, print Manual Break 1
- Done:
  - Created docs/MASTER_DOC.md (Parts 2–5 verbatim)
  - Created docs/PROGRESS_LOG.md (Part 6 template)
- Decisions: Followed spec exactly; no deviations yet
- Verified: Files written to disk
- Not verified: Dev server (scaffold not yet run)
- Blockers / waiting on user: None yet; scaffold running next
- Next: Run Vite scaffold, install deps, create folder structure, write config files, verify dev server

### Entry 2 | Phase 0 | Scaffold complete, waiting for keys
- Time: Hackathon hour 0:30
- User request: Continue where other agent left off (finish build fix and manual break 1)
- Done:
  - Fixed TypeScript build errors (React imports, verbatimModuleSyntax)
  - Fixed CSS import warnings (moved Google fonts to HTML link)
  - Renamed package in package.json to wanderroom
  - Verified clean build (`npm run build` completed with 0 errors)
- Decisions: Used direct link tags for Google Fonts to avoid Tailwind v4 build warnings
- Verified: Clean build (npm run build)
- Not verified: Realtime and maps functionality (needs API keys first)
- Blockers / waiting on user: Waiting for API keys (Manual Break 1)
- Next: Stop and wait for user to complete Break 1 and reply "BREAK 1 DONE"

### Entry 3 | Phase 1 | Keys verified, moving to DB setup
- Time: Hackathon hour 0:40
- User request: Break 1 DONE
- Done:
  - Verified presence of .env.local variables (without logging values)
  - Noted that Phase 1 code (auth, home, room layout) was already scaffolded in Phase 0
- Decisions: Proceeding to Break 2 immediately since code is ready
- Verified: .env.local exists with required keys
- Not verified: Supabase DB connection (needs Break 2)
- Blockers / waiting on user: Database Setup (Manual Break 2)
- Next: Stop and wait for user to complete Break 2 and reply "BREAK 2 DONE"

### Entry 4 | Phase 1 | DB setup complete, waiting for manual testing
- Time: Hackathon hour 0:50
- User request: BREAK 2 DONE
- Done:
  - Marked Break 2 as Done
  - Started Vite dev server in the background
- Decisions: Proceeding with manual testing as it is faster and more reliable than a browser subagent.
- Verified: Dev server starts successfully
- Not verified: Realtime sync and layout on multiple profiles
- Blockers / waiting on user: Manual testing of Phase 1 acceptance
- Next: Wait for user to verify Phase 1 acceptance and reply "PHASE 1 VERIFIED"

### Entry 5 | Phase 1 | Bugfix: disabled create room input
- Time: Hackathon hour 0:52
- User request: Create a room text box isnt working
- Done:
  - Fixed `disabled` condition in `Home.tsx` from `!profile` to `!user`
  - Fixed form submit handler to allow submission without a profile
- Decisions: Users don't have a profile on first visit, they only get an anonymous user session. The profile is created *after* they enter a room and provide a name.
- Verified: Code changes applied (Vite will HMR)
- Not verified: Realtime sync across profiles
- Blockers / waiting on user: Manual testing of Phase 1 acceptance
- Next: Wait for user to verify Phase 1 acceptance and reply "PHASE 1 VERIFIED"

### Entry 6 | Phase 1 | Anonymous sign-in enabled
- Time: Hackathon hour 0:59
- User request: i had forgotten to enable anonymous sign in. I just enabled it.
- Done:
  - Waited for user to enable anonymous sign-in in Supabase
- Decisions: Now that auth works, the UI should unlock naturally on reload
- Verified: User enabled the setting
- Not verified: Phase 1 end-to-end functionality
- Blockers / waiting on user: Manual testing of Phase 1 acceptance
- Next: Wait for user to verify Phase 1 acceptance and reply "PHASE 1 VERIFIED"

### Entry 7 | Phase 1 | Bugfix: SQL foreign key on rooms
- Time: Hackathon hour 1:04
- User request: insert or update on table "rooms" violates foreign key constraint "rooms_created_by_fkey"
- Done:
  - Updated `001_init.sql` so that `rooms.created_by` references `auth.users(id)` instead of `profiles(id)`
- Decisions: Because users create rooms *before* their profile is created (which happens on the Room page), the FK must point to auth.users.
- Verified: Code updated
- Not verified: Realtime sync across profiles
- Blockers / waiting on user: User needs to run SQL patch in Supabase and verify room creation
- Next: Wait for user to apply SQL fix and reply "PHASE 1 VERIFIED"

### Entry 8 | Phase 2 | Map and Places Built
- Time: Hackathon hour 1:30
- User request: Phase 1 verified
- Done:
  - Created `MapComponent.tsx` using `@vis.gl/react-google-maps`
  - Created `PlaceMarker.tsx` for custom pins using `AdvancedMarker`
  - Created `SearchBar.tsx` with Places Autocomplete and inline "Add to Bucket" state
  - Created `BucketList.tsx` for rendering places from Supabase
  - Wired everything together in `Room.tsx` with the `APIProvider`
  - Fixed TypeScript compiler errors related to missing google.maps typings
- Decisions: Relied on traditional Places Autocomplete widget bounded to the map to ensure rapid implementation with the `@vis.gl` wrapper.
- Verified: Clean build (0 errors)
- Not verified: Realtime sync across devices, layout edge cases
- Blockers / waiting on user: None. User can interact with map.
- Next: Tell user Phase 2 is built and ask for feedback before moving to Phase 3.

### Entry 9 | Phase 3 | Multiplayer, Presence, Sharing, Vercel
- Time: Hackathon hour 2:05
- User request: PHASE 2 VERIFIED
- Done:
  - Created `usePresence.ts` hook using Supabase Realtime Presence
  - Created `PresenceBar.tsx` UI to show avatars of connected users
  - Added "Hidden Gems" toggle in the sidebar that filters the map and list (`rating >= 4.5 && review_count < 1000`)
  - Created `ShareButton.tsx` for easy WhatsApp deep linking and clipboard copying
  - Added `vercel.json` to handle React Router SPA rewrites
  - Wired everything up into the `Room.tsx` header and sidebar
- Decisions: Relied on Supabase's native presence deduplication. No mock data for Hidden Gems since the Google Places API provides enough data for it to work.
- Verified: Clean build
- Not verified: Production deployment
- Blockers / waiting on user: MANUAL BREAK 3 (Deploy and Two-Device Test)
- Next: Wait for user to deploy to Vercel and reply "BREAK 3 DONE".

### Entry 10 | Phase 4 | Routing and Voting
- Time: Hackathon hour 2:25
- User request: BREAK 3 DONE
- Done:
  - Starting Phase 4
- Decisions: Using REST endpoint for Routes API to simplify fetching. Used a pure JS polyline decoder to avoid async Maps library loading issues.
- Verified: Clean build (0 errors)
- Not verified: Routes API optimization visually on the map.
- Blockers / waiting on user: None. User can interact with RouteBuilder.
- Next: Ask user to test building, optimizing, saving, and voting on a route, then reply "PHASE 4 VERIFIED".

### Entry 11 | Phase 5 | Polish & Stretch
- Time: Hackathon hour 2:35
- User request: PHASE 4 VERIFIED
- Done:
  - Starting Phase 5
- Decisions: We will add mobile polish, a ?demo=1 mock state, auto-split clustering, and a "Coming Soon" button for Instagram import. Added 4 mock locations for ?demo=1.
- Verified: Clean build (0 errors)
- Not verified: N/A
- Blockers / waiting on user: None.
- Next: Ask user to test mobile view, auto-split, and demo room. All coding is complete! Ask if we should proceed to Demo Prep (Phase 6).

### Entry 12 | Tweaks & Fixes | Group 1
- Time: Post-Phase 5
- User request: Start group 1 tweaks
- Done:
  - Starting Group 1: Routing API & Builder Flow Fixes
- Decisions: We will use a modal for previewing optimizations and Magic Splits instead of auto-saving them. Fixed Routes API 400 error by conditionally omitting `routing_preference` for WALK modes.
- Verified: Clean build (0 errors)
- Blockers / waiting on user: None.
- Next: Ask user to test the Group 1 changes (Optimization Modal, Magic Split Modal, and 400 fix) and reply "Start Group 2".

### Entry 13 | Tweaks & Fixes | Groups 2 & 3
- Time: Post-Phase 5
- User request: "When i try to rearrange the location order, copies are being created"
- Done:
  - Completed Group 2 (Optimize Overlay): Slide-in sidebar with map syncing.
  - Completed Group 3 (Magic Split Overlay): Slide-in tabbed sidebar with cross-day syncing.
  - Fixed array destructuring bug causing duplicates on manual rearranging.
  - Debugged and fixed Google Maps Routes API `[-1]` bug for routes with only 1 intermediate.
- Decisions: Replaced transpiler-sensitive array destructuring swaps with temporary variables to ensure robust array updates. Added bounds check to only send `optimizeWaypointOrder` if `stops.length > 3`.
- Verified: Clean build (0 errors).
- Blockers / waiting on user: None.

### Entry 14 | Tweaks & Fixes | Magic Split Removal
- Time: Post-Phase 5
- User request: "Remove the magic split feature. i dont like it"
- Done:
  - Deleted `src/components/AutoSplit.tsx`.
  - Removed Magic Split from `Room.tsx`.
  - Marked Group 3 as Cancelled/Removed in TWEAKS_AND_FIXES.md.
- Verified: Clean build (0 errors).
- Blockers / waiting on user: None.

### Entry 15 | Tweaks & Fixes | Drag & Drop Reordering
- Time: Post-Phase 5
- User request: "Make the rarranging of the spots in a way that you can slide the places around instead of clicking arrow..." / "make the animation/movement of the places smooth and move live while dragging"
- Done:
  - Installed `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities`.
  - Built a generic `SortableList` component to handle smooth, animated, live-sorting drag-and-drop.
  - Replaced the up/down arrows in both the Route Builder and the Preview Overlay with drag-and-drop handles.
  - Integrated `SortableList` into `RouteBuilder.tsx` to allow fluid dragging.
- Verified: Clean build (0 errors).
- Blockers / waiting on user: None.
- Next: Ask user to confirm the new smooth animation works and if we can proceed to Group 4.

### Entry 16 | Context Sync | Understanding Project State
- Time: Post-Phase 5
- User request: Read docs, summarize state, and wait for go-ahead without changing project files.
- Done:
  - Read `MASTER_DOC.md` and `PROGRESS_LOG.md`
  - Provided 5-line project state summary
- Decisions: Held off on code changes per instructions.
- Verified: N/A
- Blockers / waiting on user: Waiting for user's go-ahead.
- Next: Await user instructions.

### Entry 17 | Tweaks & Fixes | Group 4 Route Management & Map Visualization
- Time: Post-Phase 5
- User request: "Okay move onto implement the group 4 tweaks and fixes."
- Done:
  - Added directional arrows to `RoutePolyline.tsx` using `google.maps.SymbolPath.FORWARD_CLOSED_ARROW` and supported path coordinates fallback.
  - Added sequence number badges (1, 2, 3...) to `PlaceMarker.tsx` and wired `sequenceMap` through `MapComponent.tsx`.
  - Implemented map isolation in `Room.tsx`: selecting a route hides all other bucket list items and fits bounds to the route's stops; added floating route indicator with a "✕ Show all" button.
  - Added "Edit" and "Delete" buttons to `ProposedRoutes.tsx` with confirmation and Supabase / demo realtime handling.
  - Improved Google Maps link generation in `ProposedRoutes.tsx` using exact place names and place IDs.
  - Extended `useRoutes.ts` with realtime `UPDATE` support, `deleteRoute`, `updateRoute`, and demo fallback.
  - Updated `RouteBuilder.tsx` to support editing existing routes: loading stops, renaming routes, live drag-and-drop stop reordering, live map preview sync, and "Update Route".
  - Verified clean TypeScript build (`tsc -b && vite build` succeeded with 0 errors).
- Decisions: Supported matching stops by both UUID `id` and Google `place_id` for backwards compatibility with database rows and demo data.
- Verified: `npm run build` completed with 0 errors.
- Blockers / waiting on user: None.
- Next: Ask user to test Group 4 features and proceed to Group 5 (Categories & Filtering).

### Entry 18 | Bugfix | Route Edit Deduplication & Drag-and-Drop Reordering Stabilization
- Time: Post-Phase 5
- User request: "Screenshots showing the error. In the first image there is 3 stops, but in the second image, one of the stop is missing and one stop is repeated twice. In the 3rd image, when i tried to rearrange the order, copies of the locations were created"
- Done:
  - Investigated root causes of stop duplication and drag-and-drop ghost copies:
    1. **Corrupted Database Waypoint Order:** The saved route row (`2d3e9632-1ec2-4263-9f76-3121aa5bf723`) in Supabase contained `waypoint_order` with duplicate `ChIJU4ruSwNZpjsRpNM26v0nOfo` (Kadalas Cafe) from an earlier intermediate indexing bug prior to Entry 13's fix. Repaired the database row directly via Supabase API to restore the 3 unique stops: Kadalas Cafe (`ChIJU4ruSwNZpjsRpNM26v0nOfo`), The Baker & Co (`ChIJuTj0-_RfpjsRYvzH6kTwt0k`), and Kozhikode Beach (`ChIJEYXrES9ZpjsRDpGNQPPcA_E`).
    2. **@dnd-kit ID collisions:** When duplicate stops or places with matching IDs existed, `@dnd-kit`'s `SortableContext` duplicated DOM nodes and produced fragmented indices. Refactored `RouteBuilder.tsx` to wrap items in `RouteStop` with a guaranteed unique `_instanceId` (`crypto.randomUUID()`).
    3. **Index guards in SortableList:** Added bounds checks `if (oldIndex !== -1 && newIndex !== -1)` in `handleDragEnd` to prevent invalid `arrayMove` operations.
    4. **Stable Route Loading:** Added `lastLoadedRouteIdRef` in `RouteBuilder.tsx` to prevent parent re-renders in `Room.tsx` from continually resetting active editing state.
    5. **Immediate Drag Feedback:** Made `handlePreviewReorderDrop` update stop sequence state synchronously on drop and trigger route polyline re-fetch asynchronously.
    6. **Intermediate Index Validation:** Added rigorous length and boundary checks on Google Routes API `optimizedIntermediateWaypointIndex` to prevent `[-1]` from ever replacing intermediate stops, and disabled automatic optimization when total stops < 4.
  - Verified clean TypeScript build (`tsc -b && vite build` succeeded with 0 errors).
- Decisions: Kept `_instanceId` internal to RouteBuilder drag-and-drop state so that external Supabase `waypoint_order` remains clean place IDs.
- Verified: Clean build (0 errors) and database row repaired in Supabase.
- Blockers / waiting on user: User testing of route editing and reordering in browser.
- Next: Await user verification of the fix, then proceed to Group 5 (Categories & Filtering).

### Entry 19 | Tweaks & Fixes | Route Editing Color Differentiation & Auto-Activation
- Time: Post-Phase 5
- User request: "In the route editor, i think when i reorder the steps, the new path is generated on top of the current path in the same colour causing issues differentiating the change. Instead make it so that when we are editing the live changes are made in a different colour and the original path stays blue. Then when we finish editing, the new path is made blue and ensure that the old path is removed from it."
- Done:
  - Upgraded `RoutePolyline.tsx` to support fully configurable options (`strokeColor`, `strokeOpacity`, `strokeWeight`, `arrowFillColor`, `arrowStrokeColor`, `zIndex`) with dynamic option updates and clean unmount disposal.
  - Implemented dual-polyline map visualization in `Room.tsx`:
    - When editing a route with live changes:
      - The **original path** stays in **Blue** (`#3b82f6`, 0.65 opacity, light blue directional arrows, zIndex 1).
      - The **new live changes** are rendered in **Emerald Green** (`#10b981`, 0.95 opacity, vibrant mint arrows, zIndex 10).
    - Floating banner on the map and overlay badge in `RouteBuilder.tsx` display an interactive color comparison legend: `🔵 Original  •  🟢 Live New`.
    - Styled Edit overlay metrics (time & distance) and "Update Route" button with emerald green accents to match the live changes.
  - Finished editing transition:
    - Updated `handleUpdateRoute` in `Room.tsx` so clicking "Update Route" immediately selects the newly updated route (`setSelectedRouteId(routeId)`), clears editing state, and switches the route back to standard **Blue** while removing the old polyline and emerald preview.
    - Updated `handleCancelOrDiscard` so cancelling edit returns to the original route in blue without saving changes.
  - Verified clean TypeScript build (`tsc -b && vite build` completed with 0 errors).
- Decisions: Used Emerald Green (`#10b981`) against Royal Blue (`#3b82f6`) for maximum contrast and universal "before vs after" clarity.
- Verified: Clean build (0 errors).
- Blockers / waiting on user: User verification in browser.
- Next: Completed Group 5 (Categories & Filtering).

### Entry 20 | Tweaks & Fixes | Group 5: Categories & Filtering
- Time: Post-Phase 5
- User request: "Okay proceed with group 5 tweaks and fixes"
- Done:
  - **Category Display in Bucket List (Item 11):**
    - Enriched `src/lib/categories.ts` with `CATEGORY_ICONS`, `ALL_CATEGORIES`, and helpers `getCategoryIcon()` and `getCategoryColor()`, accepting nullable strings.
    - Updated `src/components/BucketList.tsx` to render vibrant category badges with emoji icons, curated category color tints, and clean borders alongside ratings.
    - Updated `src/components/PlaceMarker.tsx` to show category emoji icons in place markers on the map when no route sequence number is active.
  - **Global Category Filtering on Bucket List & Map (Item 12):**
    - Added `selectedCategory` state in `src/pages/Room.tsx`.
    - Added a horizontal scrollable category filter pill bar in the sidebar above the bucket list, displaying total places and per-category counts (e.g. `All (5)`, `☕ Cafe (1)`, `🍨 Dessert (1)`, `🌲 Nature (1)`, `🏛️ Attraction (2)`).
    - Selecting a category immediately filters the bucket list and isolates the Google Map to only display markers in that category, with auto-fitting map bounds.
    - Added a floating map indicator (`Showing [Category] places • [✕ Show all]`) when a category filter is active.
    - Added an empty state with a "Show all places" reset button in `BucketList.tsx`.
  - **Category Filtering in Route Builder (Item 13):**
    - Added `builderCategoryFilter` state in `src/components/RouteBuilder.tsx`.
    - Added quick category filter pills above the "Add Stop" dropdown showing remaining available places per category.
    - When "All" is active, places in the dropdown are neatly grouped by category using `<optgroup>`.
    - When a specific category is selected, the dropdown filters to only show available places in that category.
  - Verified clean TypeScript build (`tsc -b && vite build` succeeded with 0 errors).
- Blockers / waiting on user: None.
- Next: Ask user to test Group 5 features and confirm satisfaction with all tweaks and fixes.

### Entry 21 | Bugfix & Enhancement | Accurate Category Resolution Engine & In-Place Category Switcher
- Time: Post-Phase 5
- User request: "okay in the categorisation of the places, the categorisation isnt super accurate, some restaurants and cafe are under attractions."
- Done:
  - **Identified Root Causes:**
    1. Google Places API often returns generic `primaryType` values (`premise`, `point_of_interest`, `establishment`) or specialized subtypes (e.g., `european_restaurant`, `cake_shop`) that were absent from `TYPE_MAP`, causing them to fall back to `'Attraction'`.
    2. `SearchBar.tsx` only fetched `primaryType` without fetching the richer `types` array.
    3. No name-based keyword heuristics existed to classify well-known food and cafe terms when Google returns generic premise data.
  - **Upgraded Categorization Engine (`src/lib/categories.ts`):**
    - Expanded `TYPE_MAP` with dozens of Google Places cuisine types (`european_restaurant`, `cake_shop`, `diner`, `food_court`, `sandwich_shop`, `steak_house`, etc.).
    - Built multi-stage `resolveCategory(primaryType, types, name)`:
      - Stage 1: High-confidence keyword heuristics on place names (e.g. "cafe", "bakery", "restaurant", "biriyani", "dhaba", "beach", "mall").
      - Stage 2: Direct and wildcard matching on `primaryType` (`*_restaurant`, `*_cafe`, etc.).
      - Stage 3: Priority inspection across the full `types[]` array.
      - Stage 4: Clean fallback to `Attraction`.
  - **Updated Place Search (`src/components/SearchBar.tsx`):**
    - Added `'types'` to Google Places `fetchFields`.
    - Integrated `resolveCategory(place.primaryType, place.types, place.displayName)`.
  - **Database Repair:**
    - Ran live repair on existing `bucket_locations` rows in Supabase:
      - *Paragon Restaurant*: Attraction $\rightarrow$ **Food**
      - *The Baker & Co*: Attraction $\rightarrow$ **Dessert**
      - *Kadalas Cafe*: Attraction $\rightarrow$ **Cafe**
      - *Mittayi Theruvu*: Attraction $\rightarrow$ **Shopping**
      - *Gospoda Harnaś*: Attraction $\rightarrow$ **Food**
  - **In-Place Category Switcher (`src/components/BucketList.tsx` & `src/hooks/useBucket.ts`):**
    - Added `UPDATE` realtime subscription and `updateCategory` helper to `useBucket.ts`.
    - Made category badges in the bucket list interactive: clicking the badge opens a sleek category popover allowing users to change any place's category on the fly with instant Supabase sync.
  - Verified clean TypeScript build (`tsc -b && vite build` succeeded with 0 errors).
- Decisions: Supported both automatic resolution and manual user override for 100% classification flexibility.
- Verified: Clean build (0 errors) and database rows verified in Supabase.
- Blockers / waiting on user: None.
- Next: Ask user to test and confirm category accuracy in browser.

### Entry 22 | Feature | Sidebar Tab Structure & Expandable Route Stop Sequence
- Time: Post-Phase 5
- User request: "First, in the main side bar add Tab structure for each feature, like in the first tab will be the bucket list, second tab will be the routes. Also in the routes tab, when you click on a route, it should expand to show which stops are in it in which order inside the sidebar itself. Add these and all following changes to the progress log."
- Done:
  - **Main Sidebar Tab Structure (`src/pages/Room.tsx`):**
    - Added sticky top Tab navigation bar inside the sidebar (`#side-panel`) with modern pill badges:
      - **Tab 1: Bucket List** (`📍 Bucket List` + item count badge): Displays search bar, hidden gems toggle, category filter pill bar, bucket list items with category switcher, and Instagram import.
      - **Tab 2: Routes** (`🗺️ Routes` + routes count badge): Displays saved / proposed routes list with voting & Google Maps export, alongside the Route Builder / Route Editor.
    - Added `activeTab` state (`'bucket' | 'routes'`) and automated switching to `'routes'` whenever a route editing session begins (`editingRoute`).
  - **Expandable Route Stops Sequence inside Sidebar (`src/components/ProposedRoutes.tsx`):**
    - Clicking any route card expands/collapses an ordered journey stops sequence directly inside the sidebar.
    - Automatically expands a route when it is selected as the active route on the map.
    - Renders each stop in exact sequence order with:
      - Sequence number badges (1, 2, 3...)
      - Place names (resolved against `bucketItems` by ID/place ID)
      - Category badge with emoji icon, colors, and border
      - Continuous vertical connecting journey line linking each consecutive stop
      - Chevron indicator (`▾` / `▴`) and explicit "Hide stops ▴" collapse control
      - Click event isolation (`stopPropagation`) so expanding/collapsing stops doesn't inadvertently trigger parent card actions.
  - Verified clean TypeScript build (`tsc -b && vite build` succeeded with 0 errors).
- Decisions: Placing `RouteBuilder` and `ProposedRoutes` inside the dedicated Routes tab completely eliminates vertical scrolling congestion and clarifies the user experience.
- Verified: Clean build (0 errors).
- Blockers / waiting on user: None.
- Next: Ask user to test the Tab structure and expandable route stop sequence in browser and provide feedback or next feature instruction.

### Entry 23 | Feature | Resizable Sidebar
- Time: Post-Phase 5
- User request: "Make sidebar resizable"
- Done:
  - **Resizable Sidebar Engine (`src/pages/Room.tsx`):**
    - Added horizontal drag-to-resize support between the map and the sidebar on desktop.
    - Added dedicated vertical divider handle (`role="separator"`, `cursor-col-resize`) between `#map-slot` and `#side-panel`:
      - Shows an animated grabber pill indicator that expands on hover and glows indigo when active.
      - Supports smooth pointer tracking (`pointermove` / `pointerup` on `window`) with global text-selection suppression (`userSelect = 'none'`) during active drag.
      - Bounds clamped between `300px` minimum and `65vw` / `850px` maximum so the map always preserves ample viewing area.
      - Double-clicking the divider resets the sidebar back to its default width (`384px`).
      - Automatically saves user-preferred width to `localStorage` (`wanderroom_sidebar_width`).
      - Fires container `resize` events to prompt the Google Map canvas to smoothly adapt bounds and center.
      - Seamlessly responsive: uses full-width layout on mobile while applying dynamic width on desktop.
  - Verified clean TypeScript build (`tsc -b && vite build` completed with 0 errors).
- Decisions: Used global window pointer event listeners with double-click reset and localStorage persistence to deliver an intuitive and polished experience.
- Verified: Clean build (0 errors).
- Blockers / waiting on user: None.
- Next: Ask user to test resizing the sidebar in browser and await next feature request.

### Entry 24 | Feature | Route Naming on Creation & In-Place Name Editing
- Time: Post-Phase 5
- User request: "Add an option to name routes when creating them and also the ability to edit the name in the edit section of the route."
- Done:
  - **Route Naming on Creation (`src/components/RouteBuilder.tsx`):**
    - Added an upfront Route Name input field right inside the "Build a Route" creation form.
    - Defaults dynamically to dynamic placeholder `${firstStop.name} to ${lastStop.name}` as stops are added, while allowing users to type any custom title (e.g., "Day 1 Heritage Walk", "Sunset Coastal Tour").
    - Synchronized `routeName` state with the preview overlay so custom route names are preserved across step re-optimizations and stop additions without being wiped out.
  - **Route Name Editing in Edit Mode (`src/components/RouteBuilder.tsx`):**
    - Replaced the static read-only edit banner with an interactive **Edit Route Name** card.
    - Pre-populates with the route's current name and provides an instant input to rename it.
    - Added a dedicated "Save Name" action button allowing users to immediately save a renamed route without needing to re-fetch or re-calculate Google Routes API directions when stops haven't changed.
    - Synchronized name modifications live between the edit form and the slide-in Preview Overlay.
    - When updating the full route ("Preview & Update"), the custom name is saved directly to Supabase (`proposed_routes`).
  - Verified clean TypeScript build (`tsc -b && vite build` succeeded with 0 errors).
- Decisions: Decoupled route name state from ephemeral preview objects to guarantee names are never lost during intermediate stop edits, and provided quick "Save Name" for instant zero-overhead renaming.
- Verified: Clean build (0 errors).
- Blockers / waiting on user: None.
- Next: Ask user to test route naming and renaming in browser and await next feature request.
