import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { createRoom, deleteRoom } from '../hooks/useRoom';
import { supabase } from '../lib/supabase';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import UserMenu from '../components/UserMenu';
import {
  MapPin, Users, Globe, ArrowRight, Loader2,
  X, Check, Compass, Zap, Route, Star, Clock, Trash2,
} from 'lucide-react';

interface SavedTrip {
  id: string;
  name: string;
  destination?: string | null;
  created_at?: string;
  visitedAt?: number;
}

export default function Home() {
  const { user, profile, isAnonymous, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saved / recent trips
  const [myTrips, setMyTrips] = useState<SavedTrip[]>([]);

  // Optional trip destination at room creation
  const placesLib = useMapsLibrary('places');
  const [destQuery, setDestQuery] = useState('');
  const [selectedDest, setSelectedDest] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [destSuggestions, setDestSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);

  // Load saved trips from localStorage and Supabase
  useEffect(() => {
    const loadTrips = async () => {
      const tripsMap = new Map<string, SavedTrip>();

      // 1. Load from localStorage (recent visits)
      try {
        const stored = localStorage.getItem('waymark_recent_trips');
        if (stored) {
          const parsed: SavedTrip[] = JSON.parse(stored);
          parsed.forEach((t) => {
            if (t.id && t.name) tripsMap.set(t.id, t);
          });
        }
      } catch (_) {}

      // 2. If user is authenticated, query their created rooms from Supabase
      if (user && !isAnonymous) {
        try {
          const { data } = await supabase
            .from('rooms')
            .select('id, name, destination_name, created_at')
            .eq('created_by', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

          if (data) {
            data.forEach((r) => {
              tripsMap.set(r.id, {
                id: r.id,
                name: r.name,
                destination: r.destination_name,
                created_at: r.created_at,
              });
            });
          }
        } catch (_) {}
      }

      setMyTrips(Array.from(tripsMap.values()));
    };

    loadTrips();
  }, [user, isAnonymous]);

  const handleDeleteTripFromHome = async (e: React.MouseEvent, tripId: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this trip? This will permanently remove it from your trips.')) return;
    try {
      await deleteRoom(tripId);
      setMyTrips((prev) => prev.filter((t) => t.id !== tripId));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleDestInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDestQuery(val);
    if (!placesLib || !val.trim()) { setDestSuggestions([]); return; }
    try {
      const res = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: val,
        includedPrimaryTypes: ['locality', 'administrative_area_level_1', 'administrative_area_level_2', 'country', 'postal_town'],
      });
      setDestSuggestions(res.suggestions || []);
    } catch (_) {
      try {
        const fb = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: val });
        setDestSuggestions(fb.suggestions || []);
      } catch { setDestSuggestions([]); }
    }
  };

  const handleSelectDest = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    if (!placesLib || !suggestion.placePrediction) return;
    try {
      const place = new placesLib.Place({ id: suggestion.placePrediction.placeId });
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
      const name = place.displayName || suggestion.placePrediction.text.text;
      const lat = place.location?.lat();
      const lng = place.location?.lng();
      if (typeof lat === 'number' && typeof lng === 'number') setSelectedDest({ name, lat, lng });
      setDestQuery('');
      setDestSuggestions([]);
    } catch (err) { console.error('Failed to select destination:', err); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !user) return;
    setCreating(true);
    setError(null);
    try {
      const id = await createRoom(roomName.trim(), user.id, selectedDest || undefined);
      navigate(`/room/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const id = joinId.trim().replace(/.*\/room\//, '');
    if (!id) return;
    navigate(`/room/${id}`);
  };

  return (
    <main className="home-bg min-h-screen flex flex-col relative overflow-hidden">
      {/* Subtle glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #f95d0f, transparent 70%)' }} />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-6"
             style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }} />
      </div>

      {/* ── Top Header Navigation ────────────────────────────── */}
      <header className="w-full flex items-center justify-between px-6 py-4 z-20 max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #ff7a38, #f95d0f)',
              boxShadow: '0 4px 16px rgba(249,93,15,0.3)',
            }}
          >
            <Compass size={18} color="white" />
          </div>
          <span className="font-display font-bold text-lg text-neutral-100 tracking-tight">WayMark</span>
        </div>
        <UserMenu inRoom={false} />
      </header>

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-4 py-8 md:py-12">

        {/* ── Logo + tagline ──────────────────────────────── */}
        <div className="text-center mb-10 animate-in">
          {/* Logo mark */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-2xl"
               style={{ background: 'linear-gradient(135deg, #ff7a38, #f95d0f)', boxShadow: '0 8px 32px rgba(249,93,15,0.4)' }}>
            <Compass size={30} color="white" strokeWidth={2} />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
               style={{ background: 'rgba(249,93,15,0.1)', border: '1px solid rgba(249,93,15,0.2)' }}>
            <Zap size={12} className="text-brand" style={{ color: '#ff9a5c' }} />
            <span className="text-xs font-semibold" style={{ color: '#ff9a5c', letterSpacing: '0.04em' }}>
              Real-time group trip planning
            </span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl font-extrabold mb-4 gradient-text tracking-tight">
            WayMark
          </h1>
          <p className="text-lg max-w-sm mx-auto leading-relaxed" style={{ color: '#6a6a76' }}>
            Drop places, build routes,{' '}
            <span style={{ color: '#c8c8d0' }}>vote together.</span>
          </p>
        </div>

        {/* ── Feature pills ──────────────────────────────── */}
        <div className="flex items-center gap-3 mb-8 flex-wrap justify-center animate-in" style={{ animationDelay: '0.05s' }}>
          {[
            { icon: <Users size={12} />, label: 'Multiplayer' },
            { icon: <Route size={12} />, label: 'Route Builder' },
            { icon: <Star size={12} />, label: 'AI Travel Scout' },
            { icon: <Globe size={12} />, label: 'Share via WhatsApp' },
          ].map(f => (
            <span key={f.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#6a6a76' }}>
              <span style={{ color: '#4a4a54' }}>{f.icon}</span>
              {f.label}
            </span>
          ))}
        </div>

        {/* ── Cards container ─────────────────────────────── */}
        <div className="w-full max-w-[420px] space-y-3 animate-in" style={{ animationDelay: '0.1s' }}>

          {/* Create Room */}
          <div className="glass p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ background: 'rgba(249,93,15,0.15)', border: '1px solid rgba(249,93,15,0.25)' }}>
                <Globe size={15} style={{ color: '#ff9a5c' }} />
              </div>
              <h2 className="font-display font-bold text-base" style={{ color: '#e8e8ec' }}>
                Create a Room
              </h2>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              {/* Room name */}
              <input
                id="room-name-input"
                type="text"
                placeholder="e.g. Kochi Weekend"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-4 py-3 text-sm"
                maxLength={60}
                disabled={creating || !user}
              />

              {/* Destination */}
              <div className="relative">
                {selectedDest ? (
                  <div className="flex items-center justify-between px-3.5 py-3 rounded-[10px] text-xs"
                       style={{ background: 'rgba(249,93,15,0.08)', border: '1.5px solid rgba(249,93,15,0.25)' }}>
                    <div className="flex items-center gap-2.5">
                      <MapPin size={13} style={{ color: '#f95d0f', flexShrink: 0 }} />
                      <span className="font-semibold truncate" style={{ color: '#e8e8ec' }}>{selectedDest.name}</span>
                    </div>
                    <button type="button" onClick={() => setSelectedDest(null)}
                            className="p-1 rounded transition-colors"
                            style={{ color: '#6a6a76' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#e8e8ec')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#6a6a76')}>
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <MapPin size={13} style={{ color: '#4a4a54' }} />
                    </div>
                    <input
                      type="text"
                      placeholder="Destination city (optional) — e.g. Tokyo"
                      value={destQuery}
                      onChange={handleDestInputChange}
                      className="w-full pl-9 pr-4 py-3 text-xs"
                      disabled={creating || !user}
                    />
                    {destSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 autocomplete-dropdown z-30 max-h-52 overflow-y-auto">
                        {destSuggestions.map((s, i) => (
                          <button key={s.placePrediction?.placeId || i} type="button"
                                  onClick={() => handleSelectDest(s)}
                                  className="autocomplete-item w-full text-left">
                            <Globe size={13} style={{ color: '#4a4a54', flexShrink: 0 }} />
                            <span className="text-xs truncate" style={{ color: '#e8e8ec' }}>
                              {s.placePrediction?.text.text}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status messages */}
              {authLoading && (
                <p className="text-xs flex items-center gap-2" style={{ color: '#6a6a76' }}>
                  <Loader2 size={12} className="animate-spin" style={{ color: '#f95d0f' }} />
                  Connecting…
                </p>
              )}
              {!authLoading && !user && (
                <p className="text-xs flex items-center gap-2" style={{ color: '#f87171' }}>
                  <X size={12} />
                  Connection failed. Enable Anonymous Sign-ins in Supabase.
                </p>
              )}
              {!authLoading && user && !profile && (
                <p className="text-xs" style={{ color: '#6a6a76' }}>
                  You'll choose your display name when you enter the room.
                </p>
              )}
              {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}

              <button id="create-room-btn" type="submit"
                      className="btn btn-primary w-full"
                      disabled={creating || authLoading || !user || !roomName.trim()}>
                {creating ? (
                  <><Loader2 size={15} className="animate-spin" /> Creating…</>
                ) : (
                  <><span>Create Room</span><ArrowRight size={15} /></>
                )}
              </button>
            </form>
          </div>

          {/* Divider */}
          <div className="divider text-xs font-medium" style={{ color: '#3a3a42' }}>
            or join an existing room
          </div>

          {/* Join Room */}
          <div className="glass p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <Users size={15} style={{ color: '#c4b5fd' }} />
              </div>
              <h2 className="font-display font-bold text-base" style={{ color: '#e8e8ec' }}>
                Join by Link or ID
              </h2>
            </div>
            <form onSubmit={handleJoin} className="space-y-3">
              <input
                id="join-room-input"
                type="text"
                placeholder="Paste room link or ID…"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                className="w-full px-4 py-3 text-sm"
              />
              <button id="join-room-btn" type="submit"
                      className="btn btn-secondary w-full"
                      disabled={!joinId.trim()}>
                Join Room
                <ArrowRight size={15} />
              </button>
            </form>
          </div>

          {/* ── My Trips Section (if any trips recorded) ───────────── */}
          {myTrips.length > 0 && (
            <div className="glass p-5 rounded-2xl border border-white/10 space-y-3 animate-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(249,93,15,0.15)' }}
                  >
                    <Clock size={13} style={{ color: '#ff9a5c' }} />
                  </div>
                  <h3 className="font-display font-bold text-sm text-neutral-100">Your Trips</h3>
                </div>
                <span className="text-[11px] text-neutral-400">{myTrips.length} saved</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {myTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-brand-500/30 transition-all text-left group"
                  >
                    <div
                      className="min-w-0 flex-1 pr-3 cursor-pointer"
                      onClick={() => navigate(`/room/${trip.id}`)}
                    >
                      <p className="font-semibold text-xs text-neutral-200 group-hover:text-white truncate">
                        {trip.name}
                      </p>
                      {trip.destination && (
                        <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin size={10} style={{ color: '#f95d0f' }} />
                          {trip.destination}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTripFromHome(e, trip.id)}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Delete trip"
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/room/${trip.id}`)}
                        className="p-1.5 rounded-lg text-neutral-400 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all cursor-pointer"
                        title="Open trip"
                      >
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Demo link */}
          <p className="text-center text-xs" style={{ color: '#4a4a54' }}>
            No account needed.{' '}
            <a href="/room/demo?demo=1"
               className="underline transition-colors"
               style={{ color: '#6a6a76' }}
               onMouseEnter={e => (e.currentTarget.style.color = '#c8c8d0')}
               onMouseLeave={e => (e.currentTarget.style.color = '#6a6a76')}>
              Try the demo room
            </a>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center py-5">
        <p className="text-xs flex items-center justify-center gap-1.5" style={{ color: '#3a3a42' }}>
          <Check size={11} style={{ color: '#4a4a54' }} />
          Built for group trips • WayMark
        </p>
      </footer>
    </main>
  );
}
