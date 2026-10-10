import type { Profile } from '../lib/types';

export default function PresenceBar({ users }: { users: Profile[] }) {
  if (users.length === 0) return null;
  
  return (
    <div className="flex items-center -space-x-2 mr-2">
      {users.slice(0, 5).map((u) => (
        <div 
          key={u.id}
          className="w-8 h-8 rounded-full border-2 border-[rgba(15,15,26,0.95)] flex items-center justify-center text-xs font-bold text-white relative group cursor-pointer shadow-md hover:z-10 transition-transform hover:scale-110"
          style={{ background: u.avatar_color ?? '#6366f1' }}
          title={u.display_name}
        >
          {u.display_name.charAt(0).toUpperCase()}
          {/* tooltip */}
          <div className="absolute top-full mt-2 hidden group-hover:block bg-slate-800 text-[10px] px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap border border-slate-700">
            {u.display_name}
          </div>
        </div>
      ))}
      {users.length > 5 && (
        <div className="w-8 h-8 rounded-full border-2 border-[rgba(15,15,26,0.95)] flex items-center justify-center text-xs font-bold text-white bg-slate-700 shadow-md">
          +{users.length - 5}
        </div>
      )}
    </div>
  );
}
