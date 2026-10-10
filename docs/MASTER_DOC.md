# WanderRoom — Master Document

> **Rule**: The agent reads this file in full before every response. Never rely on chat history alone.

---

## PART 2: Project Vision

**Problem:** Group trip planning lives in WhatsApp threads full of random Instagram links, with no geographic logic.

**Solution:** A shared room where friends drop places into a common bucket list, filter out tourist traps to find hidden gems, build routes from the bucket, optimize the stop order for real, and vote on the best route. The winning route becomes the Final Itinerary, openable in Google Maps.

**Target market:** Group trips in India, where WhatsApp is the default planning tool. That is why a WhatsApp share button is a first-class feature.

**Differentiator vs Wanderlog and Google Maps lists:** Real-time multiplayer plus geographic efficiency (route optimizer, auto-split into days) plus group voting.

### Demo Golden Path
Everything optimizes for this:
1. Phone A creates room "Kochi Weekend" and shares the link to WhatsApp.
2. Phone B joins. Presence shows both users online.
3. Both add places. Each appears on the other phone instantly.
4. Toggle "Hidden Gems" to hide crowded places.
5. Build a route, press "Optimize order", see the line and total time and distance.
6. Both users vote. The leading route is highlighted as the Final Itinerary.
7. Tap "Open in Google Maps".

---

## PART 3: Tech Stack and Conventions

- **Frontend:** React + Vite + TypeScript (use plain JS only if the user asks), React Router.
- **Styling:** Tailwind CSS. Mobile-first: map with a bottom sheet on phones, side panel on desktop.
- **Backend:** Supabase (Postgres, Realtime, Presence, anonymous auth). No custom server.
- **Maps:** @vis.gl/react-google-maps for rendering. Places API (New) for autocomplete and details. Routes API (not the legacy Directions API; use this name everywhere) for routing.
- **State:** React state plus small custom hooks. No Redux.
- **Drag-and-drop:** Start with up/down buttons; add @dnd-kit only in the stretch phase.
- **Deploy:** Vercel (SPA rewrite so /room/:id works on refresh).
- **Env vars:** VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GOOGLE_MAPS_API_KEY, VITE_GOOGLE_MAP_ID.

### Folder Structure
```
src/lib/          (supabase client, maps helpers, polyline decode, categories)
src/hooks/        (useRoom, useBucket, useRoutes, usePresence, useVotes)
src/components/   (Map, SearchBar, BucketList, RouteBuilder, VoteButton, ShareButton, PresenceBar)
src/pages/        (Home, Room)
src/demo/         (seed data for the offline fallback)
supabase/migrations/  (SQL files)
docs/             (MASTER_DOC.md, PROGRESS_LOG.md)
```

---

## PART 4: Features, Data Model, and Technical Decisions

### Corrections to the Original Spec (follow these, not the old spec)
- **Skip full auth.** Use Supabase anonymous sign-in plus a display name the user types on first join. A profiles row is created for every user (needed for foreign keys).
- **Use gen_random_uuid(), not uuid_generate_v4().**
- **Realtime needs setup:** Tables added to the supabase_realtime publication, permissive RLS policies, and REPLICA IDENTITY FULL on tables where we listen to deletes.
- **Voting uses a route_votes table** with primary key (route_id, user_id): one vote per person, un-vote supported, no race conditions, counts update live. There is no votes integer column.
- **"Optimal" must be true:** Call the Routes API with optimizeWaypointOrder: true and a field mask that includes the optimized order, wired to an "Optimize order" button.
- **Hidden Gems uses real data:** Fetch rating and userRatingCount from Places (New) when a place is added. Filter default: rating >= 4.5 and review_count < 500. Mock values (flagged is_mock_rating) only if the fields come back empty.
- **Transit is unsupported with waypoints.** Offer DRIVE and WALK only.
- **Instagram import:** Either real (screenshot or caption to an LLM extracts the place name, then Places search) or honestly labeled "Coming soon". Never a fake spinner presented as working.

### Database Schema
Save as `supabase/migrations/001_init.sql`; the user runs it at Manual Break 2.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_color text default '#6366f1'
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table bucket_locations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  added_by uuid references profiles(id),
  place_id text not null,
  name text not null,
  address text,
  category text,
  lat double precision not null,
  lng double precision not null,
  rating numeric,
  review_count integer,
  is_mock_rating boolean default false,
  created_at timestamptz default now(),
  unique (room_id, place_id)
);

create table proposed_routes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  created_by uuid references profiles(id),
  route_name text,
  travel_mode text default 'DRIVE',
  waypoint_order jsonb not null,
  total_duration_mins integer,
  total_distance_m integer,
  encoded_polyline text,
  created_at timestamptz default now()
);

