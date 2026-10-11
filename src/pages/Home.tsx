import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { createRoom, deleteRoom } from '../hooks/useRoom';
import { supabase } from '../lib/supabase';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import UserMenu from '../components/UserMenu';
import {
  Compass, MapPin, Users, Globe, ArrowRight, Loader2,
  X, Check, Zap, Route, Clock, Trash2, Sparkles,
  Share2, ThumbsUp, Car, Footprints, ShieldCheck, ChevronDown,
  ExternalLink,
} from 'lucide-react';

function InstagramIcon({ size = 16, className }: { size?: number; className?: string }) {
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
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

interface SavedTrip {
  id: string;
  name: string;
  destination?: string | null;
  created_at?: string;
  visitedAt?: number;
}

export default function Home() {
  const { user, isAnonymous, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Launcher state
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [roomName, setRoomName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saved / recent trips
  const [myTrips, setMyTrips] = useState<SavedTrip[]>([]);

  // Destination autocomplete
  const placesLib = useMapsLibrary('places');
  const [destQuery, setDestQuery] = useState('');
  const [selectedDest, setSelectedDest] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [destSuggestions, setDestSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Focus ref for room name input
  const roomInputRef = useRef<HTMLInputElement>(null);

  // Load saved trips from localStorage and Supabase
  useEffect(() => {
    const loadTrips = async () => {
      const tripsMap = new Map<string, SavedTrip>();

      // 1. Load from localStorage (recent visits)
      try {
        const stored = localStorage.getItem('waymark_recent_trips');
        if (stored) {
          const parsed: SavedTrip[] = JSON.parse(stored);
          parsed.forEach((t) => {
            if (t.id && t.name) tripsMap.set(t.id, t);
          });
        }
      } catch (_) {}

      // 2. If user is authenticated, query their created rooms from Supabase
      if (user && !isAnonymous) {
        try {
          const { data } = await supabase
            .from('rooms')
            .select('id, name, destination_name, created_at')
            .eq('created_by', user.id)
            .order('created_at', { ascending: false })
            .limit(12);

          if (data) {
            data.forEach((r) => {
              tripsMap.set(r.id, {
                id: r.id,
                name: r.name,
                destination: r.destination_name,
                created_at: r.created_at,
              });
            });
          }
        } catch (_) {}
      }

      setMyTrips(Array.from(tripsMap.values()));
    };

    loadTrips();
  }, [user, isAnonymous]);

  const handleDeleteTripFromHome = async (e: React.MouseEvent, tripId: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this trip? This will permanently remove it from your trips.')) return;
    try {
      await deleteRoom(tripId);
      setMyTrips((prev) => prev.filter((t) => t.id !== tripId));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

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
        const fb = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: val });
        setDestSuggestions(fb.suggestions || []);
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

  const scrollToLauncher = () => {
    const el = document.getElementById('trip-launcher');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setActiveTab('create');
      setTimeout(() => roomInputRef.current?.focus(), 400);
    }
  };

  const faqs = [
    {
      q: 'Do all my friends need to create an account or sign up?',
      a: 'Not at all! Anyone who opens your trip link joins instantly as an anonymous traveler with their own chosen name and colored avatar. No passwords, no credit cards, and no app installation required.',
    },
    {
      q: 'How does route optimization work?',
      a: 'WayMark connects directly to Google Maps Routes API v2. When you add 4 or more stops to a route, clicking Optimize solves the Traveling Salesperson Problem (TSP) by reordering intermediate stops to minimize overall driving or walking duration with live traffic consideration.',
    },
    {
      q: 'What is the AI Travel Scout and how are recommendations verified?',
      a: 'AI Scout is powered by Google Gemini 2.5 Flash with live Google Search Grounding. Every recommended place is grounded in verified Google Places data, allowing you to filter suggestions by real star ratings (e.g. 4.5+ stars) and review volume (<500 for hidden local gems or 1000+ for iconic landmarks).',
    },
    {
      q: 'Can we import saved places from Instagram or TikTok?',
      a: 'Yes! Simply paste any public Instagram travel reel or post link into the bucket list importer. WayMark automatically extracts the featured location and queries Google Places for exact coordinates and photos.',
    },
    {
      q: 'Is WayMark free to use?',
      a: 'Yes! WayMark is completely free for personal travel planning, group weekend getaways, and road trips.',
    },
  ];

  return (
    <div className="home-bg min-h-screen flex flex-col selection:bg-[#f95d0f]/30 selection:text-white">
      {/* Subtle background ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute -top-40 left-1/3 w-[600px] h-[600px] rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f95d0f 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -left-20 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f95d0f 0%, transparent 70%)' }}
        />
      </div>

      {/* ── Top Navigation Bar ───────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0d0d0f]/85 border-b border-white/[0.06] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo brand */}
          <a href="/" className="flex items-center gap-3 group">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-xl shadow-lg transition-transform group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #ff7a38, #f95d0f)',
                boxShadow: '0 4px 16px rgba(249,93,15,0.3)',
              }}
            >
              <Compass size={19} color="white" strokeWidth={2.2} />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-lg text-white tracking-tight leading-tight">
                WayMark
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-[#ff9a5c] uppercase leading-none">
                Group Trip Planner
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-neutral-300">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#ai-scout" className="hover:text-white transition-colors">
              AI Scout
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
            {myTrips.length > 0 && (
              <a href="#your-trips" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <span>My Trips</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/10 text-[#ff9a5c]">
                  {myTrips.length}
                </span>
              </a>
            )}
          </nav>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            <a
              href="/room/demo?demo=1"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all"
            >
              <Globe size={13} style={{ color: '#ff9a5c' }} />
              <span>Try Live Demo</span>
            </a>
            <UserMenu inRoom={false} />
          </div>
        </div>
      </header>

      {/* ── Main Landing Content ─────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col">
        {/* ── HERO SECTION ─────────────────────────────────── */}
        <section className="pt-12 pb-16 md:pt-20 md:pb-24 px-4 sm:px-6 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Value Proposition */}
            <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-6 shadow-sm"
                style={{
                  background: 'rgba(249,93,15,0.1)',
                  border: '1px solid rgba(249,93,15,0.25)',
                }}
              >
                <Zap size={13} style={{ color: '#ff9a5c' }} />
                <span className="text-xs font-bold tracking-wide text-[#ff9a5c]">
                  Real-Time Collaborative Trip Planning
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
                Group trips friends{' '}
                <span className="gradient-text">actually enjoy</span> planning.
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-neutral-400 max-w-2xl leading-relaxed mb-8">
                Drop places on a shared map, vote on what's worth the stop, generate optimal driving or walking routes, and discover verified local gems with Gemini AI — all without messy group chat debates.
              </p>

              {/* Trust points */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-xl text-left mb-8">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-400 shrink-0">
                    <Check size={13} />
                  </div>
                  <span className="text-xs font-medium text-neutral-300">No account required</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-[#f95d0f]/15 text-[#ff9a5c] shrink-0">
                    <Users size={13} />
                  </div>
                  <span className="text-xs font-medium text-neutral-300">Live multiplayer</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 col-span-2 sm:col-span-1">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-violet-500/15 text-violet-400 shrink-0">
                    <Route size={13} />
                  </div>
                  <span className="text-xs font-medium text-neutral-300">Google Routes v2</span>
                </div>
              </div>

              {/* Secondary Demo Callout */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={scrollToLauncher}
                  className="btn btn-primary text-sm px-5 py-2.5"
                >
                  <span>Start a Trip Free</span>
                  <ArrowRight size={15} />
                </button>
                <a
                  href="/room/demo?demo=1"
                  className="btn btn-ghost text-sm px-4 py-2.5 text-neutral-300 hover:text-white"
                >
                  <span>Open Demo Room</span>
                  <ExternalLink size={13} className="text-[#ff9a5c]" />
                </a>
              </div>
            </div>

            {/* Right Column: Interactive Trip Launcher Card */}
            <div id="trip-launcher" className="lg:col-span-5 w-full max-w-md mx-auto">
              <div className="bento-card p-6 sm:p-7 shadow-2xl relative border-white/10 gradient-glow-orange">
                {/* Segmented control tabs */}
                <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/5 mb-6">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('create'); setError(null); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === 'create'
                        ? 'bg-gradient-to-r from-[#ff7a38] to-[#f95d0f] text-white shadow-md'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Create New Trip
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('join'); setError(null); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === 'join'
                        ? 'bg-gradient-to-r from-[#ff7a38] to-[#f95d0f] text-white shadow-md'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Join with Code / Link
                  </button>
                </div>

                {/* ── CREATE TAB ──────────────────────────────── */}
                {activeTab === 'create' ? (
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                        Trip Name <span className="text-[#f95d0f]">*</span>
                      </label>
                      <input
                        ref={roomInputRef}
                        id="room-name-input"
                        type="text"
                        placeholder="e.g. Kyoto Food & Temples Tour"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm"
                        maxLength={60}
                        disabled={creating || !user}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                        Destination City <span className="text-neutral-500 font-normal">(optional)</span>
                      </label>
                      {selectedDest ? (
                        <div
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs"
                          style={{
                            background: 'rgba(249,93,15,0.08)',
                            border: '1.5px solid rgba(249,93,15,0.3)',
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <MapPin size={13} style={{ color: '#f95d0f', flexShrink: 0 }} />
                            <span className="font-semibold text-neutral-100 truncate">
                              {selectedDest.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedDest(null)}
                            className="p-1 rounded text-neutral-400 hover:text-white transition-colors"
                            title="Clear destination"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                            <MapPin size={14} />
                          </div>
                          <input
                            type="text"
                            placeholder="e.g. Tokyo, Paris, Barcelona…"
                            value={destQuery}
                            onChange={handleDestInputChange}
                            className="w-full pl-9 pr-3.5 py-2.5 text-xs"
                            disabled={creating || !user}
                          />
                          {destSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 autocomplete-dropdown z-30 max-h-48 overflow-y-auto">
                              {destSuggestions.map((s, i) => (
                                <button
                                  key={s.placePrediction?.placeId || i}
                                  type="button"
                                  onClick={() => handleSelectDest(s)}
                                  className="autocomplete-item w-full text-left"
                                >
                                  <Globe size={13} className="text-neutral-500 shrink-0" />
                                  <span className="text-xs text-neutral-200 truncate">
                                    {s.placePrediction?.text.text}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Auth connection status */}
                    {authLoading && (
                      <p className="text-xs flex items-center gap-2 text-neutral-400">
                        <Loader2 size={12} className="animate-spin text-[#f95d0f]" />
                        Connecting to real-time network…
                      </p>
                    )}
                    {!authLoading && !user && (
                      <p className="text-xs text-red-400 flex items-center gap-1.5">
                        <X size={12} />
                        Connection failed. Check network or reload page.
                      </p>
                    )}
                    {error && <p className="text-xs text-red-400">{error}</p>}

                    <button
                      id="create-room-btn"
                      type="submit"
                      disabled={creating || authLoading || !user || !roomName.trim()}
                      className="btn btn-primary w-full text-sm font-bold shadow-lg shadow-orange-500/20"
                    >
                      {creating ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Creating Room…
                        </>
                      ) : (
                        <>
                          <span>Create Trip Room</span>
                          <ArrowRight size={15} />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* ── JOIN TAB ────────────────────────────────── */
                  <form onSubmit={handleJoin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                        Trip Link or Room ID
                      </label>
                      <input
                        id="join-room-input"
                        type="text"
                        placeholder="Paste room link or code (e.g. 8f2a...)"
                        value={joinId}
                        onChange={(e) => setJoinId(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm"
                      />
                    </div>
                    <button
                      id="join-room-btn"
                      type="submit"
                      disabled={!joinId.trim()}
                      className="btn btn-secondary w-full text-sm font-bold"
                    >
                      <span>Join Trip Room</span>
                      <ArrowRight size={15} />
                    </button>
                  </form>
                )}

                <div className="pt-4 mt-4 border-t border-white/5 text-center">
                  <a
                    href="/room/demo?demo=1"
                    className="text-xs text-neutral-400 hover:text-white inline-flex items-center gap-1.5 transition-colors group"
                  >
                    <span>Curious first? Explore the interactive demo</span>
                    <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform text-[#ff9a5c]" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SAVED TRIPS DASHBOARD (if any exist) ─────────────── */}
        {myTrips.length > 0 && (
          <section id="your-trips" className="py-10 px-4 sm:px-6 max-w-7xl mx-auto w-full border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display font-extrabold text-2xl text-white">Your Saved Trips</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Jump right back into any trip you've created or visited</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-[#ff9a5c]">
                {myTrips.length} {myTrips.length === 1 ? 'trip' : 'trips'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTrips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => navigate(`/room/${trip.id}`)}
                  className="bento-card p-4 flex flex-col justify-between hover:border-brand-500/40 cursor-pointer group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#f95d0f]/15 text-[#ff9a5c] shrink-0">
                        <Compass size={16} />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTripFromHome(e, trip.id)}
                        className="p-1 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete trip"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <h3 className="font-display font-bold text-base text-neutral-100 group-hover:text-white truncate">
                      {trip.name}
                    </h3>
                    {trip.destination && (
                      <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-1 truncate">
                        <MapPin size={11} className="text-[#f95d0f] shrink-0" />
                        <span>{trip.destination}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-4 border-t border-white/5 text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      <span>{trip.created_at ? new Date(trip.created_at).toLocaleDateString() : 'Recent visit'}</span>
                    </span>
                    <span className="font-semibold text-[#ff9a5c] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Open Room <ArrowRight size={11} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── VISUAL APP SHOWCASE ──────────────────────────────── */}
        <section className="py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="section-label text-[#ff9a5c]">Live Interactive Canvas</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mt-2">
              Everything your group needs in one view.
            </h2>
            <p className="text-sm sm:text-base text-neutral-400 mt-3">
              No tabs back-and-forth between chat and maps. Real-time bucket lists, consensus upvotes, and optimized routes living side by side.
            </p>
          </div>

          {/* Simulated App Window Mockup */}
          <div className="bento-card overflow-hidden shadow-2xl border-white/10 max-w-5xl mx-auto">
            {/* Window title bar */}
            <div className="px-4 py-3 bg-[#151518] border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="text-xs font-semibold text-neutral-400 ml-2 hidden sm:inline">
                  WayMark — Tokyo Weekend Adventure
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-semibold text-emerald-400">4 travelers live</span>
                <div className="flex -space-x-1.5 ml-2">
                  <div className="w-5 h-5 rounded-full bg-[#f95d0f] text-white text-[9px] font-bold flex items-center justify-center border border-[#151518]">
                    Y
                  </div>
                  <div className="w-5 h-5 rounded-full bg-purple-500 text-white text-[9px] font-bold flex items-center justify-center border border-[#151518]">
                    A
                  </div>
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center border border-[#151518]">
                    S
                  </div>
                  <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center border border-[#151518]">
                    K
                  </div>
                </div>
              </div>
            </div>

            {/* Mock split screen body */}
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[360px] bg-[#0f0f12]">
              {/* Mock Sidebar */}
              <div className="md:col-span-5 p-4 border-r border-white/5 flex flex-col gap-3 bg-[#141417]">
                {/* Mock Tab bar */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04]">
                  <span className="flex-1 py-1 text-center text-[11px] font-bold text-white bg-[#f95d0f]/20 rounded-lg border border-[#f95d0f]/40">
                    Bucket List (8)
                  </span>
                  <span className="flex-1 py-1 text-center text-[11px] font-medium text-neutral-400">
                    Routes (2)
                  </span>
                  <span className="flex-1 py-1 text-center text-[11px] font-medium text-neutral-400">
                    AI Scout
                  </span>
                </div>

                {/* Mock Bucket Items */}
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-xs font-bold text-neutral-100 truncate">Tsukiji Outer Market</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Food & Markets • ★ 4.7</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f95d0f]/20 text-[#ff9a5c] border border-[#f95d0f]/40 flex items-center gap-1 shrink-0">
                      <ThumbsUp size={10} /> 4 votes
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <span className="text-xs font-bold text-neutral-100 truncate">Senso-ji Temple</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Attraction • ★ 4.6</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-neutral-300 border border-white/10 flex items-center gap-1 shrink-0">
                      <ThumbsUp size={10} /> 3 votes
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs font-bold text-neutral-100 truncate">Fuglen Tokyo</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Specialty Cafe • ★ 4.5</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-neutral-300 border border-white/10 flex items-center gap-1 shrink-0">
                      <ThumbsUp size={10} /> 2 votes
                    </span>
                  </div>
                </div>
              </div>

              {/* Mock Map Canvas */}
              <div className="md:col-span-7 p-6 relative flex flex-col justify-between overflow-hidden bg-radial from-[#1e1e24] to-[#0c0c0e]">
                {/* Floating Map Route Indicators */}
                <div className="flex items-center justify-between z-10">
                  <div className="px-3 py-1.5 rounded-full bg-[#1c1c20]/90 border border-white/10 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-1.5 shadow-lg">
                    <Car size={13} className="text-[#ff9a5c]" />
                    <span>Morning Route: 18 min driving</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 shadow-lg">
                    <Sparkles size={12} />
                    <span>Optimal Waypoint Order</span>
                  </div>
                </div>

                {/* Simulated Pins and Route Line in center */}
                <div className="relative py-12 flex items-center justify-around z-10">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff7a38] to-[#f95d0f] text-white font-black text-xs flex items-center justify-center shadow-lg shadow-orange-500/40 ring-4 ring-orange-500/20">
                      1
                    </div>
                    <span className="text-[11px] font-bold text-white mt-1.5">Tsukiji</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-gradient-to-r from-[#f95d0f] to-amber-500 mx-2 relative">
                    <div className="absolute inset-0 bg-[#f95d0f] blur-sm opacity-50" />
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff7a38] to-[#f95d0f] text-white font-black text-xs flex items-center justify-center shadow-lg shadow-orange-500/40 ring-4 ring-orange-500/20">
                      2
                    </div>
                    <span className="text-[11px] font-bold text-white mt-1.5">Senso-ji</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-gradient-to-r from-amber-500 to-purple-500 mx-2 relative">
                    <div className="absolute inset-0 bg-amber-500 blur-sm opacity-50" />
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff7a38] to-[#f95d0f] text-white font-black text-xs flex items-center justify-center shadow-lg shadow-orange-500/40 ring-4 ring-orange-500/20">
                      3
                    </div>
                    <span className="text-[11px] font-bold text-white mt-1.5">Fuglen</span>
                  </div>
                </div>

                {/* Floating toast notification */}
                <div className="self-center z-10 px-4 py-2 rounded-xl bg-[#1c1c20]/95 border border-white/10 shadow-2xl backdrop-blur-xl flex items-center gap-2.5">
                  <Sparkles size={13} className="text-[#ff9a5c]" />
                  <span className="text-xs text-neutral-300">
                    <strong className="text-white">Alex M.</strong> just voted on Tsukiji Outer Market
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────── */}
        <section id="how-it-works" className="py-16 md:py-24 px-4 sm:px-6 max-w-7xl mx-auto w-full border-t border-white/[0.06]">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="section-label text-[#ff9a5c]">Simple 3-Step Workflow</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mt-2">
              How groups plan with WayMark
            </h2>
            <p className="text-sm sm:text-base text-neutral-400 mt-3">
              Plan in minutes, vote without tension, and navigate effortlessly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bento-card p-6 flex flex-col justify-between">
              <div>
                <span className="text-3xl font-display font-extrabold text-[#f95d0f]/60">01</span>
                <h3 className="font-display font-bold text-lg text-white mt-3">Create & Share Link</h3>
                <p className="text-xs sm:text-sm text-neutral-400 mt-2 leading-relaxed">
                  Start a trip in 3 seconds. Copy your room link directly to WhatsApp, iMessage, or Discord. Friends join immediately as travelers on any device.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs font-semibold text-[#ff9a5c]">
                <Share2 size={13} />
                <span>Zero login wall for guests</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bento-card p-6 flex flex-col justify-between">
              <div>
                <span className="text-3xl font-display font-extrabold text-[#f95d0f]/60">02</span>
                <h3 className="font-display font-bold text-lg text-white mt-3">Pin Places & Upvote</h3>
                <p className="text-xs sm:text-sm text-neutral-400 mt-2 leading-relaxed">
                  Search locations with Google Places or paste Instagram travel clips. Upvote spots to see what the whole group is genuinely excited to visit.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs font-semibold text-[#ff9a5c]">
                <ThumbsUp size={13} />
                <span>Democratic group consensus</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bento-card p-6 flex flex-col justify-between">
              <div>
                <span className="text-3xl font-display font-extrabold text-[#f95d0f]/60">03</span>
                <h3 className="font-display font-bold text-lg text-white mt-3">Build Routes with Bubbles</h3>
                <p className="text-xs sm:text-sm text-neutral-400 mt-2 leading-relaxed">
                  Select stops with multi-select bubbles without annoying dropdowns closing. Drag to reorder or click Optimize to compute the shortest road trip.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs font-semibold text-[#ff9a5c]">
                <Route size={13} />
                <span>Google Routes v2 with live traffic</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── BENTO FEATURES GRID ──────────────────────────────── */}
        <section id="features" className="py-16 md:py-24 px-4 sm:px-6 max-w-7xl mx-auto w-full border-t border-white/[0.06]">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="section-label text-[#ff9a5c]">Engineered for Modern Travel</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mt-2">
              Every detail built for seamless travel.
            </h2>
            <p className="text-sm sm:text-base text-neutral-400 mt-3">
              Powerful travel tech under the hood, wrapped in a friendly and clean interface.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Bento Card 1: Multi-Stop Route Optimizer (Large, span 7) */}
            <div className="md:col-span-7 bento-card p-7 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#f95d0f]/15 text-[#ff9a5c] mb-4">
                  <Route size={20} />
                </div>
                <h3 className="font-display font-bold text-xl text-white">
                  Intelligent Route Builder & TSP Optimizer
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 mt-2 leading-relaxed max-w-xl">
                  Planning 4 to 6 stops in a day? Google Routes API v2 calculates exact driving or walking durations and reorganizes your intermediate stops to eliminate backtracking and cut down on gas and fatigue.
                </p>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Car size={14} className="text-[#ff9a5c]" />
                  <span className="text-neutral-200">Drive (live traffic)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Footprints size={14} className="text-emerald-400" />
                  <span className="text-neutral-200">Walk (scenic footpaths)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-amber-400" />
                  <span className="text-neutral-200">1-click optimization</span>
                </div>
              </div>
            </div>

            {/* Bento Card 2: AI Scout with Filters (Large, span 5) */}
            <div id="ai-scout" className="md:col-span-5 bento-card p-7 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/15 text-purple-400 mb-4">
                  <Sparkles size={20} />
                </div>
                <h3 className="font-display font-bold text-xl text-white">
                  Gemini AI Scout with Verified Filters
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 mt-2 leading-relaxed">
                  Ask natural questions like <em>"cozy cafes with matcha near Shibuya"</em>. Every spot is grounded with live Google Places data and filterable by star ratings (4.0+ to 4.7+) and review volume.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-semibold text-neutral-300">
                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">★ 4.5+ Rating</span>
                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">&lt; 500 Reviews (Quiet Gems)</span>
                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">1000+ Reviews (Hotspots)</span>
              </div>
            </div>

            {/* Bento Card 3: Realtime Websocket Sync (span 4) */}
            <div className="md:col-span-4 bento-card p-6 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-500/15 text-blue-400 mb-3">
                  <Users size={18} />
                </div>
                <h3 className="font-display font-bold text-base text-white">
                  Real-Time Collaborative Sync
                </h3>
                <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                  Built on Supabase Realtime channels. When one friend drops a pin or adds a route, everyone's screen updates instantly.
                </p>
              </div>
              <div className="mt-5 text-[11px] text-neutral-400 flex items-center gap-1.5 font-medium">
                <Check size={12} className="text-emerald-400" />
                <span>Zero lag websocket updates</span>
              </div>
            </div>

            {/* Bento Card 4: Instagram Link Parser (span 4) */}
            <div className="md:col-span-4 bento-card p-6 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-pink-500/15 text-pink-400 mb-3">
                  <InstagramIcon size={18} />
                </div>
                <h3 className="font-display font-bold text-base text-white">
                  Instagram Link Importer
                </h3>
                <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                  Turn saved reels and clips into actual destinations. Paste links into your bucket list to extract titles and pinpoint exact Google coordinates.
                </p>
              </div>
              <div className="mt-5 text-[11px] text-neutral-400 flex items-center gap-1.5 font-medium">
                <Check size={12} className="text-emerald-400" />
                <span>No more forgotten reels</span>
              </div>
            </div>

            {/* Bento Card 5: Hybrid Traveler Auth (span 4) */}
            <div className="md:col-span-4 bento-card p-6 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/15 text-emerald-400 mb-3">
                  <ShieldCheck size={18} />
                </div>
                <h3 className="font-display font-bold text-base text-white">
                  Frictionless Guest & Google Auth
                </h3>
                <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                  Anonymous session tokens let travelers collaborate instantly. Connect your Google account anytime to keep your trips permanently across devices.
                </p>
              </div>
              <div className="mt-5 text-[11px] text-neutral-400 flex items-center gap-1.5 font-medium">
                <Check size={12} className="text-emerald-400" />
                <span>Safe, permanent cloud backup</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── BEFORE VS. AFTER COMPARISON ──────────────────────── */}
        <section className="py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full border-t border-white/[0.06]">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="section-label text-[#ff9a5c]">The Group Travel Difference</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mt-2">
              Why groups switch to WayMark
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* The Old Way */}
            <div className="p-6 rounded-2xl bg-red-950/10 border border-red-500/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm mb-4">
                  <X size={16} />
                  <span>The Old Way (Chaos)</span>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-neutral-300">
                  <li className="flex items-start gap-2.5">
                    <span className="text-red-400 shrink-0 font-bold">✕</span>
                    <span>300 unread messages in WhatsApp with lost links</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-red-400 shrink-0 font-bold">✕</span>
                    <span>“Where do you want to eat?” “I don't know, wherever” indecision</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-red-400 shrink-0 font-bold">✕</span>
                    <span>Backtracking 45 minutes because stops weren't sequenced</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-red-400 shrink-0 font-bold">✕</span>
                    <span>Messy spreadsheets that nobody opens once the trip starts</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* The WayMark Way */}
            <div className="p-6 rounded-2xl bg-emerald-950/15 border border-emerald-500/30 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-4">
                  <Check size={16} />
                  <span>The WayMark Way (Clarity)</span>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-neutral-100">
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-400 shrink-0 font-bold">✓</span>
                    <span>Single shared visual map accessible instantly via link</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-400 shrink-0 font-bold">✓</span>
                    <span>Democratic upvoting highlights group favorites immediately</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-400 shrink-0 font-bold">✓</span>
                    <span>1-click route optimization with Google driving durations</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-400 shrink-0 font-bold">✓</span>
                    <span>AI Scout finds verified hidden gems with real review counts</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ SECTION ──────────────────────────────────────── */}
        <section id="faq" className="py-16 md:py-24 px-4 sm:px-6 max-w-4xl mx-auto w-full border-t border-white/[0.06]">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="section-label text-[#ff9a5c]">Questions & Answers</span>
            <h2 className="font-display text-3xl font-extrabold text-white mt-2">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bento-card overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left cursor-pointer"
                  >
                    <span className="font-display font-bold text-sm sm:text-base text-neutral-100">
                      {faq.q}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-neutral-400 transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180 text-[#ff9a5c]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 sm:pb-6 text-xs sm:text-sm text-neutral-400 leading-relaxed border-t border-white/5 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── BOTTOM CALL TO ACTION ────────────────────────────── */}
        <section className="py-16 px-4 sm:px-6 max-w-5xl mx-auto w-full mb-12">
          <div
            className="p-8 sm:p-12 rounded-3xl relative overflow-hidden text-center shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(249,93,15,0.2) 0%, rgba(20,20,24,0.95) 100%)',
              border: '1.5px solid rgba(249,93,15,0.35)',
            }}
          >
            <div
              className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-30 blur-2xl pointer-events-none"
              style={{ background: '#f95d0f' }}
            />
            <div className="relative z-10 max-w-2xl mx-auto">
              <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-[#ff7a38] to-[#f95d0f] shadow-lg shadow-orange-500/30">
                <Compass size={24} color="white" />
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
                Ready for your next adventure?
              </h2>
              <p className="text-sm sm:text-base text-neutral-300 mt-3 leading-relaxed">
                Create your shared trip room in 3 seconds. Invite your friends with a link and start plotting pins together.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
                <button
                  type="button"
                  onClick={scrollToLauncher}
                  className="btn btn-primary text-sm px-6 py-3 font-bold shadow-xl shadow-orange-500/25"
                >
                  <span>Start Planning Now</span>
                  <ArrowRight size={16} />
                </button>
                <a
                  href="/room/demo?demo=1"
                  className="btn btn-secondary text-sm px-5 py-3 font-semibold"
                >
                  <span>Explore Demo Room</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-[#0c0c0e] py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg shadow"
              style={{ background: 'linear-gradient(135deg, #ff7a38, #f95d0f)' }}
            >
              <Compass size={16} color="white" />
            </div>
            <div>
              <span className="font-display font-bold text-sm text-neutral-100">WayMark</span>
              <p className="text-[11px] text-neutral-500">Collaborative Group Trip Planner</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-neutral-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#ai-scout" className="hover:text-white transition-colors">AI Scout</a>
            <a href="/room/demo?demo=1" className="hover:text-white transition-colors">Demo</a>
          </div>

          <p className="text-xs text-neutral-500">
            Powered by Google Maps Platform & Gemini AI • © 2026 WayMark
          </p>
        </div>
      </footer>
    </div>
  );
}
