import { useState, useEffect, useRef } from 'react';
import type { BucketLocation, ProposedRoute } from '../lib/types';
import { computeRoutes } from '../lib/routes';
import { supabase } from '../lib/supabase';
import { SortableList } from './SortableList';
import { getCategoryColor, getCategoryIcon, type PlaceCategory } from '../lib/categories';
import {
  Car, Footprints, Wand2, ChevronRight, ChevronDown, GripVertical,
  X, Pencil, Check, Loader2, Route, Clock, Ruler, ArrowLeft, Search,
} from 'lucide-react';
import CategoryIcon from './CategoryIcon';

export interface RouteStop extends BucketLocation {
  _instanceId: string;
}

function toRouteStop(place: BucketLocation): RouteStop {
  return {
    ...place,
    _instanceId: `${place.id}-${Math.random().toString(36).slice(2, 9)}`,
  };
}

interface RouteBuilderProps {
  roomId: string;
  userId: string | undefined;
  availablePlaces: BucketLocation[];
  editingRoute?: ProposedRoute | null;
  onClearEditing?: () => void;
  onPreviewChange?: (preview: { stops: BucketLocation[]; route: any; routeName: string } | null) => void;
  onUpdateRoute?: (routeId: string, updates: Partial<ProposedRoute>) => Promise<void> | void;
  onRouteCreated?: (routeId: string) => void;
}

