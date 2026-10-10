import { useState, useEffect, useRef } from 'react';
import type { BucketLocation, ProposedRoute } from '../lib/types';
import { computeRoutes } from '../lib/routes';
import { supabase } from '../lib/supabase';
import { SortableList } from './SortableList';
import { getCategoryColor, getCategoryIcon, type PlaceCategory } from '../lib/categories';
import {
  Car, Footprints, Wand2, ChevronRight, GripVertical,
  X, Pencil, Check, Loader2, Route, Clock, Ruler, ArrowLeft,
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
  const [preview, setPreview] = useState<{
    stops: RouteStop[];
    route: any;
    routeName: string;
  } | null>(null);

  const lastLoadedRouteIdRef = useRef<string | null>(null);

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

  const handleAddStop = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const placeId = e.target.value;
    if (!placeId) return;
    const place = availablePlaces.find(p => p.id === placeId);
    if (place && !stops.find(s => s.id === placeId) && stops.length < 6) {
      setStops([...stops, toRouteStop(place)]);
    }
    e.target.value = ''; // reset select
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
        origin: { placeId: newStops[0].place_id },
        destination: { placeId: newStops[newStops.length - 1].place_id },
        intermediates: newStops.slice(1, -1).map(s => ({ placeId: s.place_id })),
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

  const handleComputeRoute = async (optimize: boolean) => {
    if (!userId || stops.length < 2) return;
    setIsComputing(true);
    setErrorStr(null);

    // Google Maps Routes API only reorders intermediate stops.
    // Optimization requires at least 2 intermediate stops (4+ stops total).
    const canOptimize = optimize && stops.length > 3;

    try {
      const response = await computeRoutes({
        origin: { placeId: stops[0].place_id },
        destination: { placeId: stops[stops.length - 1].place_id },
        intermediates: stops.slice(1, -1).map(s => ({ placeId: s.place_id })),
        travelMode,
        optimizeWaypointOrder: canOptimize,
      });

      if (!response.routes || response.routes.length === 0) {
        throw new Error('No routes found');
      }

      const route = response.routes[0];
      
      let finalStops = [...stops];
      const intermediates = stops.slice(1, -1);
      const optIndices = route.optimizedIntermediateWaypointIndex;

      // Validate permutation indices returned from Routes API
      if (
        canOptimize && 
        Array.isArray(optIndices) && 
        optIndices.length === intermediates.length &&
        optIndices.every((idx: number) => typeof idx === 'number' && idx >= 0 && idx < intermediates.length)
      ) {
        const reorderedIntermediates = optIndices.map((idx: number) => intermediates[idx]);
        finalStops = [stops[0], ...reorderedIntermediates, stops[stops.length - 1]];
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

  const handleSavePreview = async () => {
    if (!userId || !preview) return;
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
          created_by: userId,
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

  const remainingPlaces = availablePlaces.filter(p => !stops.find(s => s.id === p.id));
  const builderAvailableCategories = Array.from(
    new Set(remainingPlaces.map(p => (p.category || 'Attraction') as PlaceCategory))
  );

  const displayedPlaces = builderCategoryFilter === 'ALL'
    ? remainingPlaces
    : remainingPlaces.filter(p => (p.category || 'Attraction') === builderCategoryFilter);

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
                onClick={() => handleRemove(i)}
                className="p-0.5 rounded transition-colors flex-shrink-0"
                style={{ color: '#4a4a54' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                onMouseLeave={e => (e.currentTarget.style.color = '#4a4a54')}
              >
                <X size={12} />
              </button>
            </div>
          )}
        />
      )}

      {/* Add stop */}
      {stops.length < 6 && (
        <div className="flex flex-col gap-2">
          {/* Category filter pills */}
          {builderAvailableCategories.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="section-label">Filter by category</span>
                {builderCategoryFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setBuilderCategoryFilter('ALL')}
                    className="text-[10px] font-semibold"
                    style={{ color: '#f95d0f' }}
                  >
                    Show all ({remainingPlaces.length})
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setBuilderCategoryFilter('ALL')}
                  className={`cat-pill ${builderCategoryFilter === 'ALL' ? 'active' : ''}`}
                  style={builderCategoryFilter === 'ALL' ? { background: 'rgba(249,93,15,0.2)', borderColor: 'rgba(249,93,15,0.5)', color: '#fff' } : {}}
                >
                  All ({remainingPlaces.length})
                </button>
                {builderAvailableCategories.map((cat) => {
                  const isSelected = builderCategoryFilter === cat;
                  const catColor = getCategoryColor(cat);
                  const catIcon = getCategoryIcon(cat);
                  const count = remainingPlaces.filter(p => (p.category || 'Attraction') === cat).length;
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
            </div>
          )}

          {/* Dropdown */}
          <select
            onChange={handleAddStop}
            className="w-full text-xs px-3 py-2.5"
            value=""
          >
            <option value="" disabled>
              {builderCategoryFilter === 'ALL'
                ? `Add a stop… (${remainingPlaces.length} available)`
                : `Add ${builderCategoryFilter} stop… (${displayedPlaces.length} available)`}
            </option>
            {builderCategoryFilter === 'ALL' ? (
              builderAvailableCategories.map(cat => (
                <optgroup key={cat} label={cat}>
                  {remainingPlaces
                    .filter(p => (p.category || 'Attraction') === cat)
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </optgroup>
              ))
            ) : (
              displayedPlaces.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))
            )}
          </select>
        </div>
      )}

      {/* Travel mode + action buttons */}
      <div className="flex items-center justify-between gap-2">
        {/* Travel mode toggle */}
        <div className="flex items-center rounded-xl overflow-hidden"
             style={{ border: '1.5px solid rgba(255,255,255,0.07)' }}>
          <button
            type="button"
            onClick={() => setTravelMode('DRIVE')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all"
            style={travelMode === 'DRIVE' ? {
              background: 'rgba(249,93,15,0.2)',
              color: '#ff9a5c',
            } : {
              background: 'transparent',
              color: '#4a4a54',
            }}
          >
            <Car size={13} />
            Drive
          </button>
          <button
            type="button"
            onClick={() => setTravelMode('WALK')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all"
            style={travelMode === 'WALK' ? {
              background: 'rgba(249,93,15,0.2)',
              color: '#ff9a5c',
            } : {
              background: 'transparent',
              color: '#4a4a54',
            }}
          >
            <Footprints size={13} />
            Walk
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleComputeRoute(true)}
            disabled={stops.length < 4 || isComputing}
            className="btn btn-ghost !py-2 !px-3 text-xs gap-1.5"
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
