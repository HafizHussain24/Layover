import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { APIProvider } from '@vis.gl/react-google-maps';
import { supabase } from '../lib/supabase';
import { useRoom, updateRoomDestination } from '../hooks/useRoom';
import { useBucket } from '../hooks/useBucket';
import { usePresence } from '../hooks/usePresence';
import { useRoutes } from '../hooks/useRoutes';
import { useVotes } from '../hooks/useVotes';
import DisplayNamePrompt from '../components/DisplayNamePrompt';
import MapComponent from '../components/MapComponent';
import SearchBar, { type PlacePreview } from '../components/SearchBar';
import DestinationBar from '../components/DestinationBar';
import BucketList from '../components/BucketList';
import PresenceBar from '../components/PresenceBar';
import ShareButton from '../components/ShareButton';
import RouteBuilder from '../components/RouteBuilder';
import ProposedRoutes from '../components/ProposedRoutes';
import RoutePolyline from '../components/RoutePolyline';
import InstagramImport from '../components/InstagramImport';
import { getCategoryColor, getCategoryIcon, type PlaceCategory } from '../lib/categories';
import CategoryIcon from '../components/CategoryIcon';
import {
  Compass, X, Gem, BookMarked, Route,
  Loader2, AlertTriangle, ArrowLeft,
} from 'lucide-react';

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

  // Group 6: Destination Resolution & Smart Search Bias
  const explicitDestination = room?.destination_name && room.destination_lat && room.destination_lng
    ? {
        name: room.destination_name,
        lat: room.destination_lat,
        lng: room.destination_lng,
      }
    : null;

  const bucketCentroid = bucketItems.length > 0
    ? {
        name: `${bucketItems[0].name} area`,
        lat: bucketItems.reduce((acc, p) => acc + p.lat, 0) / bucketItems.length,
        lng: bucketItems.reduce((acc, p) => acc + p.lng, 0) / bucketItems.length,
      }
    : null;

  const activeSearchDestination = explicitDestination || bucketCentroid;

  const handleSetDestination = async (dest: { name: string; lat: number; lng: number } | null) => {
    if (!room) return;
    try {
      await updateRoomDestination(room.id, {
        name: dest ? dest.name : null,
        lat: dest ? dest.lat : null,
        lng: dest ? dest.lng : null,
      });
    } catch (err) {
      console.error('Failed to update destination:', err);
    }
  };

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
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-5"
               style={{ background: 'linear-gradient(135deg, #ff7a38, #f95d0f)', boxShadow: '0 8px 24px rgba(249,93,15,0.35)' }}>
            <Compass size={22} color="white" />
          </div>
          <Loader2 size={22} className="animate-spin mx-auto mb-3" style={{ color: '#f95d0f' }} />
          <p className="text-sm" style={{ color: '#4a4a54' }}>Loading room…</p>
        </div>
      </div>
    );
  }

  if (roomError || (!room && !isDemo)) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="glass p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
               style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={20} style={{ color: '#f87171' }} />
          </div>
          <h2 className="font-display font-bold text-xl mb-2" style={{ color: '#e8e8ec' }}>Room not found</h2>
          <p className="text-sm mb-6" style={{ color: '#4a4a54' }}>{roomError ?? "This room doesn't exist."}</p>
          <Link to="/" className="btn btn-secondary flex items-center justify-center gap-2">
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const roomName = isDemo ? 'Kochi Weekend [DEMO]' : room?.name ?? '';

  return (
    <APIProvider apiKey={mapsApiKey}>
      {showPrompt && !isDemo && (
        <DisplayNamePrompt onComplete={() => setShowPrompt(false)} />
      )}

      {/* App shell */}
      <div className="flex flex-col h-screen overflow-hidden">
        {/* ── Top bar ── */}
        <header
          className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 z-40 relative"
          style={{
            background: 'rgba(20,20,22,0.97)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
              style={{ background: 'linear-gradient(135deg, #ff7a38, #f95d0f)' }}
              title="Home"
            >
              <Compass size={16} color="white" />
            </Link>
            <div>
              <h1 className="font-display font-bold text-sm leading-tight" style={{ color: '#e8e8ec' }}>
                {roomName.replace(' [DEMO]', '')}
              </h1>
              {isDemo && <span className="demo-badge">demo</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div id="presence-bar-slot" className="hidden sm:flex items-center">
              <PresenceBar users={presentUsers} />
            </div>
            <div id="share-btn-slot">
              <ShareButton roomName={roomName} />
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Map area */}
          <div id="map-slot" className="flex-1 relative min-h-[40vh] md:min-h-0"
               style={{ background: 'var(--color-surface-0)' }}>
            {/* Floating banner: viewing isolated route */}
            {selectedRoute && !builderPreview && !editingRoute && (
              <div className="absolute top-4 left-4 z-10 map-banner flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: '#f95d0f', boxShadow: '0 0 8px #f95d0f' }} />
                  <span className="text-xs font-semibold" style={{ color: '#e8e8ec' }}>
                    Viewing{' '}
                    <span className="font-bold" style={{ color: '#ff9a5c' }}>{selectedRoute.route_name}</span>
                  </span>
                  <span className="text-xs" style={{ color: '#4a4a54' }}>({mapItems.length} stops)</span>
                </div>
                <button
                  onClick={() => setSelectedRouteId(null)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#6a6a76', border: '1px solid rgba(255,255,255,0.08)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#e8e8ec')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#6a6a76')}
                >
                  <X size={11} /> Show all
                </button>
              </div>
            )}

            {/* Floating banner: editing with live comparison */}
            {isEditing && (
              <div className="absolute top-4 left-4 z-10 map-banner flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                  <span className="text-xs font-semibold" style={{ color: '#e8e8ec' }}>
                    Editing{' '}
                    <span style={{ color: '#6ee7b7' }}>{editingRoute.route_name}</span>
                  </span>
                </div>
                {isRouteModified && (
                  <div className="flex items-center gap-2.5 text-xs border-l pl-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <span className="flex items-center gap-1.5 font-semibold" style={{ color: '#60a5fa' }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} /> Original
                    </span>
                    <span style={{ color: '#3a3a42' }}>•</span>
                    <span className="flex items-center gap-1.5 font-semibold" style={{ color: '#34d399' }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} /> Live
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Floating banner: category filter */}
            {selectedCategory !== 'ALL' && !selectedRoute && !builderPreview && !editingRoute && (
              <div className="absolute top-4 left-4 z-10 map-banner flex items-center gap-2.5 text-xs">
                <CategoryIcon name={getCategoryIcon(selectedCategory)} size={13} style={{ color: getCategoryColor(selectedCategory) }} />
                <span style={{ color: '#e8e8ec' }}>
                  Showing{' '}
                  <strong style={{ color: getCategoryColor(selectedCategory) }}>{selectedCategory}</strong>
                  {' '}places
                </span>
                <span style={{ color: '#4a4a54' }}>({filteredBucket.length})</span>
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ml-1"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#6a6a76', border: '1px solid rgba(255,255,255,0.08)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#e8e8ec')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#6a6a76')}
                >
                  <X size={11} /> Show all
                </button>
              </div>
            )}

            <MapComponent items={mapItems} sequenceMap={sequenceMap} destination={activeSearchDestination}>
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
                    strokeColor="#3b82f6"
                    strokeOpacity={0.9}
                    strokeWeight={5}
                    arrowFillColor="#93c5fd"
                    arrowStrokeColor="#1e3a8a"
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
                ? 'bg-brand-500 shadow-[0_0_12px_rgba(249,93,15,0.7)]'
                : 'bg-surface-1 hover:bg-brand-500/30 border-l border-r border-white/5 hover:border-brand-500/40'
            }`}
            title="Drag to resize sidebar • Double-click to reset"
          >
            {/* Grabber indicator */}
            <div 
              className={`w-0.5 rounded-full transition-all ${
                isResizingSidebar 
                  ? 'bg-white h-12 shadow-sm' 
                  : 'bg-white/20 group-hover:bg-brand-400 h-8 group-hover:h-10'
              }`} 
            />
          </div>

          {/* Side panel — bottom half scrollable on mobile, right side on desktop */}
          <aside
            id="side-panel"
            className="flex flex-col flex-shrink-0 w-full h-[60vh] md:h-auto overflow-y-auto border-t md:border-t-0 relative overflow-x-hidden"
            style={{ 
              background: 'var(--color-surface-1)', 
              borderColor: 'rgba(255,255,255,0.06)',
              width: isDesktop ? `${sidebarWidth}px` : undefined,
              maxWidth: isDesktop ? '65vw' : undefined,
              minWidth: isDesktop ? `${MIN_SIDEBAR_WIDTH}px` : undefined,
            }}
          >
            {/* ── Feature Tabs ── */}
            <div className="tab-bar">
              <button
                type="button"
                onClick={() => setActiveTab('bucket')}
                className={`tab-btn ${activeTab === 'bucket' ? 'active' : ''}`}
              >
                <BookMarked size={13} />
                <span>Bucket List</span>
                <span className="tab-count">{bucketItems.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('routes')}
                className={`tab-btn ${activeTab === 'routes' ? 'active' : ''}`}
              >
                <Route size={13} />
                <span>Routes</span>
                <span className="tab-count">{routes.length}</span>
              </button>
            </div>

            {/* TAB 1: BUCKET LIST */}
            {activeTab === 'bucket' && (
              <>
                {/* Search + destination + filters */}
                <div id="search-bar-slot" className="p-4 border-b relative z-10 flex flex-col gap-3"
                     style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <DestinationBar
                    currentDestination={explicitDestination}
                    bucketCount={bucketItems.length}
                    hasBucketItems={bucketItems.length > 0}
                    onSetDestination={handleSetDestination}
                  />
                  <SearchBar
                    onAddPlace={handleAddPlace}
                    adding={addingPlace}
                    destination={activeSearchDestination}
                  />
                  
                  {/* Hidden Gems Toggle */}
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <Gem size={12} style={{ color: showHiddenGems ? '#f95d0f' : '#4a4a54' }} />
                      <span className="text-xs font-medium transition-colors"
                            style={{ color: showHiddenGems ? '#e8e8ec' : '#6a6a76' }}>
                        Hidden Gems
                      </span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={showHiddenGems}
                        onChange={e => setShowHiddenGems(e.target.checked)}
                      />
                      <span className="toggle-track" />
                    </label>
                  </label>

                  {/* Category filter pills */}
                  {availableCategories.length > 0 && (
                    <div className="flex flex-col gap-1.5 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <div className="flex items-center justify-between">
                        <span className="section-label">Categories</span>
                        {selectedCategory !== 'ALL' && (
                          <button
                            onClick={() => setSelectedCategory('ALL')}
                            className="text-[10px] font-semibold"
                            style={{ color: '#f95d0f' }}
                          >
                            Clear filter
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                        <button
                          onClick={() => setSelectedCategory('ALL')}
                          className={`cat-pill ${selectedCategory === 'ALL' ? 'active' : ''}`}
                          style={selectedCategory === 'ALL'
                            ? { background: 'rgba(249,93,15,0.2)', borderColor: 'rgba(249,93,15,0.5)', color: '#fff' }
                            : {}}
                        >
                          All
                          <span className="text-[10px] px-1.5 rounded-full"
                                style={{ background: 'rgba(255,255,255,0.05)', color: '#6a6a76' }}>
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
                              className="cat-pill"
                              style={isSelected ? {
                                background: `${catColor}20`,
                                borderColor: catColor,
                                color: '#fff',
                              } : {}}
                            >
                              <CategoryIcon name={catIcon} size={10} />
                              {cat}
                              <span className="text-[10px] px-1.5 rounded-full"
                                    style={{ background: isSelected ? `${catColor}30` : 'rgba(255,255,255,0.04)', color: isSelected ? '#fff' : '#4a4a54' }}>
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

                {/* RouteBuilder slot */}
                <div id="route-builder-slot" className="border-t p-4 shrink-0"
                     style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'var(--color-surface-1)' }}>
                  <RouteBuilder
                    roomId={room?.id ?? ''}
                    userId={user?.id}
                    availablePlaces={bucketItems}
                    editingRoute={editingRoute}
                    onClearEditing={() => {
                      if (editingRoute) setSelectedRouteId(editingRoute.id);
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
