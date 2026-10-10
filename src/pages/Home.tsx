import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { createRoom } from '../hooks/useRoom';

export default function Home() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !user) return;
    setCreating(true);
    setError(null);
    try {
      const id = await createRoom(roomName.trim(), user.id);
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
