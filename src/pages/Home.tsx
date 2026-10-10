import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { createRoom } from '../hooks/useRoom';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

export default function Home() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Optional trip destination at room creation
  const placesLib = useMapsLibrary('places');
  const [destQuery, setDestQuery] = useState('');
  const [selectedDest, setSelectedDest] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [destSuggestions, setDestSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);

  const handleDestInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDestQuery(val);
    if (!placesLib || !val.trim()) {
      setDestSuggestions([]);
      return;
    }

    try {
      const res = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: val,
        includedPrimaryTypes: ['locality', 'administrative_area_level_1', 'administrative_area_level_2', 'country', 'postal_town'],
      });
      setDestSuggestions(res.suggestions || []);
    } catch (_) {
      try {
        const fallback = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: val });
        setDestSuggestions(fallback.suggestions || []);
      } catch {
        setDestSuggestions([]);
      }
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
      if (typeof lat === 'number' && typeof lng === 'number') {
        setSelectedDest({ name, lat, lng });
      }
      setDestQuery('');
      setDestSuggestions([]);
    } catch (err) {
      console.error('Failed to select destination:', err);
    }
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
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
          style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #16162a 50%, #1a1030 100%)' }}>
      {/* Hero */}
      <div className="text-center mb-12 animate-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
             style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
          <span className="text-lg">✈️</span>
          <span className="text-sm font-semibold text-indigo-300 tracking-wide">Group Trip Planner</span>
        </div>
        <h1 className="text-5xl font-extrabold mb-4 gradient-text">WanderRoom</h1>
        <p className="text-slate-400 text-lg max-w-md mx-auto leading-relaxed">
          Drop places, build routes, vote together.
          <br />
          <span className="text-indigo-300">Real-time group trip planning.</span>
        </p>
      </div>

      {/* Cards */}
      <div className="w-full max-w-md space-y-4 animate-in" style={{ animationDelay: '0.1s' }}>
        {/* Create Room */}
        <div className="glass p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>🗺️</span> Create a Room
          </h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              id="room-name-input"
              type="text"
              placeholder="e.g. Kochi Weekend 🌴"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-4 py-3 text-sm"
              style={{ borderRadius: '0.625rem' }}
              maxLength={60}
              disabled={creating || !user}
            />

            {/* Trip Destination (Optional) */}
            <div className="relative">
              {selectedDest ? (
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-indigo-950/60 border border-indigo-500/40 rounded-[0.625rem] text-xs text-white">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">📍</span>
                    <span className="font-semibold truncate">{selectedDest.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDest(null)}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                    title="Remove destination"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="📍 Destination (e.g. Kozhikode, Tokyo) - optional"
                    value={destQuery}
                    onChange={handleDestInputChange}
                    className="w-full px-4 py-2.5 text-xs bg-slate-900/60 border border-slate-700/60 rounded-[0.625rem] text-white placeholder-slate-500 outline-none focus:border-indigo-500/60 transition-colors"
                    disabled={creating || !user}
                  />
                  {destSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl overflow-hidden z-30 max-h-48 overflow-y-auto">
                      {destSuggestions.map((s, i) => (
                        <button
                          key={s.placePrediction?.placeId || i}
                          type="button"
                          onClick={() => handleSelectDest(s)}
                          className="w-full text-left px-3 py-2.5 hover:bg-indigo-600/20 border-b border-slate-800 last:border-b-0 text-xs flex items-center gap-2.5 text-white transition-colors group"
                        >
                          <span className="opacity-60 group-hover:opacity-100">🏙️</span>
                          <span className="truncate">{s.placePrediction?.text.text}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {authLoading && (
              <p className="text-xs text-indigo-300 flex items-center gap-1">
                <span className="spinner w-3 h-3 border-2 border-indigo-300 border-t-transparent" /> Connecting to server...
              </p>
            )}
            {!authLoading && !user && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <span>❌</span> Connection failed. Did you enable Anonymous Sign-ins in Supabase?
              </p>
            )}
            {!authLoading && user && !profile && (
              <p className="text-xs text-amber-400 flex items-center gap-1">
                <span>⚠️</span> You'll be asked for your name when you enter the room.
              </p>
            )}
            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}
            <button
              id="create-room-btn"
              type="submit"
              className="btn btn-primary w-full"
              disabled={creating || authLoading || !user || !roomName.trim()}
            >
              {creating ? (
                <><span className="spinner" /> Creating...</>
              ) : (
                '✨ Create Room'
              )}
            </button>
          </form>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 text-slate-600">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-xs font-medium">or join one</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Join Room */}
        <div className="glass p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>🔗</span> Join by Link or ID
          </h2>
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              id="join-room-input"
              type="text"
              placeholder="Paste room link or ID..."
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              className="w-full px-4 py-3 text-sm"
              style={{ borderRadius: '0.625rem' }}
            />
            <button
              id="join-room-btn"
              type="submit"
              className="btn btn-ghost w-full"
              disabled={!joinId.trim()}
            >
              Join Room →
            </button>
          </form>
        </div>

        {/* Demo link */}
        <p className="text-center text-slate-600 text-xs">
          Want to see a demo?{' '}
          <a href="/room/demo?demo=1" className="text-indigo-400 hover:text-indigo-300 underline">
            Open the demo room
          </a>
        </p>
      </div>

      {/* Footer */}
      <p className="mt-12 text-slate-700 text-xs">
        Built for group trips in India 🇮🇳
      </p>
    </main>
  );
}
