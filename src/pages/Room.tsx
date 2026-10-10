import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { APIProvider } from '@vis.gl/react-google-maps';
import { supabase } from '../lib/supabase';
import { useRoom } from '../hooks/useRoom';
import { useBucket } from '../hooks/useBucket';
import { usePresence } from '../hooks/usePresence';
import { useRoutes } from '../hooks/useRoutes';
import { useVotes } from '../hooks/useVotes';
import DisplayNamePrompt from '../components/DisplayNamePrompt';
import MapComponent from '../components/MapComponent';
import SearchBar, { type PlacePreview } from '../components/SearchBar';
import BucketList from '../components/BucketList';
import PresenceBar from '../components/PresenceBar';
import ShareButton from '../components/ShareButton';
import RouteBuilder from '../components/RouteBuilder';
import ProposedRoutes from '../components/ProposedRoutes';
import RoutePolyline from '../components/RoutePolyline';
import InstagramImport from '../components/InstagramImport';
import { getCategoryColor, getCategoryIcon, type PlaceCategory } from '../lib/categories';

// Phase 1: layout shell. Map, BucketList, etc. wired in Phase 2+.

export default function Room() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const { room, loading: roomLoading, error: roomError } = useRoom(id);
  const { items: bucketItems, loading: bucketLoading, removeItem, updateCategory } = useBucket(id);
  const isDemo = new URLSearchParams(window.location.search).get('demo') === '1';
  const presentUsers = usePresence(id, profile);
  const { routes, loading: routesLoading, deleteRoute, updateRoute } = useRoutes(id, isDemo);
  const votesHook = useVotes(id, user?.id);
  
  const [showPrompt, setShowPrompt] = useState(false);
  const [addingPlace, setAddingPlace] = useState(false);
  const [showHiddenGems, setShowHiddenGems] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory | 'ALL'>('ALL');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [editingRoute, setEditingRoute] = useState<any | null>(null);
  const [builderPreview, setBuilderPreview] = useState<{ stops: any[]; route: any; routeName: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'bucket' | 'routes'>('bucket');

  // Resizable sidebar state
  const DEFAULT_SIDEBAR_WIDTH = 384;
  const MIN_SIDEBAR_WIDTH = 300;
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('wanderroom_sidebar_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= 900) {
          return parsed;
        }
      }
    } catch (_) {}
    return DEFAULT_SIDEBAR_WIDTH;
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const sidebarWidthRef = useRef(sidebarWidth);
  sidebarWidthRef.current = sidebarWidth;

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handlePointerMove = (e: PointerEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const maxAllowed = Math.max(MIN_SIDEBAR_WIDTH, Math.min(850, Math.floor(window.innerWidth * 0.65)));
      const clamped = Math.max(MIN_SIDEBAR_WIDTH, Math.min(maxAllowed, newWidth));
      sidebarWidthRef.current = clamped;
      setSidebarWidth(clamped);
    };

    const handlePointerUp = () => {
      setIsResizingSidebar(false);
      try {
        localStorage.setItem('wanderroom_sidebar_width', sidebarWidthRef.current.toString());
      } catch (_) {}
      // Notify map of container resize
      window.dispatchEvent(new Event('resize'));
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizingSidebar]);

  // Auto-switch to Routes tab when editing a route
  useEffect(() => {
    if (editingRoute) {
      setActiveTab('routes');
    }
  }, [editingRoute]);
  
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Group 5: Category counts for available bucket items
  const categoryCounts = bucketItems.reduce<Record<string, number>>((acc, item) => {
    const cat = (item.category || 'Attraction') as PlaceCategory;
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const availableCategories = Object.keys(categoryCounts) as PlaceCategory[];

  const filteredBucket = bucketItems.filter(item => {
    if (showHiddenGems) {
      const isGem = (item.rating ?? 0) >= 4.5 && (item.review_count ?? 0) > 0 && (item.review_count ?? 0) < 1000;
      if (!isGem) return false;
    }
    if (selectedCategory !== 'ALL' && (item.category || 'Attraction') !== selectedCategory) {
      return false;
    }
    return true;
  });

  // Once auth loads, show prompt if no profile yet
  useEffect(() => {
    if (!authLoading && !profile) {
      setShowPrompt(true);
    }
  }, [authLoading, profile]);


  const handleAddPlace = async (place: PlacePreview) => {
    if (!room || !user || isDemo) return;
    setAddingPlace(true);
    try {
      const { error } = await supabase.from('bucket_locations').insert({
        room_id: room.id,
        added_by: user.id,
        place_id: place.place_id,
        name: place.name,
        address: place.address,
        category: place.category,
        lat: place.lat,
        lng: place.lng,
        rating: place.rating,
        review_count: place.review_count
      });
      if (error && error.code !== '23505') { // ignore unique violation (already added)
        console.error('Error adding place:', error.message);
      }
    } finally {
      setAddingPlace(false);
    }
  };

  const handleUpdateRoute = async (routeId: string, updates: any) => {
    await updateRoute(routeId, updates);
    // When editing is saved: select the updated route on the map in blue
    setSelectedRouteId(routeId);
    setEditingRoute(null);
    setBuilderPreview(null);
  };

  const selectedRoute = selectedRouteId ? routes.find(r => r.id === selectedRouteId) : null;

  // Group 4: Compute isolated map items, sequence map, and active polyline
  let mapItems = filteredBucket;
  let sequenceMap: Record<string, number> | undefined = undefined;
  let activePolyline: string | null = null;
  let activeCoordinates: { lat: number; lng: number }[] | null = null;

  // Original route path (baseline reference when editing)
  let originalPolyline: string | null = null;
  let originalCoordinates: { lat: number; lng: number }[] | null = null;

  if (editingRoute) {
    originalPolyline = editingRoute.encoded_polyline ?? null;
    if (!originalPolyline) {
      originalCoordinates = [];
      editingRoute.waypoint_order.forEach((stopId: string) => {
        const item = bucketItems.find(b => b.id === stopId || b.place_id === stopId);
        if (item) originalCoordinates!.push({ lat: item.lat, lng: item.lng });
      });
    }
  }

  // Detect if live changes have been made to the route during editing
  const isEditing = Boolean(editingRoute && builderPreview);
  const isRouteModified = Boolean(
    editingRoute &&
    builderPreview &&
    (
      builderPreview.stops.length !== editingRoute.waypoint_order.length ||
      builderPreview.stops.some((s, idx) => {
        const origId = editingRoute.waypoint_order[idx];
        return s.id !== origId && s.place_id !== origId;
      }) ||
      (builderPreview.route?.polyline?.encodedPolyline &&
       editingRoute.encoded_polyline &&
       builderPreview.route.polyline.encodedPolyline !== editingRoute.encoded_polyline)
    )
  );

  if (builderPreview) {
    // When previewing in RouteBuilder, isolate map to preview stops with sequence numbers
    mapItems = builderPreview.stops;
    sequenceMap = {};
    builderPreview.stops.forEach((stop, idx) => {
      sequenceMap![stop.id] = idx + 1;
      if (stop.place_id) sequenceMap![stop.place_id] = idx + 1;
    });
    activePolyline = builderPreview.route?.polyline?.encodedPolyline ?? null;
    if (!activePolyline) {
      activeCoordinates = builderPreview.stops.map(s => ({ lat: s.lat, lng: s.lng }));
    }
  } else if (selectedRoute) {
    // When a saved route is selected, isolate map to its stops with sequence numbers (Requirements 8 & 9)
    const orderedStops: typeof bucketItems = [];
    sequenceMap = {};
    selectedRoute.waypoint_order.forEach((stopId, idx) => {
      const item = bucketItems.find(b => b.id === stopId || b.place_id === stopId);
      if (item && !orderedStops.some(s => s.id === item.id)) {
        orderedStops.push(item);
        sequenceMap![item.id] = idx + 1;
        if (item.place_id) sequenceMap![item.place_id] = idx + 1;
      }
    });

    mapItems = orderedStops;
    activePolyline = selectedRoute.encoded_polyline;
    if (!activePolyline) {
      activeCoordinates = orderedStops.map(s => ({ lat: s.lat, lng: s.lng }));
    }
  }

  if (authLoading || roomLoading || bucketLoading || routesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" style={{ width: 32, height: 32 }} />
          <p className="text-slate-400 text-sm">Loading room...</p>
        </div>
      </div>
    );
  }

  if (roomError || (!room && !isDemo)) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="glass p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">🗺️</div>
          <h2 className="text-xl font-bold text-white mb-2">Room not found</h2>
          <p className="text-slate-400 text-sm mb-6">{roomError ?? 'This room doesn\'t exist.'}</p>
          <Link to="/" className="btn btn-primary">← Back to Home</Link>
        </div>
      </div>
    );
  }

  const roomName = isDemo ? 'Kochi Weekend 🌴 [DEMO]' : room?.name ?? '';

  return (
    <APIProvider apiKey={mapsApiKey}>
      {showPrompt && !isDemo && (
        <DisplayNamePrompt onComplete={() => setShowPrompt(false)} />
      )}

      {/* App shell */}
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 z-20"
                style={{ background: 'rgba(15,15,26,0.95)', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-slate-400 hover:text-white transition-colors text-lg" title="Home">
              ✈️
            </Link>
            <div>
              <h1 className="text-white font-bold text-base leading-tight truncate max-w-[180px] sm:max-w-none">
                {roomName}
              </h1>
              {isDemo && <span className="demo-badge">demo data</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div id="presence-bar-slot" className="hidden sm:flex items-center gap-1">
              <PresenceBar users={presentUsers} />
            </div>
            <div id="share-btn-slot">
              <ShareButton roomName={roomName} />
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Map area — takes top half on mobile, left side on desktop */}
          <div id="map-slot" className="flex-1 relative bg-slate-900 min-h-[40vh] md:min-h-0">
            {/* Floating Banner when viewing an isolated route */}
            {selectedRoute && !builderPreview && !editingRoute && (
              <div className="absolute top-4 left-4 z-10 bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 rounded-xl px-3.5 py-2 shadow-2xl flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  <span className="text-xs font-semibold text-white">
                    Viewing: <span className="text-indigo-300 font-bold">{selectedRoute.route_name}</span>
                  </span>
                  <span className="text-[11px] text-slate-400">({mapItems.length} stops isolated)</span>
                </div>
                <button 
                  onClick={() => setSelectedRouteId(null)}
                  className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded border border-slate-700 transition-colors"
                  title="Show all places on map"
                >
                  ✕ Show all
                </button>
              </div>
            )}

            {/* Floating Banner when editing with live changes comparison */}
            {isEditing && (
              <div className="absolute top-4 left-4 z-10 bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 rounded-xl px-3.5 py-2 shadow-2xl flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-semibold text-white">
                    Editing: <span className="text-emerald-300 font-bold">{editingRoute.route_name}</span>
                  </span>
                </div>
                {isRouteModified && (
                  <div className="flex items-center gap-2.5 text-xs border-l border-slate-700 pl-3">
                    <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm"></span> Original
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span> Live New
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Floating Banner when category filter is active and not viewing a route */}
            {selectedCategory !== 'ALL' && !selectedRoute && !builderPreview && !editingRoute && (
              <div className="absolute top-4 left-4 z-10 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl px-3.5 py-2 shadow-2xl flex items-center gap-2.5 text-xs">
                <span className="text-sm">{getCategoryIcon(selectedCategory)}</span>
                <span className="text-white font-medium">
                  Showing <strong style={{ color: getCategoryColor(selectedCategory) }}>{selectedCategory}</strong> places
                </span>
                <span className="text-slate-400">({filteredBucket.length})</span>
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className="ml-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded border border-slate-700 transition-colors"
                >
                  ✕ Show all
                </button>
              </div>
            )}

            <MapComponent items={mapItems} sequenceMap={sequenceMap}>
              {/* When editing an existing route with live changes, render BOTH: original in Blue, live changes in Emerald Green */}
              {isEditing && isRouteModified ? (
                <>
                  {/* 1. Original path stays Blue */}
                  {(originalPolyline || (originalCoordinates && originalCoordinates.length > 1)) && (
                    <RoutePolyline 
                      key={`orig-${editingRoute.id}`}
                      encodedPolyline={originalPolyline} 
                      pathCoordinates={originalCoordinates}
                      strokeColor="#3b82f6"
                      strokeOpacity={0.65}
                      strokeWeight={4}
                      arrowFillColor="#93c5fd"
                      arrowStrokeColor="#1e3a8a"
                      zIndex={1}
                    />
                  )}
                  {/* 2. Live changes rendered in Emerald Green */}
                  {(activePolyline || (activeCoordinates && activeCoordinates.length > 1)) && (
                    <RoutePolyline 
                      key={`live-${editingRoute.id}`}
                      encodedPolyline={activePolyline} 
                      pathCoordinates={activeCoordinates}
                      strokeColor="#10b981"
                      strokeOpacity={0.95}
                      strokeWeight={5}
                      arrowFillColor="#34d399"
                      arrowStrokeColor="#064e3b"
                      zIndex={10}
                    />
                  )}
                </>
              ) : (
                /* Standard active route (saved route, new route preview, or unmodified edit) in standard Blue */
                (activePolyline || (activeCoordinates && activeCoordinates.length > 1)) && (
                  <RoutePolyline 
                    key="standard-route"
                    encodedPolyline={activePolyline} 
                    pathCoordinates={activeCoordinates}
                    strokeColor="#6366f1"
                    strokeOpacity={0.9}
                    strokeWeight={5}
                    arrowFillColor="#38bdf8"
                    arrowStrokeColor="#312e81"
                    zIndex={5}
                  />
                )
              )}
            </MapComponent>
          </div>

          {/* Desktop Resizer Handle */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            onPointerDown={(e) => {
              e.preventDefault();
              setIsResizingSidebar(true);
            }}
            onDoubleClick={() => {
              setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
              try {
                localStorage.setItem('wanderroom_sidebar_width', DEFAULT_SIDEBAR_WIDTH.toString());
              } catch (_) {}
              window.dispatchEvent(new Event('resize'));
            }}
            className={`hidden md:flex w-2 cursor-col-resize z-30 flex-shrink-0 transition-colors select-none relative items-center justify-center group ${
              isResizingSidebar
                ? 'bg-indigo-600 shadow-[0_0_12px_rgba(99,102,241,0.7)]'
                : 'bg-slate-900/90 hover:bg-indigo-600/50 border-l border-r border-slate-800/80 hover:border-indigo-500/50'
            }`}
            title="Drag to resize sidebar • Double-click to reset"
          >
            {/* Grabber indicator */}
            <div 
              className={`w-0.5 rounded-full transition-all ${
                isResizingSidebar 
                  ? 'bg-white h-12 shadow-sm' 
                  : 'bg-slate-600 group-hover:bg-indigo-300 h-8 group-hover:h-10'
              }`} 
            />
          </div>

          {/* Side panel — bottom half scrollable on mobile, right side on desktop */}
          <aside
            id="side-panel"
            className="flex flex-col flex-shrink-0 w-full h-[60vh] md:h-auto overflow-y-auto border-t md:border-t-0 relative overflow-x-hidden"
            style={{ 
              background: 'var(--color-surface-1)', 
              borderColor: 'rgba(99,102,241,0.12)',
              width: isDesktop ? `${sidebarWidth}px` : undefined,
              maxWidth: isDesktop ? '65vw' : undefined,
              minWidth: isDesktop ? `${MIN_SIDEBAR_WIDTH}px` : undefined,
            }}
          >
            {/* Feature Tabs Header */}
            <div className="flex items-center border-b border-slate-800/80 bg-slate-900/70 p-2 gap-2 shrink-0 sticky top-0 z-20 backdrop-blur">
              <button
                type="button"
                onClick={() => setActiveTab('bucket')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                  activeTab === 'bucket'
                    ? 'bg-indigo-600/30 border-indigo-500/80 text-white shadow-sm shadow-indigo-500/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span>📍 Bucket List</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === 'bucket' ? 'bg-indigo-500/40 text-indigo-100' : 'bg-slate-800 text-slate-400'
                }`}>
                  {bucketItems.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('routes')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                  activeTab === 'routes'
                    ? 'bg-indigo-600/30 border-indigo-500/80 text-white shadow-sm shadow-indigo-500/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span>🗺️ Routes</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === 'routes' ? 'bg-indigo-500/40 text-indigo-100' : 'bg-slate-800 text-slate-400'
                }`}>
                  {routes.length}
                </span>
              </button>
            </div>

            {/* TAB 1: BUCKET LIST */}
            {activeTab === 'bucket' && (
              <>
                {/* SearchBar slot (Phase 2) */}
                <div id="search-bar-slot" className="p-4 border-b border-slate-800/60 relative z-10 flex flex-col gap-3">
                  <SearchBar onAddPlace={handleAddPlace} adding={addingPlace} />
                  
                  {/* Hidden Gem Toggle */}
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-xs text-slate-400 group-hover:text-white transition-colors">💎 Show Hidden Gems</span>
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={showHiddenGems}
                      onChange={e => setShowHiddenGems(e.target.checked)}
                    />
                    <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500 relative"></div>
                  </label>

                  {/* Category Filter Pills (Group 5) */}
                  {availableCategories.length > 0 && (
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Categories
                        </span>
                        {selectedCategory !== 'ALL' && (
                          <button
                            onClick={() => setSelectedCategory('ALL')}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold underline"
                          >
                            Clear filter
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                        <button
                          onClick={() => setSelectedCategory('ALL')}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                            selectedCategory === 'ALL'
                              ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                              : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                          }`}
                        >
                          <span>All</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/60 text-slate-300">
                            {bucketItems.length}
                          </span>
                        </button>

                        {availableCategories.map((cat) => {
                          const isSelected = selectedCategory === cat;
                          const catColor = getCategoryColor(cat);
                          const catIcon = getCategoryIcon(cat);
                          const count = categoryCounts[cat] || 0;

                          return (
                            <button
                              key={cat}
                              onClick={() => setSelectedCategory(isSelected ? 'ALL' : cat)}
                              className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border shadow-sm"
                              style={{
                                backgroundColor: isSelected ? `${catColor}25` : 'rgba(30, 41, 59, 0.7)',
                                borderColor: isSelected ? catColor : 'rgba(51, 65, 85, 0.6)',
                                color: isSelected ? '#ffffff' : '#94a3b8',
                                boxShadow: isSelected ? `0 0 10px ${catColor}30` : undefined,
                              }}
                            >
                              <span className="text-xs">{catIcon}</span>
                              <span>{cat}</span>
                              <span 
                                className="text-[10px] px-1.5 py-0.2 rounded-full"
                                style={{
                                  backgroundColor: isSelected ? `${catColor}40` : 'rgba(15, 23, 42, 0.6)',
                                  color: isSelected ? '#ffffff' : '#94a3b8',
                                }}
                              >
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* BucketList slot (Phase 2) */}
                <div id="bucket-list-slot" className="flex-1 overflow-y-auto relative z-0">
                  <BucketList 
                    items={filteredBucket} 
                    onRemove={removeItem} 
                    onUpdateCategory={updateCategory}
                    isFiltered={selectedCategory !== 'ALL' || showHiddenGems}
                    onClearFilter={() => {
                      setSelectedCategory('ALL');
                      setShowHiddenGems(false);
                    }}
                  />
                </div>

                <InstagramImport />
              </>
            )}

            {/* TAB 2: ROUTES */}
            {activeTab === 'routes' && (
              <div className="flex flex-col flex-1 overflow-y-auto">
                <div id="proposed-routes-slot" className="flex-1 overflow-y-auto">
                  <ProposedRoutes 
                    routes={routes} 
                    votesHook={votesHook} 
                    onSelectRoute={(r) => setSelectedRouteId(r ? r.id : null)}
                    selectedRouteId={selectedRouteId}
                    onEditRoute={(r) => {
                      setSelectedRouteId(null);
                      setEditingRoute(r);
                    }}
                    onDeleteRoute={deleteRoute}
                    bucketItems={bucketItems}
                  />
                </div>

                {/* RouteBuilder slot (Phase 4) */}
                <div id="route-builder-slot" className="border-t border-slate-800/60 p-4 shrink-0 bg-surface-1">
                  <RouteBuilder 
                    roomId={room?.id ?? ''}
                    userId={user?.id}
                    availablePlaces={bucketItems}
                    editingRoute={editingRoute}
                    onClearEditing={() => {
                      if (editingRoute) {
                        setSelectedRouteId(editingRoute.id);
                      }
                      setEditingRoute(null);
                    }}
                    onPreviewChange={setBuilderPreview}
                    onUpdateRoute={handleUpdateRoute}
                    onRouteCreated={(newId) => setSelectedRouteId(newId)}
                  />
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </APIProvider>
  );
}
