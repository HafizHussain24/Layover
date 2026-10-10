import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { deleteRoom } from '../hooks/useRoom';
import {
  X, Compass, MapPin, ArrowRight, Trash2,
  Plus, Loader2, AlertTriangle
} from 'lucide-react';

export interface TripItem {
  id: string;
  name: string;
  destination?: string | null;
  created_at?: string;
  visitedAt?: number;
  isOwner?: boolean;
}

interface MyTripsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoomId?: string;
}

export default function MyTripsModal({ isOpen, onClose, currentRoomId }: MyTripsModalProps) {
  const { user, isAnonymous } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchTrips = async () => {
      setLoading(true);
      const tripsMap = new Map<string, TripItem>();

      // 1. Load from localStorage (recent visits)
      try {
        const stored = localStorage.getItem('waymark_recent_trips') || localStorage.getItem('wanderroom_recent_trips');
        if (stored) {
          const parsed: TripItem[] = JSON.parse(stored);
          parsed.forEach((t) => {
            if (t.id && t.name) tripsMap.set(t.id, t);
          });
        }
      } catch (_) {}

      // 2. Load from Supabase rooms if user is authenticated
      if (user && !isAnonymous) {
        try {
          const { data, error } = await supabase
            .from('rooms')
            .select('id, name, destination_name, created_at, created_by')
            .eq('created_by', user.id)
            .order('created_at', { ascending: false });

          if (!error && data) {
            data.forEach((r) => {
              tripsMap.set(r.id, {
                id: r.id,
                name: r.name,
                destination: r.destination_name,
                created_at: r.created_at,
                isOwner: true,
              });
            });
          }
        } catch (err) {
          console.warn('Could not load trips from Supabase:', err);
        }
      }

      setTrips(Array.from(tripsMap.values()));
      setLoading(false);
    };

    fetchTrips();
  }, [isOpen, user, isAnonymous]);

  if (!isOpen) return null;

  const handleOpenTrip = (id: string) => {
    onClose();
    navigate(`/room/${id}`);
  };

  const handleDeleteTrip = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteRoom(id);
      setTrips((prev) => prev.filter((t) => t.id !== id));
      setConfirmDeleteId(null);
      // If currently inside the deleted room, navigate to home
      if (currentRoomId === id) {
        onClose();
        navigate('/');
      }
    } catch (err) {
      console.error('Failed to delete trip:', err);
      // Even if database delete had an RLS constraint, remove from local storage list
      try {
        const stored = localStorage.getItem('waymark_recent_trips');
        if (stored) {
          const updated = JSON.parse(stored).filter((t: any) => t.id !== id);
          localStorage.setItem('waymark_recent_trips', JSON.stringify(updated));
        }
      } catch (_) {}
      setTrips((prev) => prev.filter((t) => t.id !== id));
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass max-w-lg w-full p-6 sm:p-7 rounded-2xl relative shadow-2xl border border-white/10 my-auto flex flex-col max-h-[85vh]">
        {/* Glow ambient accent */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-56 h-56 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f95d0f, transparent 70%)' }}
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #ff7a38, #f95d0f)',
                boxShadow: '0 4px 16px rgba(249,93,15,0.3)',
              }}
            >
              <Compass size={18} color="white" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-neutral-100">My Trips</h3>
              <p className="text-xs text-neutral-400">
                {trips.length} {trips.length === 1 ? 'trip' : 'trips'} saved
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Close"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2.5 min-h-[160px] pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-neutral-400 text-xs">
              <Loader2 size={20} className="animate-spin text-brand-500" style={{ color: '#f95d0f' }} />
              <span>Loading trips…</span>
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div
                className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-white/5 border border-white/10"
              >
                <Compass size={22} className="text-neutral-500" />
              </div>
              <p className="font-semibold text-sm text-neutral-200">No saved trips yet</p>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                Create a new trip to start saving places, building routes, and collaborating with friends.
              </p>
              <button
                onClick={() => {
                  onClose();
                  navigate('/');
                }}
                className="btn btn-primary text-xs py-2 px-4 gap-2 mx-auto inline-flex"
              >
                <Plus size={14} />
                <span>Create a Trip</span>
              </button>
            </div>
          ) : (
            trips.map((trip) => {
              const isConfirming = confirmDeleteId === trip.id;
              const isDeleting = deletingId === trip.id;
              const isCurrent = currentRoomId === trip.id;

              return (
                <div
                  key={trip.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-brand-500/10 border-brand-500/40'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/5 hover:border-white/15'
                  }`}
                >
                  {isConfirming ? (
                    <div className="flex items-center justify-between gap-3 animate-in">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle size={15} className="text-red-400 flex-shrink-0" />
                        <span className="text-xs text-red-200 truncate">Delete this trip permanently?</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/5"
                          disabled={isDeleting}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDeleteTrip(trip.id)}
                          disabled={isDeleting}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500 hover:bg-red-600 text-white flex items-center gap-1 shadow-sm"
                        >
                          {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          <span>Confirm</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() => handleOpenTrip(trip.id)}
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-xs text-neutral-100 hover:text-brand-400 transition-colors truncate">
                            {trip.name}
                          </p>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30">
                              Current
                            </span>
                          )}
                        </div>
                        {trip.destination && (
                          <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5 truncate">
                            <MapPin size={10} style={{ color: '#f95d0f' }} />
                            <span>{trip.destination}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleOpenTrip(trip.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white transition-colors flex items-center gap-1.5"
                          title="Open trip"
                        >
                          <span>Open</span>
                          <ArrowRight size={12} />
                        </button>

                        <button
                          onClick={() => setConfirmDeleteId(trip.id)}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete trip"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => {
              onClose();
              navigate('/');
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
            style={{ color: '#ff9a5c' }}
          >
            <Plus size={14} />
            <span>Create new trip</span>
          </button>

          <button
            onClick={onClose}
            className="btn btn-secondary text-xs !py-1.5 !px-3"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
