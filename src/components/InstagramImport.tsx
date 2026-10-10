import { Lock } from 'lucide-react';

function InstagramIcon({ size = 14, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function InstagramImport() {
  return (
    <div className="p-4 border-t shrink-0"
         style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'var(--color-surface-1)' }}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
             style={{ background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.2)' }}>
          <InstagramIcon size={14} style={{ color: '#f472b6' }} />
        </div>
        <div>
          <h3 className="font-semibold text-xs" style={{ color: '#e8e8ec' }}>Import from Instagram</h3>
        </div>
        <span className="ml-auto flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(244,114,182,0.12)', color: '#f472b6', border: '1px solid rgba(244,114,182,0.2)' }}>
          <Lock size={8} />
          Coming Soon
        </span>
      </div>
      <p className="text-xs mb-3" style={{ color: '#4a4a54' }}>
        Paste a Reel URL to extract places using AI.
      </p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="https://instagram.com/reel/…"
          className="flex-1 text-xs px-3 py-2 rounded-lg opacity-40 cursor-not-allowed"
          disabled
        />
        <button disabled
                className="btn btn-primary !py-2 !px-3 text-xs opacity-40 cursor-not-allowed">
          Import
        </button>
      </div>
    </div>
  );
}