export default function RouteBuilder({ 
  roomId, 
  userId, 
  availablePlaces,
  editingRoute,
  onClearEditing,
  onPreviewChange,
  onUpdateRoute,
  onRouteCreated,
}: RouteBuilderProps) {
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [travelMode, setTravelMode] = useState<'DRIVE' | 'WALK'>('DRIVE');
  const [isComputing, setIsComputing] = useState(false);
  const [errorStr, setErrorStr] = useState<string | null>(null);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [routeName, setRouteName] = useState<string>('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [builderCategoryFilter, setBuilderCategoryFilter] = useState<PlaceCategory | 'ALL'>('ALL');
  const [placeSearchQuery, setPlaceSearchQuery] = useState<string>('');
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  const [preview, setPreview] = useState<{
    stops: RouteStop[];
    route: any;
    routeName: string;
  } | null>(null);

  const lastLoadedRouteIdRef = useRef<string | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setIsModeDropdownOpen(false);
      }
    }
    if (isModeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isModeDropdownOpen]);

  // Load editing route into builder & preview overlay
  useEffect(() => {
    if (editingRoute) {
      if (lastLoadedRouteIdRef.current === editingRoute.id) {
        return; // Already loaded this route into builder, don't re-initialize on unrelated renders
      }
      lastLoadedRouteIdRef.current = editingRoute.id;

      // Deduplicate place IDs to sanitize any corrupted historical database records
      const seen = new Set<string>();
      const matchingStops: RouteStop[] = [];

      for (const stopId of editingRoute.waypoint_order) {
        const place = availablePlaces.find(p => p.id === stopId || p.place_id === stopId);
        if (place && !seen.has(place.id)) {
          seen.add(place.id);
          matchingStops.push(toRouteStop(place));
        }
      }

      const initialRouteName = editingRoute.route_name ?? (matchingStops.length > 0 ? `${matchingStops[0].name} to ${matchingStops[matchingStops.length - 1].name}` : 'Custom Route');

      setStops(matchingStops);
      setTravelMode(editingRoute.travel_mode);
      setEditingRouteId(editingRoute.id);
      setRouteName(initialRouteName);
      
      const prev = {
        stops: matchingStops,
        route: {
          duration: `${(editingRoute.total_duration_mins ?? 0) * 60}s`,
          distanceMeters: editingRoute.total_distance_m ?? 0,
          polyline: { encodedPolyline: editingRoute.encoded_polyline ?? '' },
        },
        routeName: initialRouteName,
      };
      setPreview(prev);
      onPreviewChange?.(prev);
    } else {
      lastLoadedRouteIdRef.current = null;
      setRouteName('');
    }
  }, [editingRoute, availablePlaces]);

  const handleCancelOrDiscard = () => {
    setPreview(null);
    onPreviewChange?.(null);
    setEditingRouteId(null);
    lastLoadedRouteIdRef.current = null;
    setRouteName('');
    onClearEditing?.();
  };

  const handleQuickRename = async () => {
    if (!editingRouteId || !routeName.trim()) return;
    setIsSavingName(true);
    try {
      if (onUpdateRoute) {
        await onUpdateRoute(editingRouteId, { route_name: routeName.trim() });
      } else {
        await supabase
          .from('proposed_routes')
          .update({ route_name: routeName.trim() })
          .eq('id', editingRouteId);
      }
      if (preview) {
        const updated = { ...preview, routeName: routeName.trim() };
        setPreview(updated);
        onPreviewChange?.(updated);
      }
    } catch (err: any) {
      setErrorStr(err.message || 'Failed to update route name');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleToggleStop = (place: BucketLocation) => {
    const existingIndex = stops.findIndex(s => s.id === place.id || s.place_id === place.place_id);
    if (existingIndex !== -1) {
      setStops(stops.filter((_, i) => i !== existingIndex));
      setErrorStr(null);
    } else {
      if (stops.length >= 6) {
        setErrorStr('Maximum 6 stops allowed per route. Unselect a stop to add another.');
        return;
      }
      setErrorStr(null);
      setStops([...stops, toRouteStop(place)]);
    }
  };

  const handleRemove = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const handleMainReorder = (newStops: RouteStop[]) => {
    setStops(newStops);
  };

  const handlePreviewReorderDrop = async (newStops: RouteStop[]) => {
    if (!preview) return;
    
    // 1. Immediately update UI state synchronously so drag-and-drop animation is instant and smooth
    setStops(newStops);
    const immediatePrev = {
      ...preview,
      stops: newStops,
      route: {
        ...preview.route,
        polyline: { encodedPolyline: '' }, // Clear temporarily so stale polyline doesn't show in live changes layer
      },
      routeName: preview.routeName || `${newStops[0].name} to ${newStops[newStops.length - 1].name}`
    };
    setPreview(immediatePrev);
    onPreviewChange?.(immediatePrev);

    if (isComputing) return;

    // 2. Recompute the route polyline, duration, and distance in background
    setIsComputing(true);
    setErrorStr(null);
    try {
      const response = await computeRoutes({
        origin: { placeId: newStops[0].place_id, lat: newStops[0].lat, lng: newStops[0].lng },
        destination: { placeId: newStops[newStops.length - 1].place_id, lat: newStops[newStops.length - 1].lat, lng: newStops[newStops.length - 1].lng },
        intermediates: newStops.slice(1, -1).map(s => ({ placeId: s.place_id, lat: s.lat, lng: s.lng })),
        travelMode,
        optimizeWaypointOrder: false, // User manually reordered, so do not optimize
      });

      if (!response.routes || response.routes.length === 0) return;

      const route = response.routes[0];
      setPreview(prev => prev ? {
        ...prev,
        stops: newStops,
        route,
      } : null);
      onPreviewChange?.({
        stops: newStops,
        route,
        routeName: immediatePrev.routeName
      });
    } catch (err: any) {
      console.warn('Failed to recompute route:', err);
    } finally {
      setIsComputing(false);
    }
  };

  const handleComputeRoute = async (optimize: boolean, modeToUse?: 'DRIVE' | 'WALK', stopsToUse?: RouteStop[]) => {
    const activeStops = stopsToUse || stops;
    if (activeStops.length < 2) return;
    const activeMode = modeToUse || travelMode;
    setIsComputing(true);
    setErrorStr(null);

    // Google Maps Routes API only reorders intermediate stops.
    // Optimization requires at least 2 intermediate stops (4+ stops total).
    const canOptimize = optimize && activeStops.length > 3;

    try {
      const response = await computeRoutes({
        origin: { placeId: activeStops[0].place_id, lat: activeStops[0].lat, lng: activeStops[0].lng },
        destination: { placeId: activeStops[activeStops.length - 1].place_id, lat: activeStops[activeStops.length - 1].lat, lng: activeStops[activeStops.length - 1].lng },
        intermediates: activeStops.slice(1, -1).map(s => ({ placeId: s.place_id, lat: s.lat, lng: s.lng })),
        travelMode: activeMode,
        optimizeWaypointOrder: canOptimize,
      });

      if (!response.routes || response.routes.length === 0) {
        throw new Error('No routes found');
      }

      const route = response.routes[0];
      
      let finalStops = [...activeStops];
      const intermediates = activeStops.slice(1, -1);
      const optIndices = route.optimizedIntermediateWaypointIndex;

      // Validate permutation indices returned from Routes API
      if (
        canOptimize && 
        Array.isArray(optIndices) && 
        optIndices.length === intermediates.length &&
        optIndices.every((idx: number) => typeof idx === 'number' && idx >= 0 && idx < intermediates.length)
      ) {
        const reorderedIntermediates = optIndices.map((idx: number) => intermediates[idx]);
        finalStops = [activeStops[0], ...reorderedIntermediates, activeStops[activeStops.length - 1]];
      }

      const defaultName = finalStops.length >= 2 
        ? `${finalStops[0].name} to ${finalStops[finalStops.length - 1].name}` 
        : 'Custom Route';
      const finalRouteName = routeName.trim() || preview?.routeName?.trim() || defaultName;
      
      // Open preview modal instead of saving
      const newPrev = {
        stops: finalStops,
        route,
        routeName: finalRouteName
      };
      setPreview(newPrev);
      onPreviewChange?.(newPrev);

    } catch (err: any) {
      setErrorStr(err.message || 'Failed to compute route');
    } finally {
      setIsComputing(false);
    }
  };

  const handleTravelModeChange = async (newMode: 'DRIVE' | 'WALK') => {
    setTravelMode(newMode);
    const activeStops = preview?.stops || stops;
    if (activeStops.length >= 2) {
      await handleComputeRoute(false, newMode, activeStops);
    }
  };

  const handleSavePreview = async () => {
    if (!preview) return;
    try {
      const defaultName = preview.stops.length >= 2 
        ? `${preview.stops[0].name} to ${preview.stops[preview.stops.length - 1].name}` 
        : 'Custom Route';
      const finalRouteName = preview.routeName.trim() || routeName.trim() || defaultName;

      const routeData = {
        route_name: finalRouteName,
        travel_mode: travelMode,
        waypoint_order: preview.stops.map(s => s.place_id || s.id),
        total_duration_mins: Math.round(parseInt(preview.route.duration) / 60),
        total_distance_m: preview.route.distanceMeters,
        encoded_polyline: preview.route.polyline.encodedPolyline,
      };

      if (editingRouteId) {
        if (onUpdateRoute) {
          await onUpdateRoute(editingRouteId, routeData);
        } else {
          await supabase.from('proposed_routes').update(routeData).eq('id', editingRouteId);
        }
      } else {
        const { data, error } = await supabase.from('proposed_routes').insert({
          room_id: roomId,
          created_by: userId || null,
          ...routeData,
        }).select().single();
        if (error) throw error;
        if (data && onRouteCreated) {
          onRouteCreated(data.id);
        }
      }

      setStops([]); // clear builder
      handleCancelOrDiscard();
    } catch (err: any) {
      setErrorStr(err.message || 'Failed to save route');
    }
  };

  const builderAvailableCategories = Array.from(
    new Set(availablePlaces.map(p => (p.category || 'Attraction') as PlaceCategory))
  );

  const displayedPlaces = availablePlaces.filter(p => {
    const matchesCategory = builderCategoryFilter === 'ALL' || (p.category || 'Attraction') === builderCategoryFilter;
    const matchesSearch = !placeSearchQuery.trim() || p.name.toLowerCase().includes(placeSearchQuery.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Route size={15} style={{ color: '#f95d0f' }} />
          <h3 className="font-display font-bold text-sm" style={{ color: '#e8e8ec' }}>
            {editingRouteId ? 'Edit Route' : 'Build a Route'}
          </h3>
        </div>
        {editingRouteId && (
          <button
            onClick={handleCancelOrDiscard}
            className="text-xs font-medium transition-colors"
            style={{ color: '#4a4a54' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e8e8ec')}
            onMouseLeave={e => (e.currentTarget.style.color = '#4a4a54')}
          >
            Cancel Edit
          </button>
        )}
      </div>

      {/* Route name field */}
      {editingRouteId ? (
        <div className="flex flex-col gap-2 p-3 rounded-xl"
             style={{ background: 'rgba(249,93,15,0.06)', border: '1.5px solid rgba(249,93,15,0.2)' }}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#ff9a5c' }}>
              <Pencil size={11} />
              Edit Route Name
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(249,93,15,0.15)', color: '#ff9a5c' }}>
              {stops.length} stops
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={routeName}
              onChange={(e) => {
                const val = e.target.value;
                setRouteName(val);
                if (preview) {
                  const updated = { ...preview, routeName: val };
                  setPreview(updated);
                  onPreviewChange?.(updated);
                }
              }}
              placeholder="Enter route name"
              className="flex-1 text-xs px-3 py-2"
            />
            {editingRoute && routeName.trim() && routeName.trim() !== (editingRoute.route_name || '') && (
              <button
                type="button"
                onClick={handleQuickRename}
                disabled={isSavingName}
                className="btn btn-success !py-2 !px-3 text-xs"
                title="Save updated route name immediately"
              >
                {isSavingName ? <Loader2 size={13} className="animate-spin" /> : <><Check size={12} /> Save</>}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="section-label">Route Name</span>
            {routeName.trim() && (
              <span className="text-[10px]" style={{ color: '#f95d0f' }}>Custom title</span>
            )}
          </div>
          <input
            type="text"
            value={routeName}
            onChange={(e) => {
              const val = e.target.value;
              setRouteName(val);
              if (preview) {
                const updated = { ...preview, routeName: val };
                setPreview(updated);
                onPreviewChange?.(updated);
              }
            }}
            placeholder={
              stops.length >= 2
                ? `${stops[0].name} → ${stops[stops.length - 1].name}`
                : 'Name this route (e.g., Morning Food Tour)'
            }
            className="w-full text-xs px-3 py-2"
          />
        </div>
      )}

      {/* Error */}
      {errorStr && (
        <div className="text-xs px-3 py-2 rounded-xl"
             style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
          {errorStr}
        </div>
      )}

      {/* Stops list */}
      {stops.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="section-label">Route sequence (drag to reorder)</span>
            <button
              type="button"
              onClick={() => {
                setStops([]);
                setErrorStr(null);
              }}
              className="text-[10px] font-medium transition-colors"
              style={{ color: '#6a6a76' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6a6a76')}
            >
              Clear all
            </button>
          </div>
          <SortableList
            items={stops}
            onReorder={handleMainReorder}
            keyExtractor={(s) => s._instanceId}
            renderItem={(stop, i, dragHandleProps, isDragging) => (
              <div
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs transition-all"
                style={{
                  background: isDragging ? 'rgba(249,93,15,0.1)' : 'var(--color-surface-3)',
                  border: `1.5px solid ${isDragging ? 'rgba(249,93,15,0.4)' : 'rgba(255,255,255,0.07)'}`,
                }}
              >
                <div
                  {...dragHandleProps}
                  className="cursor-grab active:cursor-grabbing outline-none flex-shrink-0"
                  style={{ color: '#3a3a42' }}
                  title="Drag to reorder"
                >
                  <GripVertical size={14} />
                </div>
                <span
                  className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0 text-white"
                  style={{ background: '#f95d0f' }}
                >
                  {i + 1}
                </span>
                <span className="flex-1 truncate" style={{ color: '#e8e8ec' }}>{stop.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="p-0.5 rounded transition-colors flex-shrink-0"
                  style={{ color: '#4a4a54' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#4a4a54')}
                  title="Remove stop"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          />
        </div>
      )}

      {/* Choose stops multi-select list */}
      <div className="flex flex-col gap-2">
        {/* Section header with selected count indicator */}
        <div className="flex items-center justify-between">
          <span className="section-label">
            Choose stops from bucket list
          </span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: stops.length >= 6 ? 'rgba(239,68,68,0.15)' : 'rgba(249,93,15,0.12)',
              color: stops.length >= 6 ? '#f87171' : '#ff9a5c',
              border: `1px solid ${stops.length >= 6 ? 'rgba(239,68,68,0.3)' : 'rgba(249,93,15,0.25)'}`,
            }}
          >
            {stops.length >= 6 ? '6/6 (Max)' : `${stops.length}/6 selected`}
          </span>
        </div>

        {/* Category filter pills */}
        {builderAvailableCategories.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setBuilderCategoryFilter('ALL')}
              className={`cat-pill ${builderCategoryFilter === 'ALL' ? 'active' : ''}`}
              style={builderCategoryFilter === 'ALL' ? { background: 'rgba(249,93,15,0.2)', borderColor: 'rgba(249,93,15,0.5)', color: '#fff' } : {}}
            >
              All ({availablePlaces.length})
            </button>
            {builderAvailableCategories.map((cat) => {
              const isSelected = builderCategoryFilter === cat;
              const catColor = getCategoryColor(cat);
              const catIcon = getCategoryIcon(cat);
              const count = availablePlaces.filter(p => (p.category || 'Attraction') === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setBuilderCategoryFilter(isSelected ? 'ALL' : cat)}
                  className="cat-pill"
                  style={isSelected ? {
                    background: `${catColor}20`,
                    borderColor: catColor,
                    color: '#fff',
                  } : {}}
                >
                  <CategoryIcon name={catIcon} size={10} />
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Quick search if more than 4 places */}
        {availablePlaces.length > 4 && (
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#6a6a76' }} />
            <input
              type="text"
              value={placeSearchQuery}
              onChange={(e) => setPlaceSearchQuery(e.target.value)}
              placeholder="Search places…"
              className="w-full text-xs pl-7 pr-3 py-1.5 rounded-xl border"
              style={{
                background: 'var(--color-surface-2)',
                borderColor: 'rgba(255,255,255,0.06)',
                color: '#e8e8ec',
              }}
            />
            {placeSearchQuery && (
              <button
                type="button"
                onClick={() => setPlaceSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors"
                style={{ color: '#6a6a76' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#e8e8ec')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6a6a76')}
              >
                <X size={11} />
              </button>
            )}
          </div>
        )}

        {/* Places list with small selection bubbles */}
        {availablePlaces.length === 0 ? (
          <div className="p-3.5 rounded-xl text-center" style={{ background: 'var(--color-surface-2)', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <p className="text-xs font-medium" style={{ color: '#8a8a96' }}>
              No places in bucket list yet.
            </p>
            <p className="text-[10px] mt-1" style={{ color: '#6a6a76' }}>
              Add places to your bucket list to start creating routes.
            </p>
          </div>
        ) : displayedPlaces.length === 0 ? (
          <div className="p-3 rounded-xl text-center" style={{ background: 'var(--color-surface-2)', border: '1px dashed rgba(255,255,255,0.08)' }}>
            <p className="text-xs" style={{ color: '#8a8a96' }}>
              No places match your search.
            </p>
            <button
              type="button"
              onClick={() => { setBuilderCategoryFilter('ALL'); setPlaceSearchQuery(''); }}
              className="text-[10px] font-semibold mt-1"
              style={{ color: '#f95d0f' }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="max-h-52 overflow-y-auto flex flex-col gap-1.5 pr-1 no-scrollbar">
            {displayedPlaces.map((place) => {
              const stopIndex = stops.findIndex(s => s.id === place.id || s.place_id === place.place_id);
              const isChosen = stopIndex !== -1;
              const sequenceNum = stopIndex + 1;
              const isMaxReached = stops.length >= 6 && !isChosen;
              const catColor = getCategoryColor((place.category || 'Attraction') as PlaceCategory);
              const catIcon = getCategoryIcon((place.category || 'Attraction') as PlaceCategory);

              return (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => handleToggleStop(place)}
                  disabled={isMaxReached}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                    isMaxReached ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-white/15'
                  }`}
                  style={{
                    background: isChosen ? 'rgba(249,93,15,0.08)' : 'var(--color-surface-2)',
                    border: `1.5px solid ${isChosen ? 'rgba(249,93,15,0.35)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {/* Left: Category icon & Place metadata */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: `${catColor}18`,
                        color: catColor,
                        border: `1px solid ${catColor}30`,
                      }}
                    >
                      <CategoryIcon name={catIcon} size={11} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span
                        className="text-xs font-semibold truncate leading-tight"
                        style={{ color: isChosen ? '#ff9a5c' : '#e8e8ec' }}
                      >
                        {place.name}
                      </span>
                      <div className="flex items-center gap-2 text-[10px]" style={{ color: '#6a6a76' }}>
                        <span className="truncate">{place.category || 'Attraction'}</span>
                        {place.rating != null && (
                          <span className="flex items-center gap-0.5 text-[#fbbf24] shrink-0 font-medium">
                            ★ {place.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Small bubble that fills when chosen */}
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-200"
                    style={isChosen ? {
                      background: 'linear-gradient(135deg, #ff7a38 0%, #f95d0f 100%)',
                      boxShadow: '0 2px 8px rgba(249,93,15,0.35)',
                      border: '1.5px solid #ff9a5c',
                    } : {
                      background: 'rgba(255,255,255,0.03)',
                      border: '1.5px solid rgba(255,255,255,0.22)',
                    }}
                    title={isChosen ? `Stop #${sequenceNum} (click to remove)` : 'Click to add stop'}
                  >
                    {isChosen ? (
                      <span className="text-[10px] font-black text-white leading-none">
                        {sequenceNum}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Travel mode dropdown + action buttons */}
      <div className="flex items-center justify-between gap-2 pt-1">
        {/* Travel mode dropdown selector */}
        <div className="relative shrink-0" ref={modeDropdownRef}>
          <button
            type="button"
            onClick={() => setIsModeDropdownOpen(prev => !prev)}
            disabled={isComputing}
            className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer disabled:opacity-50"
            style={{
              background: 'var(--color-surface-2)',
              borderColor: isModeDropdownOpen ? 'rgba(249,93,15,0.4)' : 'rgba(255,255,255,0.08)',
              color: travelMode === 'DRIVE' ? '#ff9a5c' : '#34d399',
              boxShadow: isModeDropdownOpen ? '0 0 10px rgba(249,93,15,0.15)' : 'none',
            }}
            title="Choose travel mode"
          >
            {isComputing ? (
              <Loader2 size={13} className="animate-spin text-[#f95d0f]" />
            ) : travelMode === 'DRIVE' ? (
              <Car size={13} style={{ color: '#ff9a5c' }} />
            ) : (
              <Footprints size={13} style={{ color: '#34d399' }} />
            )}
            <span className="font-medium" style={{ color: '#e8e8ec' }}>
              {travelMode === 'DRIVE' ? 'Drive' : 'Walk'}
            </span>
            <ChevronDown
              size={12}
              className="transition-transform duration-200"
              style={{
                color: '#6a6a76',
                transform: isModeDropdownOpen ? 'rotate(180deg)' : 'none',
              }}
            />
          </button>

          {/* Dropdown menu popover */}
          {isModeDropdownOpen && (
            <div
              className="absolute bottom-full mb-2 left-0 z-50 w-48 rounded-2xl border p-1.5 flex flex-col gap-1 shadow-2xl backdrop-blur-xl"
              style={{
                background: '#151518',
                borderColor: 'rgba(255,255,255,0.1)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
              }}
            >
              <div className="px-2.5 py-1 border-b mb-0.5" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <span className="section-label text-[10px]">Travel Mode</span>
              </div>

              {/* Drive option */}
              <button
                type="button"
                onClick={() => {
                  setIsModeDropdownOpen(false);
                  handleTravelModeChange('DRIVE');
                }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer group"
                style={{
                  background: travelMode === 'DRIVE' ? 'rgba(249,93,15,0.15)' : 'transparent',
                }}
                onMouseEnter={e => {
                  if (travelMode !== 'DRIVE') e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={e => {
                  if (travelMode !== 'DRIVE') e.currentTarget.style.background = 'transparent';
                }}
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: travelMode === 'DRIVE' ? 'rgba(249,93,15,0.25)' : 'rgba(255,255,255,0.06)',
                    color: travelMode === 'DRIVE' ? '#ff9a5c' : '#8a8a96',
                  }}
                >
                  <Car size={13} />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs font-semibold leading-tight" style={{ color: travelMode === 'DRIVE' ? '#ff9a5c' : '#e8e8ec' }}>
                    Drive
                  </span>
                  <span className="text-[10px] truncate" style={{ color: '#6a6a76' }}>
                    Live traffic
                  </span>
                </div>
                {travelMode === 'DRIVE' && (
                  <Check size={13} style={{ color: '#ff9a5c' }} className="shrink-0" />
                )}
              </button>

              {/* Walk option */}
              <button
                type="button"
                onClick={() => {
                  setIsModeDropdownOpen(false);
                  handleTravelModeChange('WALK');
                }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer group"
                style={{
                  background: travelMode === 'WALK' ? 'rgba(52,211,153,0.15)' : 'transparent',
                }}
                onMouseEnter={e => {
                  if (travelMode !== 'WALK') e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={e => {
                  if (travelMode !== 'WALK') e.currentTarget.style.background = 'transparent';
                }}
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: travelMode === 'WALK' ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.06)',
                    color: travelMode === 'WALK' ? '#34d399' : '#8a8a96',
                  }}
                >
                  <Footprints size={13} />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs font-semibold leading-tight" style={{ color: travelMode === 'WALK' ? '#34d399' : '#e8e8ec' }}>
                    Walk
                  </span>
                  <span className="text-[10px] truncate" style={{ color: '#6a6a76' }}>
                    Footpaths
                  </span>
                </div>
                {travelMode === 'WALK' && (
                  <Check size={13} style={{ color: '#34d399' }} className="shrink-0" />
                )}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => handleComputeRoute(true)}
            disabled={stops.length < 4 || isComputing}
            className="btn btn-ghost !py-2 !px-2.5 text-xs gap-1.5"
            title="Reorders stops to minimize travel time (needs 4+ stops)"
          >
            <Wand2 size={12} />
            Optimize
          </button>
          <button
            onClick={() => handleComputeRoute(false)}
            disabled={stops.length < 2 || isComputing}
            className="btn btn-primary !py-2 !px-3 text-xs gap-1.5"
          >
            {isComputing
              ? <><Loader2 size={13} className="animate-spin" /> Computing…</>
              : <>{editingRouteId ? 'Preview & Update' : 'Preview Route'}<ChevronRight size={13} /></>
            }
          </button>
        </div>
      </div>

      {/* ── Preview overlay ── */}
      {preview && (
        <div className="absolute inset-0 z-50 flex flex-col"
             style={{ background: 'var(--color-surface-1)' }}>
          {/* Overlay header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b shrink-0"
               style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <Route size={16} style={{ color: '#f95d0f' }} />
              <h3 className="font-display font-bold text-base" style={{ color: '#e8e8ec' }}>
                {editingRouteId ? 'Edit Route' : 'Route Preview'}
              </h3>
              {editingRouteId && (
                <span className="badge" style={{ background: 'rgba(249,93,15,0.15)', color: '#ff9a5c', borderColor: 'rgba(249,93,15,0.3)' }}>
                  Editing
                </span>
              )}
            </div>
            <button
              onClick={handleCancelOrDiscard}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: '#4a4a54' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e8e8ec')}
              onMouseLeave={e => (e.currentTarget.style.color = '#4a4a54')}
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {/* Route name */}
            <div>
              <label className="section-label mb-2 block">Route Name</label>
              <input
                type="text"
                value={preview.routeName}
                onChange={(e) => {
                  const val = e.target.value;
                  setRouteName(val);
                  const updated = { ...preview, routeName: val };
                  setPreview(updated);
                  onPreviewChange?.(updated);
                }}
                className="w-full text-xs px-3 py-2.5"
                placeholder="Route name"
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col items-center p-3 rounded-xl"
                   style={{ background: 'var(--color-surface-3)', border: '1.5px solid rgba(255,255,255,0.06)' }}>
                <Clock size={14} style={{ color: editingRouteId ? '#10b981' : '#f95d0f', marginBottom: 4 }} />
                <div className="section-label mb-0.5">Time</div>
                <div className="text-sm font-bold" style={{ color: editingRouteId ? '#6ee7b7' : '#ff9a5c' }}>
                  {Math.round(parseInt(preview.route.duration) / 60)} min
                </div>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl"
                   style={{ background: 'var(--color-surface-3)', border: '1.5px solid rgba(255,255,255,0.06)' }}>
                <Ruler size={14} style={{ color: editingRouteId ? '#10b981' : '#f95d0f', marginBottom: 4 }} />
                <div className="section-label mb-0.5">Distance</div>
                <div className="text-sm font-bold" style={{ color: editingRouteId ? '#6ee7b7' : '#ff9a5c' }}>
                  {(preview.route.distanceMeters / 1000).toFixed(1)} km
                </div>
              </div>
            </div>

            {/* Travel Mode Selector in Preview / Edit */}
            <div className="flex items-center justify-between p-2.5 rounded-xl"
                 style={{ background: 'var(--color-surface-3)', border: '1.5px solid rgba(255,255,255,0.06)' }}>
              <div className="flex flex-col">
                <span className="section-label">Travel Mode</span>
                <span className="text-[10px] font-medium" style={{ color: '#6a6a76' }}>
                  {isComputing ? 'Recalculating route…' : travelMode === 'DRIVE' ? 'Driving with traffic' : 'Walking route path'}
                </span>
              </div>
              <div className="flex items-center rounded-xl overflow-hidden p-0.5"
                   style={{ background: 'var(--color-surface-2)', border: '1.5px solid rgba(255,255,255,0.08)' }}>
                <button
                  type="button"
                  onClick={() => handleTravelModeChange('DRIVE')}
                  disabled={isComputing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-50"
                  style={travelMode === 'DRIVE' ? {
                    background: 'rgba(249,93,15,0.25)',
                    color: '#ff9a5c',
                    boxShadow: '0 2px 8px rgba(249,93,15,0.2)',
                  } : {
                    background: 'transparent',
                    color: '#6a6a76',
                  }}
                >
                  {isComputing && travelMode === 'DRIVE' ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Car size={12} />
                  )}
                  Drive
                </button>
                <button
                  type="button"
                  onClick={() => handleTravelModeChange('WALK')}
                  disabled={isComputing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-50"
                  style={travelMode === 'WALK' ? {
                    background: 'rgba(249,93,15,0.25)',
                    color: '#ff9a5c',
                    boxShadow: '0 2px 8px rgba(249,93,15,0.2)',
                  } : {
                    background: 'transparent',
                    color: '#6a6a76',
                  }}
                >
                  {isComputing && travelMode === 'WALK' ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Footprints size={12} />
                  )}
                  Walk
                </button>
              </div>
            </div>

            {/* Editing map comparison legend */}
            {editingRouteId && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl text-xs"
                   style={{ background: 'var(--color-surface-3)', border: '1.5px solid rgba(255,255,255,0.06)' }}>
                <span className="font-medium" style={{ color: '#6a6a76' }}>Map comparison:</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 font-semibold" style={{ color: '#60a5fa' }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3b82f6' }} /> Original
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold" style={{ color: '#34d399' }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#10b981', boxShadow: '0 0 6px #10b981' }} /> Live
                  </span>
                </div>
              </div>
            )}

            {/* Stops sequence */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="section-label">Stops (drag to reorder)</span>
                <button
                  onClick={() => { setPreview(null); onPreviewChange?.(null); }}
                  className="flex items-center gap-1 text-xs font-medium transition-colors"
                  style={{ color: '#4a4a54' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f95d0f')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#4a4a54')}
                >
                  <ArrowLeft size={11} />
                  Edit stops
                </button>
              </div>

              <SortableList
                items={preview.stops}
                onReorder={handlePreviewReorderDrop}
                keyExtractor={(s) => s._instanceId}
                renderItem={(s, i, dragHandleProps, isDragging) => (
                  <div
                    className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-sm transition-all"
                    style={{
                      background: isDragging
                        ? (editingRouteId ? 'rgba(16,185,129,0.1)' : 'rgba(249,93,15,0.1)')
                        : 'var(--color-surface-3)',
                      border: `1.5px solid ${isDragging
                        ? (editingRouteId ? 'rgba(16,185,129,0.4)' : 'rgba(249,93,15,0.4)')
                        : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    <div
                      {...dragHandleProps}
                      className={`outline-none flex-shrink-0 ${isComputing ? 'opacity-30 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
                      style={{ color: '#3a3a42' }}
                    >
                      <GripVertical size={14} />
                    </div>
                    <span
                      className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0 text-white"
                      style={{ background: editingRouteId ? '#10b981' : '#f95d0f' }}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-xs" style={{ color: '#e8e8ec' }}>{s.name}</span>
                  </div>
                )}
              />
            </div>
          </div>

          {/* Overlay actions */}
          <div className="px-4 py-3 border-t flex gap-2 shrink-0"
               style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <button className="btn btn-secondary flex-1" onClick={handleCancelOrDiscard}>
              {editingRouteId ? 'Cancel' : 'Discard'}
            </button>
            <button
              className={`btn flex-1 ${editingRouteId ? '' : 'btn-primary'}`}
              style={editingRouteId ? {
                background: 'linear-gradient(135deg, #059669, #047857)',
                color: 'white',
                boxShadow: '0 4px 16px rgba(5,150,105,0.35)',
              } : undefined}
              onClick={handleSavePreview}
              disabled={isComputing}
            >
              {editingRouteId ? 'Update Route' : 'Save Route'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
