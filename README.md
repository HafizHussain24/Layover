# WanderRoom 🗺️

> **Real-time collaborative group trip planner** — built for group trips in India.

## The Problem
Group trip planning lives in WhatsApp threads full of random Instagram links, with no geographic logic.

## The Solution
A shared room where friends drop places into a common bucket list, filter out tourist traps, build optimized routes, and vote on the best itinerary.

## Quick Start

```bash
# 1. Clone and install
npm install

# 2. Set up environment
cp .env.example .env.local
# Fill in the four variables — see MANUAL BREAK 1 in docs/MASTER_DOC.md

# 3. Run the SQL migration
# Open Supabase > SQL Editor and run supabase/migrations/001_init.sql

# 4. Start dev server
npm run dev
```

## Tech Stack
- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind CSS (dark mode, mobile-first)
- **Backend**: Supabase (Postgres, Realtime, Presence, Anonymous Auth)
- **Maps**: @vis.gl/react-google-maps + Places API (New) + Routes API
- **Deploy**: Vercel

## Features
- 🗺️ Map-based place discovery with real ratings
- ⚡ Real-time multiplayer (see places added instantly)
- 💎 Hidden Gems filter (high rating, low crowds)
- 🧭 Route builder with Google Routes API optimization
- 🗳️ Group voting with live vote counts
- 📱 WhatsApp share button
- 🎭 Demo mode (`?demo=1`) — works offline for pitches

## Environment Variables
See `.env.example` for required variables.

## What's Real vs Mocked
> See `docs/PROGRESS_LOG.md` → "Mocked / fake" section for the current list.

## License
MIT — Hackathon build.
