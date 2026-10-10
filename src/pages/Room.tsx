import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { APIProvider } from '@vis.gl/react-google-maps';
import { supabase } from '../lib/supabase';
import { useRoom } from '../hooks/useRoom';
import { useBucket } from '../hooks/useBucket';
import { usePresence } from '../hooks/usePresence';
import DisplayNamePrompt from '../components/DisplayNamePrompt';
import MapComponent from '../components/MapComponent';
import SearchBar, { type PlacePreview } from '../components/SearchBar';
import BucketList from '../components/BucketList';
import PresenceBar from '../components/PresenceBar';
import ShareButton from '../components/ShareButton';

// Phase 1: layout shell. Map, BucketList, etc. wired in Phase 2+.

export default function Room() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const { room, loading: roomLoading, error: roomError } = useRoom(id);
  const { items: bucketItems, loading: bucketLoading, removeItem } = useBucket(id);
  const presentUsers = usePresence(id, profile);
  const [showPrompt, setShowPrompt] = useState(false);
  const [addingPlace, setAddingPlace] = useState(false);
  const [showHiddenGems, setShowHiddenGems] = useState(false);
  const isDemo = new URLSearchParams(window.location.search).get('demo') === '1';
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const filteredBucket = showHiddenGems
    ? bucketItems.filter(i => (i.rating ?? 0) >= 4.5 && (i.review_count ?? 0) > 0 && (i.review_count ?? 0) < 1000)
    : bucketItems;

  // Once auth loads, show prompt if no profile yet
  useEffect(() => {
    if (!authLoading && !profile) {
      setShowPrompt(true);
    }
  }, [authLoading, profile]);


  const handleAddPlace = async (place: PlacePreview) => {
    if (!room || !user || isDemo) return;
    setAddingPlace(true);
    try {
      const { error } = await supabase.from('bucket_locations').insert({
        room_id: room.id,
        added_by: user.id,
        place_id: place.place_id,
        name: place.name,
        address: place.address,
        category: place.category,
        lat: place.lat,
        lng: place.lng,
        rating: place.rating,
        review_count: place.review_count
      });
      if (error && error.code !== '23505') { // ignore unique violation (already added)
        console.error('Error adding place:', error.message);
      }
    } finally {
      setAddingPlace(false);
    }
  };

  if (authLoading || roomLoading || bucketLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" style={{ width: 32, height: 32 }} />
          <p className="text-slate-400 text-sm">Loading room...</p>
        </div>
      </div>
    );
  }

  if (roomError || (!room && !isDemo)) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="glass p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">🗺️</div>
          <h2 className="text-xl font-bold text-white mb-2">Room not found</h2>
          <p className="text-slate-400 text-sm mb-6">{roomError ?? 'This room doesn\'t exist.'}</p>
          <Link to="/" className="btn btn-primary">← Back to Home</Link>
        </div>
      </div>
    );
  }

  const roomName = isDemo ? 'Kochi Weekend 🌴 [DEMO]' : room?.name ?? '';

  return (
    <APIProvider apiKey={mapsApiKey}>
      {showPrompt && !isDemo && (
        <DisplayNamePrompt onComplete={() => setShowPrompt(false)} />
      )}

      {/* App shell */}
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 z-20"
                style={{ background: 'rgba(15,15,26,0.95)', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-slate-400 hover:text-white transition-colors text-lg" title="Home">
              ✈️
            </Link>
            <div>
              <h1 className="text-white font-bold text-base leading-tight truncate max-w-[180px] sm:max-w-none">
                {roomName}
              </h1>
              {isDemo && <span className="demo-badge">demo data</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div id="presence-bar-slot" className="hidden sm:flex items-center gap-1">
              <PresenceBar users={presentUsers} />
            </div>
            <div id="share-btn-slot">
              <ShareButton roomName={roomName} />
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Map area — takes full screen on mobile, left side on desktop */}
          <div id="map-slot" className="flex-1 relative bg-slate-900">
            <MapComponent items={filteredBucket} />
          </div>

          {/* Side panel — desktop only; becomes bottom sheet on mobile (Phase 5) */}
          <aside
            id="side-panel"
            className="hidden md:flex flex-col w-96 flex-shrink-0 overflow-y-auto"
            style={{ background: 'var(--color-surface-1)', borderLeft: '1px solid rgba(99,102,241,0.12)' }}
          >
            {/* SearchBar slot (Phase 2) */}
            <div id="search-bar-slot" className="p-4 border-b border-slate-800/60 relative z-10 flex flex-col gap-3">
              <SearchBar onAddPlace={handleAddPlace} adding={addingPlace} />
              
              {/* Hidden Gem Toggle */}
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs text-slate-400 group-hover:text-white transition-colors">💎 Show Hidden Gems</span>
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={showHiddenGems}
                  onChange={e => setShowHiddenGems(e.target.checked)}
                />
                <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500 relative"></div>
              </label>
            </div>

            {/* BucketList slot (Phase 2) */}
            <div id="bucket-list-slot" className="flex-1 overflow-y-auto relative z-0">
              <BucketList items={filteredBucket} onRemove={removeItem} />
            </div>

            {/* RouteBuilder slot (Phase 4) */}
            <div id="route-builder-slot" className="border-t border-slate-800/60 p-4">
              <p className="text-slate-700 text-xs text-center">Route builder — Phase 4</p>
            </div>
          </aside>
        </div>

        {/* Mobile bottom sheet (Phase 5 enhancement) */}
        <div id="mobile-sheet"
             className="md:hidden flex-shrink-0 h-48 overflow-y-auto"
             style={{ background: 'var(--color-surface-1)', borderTop: '1px solid rgba(99,102,241,0.15)' }}>
          <p className="text-slate-600 text-xs text-center py-4">
            Bucket list — mobile view loads in Phase 2
          </p>
        </div>
      </div>
    </APIProvider>
  );
}
