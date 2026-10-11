# WayMark 🗺️
### Real-Time Collaborative Group Trip Planner

[![Vercel Deployment](https://img.shields.io/badge/Deployed-Vercel-black?style=flat&logo=vercel)](https://waymark-livid.vercel.app/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-emerald?style=flat&logo=supabase)](https://supabase.com/)
[![Google Maps](https://img.shields.io/badge/Maps-Google%20Maps%20Platform-red?style=flat&logo=googlemaps)](https://developers.google.com/maps)
[![Google Gemini](https://img.shields.io/badge/AI-Gemini%20Flash-orange?style=flat&logo=google)](https://deepmind.google/technologies/gemini/)

---

## 🧭 Overview

**Group trip planning usually falls apart in chaotic WhatsApp threads** — buried beneath disjointed Instagram reels, disconnected Google Maps pins, and zero geographic logic.

**WayMark** replaces fragmented chats with a unified, real-time multiplayer trip room. Friends can drop places into a shared bucket list, uncover authentic local spots using the "Hidden Gems" filter, brainstorm with an AI Scout powered by Gemini, calculate multi-stop driving and walking routes with Google Routes optimization, and vote together to crown the winning itinerary.

---

## ✨ Key Features

### ⚡ 1. Real-Time Multiplayer Collaboration
- **Instant Rooms & WhatsApp Share**: Generate a trip room in one click and invite friends via an integrated WhatsApp share button with rich previews.
- **Live Presence Engine**: See who is currently online in the room with animated color-coded traveler avatars.
- **Realtime Sync**: Powered by Supabase Realtime channels — additions, removals, route creations, and votes broadcast across all devices in under 100ms.

### 📍 2. Smart Place Discovery & Instagram Extraction
- **Google Places Search**: Search places autocomplete tailored to the room's destination, retrieving live ratings, review counts, photos, and exact coordinates.
- **Instagram Reel Parser**: Paste links from travel and food reels to parse location names and instantly add them to the group bucket list.
- **"Hidden Gems" Filter**: Algorithmic filter that surfaces high-rated (≥4.3★) places with moderate review volume, filtering out commercial tourist traps.
- **Categorization**: Color-coded category tags (*Nature, Food, Cafe, Dessert, Attraction, Shopping, Nightlife, Accommodation, Transport*).

### 🤖 3. AI Travel Scout (Google Gemini)
- **Local Insider Intelligence**: Natural language recommendations powered by `gemini-3.8-flash` tailored to the trip's destination.
- **Automated Google Grounding**: Every AI recommendation is automatically resolved against Google Places API to verify real-world coordinates and details.
- **1-Click Add**: Add recommended spots directly to the group bucket list with a single click.

### 🚗 4. Multi-Stop Route Builder & Optimization
- **Google Routes API Engine**: Generates real driving (traffic-aware) and walking paths with exact distance and travel duration metrics.
- **Travel Mode Selector**: Sleek dropdown popover to effortlessly toggle between Driving and Walking paths.
- **Order Optimizer**: Solves the Traveling Salesperson Problem (TSP) using Google Routes API order optimization to calculate the most efficient sequence.
- **Drag-and-Drop Reordering**: Smooth, fluid stop reordering powered by `@dnd-kit`.
- **Live Comparison Visualizer**: Compare original saved routes (blue polyline) against modified edits (emerald green polyline) simultaneously on the map.
- **Turn-by-Turn Export**: One-click "Open in Maps" generates a Google Maps navigation URL with all origin, waypoint, and destination stops.

### 🗳️ 5. Democratic Group Voting
- **Live Upvoting**: Room members upvote proposed routes.
- **Final Itinerary**: The highest-voted route is dynamically awarded the "Final Itinerary" badge and highlighted as the group's chosen plan.

### 👤 6. Production Hybrid Auth & Trip Management
- **Flexible Sign-In**: Frictionless guest access for travelers, plus Google OAuth and Email Magic Link login.
- **"My Trips" Dashboard**: Access saved trips from any device with full deletion management and local storage fallback.

### 🎭 7. Offline Demo Mode (`?demo=1`)
- Built-in offline demo room pre-seeded with Kochi, Kerala attractions, mock routes, and sample votes for instant pitches without external API dependencies.

---

## 🛠️ Architecture & Tech Stack

```
WayMark Client (React 19 + Vite + TypeScript)
 ├── UI & State
 │    ├── Tailwind CSS v4 (Warm Midnight theme)
 │    ├── Lucide React Icons
 │    └── @dnd-kit (Sortable Drag & Drop)
 ├── Real-Time & Backend (Supabase)
 │    ├── Postgres DB (RLS policies)
 │    ├── Supabase Realtime & Presence
 │    └── Supabase Auth (Google OAuth & Magic Link)
 ├── Maps & Routing (Google Maps Platform)
 │    ├── @vis.gl/react-google-maps
 │    ├── Places API (Search & Place Details)
 │    └── Routes API v2 (Directions & Order Optimization)
 └── AI Scout
      └── Google Gemini API (gemini-3.8-flash)
```

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) | Client application & fast build tooling |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Strict type-safety across all components & hooks |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Dark-mode first design tokens & responsive layout |
| **Database & Realtime** | [Supabase](https://supabase.com/) | PostgreSQL, Realtime WebSocket sync, Presence, Auth |
| **Maps & Places** | [Google Maps Platform](https://developers.google.com/maps) | Maps JS API, Places API, Routes API v2 |
| **AI / LLM** | [Google Gemini](https://ai.google.dev/) | Travel scout assistant (`gemini-3.8-flash`) |
| **Drag & Drop** | [@dnd-kit](https://dndkit.com/) | Accessible stop reordering in route builder |
| **Deployment** | [Vercel](https://vercel.com/) | Continuous deployment with edge CDN |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+ recommended)
- A Supabase project ([supabase.com](https://supabase.com))
- Google Maps Platform API Key (with *Maps JavaScript API*, *Places API*, and *Routes API* enabled)
- Google Gemini API Key ([aistudio.google.com](https://aistudio.google.com))

### 1. Clone & Install
```bash
git clone https://github.com/HafizHussain24/Layover.git
cd Layover
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```bash
cp .env.example .env.local
```

Fill in your API credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_GOOGLE_MAP_ID=your-google-map-id
VITE_GEMINI_API_KEY=your-gemini-api-key
```

### 3. Initialize the Database
Open your Supabase project's **SQL Editor** and run the migration scripts in order:
1. `supabase/migrations/001_init.sql` — Base tables, RLS policies, and realtime publications.
2. `supabase/migrations/002_room_destination.sql` — Room destination fields.
3. `supabase/migrations/003_production_auth_rls.sql` — Idempotent production RLS and Google OAuth profile integration.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🌐 Deploying to Vercel

1. Push your code to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Under **Settings → Environment Variables**, add the 5 variables from `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GOOGLE_MAPS_API_KEY`
   - `VITE_GOOGLE_MAP_ID`
   - `VITE_GEMINI_API_KEY` *(Save as **Config** type rather than Secret since it is prefixed with `VITE_`)*
4. Set the Google OAuth redirect URI in your Supabase Auth settings:
   - **Site URL**: `https://your-domain.vercel.app/`
   - **Redirect URLs**: `https://your-domain.vercel.app/**`
5. Click **Deploy**.

---

## 🧪 Demo Mode

To test or pitch the application without setting up Supabase or Google Cloud credentials:

Visit the demo room URL:
```
http://localhost:5173/room/demo?demo=1
```
*(Or append `?demo=1` to any deployed room URL)*

Demo mode loads:
- Pre-populated Kochi bucket list places
- Sample proposed driving and walking routes
- Simulated live presence avatars
- Offline fallback recommendations for AI Scout

---

## 📁 Project Structure

```
Layover/
├── src/
│   ├── components/       # UI components (Map, RouteBuilder, AIScout, BucketList, etc.)
│   ├── hooks/            # Custom hooks (useRoom, useBucket, usePresence, useRoutes, useVotes)
│   ├── lib/              # Core clients (supabase, auth, routes, gemini, categories)
│   ├── pages/            # Application views (Home.tsx, Room.tsx)
│   ├── demo/             # Offline demo mock data (seedData.ts)
│   ├── index.css         # Global tokens & Warm Midnight styling
│   └── main.tsx          # Application entrypoint
├── supabase/
│   └── migrations/       # PostgreSQL schema & idempotent RLS migrations
├── docs/                 # Architecture documents & progress logs
├── package.json          # Project dependencies & scripts
└── index.html            # HTML entrypoint & OpenGraph metadata
```

---

## 📄 License

MIT License — Built for collaborative trip planning.
