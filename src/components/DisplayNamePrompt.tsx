import { useState } from 'react';
import { useAuth, upsertProfile } from '../lib/auth';

const AVATAR_COLORS = [
  '#6366f1', '#ec4899', '#f97316', '#22c55e',
  '#14b8a6', '#a78bfa', '#eab308', '#3b82f6',
];

interface DisplayNamePromptProps {
  onComplete: () => void;
}

export default function DisplayNamePrompt({ onComplete }: DisplayNamePromptProps) {
  const { user, setProfile } = useAuth();
  const [name, setName] = useState('');
  const [color, setColor] = useState(AVATAR_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    setSaving(true);
    setError(null);
    try {
      const p = await upsertProfile(user.id, name.trim(), color);
      setProfile(p);
      onComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save name');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
         style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="glass p-8 w-full max-w-sm animate-in">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">👋</div>
          <h2 className="text-xl font-bold text-white">What's your name?</h2>
          <p className="text-slate-400 text-sm mt-1">Your friends will see this in the room.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            id="display-name-input"
            type="text"
            placeholder="Your name (e.g. Riya)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 text-sm"
            style={{ borderRadius: '0.625rem' }}
            maxLength={30}
            autoFocus
          />

          {/* Color picker */}
          <div>
            <p className="text-xs text-slate-500 mb-2">Pick a color</p>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  id={`color-${c.replace('#', '')}`}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-transform border-2"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? 'white' : 'transparent',
                    transform: color === c ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Avatar preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl"
               style={{ background: 'rgba(99,102,241,0.08)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                 style={{ backgroundColor: color }}>
              {name ? name[0].toUpperCase() : '?'}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{name || 'Your Name'}</p>
              <p className="text-slate-500 text-xs">WanderRoom member</p>
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            id="save-name-btn"
            type="submit"
            className="btn btn-primary w-full"
            disabled={saving || !name.trim()}
          >
            {saving ? <><span className="spinner" /> Saving...</> : 'Let\'s go →'}
          </button>
        </form>
      </div>
    </div>
  );
}
