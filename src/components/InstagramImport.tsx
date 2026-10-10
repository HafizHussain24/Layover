export default function InstagramImport() {
  return (
    <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-800/60 p-4 shrink-0 bg-surface-1">
      <h3 className="font-bold text-white text-sm">📸 Import from Instagram</h3>
      <p className="text-xs text-slate-400">
        Paste a Reel URL to extract places using AI.
      </p>
      <div className="flex items-center gap-2 mt-1">
        <input 
          type="text" 
          placeholder="https://instagram.com/reel/..." 
          className="flex-1 bg-slate-800 border border-slate-700 text-white text-xs rounded p-2 outline-none opacity-50 cursor-not-allowed"
          disabled
        />
        <button 
          disabled
          className="btn btn-primary !py-2 !px-3 text-xs opacity-50 cursor-not-allowed whitespace-nowrap"
        >
          Import
        </button>
      </div>
      <p className="text-[10px] text-pink-400 font-bold uppercase tracking-wider text-right">
        Coming Soon
      </p>
    </div>
  );
}
