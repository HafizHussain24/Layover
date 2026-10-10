import { useState } from 'react';
import { useAuth, upsertProfile } from '../lib/auth';
import { Loader2, ArrowRight } from 'lucide-react';

const AVATAR_COLORS = [
  '#f95d0f', '#ec4899', '#8b5cf6', '#3b82f6',
  '#10b981', '#f59e0b', '#14b8a6', '#6366f1',
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
         style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}>
      <div className="glass p-8 w-full max-w-sm animate-in">

        {/* Avatar preview */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-xl transition-all"
               style={{ backgroundColor: color, boxShadow: `0 8px 24px ${color}55` }}>
            {name ? name[0].toUpperCase() : '?'}
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="font-display font-bold text-xl mb-1.5" style={{ color: '#e8e8ec' }}>
            What's your name?
          </h2>
          <p className="text-sm" style={{ color: '#6a6a76' }}>
            Your friends will see this in the room.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            id="display-name-input"
            type="text"
            placeholder="Your name — e.g. Riya"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 text-sm"
            maxLength={30}
            autoFocus
          />

          {/* Color picker */}
          <div>
            <p className="section-label mb-3">Choose a color</p>
            <div className="flex gap-2.5 flex-wrap">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  id={`color-${c.replace('#', '')}`}
                  onClick={() => setColor(c)}
                  className="w-9 h-9 rounded-xl transition-all relative"
                  style={{
                    backgroundColor: c,
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                    boxShadow: color === c ? `0 0 0 2px #141416, 0 0 0 4px ${c}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
               style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0 transition-all"
                 style={{ backgroundColor: color }}>
              {name ? name[0].toUpperCase() : '?'}
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: '#e8e8ec' }}>
                {name || 'Your Name'}
              </p>
              <p className="text-xs" style={{ color: '#4a4a54' }}>WanderRoom traveller</p>
            </div>
          </div>

          {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}

          <button
            id="save-name-btn"
            type="submit"
            className="btn btn-primary w-full"
            disabled={saving || !name.trim()}
          >
            {saving
              ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
              : <><span>Let's go</span><ArrowRight size={15} /></>
            }
          </button>
        </form>
      </div>
    </div>
  );
}
