import type { Profile } from '../lib/types';

export default function PresenceBar({ users }: { users: Profile[] }) {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center -space-x-2">
      {users.slice(0, 5).map((u) => (
        <div
          key={u.id}
          className="relative group hover:z-30"
        >
          <div
            className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-bold text-white cursor-default shadow-md hover:z-10 transition-transform hover:scale-110 relative z-0"
            style={{
              background: u.avatar_color ?? '#f95d0f',
              borderColor: 'var(--color-surface-1)',
              boxShadow: `0 0 0 1px ${u.avatar_color ?? '#f95d0f'}44`,
            }}
          >
            {u.display_name.charAt(0).toUpperCase()}
          </div>
          {/* Tooltip */}
          <div
            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 pointer-events-none hidden group-hover:flex items-center z-50 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium shadow-2xl transition-all"
            style={{
              background: 'var(--color-surface-3)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#f4f4f6',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.4)',
            }}
          >
            {/* Arrow notch pointing up */}
            <div
              className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 pointer-events-none"
              style={{
                background: 'var(--color-surface-3)',
                borderLeft: '1px solid rgba(255,255,255,0.12)',
                borderTop: '1px solid rgba(255,255,255,0.12)',
              }}
            />
            <span className="relative z-10">{u.display_name}</span>
          </div>
        </div>
      ))}
      {users.length > 5 && (
        <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-bold text-white shadow-md"
             style={{ background: 'var(--color-surface-3)', borderColor: 'var(--color-surface-1)', color: '#6a6a76' }}>
          +{users.length - 5}
        </div>
      )}
    </div>
  );
}