create table route_votes (
  route_id uuid references proposed_routes(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (route_id, user_id)
);

-- Hackathon-grade RLS: open to any signed-in (including anonymous) user
alter table profiles enable row level security;
alter table rooms enable row level security;
alter table bucket_locations enable row level security;
alter table proposed_routes enable row level security;
alter table route_votes enable row level security;

create policy open_all on profiles for all to anon, authenticated using (true) with check (true);
create policy open_all on rooms for all to anon, authenticated using (true) with check (true);
create policy open_all on bucket_locations for all to anon, authenticated using (true) with check (true);
create policy open_all on proposed_routes for all to anon, authenticated using (true) with check (true);
create policy open_all on route_votes for all to anon, authenticated using (true) with check (true);

-- Realtime
alter table bucket_locations replica identity full;
alter table proposed_routes replica identity full;
alter table route_votes replica identity full;
alter publication supabase_realtime add table bucket_locations, proposed_routes, route_votes;
```

### Feature Rules

**Rooms:** Create with a name, share link /room/<uuid>. On first visit the user enters a display name (stored in profiles and remembered via the anonymous session). Include a Share to WhatsApp button using a https://wa.me/?text= deep link, plus copy-link.

**Bucket list:** Search via Places Autocomplete (New). On select, fetch details with a minimal field mask (id, displayName, formattedAddress, location, primaryType, rating, userRatingCount) and insert into bucket_locations. Category comes from a lookup of primaryType (restaurant, cafe, bakery to Food or Dessert; tourist_attraction, museum, park to Attraction; and so on; default "Attraction"). Keep the lookup in src/lib/categories.ts. Subscribe to realtime inserts and deletes for the room.

**Presence:** Use Supabase Presence on a per-room channel to show who is online and optionally "Riya is adding a place...".

**Hidden Gem filter:** Toggle in the bucket list header. Filters on real rating and review_count with the thresholds above. Show rating and review count on each card.

**Route builder:** Select 3 to 6 bucket items, order them with up/down buttons, choose DRIVE or WALK. Call the Routes API computeRoutes with the first item as origin, the last as destination, the rest as intermediates. Field mask must include routes.duration, routes.distanceMeters, routes.polyline.encodedPolyline, routes.optimizedIntermediateWaypointIndex. Decode the polyline yourself and draw it on the map. "Optimize order" re-calls with optimizeWaypointOrder: true and re-sorts the list from the returned indices. Show total time and distance. "Save route" writes to proposed_routes.

**Voting:** One vote per user per route using route_votes. Toggle to un-vote. The route with the most votes gets a "Final Itinerary" badge. Provide Open in Google Maps using https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=....

**Demo fallback:** ?demo=1 loads a pre-seeded fake room from src/demo/ (about 8 Kochi places, 2 saved routes with votes) with no backend calls, so the pitch survives a network failure. Mark it clearly as demo data in code.

**Stretch (only if ahead of schedule, in this order):**
1. Auto-split into days via simple k-means on lat/lng
2. Drag-and-drop with @dnd-kit
3. Real Instagram import

---

## PART 5: Phase Plan

Times are targets from the start of the hackathon. Feature freeze at hour 9. Hour 10 is polish and rehearsal only.

### Phase 0: Context and Scaffold (0:00 to 0:30) | agent
- Create docs/MASTER_DOC.md and docs/PROGRESS_LOG.md.
- Scaffold Vite + React + TS, install Tailwind, React Router, @supabase/supabase-js, @vis.gl/react-google-maps.
- Create folder structure, .env.example, .gitignore, README stub, and supabase/migrations/001_init.sql from Part 4.
- Verify the dev server runs.

### MANUAL BREAK 1: Accounts and Keys (about 20 min)
Agent prints these instructions, then stops:
1. Supabase: create a project at supabase.com. In Project Settings > API, copy the Project URL and anon public key. In Authentication > Sign In / Providers, turn on Allow anonymous sign-ins.
2. Google Cloud: create a project and enable billing (Maps needs it; new accounts get free credit). Under APIs and Services, enable Maps JavaScript API, Places API (New), and Routes API.
3. Create an API key. For now restrict it to those three APIs only (add website restrictions at Break 4).
4. In Google Maps Platform > Map Management, create a Map ID (vector, JavaScript).
5. Create .env.local in the project root with the four variables from .env.example.
6. Reply BREAK 1 DONE. The agent will confirm it can read the variables (without printing their values).

### Phase 1: Foundation and Rooms (0:30 to 1:45) | agent
- Supabase client, anonymous sign-in on app load, display-name prompt, profiles upsert.
- Home page: create room, join by link. Room page shell with responsive layout (map area plus bottom sheet on mobile).
- Pages and routing for / and /room/:id.

### MANUAL BREAK 2: Database Setup (about 10 min)
The agent should run Phase 1 code only after this is done, so it stops here first:
1. Open Supabase > SQL Editor > New query. Paste the full contents of supabase/migrations/001_init.sql and run it.
2. Open Database > Replication (or Publications) and confirm bucket_locations, proposed_routes, and route_votes are in supabase_realtime.
3. Open Table Editor and confirm all five tables exist.
4. Reply BREAK 2 DONE. The agent then finishes and tests room creation end to end.

Acceptance: you can create a room, copy its link, and open it in a second browser profile.

### Phase 2: Map and Places (1:45 to 3:45) | agent
- Render the map with your Map ID. Places Autocomplete (New) search bar with debounce.
- On select, fetch details with the minimal field mask, categorize, insert into bucket_locations. Handle duplicates (unique constraint).
- Markers for bucket items, colored by category. Bucket list cards with name, category, rating, review count, delete.

Acceptance: search "Fort Kochi", add 3 places, see markers and cards, and see the real rating and review count.

### Phase 3: Multiplayer, Filter, Share, First Deploy (3:45 to 5:30) | agent + user
- Realtime subscriptions for bucket changes. Presence bar. Hidden Gem toggle with real data (mock fallback flagged). WhatsApp share and copy link. Add vercel.json SPA rewrite.

### MANUAL BREAK 3: Deploy and Two-Device Test (about 25 min)
1. Push the repo to GitHub.
2. In Vercel, import the repo. Add the four environment variables under Settings > Environment Variables. Deploy.
3. In Google Cloud, edit the API key: set Website restrictions to http://localhost:5173/* and https://<your-app>.vercel.app/*.
4. In Supabase, Authentication > URL Configuration, add the Vercel URL to Site URL / Redirect URLs.
5. Open the deployed link on two real phones (or phone plus laptop). Add a place on one and confirm it appears on the other within about a second.
6. Reply BREAK 3 DONE and report anything broken (error text or screenshot).

Acceptance: realtime works across two devices on the deployed URL.

### Phase 4: Routing, Optimization, Voting (5:30 to 8:00) | agent
- Routes API helper, polyline decoder, route polyline layer on the map.
- Route builder: select 3 to 6 stops, up/down reorder, DRIVE or WALK, live total time and distance.
- Optimize order button using optimizeWaypointOrder.
- Save routes to proposed_routes (realtime), list proposed routes in the room.
- route_votes voting with live counts and the Final Itinerary badge. Open in Google Maps button.
- Handle API errors visibly (toast), never a blank screen.

Acceptance: build a 4-stop route, press Optimize and watch the order change, save it, vote from two devices and see counts sync.

### Phase 5: Differentiators and Polish (8:00 to 9:00) | agent (+ optional user break)
Do in order, stop when time is up:
1. Mobile polish: touch targets, bottom sheet behavior, loading and empty states.
2. Auto-split into days (k-means on lat/lng, k chosen by the user, 2 to 3).
3. Seeded ?demo=1 fallback room.
4. Instagram import decision: if more than 45 minutes remain, build the real version below, otherwise add a visibly labeled "Coming soon" button and stop.

### MANUAL BREAK 4 (optional): Instagram Import Backend (about 20 min)
Only if building the real import. The API key must never ship in frontend code, so use a Supabase Edge Function.
1. Get an LLM API key with vision support (for example from the Anthropic Console).
2. Install the Supabase CLI, run supabase login, then supabase link --project-ref <your-ref>.
3. Run supabase secrets set LLM_API_KEY=<your key>.
4. After the agent writes supabase/functions/extract-place/, run supabase functions deploy extract-place.
5. Reply BREAK 4 DONE.

The flow: user uploads a screenshot or pastes a caption, the function returns a place name guess, the app runs it through Places search, and the user confirms before adding.

### Phase 6: Feature Freeze, Demo Prep (9:00 to 10:00) | agent + user
- No new features. Bug fixes only.
- Agent writes the final README (problem, features, stack, what is real vs mocked) and a one-page pitch outline.

### MANUAL BREAK 5: Final Rehearsal (about 30 min)
1. Create a fresh room on the deployed URL and run the full golden path on two phones, twice.
2. Test ?demo=1 with Wi-Fi off to confirm the fallback works.
3. Prepare a WhatsApp-chaos screenshot for the pitch opener.
4. Rehearse the 2-minute pitch: before/after, live demo, what is real vs mocked, what is next.
5. Reply BREAK 5 DONE with any final bugs.
