import { useState, useEffect, useRef } from 'react';
import type { BucketLocation, ProposedRoute } from '../lib/types';
import { computeRoutes } from '../lib/routes';
import { supabase } from '../lib/supabase';
import { SortableList } from './SortableList';
import { getCategoryColor, getCategoryIcon, type PlaceCategory } from '../lib/categories';

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
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white text-sm">
          {editingRouteId ? 'Edit Route' : 'Build a Route'}
        </h3>
        {editingRouteId && (
          <button 
            onClick={handleCancelOrDiscard}
            className="text-[11px] text-slate-400 hover:text-white underline"
          >
            Cancel Edit
          </button>
        )}
      </div>

      {editingRouteId ? (
        <div className="bg-indigo-950/40 border border-indigo-500/30 p-2.5 rounded-lg flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-indigo-300 flex items-center gap-1.5">
              <span>✏️</span>
              <span>Edit Route Name</span>
            </span>
            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
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
              className="flex-1 bg-slate-800/90 border border-slate-700 focus:border-indigo-500 text-white text-xs rounded p-2 outline-none transition-colors"
            />
            {editingRoute && routeName.trim() && routeName.trim() !== (editingRoute.route_name || '') && (
              <button
                type="button"
                onClick={handleQuickRename}
                disabled={isSavingName}
                className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded transition-colors whitespace-nowrap shadow-sm disabled:opacity-50"
                title="Save updated route name immediately"
              >
                {isSavingName ? '...' : 'Save Name'}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Create Mode: Route Name Field */
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
            <span>Route Name</span>
            {routeName.trim() && (
              <span className="text-[10px] text-indigo-400 font-normal">Custom title</span>
            )}
          </label>
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
                ? `${stops[0].name} to ${stops[stops.length - 1].name}` 
                : 'Name this route (e.g., Morning Food Tour)'
            }
            className="w-full bg-slate-800/90 border border-slate-700/80 focus:border-indigo-500 text-white text-xs rounded p-2 outline-none transition-colors placeholder-slate-500"
          />
        </div>
      )}
      
      {errorStr && (
        <div className="bg-red-900/50 border border-red-500/50 text-red-200 text-xs p-2 rounded">
          {errorStr}
        </div>
      )}

      {stops.length > 0 && (
        <SortableList
          items={stops}
          onReorder={handleMainReorder}
          keyExtractor={(s) => s._instanceId}
          renderItem={(stop, i, dragHandleProps, isDragging) => (
            <div 
              className={`flex items-center gap-2 bg-slate-800/50 p-2 rounded text-xs border transition-colors ${isDragging ? 'border-indigo-500 shadow-lg' : 'border-slate-700/50'} bg-surface-1/90 backdrop-blur`}
            >
              <div 
                {...dragHandleProps} 
                className="flex items-center gap-1 cursor-grab active:cursor-grabbing text-slate-500 hover:text-white pl-1 pr-1 outline-none"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
              </div>
              <span className="w-4 h-4 flex items-center justify-center bg-indigo-500/20 text-indigo-400 rounded-full flex-shrink-0 text-[10px] font-bold">
                {i + 1}
              </span>
              <span className="flex-1 truncate text-white">{stop.name}</span>
              <div className="flex items-center">
                <button onClick={() => handleRemove(i)} className="px-1 ml-1 text-red-400 hover:text-red-300">✕</button>
              </div>
            </div>
          )}
        />
      )}

      {stops.length < 6 && (
        <div className="flex flex-col gap-2 mt-1">
          {/* Quick Category Filter for Available Stops */}
          {builderAvailableCategories.length > 1 && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold">
                  Filter places by category:
                </span>
                {builderCategoryFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setBuilderCategoryFilter('ALL')}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold underline"
                  >
                    Show all ({remainingPlaces.length})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                <button
                  type="button"
                  onClick={() => setBuilderCategoryFilter('ALL')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap transition-all border ${
                    builderCategoryFilter === 'ALL'
                      ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
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
                      className="px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap transition-all border flex items-center gap-1 shadow-sm"
                      style={{
                        backgroundColor: isSelected ? `${catColor}25` : 'rgba(30, 41, 59, 0.7)',
                        borderColor: isSelected ? catColor : 'rgba(51, 65, 85, 0.6)',
                        color: isSelected ? '#ffffff' : '#94a3b8',
                      }}
                    >
                      <span>{catIcon}</span>
                      <span>{cat}</span>
                      <span className="opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add Stop Dropdown */}
          <select 
            onChange={handleAddStop} 
            className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded p-2 outline-none focus:border-indigo-500 transition-colors"
            value=""
          >
            <option value="" disabled>
              {builderCategoryFilter === 'ALL'
                ? `+ Add stop (${remainingPlaces.length} places available)`
                : `+ Add ${getCategoryIcon(builderCategoryFilter)} ${builderCategoryFilter} stop (${displayedPlaces.length} available)`}
            </option>
            {builderCategoryFilter === 'ALL' ? (
              // Grouped by Category in the dropdown
              builderAvailableCategories.map(cat => (
                <optgroup key={cat} label={`${getCategoryIcon(cat)} ${cat}`}>
                  {remainingPlaces
                    .filter(p => (p.category || 'Attraction') === cat)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              ))
            ) : (
              // Filtered by Selected Category
              displayedPlaces.map(p => (
                <option key={p.id} value={p.id}>
                  {getCategoryIcon(p.category)} {p.name}
                </option>
              ))
            )}
          </select>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-2">
        <select 
          value={travelMode} 
          onChange={(e) => setTravelMode(e.target.value as 'DRIVE' | 'WALK')}
          className="bg-slate-800 border border-slate-700 text-white text-xs rounded p-1.5 outline-none"
        >
          <option value="DRIVE">🚗 Drive</option>
          <option value="WALK">🚶 Walk</option>
        </select>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleComputeRoute(true)}
            disabled={stops.length < 4 || isComputing}
            className="btn btn-secondary !py-1.5 !px-3 text-xs border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
            title="Automatically reorders intermediate stops to save time (needs 4+ stops)"
          >
            {isComputing ? '...' : '✨ Optimize'}
          </button>
          <button 
            onClick={() => handleComputeRoute(false)}
            disabled={stops.length < 2 || isComputing}
            className="btn btn-primary !py-1.5 !px-3 text-xs"
          >
            {isComputing ? '...' : (editingRouteId ? 'Preview & Update' : 'Preview Route')}
          </button>
        </div>
      </div>

      {/* Preview Sidebar Overlay */}
      {preview && (
        <div className="absolute inset-0 z-50 bg-[#0f0f1a] flex flex-col animate-in slide-in-from-right-full duration-300">
          <div className="p-4 border-b border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-lg">
                {editingRouteId ? 'Edit Route' : 'Route Preview'}
              </h3>
              {editingRouteId && (
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-[10px] font-bold">
                  Editing
                </span>
              )}
            </div>
            <button onClick={handleCancelOrDiscard} className="text-slate-400 hover:text-white">✕</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {/* Editable Route Name */}
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">Route Name</label>
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
                className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded p-2 outline-none focus:border-indigo-500"
                placeholder="Route name"
              />
            </div>

            <div className={`flex justify-between items-center p-3 rounded-lg border transition-colors ${editingRouteId ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
              <div className="text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Time</div>
                <div className={`font-bold ${editingRouteId ? 'text-emerald-400' : 'text-indigo-400'}`}>{Math.round(parseInt(preview.route.duration) / 60)} min</div>
              </div>
              <div className={`w-px h-8 ${editingRouteId ? 'bg-emerald-500/20' : 'bg-slate-700'}`}></div>
              <div className="text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Distance</div>
                <div className={`font-bold ${editingRouteId ? 'text-emerald-400' : 'text-indigo-400'}`}>{(preview.route.distanceMeters / 1000).toFixed(1)} km</div>
              </div>
            </div>

            {editingRouteId && (
              <div className="flex items-center justify-between bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700/60 text-xs">
                <span className="text-slate-300 font-medium">Map Comparison:</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm"></span> Original
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm"></span> Live New
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Stops sequence (drag to reorder)</span>
              <button
                onClick={() => {
                  setPreview(null);
                  onPreviewChange?.(null);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline"
              >
                ← Add/remove stops
              </button>
            </div>

            <SortableList
              items={preview.stops}
              onReorder={handlePreviewReorderDrop}
              keyExtractor={(s) => s._instanceId}
              renderItem={(s, i, dragHandleProps, isDragging) => (
                <div 
                  className={`flex items-center gap-2 text-sm text-slate-300 bg-slate-800 p-2 rounded border transition-colors ${isDragging ? (editingRouteId ? 'border-emerald-500 shadow-lg' : 'border-indigo-500 shadow-lg') : 'border-slate-700/30'} shadow-md`}
                >
                  <div 
                    {...dragHandleProps}
                    className={`flex items-center gap-1 px-1 outline-none ${isComputing ? 'opacity-30 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:text-white'} text-slate-500`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6"></line>
                      <line x1="8" y1="12" x2="21" y2="12"></line>
                      <line x1="8" y1="18" x2="21" y2="18"></line>
                      <line x1="3" y1="6" x2="3.01" y2="6"></line>
                      <line x1="3" y1="12" x2="3.01" y2="12"></line>
                      <line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                  </div>
                  <span className={`w-5 h-5 flex items-center justify-center ${editingRouteId ? 'bg-emerald-600' : 'bg-indigo-500'} text-white rounded-full flex-shrink-0 text-[10px] font-bold`}>
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate">{s.name}</span>
                </div>
              )}
            />
          </div>

          <div className="p-4 border-t border-slate-800/60 flex gap-2">
            <button 
              className="btn btn-secondary flex-1" 
              onClick={handleCancelOrDiscard}
            >
              {editingRouteId ? 'Cancel' : 'Discard'}
            </button>
            <button 
              className={`btn flex-1 ${editingRouteId ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 font-bold' : 'btn-primary'}`} 
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
