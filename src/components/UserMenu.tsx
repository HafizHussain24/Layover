import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import AuthModal from './AuthModal';
import MyTripsModal from './MyTripsModal';
import { LogOut, User as UserIcon, Compass, CheckCircle2, ChevronDown } from 'lucide-react';

interface UserMenuProps {
  inRoom?: boolean;
}

export default function UserMenu({ inRoom = false }: UserMenuProps) {
  const { user, profile, isAnonymous, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [tripsModalOpen, setTripsModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
  };

  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Traveler';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const avatarColor = profile?.avatar_color || '#f95d0f';

  const currentRoomId = inRoom ? window.location.pathname.replace('/room/', '') : undefined;

  return (
    <>
      <div className="relative inline-block text-left" ref={menuRef}>
        {isAnonymous || !user ? (
          // Guest mode button
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTripsModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all hover:bg-white/5 border border-white/10 text-neutral-300 hover:text-white"
              title="View your saved trips"
            >
              <Compass size={13} style={{ color: '#f95d0f' }} />
              <span className="hidden sm:inline">Trips</span>
            </button>

            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#e8e8ec',
              }}
              title={inRoom ? 'Link Google to save this trip' : 'Sign In with Google or Email'}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: avatarColor }}
              >
                {displayName ? displayName[0].toUpperCase() : <UserIcon size={11} />}
              </div>
              <span className="hidden sm:inline text-xs">
                {inRoom ? 'Save Trip' : 'Sign In'}
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"
                style={{ backgroundColor: '#f95d0f' }}
              />
            </button>
          </div>
        ) : (
          // Logged-in authenticated user button
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-full transition-all hover:bg-white/5 border border-white/10 cursor-pointer"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-brand-500/50"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm"
                style={{ backgroundColor: avatarColor }}
              >
                {displayName[0].toUpperCase()}
              </div>
            )}
            <span className="hidden sm:inline text-xs font-medium max-w-[110px] truncate" style={{ color: '#e8e8ec' }}>
              {displayName}
            </span>
            <ChevronDown size={13} className="text-neutral-400" />
          </button>
        )}

        {/* Dropdown Menu for Authenticated Users */}
        {menuOpen && !isAnonymous && user && (
          <div
            className="absolute right-0 mt-2 w-64 rounded-2xl glass shadow-2xl border border-white/10 z-50 p-2 animate-in origin-top-right"
            style={{ backdropFilter: 'blur(16px)', background: 'rgba(20, 20, 24, 0.96)' }}
          >
            {/* User Profile Card */}
            <div className="p-3 border-b border-white/10 flex items-center gap-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-brand-500/40"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: avatarColor }}
                >
                  {displayName[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold truncate text-neutral-100">{displayName}</p>
                  <span title="Verified Account" className="inline-flex">
                    <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                  </span>
                </div>
                <p className="text-[11px] truncate text-neutral-400">{user.email}</p>
              </div>
            </div>

            {/* Navigation options */}
            <div className="py-1">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setTripsModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <Compass size={14} className="text-brand-400" style={{ color: '#f95d0f' }} />
                <span>My Trips</span>
              </button>
            </div>

            {/* Sign out */}
            <div className="pt-1 border-t border-white/10">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Auth Modal when Guest wants to connect or sign in */}
      <AuthModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        isLinking={inRoom && isAnonymous}
        customRedirectPath={inRoom ? window.location.pathname : '/'}
      />

      {/* My Trips Modal */}
      <MyTripsModal
        isOpen={tripsModalOpen}
        onClose={() => setTripsModalOpen(false)}
        currentRoomId={currentRoomId}
      />
    </>
  );
}
