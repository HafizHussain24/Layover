import { useState, useEffect } from 'react';
import type { ProposedRoute, BucketLocation } from '../lib/types';
import { getCategoryColor, getCategoryIcon } from '../lib/categories';
import { computeRoutes } from '../lib/routes';
import {
  Car, Footprints, Ruler, ChevronDown, ChevronUp,
  Trophy, MapPin, Pencil, Trash2, ExternalLink, ArrowUp, Loader2,
} from 'lucide-react';
import CategoryIcon from './CategoryIcon';

interface ProposedRoutesProps {
  routes: ProposedRoute[];
  votesHook: {
    getVoteCount: (routeId: string) => number;
    hasVoted: (routeId: string) => boolean;
    toggleVote: (routeId: string) => Promise<void>;
  };
  onSelectRoute: (route: ProposedRoute | null) => void;
  selectedRouteId: string | null;
  onEditRoute?: (route: ProposedRoute) => void;
  onUpdateRoute?: (routeId: string, updates: Partial<ProposedRoute>) => Promise<void> | void;
  onDeleteRoute?: (routeId: string) => Promise<void> | void;
  bucketItems?: BucketLocation[];
}

export default function ProposedRoutes({
  routes,
  votesHook,
  onSelectRoute,
  selectedRouteId,
  onEditRoute,
  onUpdateRoute,
  onDeleteRoute,
  bucketItems = [],
}: ProposedRoutesProps) {
  const [expandedRouteIds, setExpandedRouteIds] = useState<Set<string>>(new Set());
  const [togglingRouteId, setTogglingRouteId] = useState<string | null>(null);

  const handleToggleTravelMode = async (route: ProposedRoute, e: React.MouseEvent) => {
    e.stopPropagation();
    if (togglingRouteId || !onUpdateRoute) return;

    const newMode: 'DRIVE' | 'WALK' = route.travel_mode === 'DRIVE' ? 'WALK' : 'DRIVE';
    setTogglingRouteId(route.id);

    try {
      const matchedStops: BucketLocation[] = [];
      for (const stopId of route.waypoint_order) {
        const item = bucketItems.find(b => b.id === stopId || b.place_id === stopId);
        if (item) matchedStops.push(item);
      }

      if (matchedStops.length >= 2) {
        const res = await computeRoutes({
          origin: { placeId: matchedStops[0].place_id, lat: matchedStops[0].lat, lng: matchedStops[0].lng },
          destination: { placeId: matchedStops[matchedStops.length - 1].place_id, lat: matchedStops[matchedStops.length - 1].lat, lng: matchedStops[matchedStops.length - 1].lng },
          intermediates: matchedStops.slice(1, -1).map(s => ({ placeId: s.place_id, lat: s.lat, lng: s.lng })),
          travelMode: newMode,
        });

        if (res.routes && res.routes.length > 0) {
          const comp = res.routes[0];
          await onUpdateRoute(route.id, {
            travel_mode: newMode,
            total_duration_mins: Math.round(parseInt(comp.duration) / 60),
            total_distance_m: comp.distanceMeters,
            encoded_polyline: comp.polyline.encodedPolyline,
          });
        }
      }
    } catch (err) {
      console.error('Failed to toggle travel mode:', err);
    } finally {
      setTogglingRouteId(null);
    }
  };

  useEffect(() => {
    if (selectedRouteId) {
      setExpandedRouteIds(prev => new Set(prev).add(selectedRouteId));
    }
  }, [selectedRouteId]);

  const toggleExpand = (routeId: string) => {
    setExpandedRouteIds(prev => {
      const next = new Set(prev);
      if (next.has(routeId)) next.delete(routeId);
      else next.add(routeId);
      return next;
    });
  };

  if (routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center m-4 rounded-2xl"
           style={{ background: 'var(--color-surface-2)', border: '1.5px dashed rgba(255,255,255,0.07)' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
             style={{ background: 'var(--color-surface-3)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <MapPin size={20} style={{ color: '#3a3a42' }} />
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color: '#4a4a54' }}>No saved routes yet</p>
        <p className="text-xs" style={{ color: '#3a3a42' }}>
          Build your first route below — pick stops and save it.
        </p>
      </div>
    );
  }

  const voteCounts = routes.map(r => ({ id: r.id, count: votesHook.getVoteCount(r.id) }));
  const maxVotes = Math.max(...voteCounts.map(v => v.count), 0);
  const winningRouteIds = maxVotes > 0 ? voteCounts.filter(v => v.count === maxVotes).map(v => v.id) : [];

  const handleOpenGoogleMaps = (route: ProposedRoute, e: React.MouseEvent) => {
    e.stopPropagation();
    const routePlaces = route.waypoint_order
      .map(id => bucketItems.find(b => b.id === id || b.place_id === id))
      .filter(Boolean) as BucketLocation[];

    let url = '';
    if (routePlaces.length >= 2) {
      const origin = routePlaces[0];
      const destination = routePlaces[routePlaces.length - 1];
      const intermediates = routePlaces.slice(1, -1);
      url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin.name)}&origin_place_id=${origin.place_id}&destination=${encodeURIComponent(destination.name)}&destination_place_id=${destination.place_id}&travelmode=${route.travel_mode.toLowerCase()}`;
      if (intermediates.length > 0) {
        url += `&waypoints=${intermediates.map(p => encodeURIComponent(p.name)).join('|')}&waypoint_place_ids=${intermediates.map(p => p.place_id).join('|')}`;
      }
    } else {
      const origin = route.waypoint_order[0];
      const destination = route.waypoint_order[route.waypoint_order.length - 1];
      const waypoints = route.waypoint_order.slice(1, -1).join('|');
      url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${route.travel_mode.toLowerCase()}`;
      if (waypoints.length > 0) url += `&waypoints=${waypoints}`;
    }
    window.open(url, '_blank');
  };

  const handleDelete = async (route: ProposedRoute, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete route "${route.route_name ?? 'Untitled Route'}"?`)) {
      if (onDeleteRoute) await onDeleteRoute(route.id);
      if (selectedRouteId === route.id) onSelectRoute(null);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="font-display font-bold text-sm" style={{ color: '#e8e8ec' }}>Saved Routes</h3>
        <span className="text-xs" style={{ color: '#4a4a54' }}>{routes.length} route{routes.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex flex-col gap-3 px-3 pb-3">
        {routes.map(route => {
          const isWinner = winningRouteIds.includes(route.id);
          const isSelected = selectedRouteId === route.id;
          const isExpanded = expandedRouteIds.has(route.id);
          const votes = votesHook.getVoteCount(route.id);
          const voted = votesHook.hasVoted(route.id);
          const distKm = ((route.total_distance_m ?? 0) / 1000).toFixed(1);

          return (
            <div
              key={route.id}
              className={`route-card ${isSelected ? 'selected' : ''}`}
              onClick={() => { onSelectRoute(isSelected ? null : route); toggleExpand(route.id); }}
            >
              {/* Winner highlight stripe */}
              {isWinner && (
                <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
              )}

              <div className="p-4">
                {/* Top row: name + vote button */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    {/* Badges */}
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      {isWinner && (
                        <span className="flex items-center gap-1 badge badge-gold">
                          <Trophy size={9} />
                          Final Itinerary
                        </span>
                      )}
                      {isSelected && !isWinner && (
                        <span className="badge"
                              style={{ background: 'rgba(249,93,15,0.12)', color: '#ff9a5c', borderColor: 'rgba(249,93,15,0.25)' }}>
                          Active on map
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-sm leading-tight" style={{ color: '#e8e8ec' }}>
                      {route.route_name || 'Untitled Route'}
                    </h4>
                  </div>

                  {/* Vote button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); votesHook.toggleVote(route.id); }}
                    className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all flex-shrink-0"
                    style={voted ? {
                      background: 'rgba(249,93,15,0.2)',
                      borderColor: 'rgba(249,93,15,0.5)',
                      color: '#ff9a5c',
                      boxShadow: '0 4px 14px rgba(249,93,15,0.2)',
                    } : {
                      background: 'var(--color-surface-3)',
                      borderColor: 'rgba(255,255,255,0.08)',
                      color: '#6a6a76',
                    }}
                    title={voted ? 'Remove vote' : 'Vote for this route'}
                  >
                    <ArrowUp size={14} />
                    <span style={{ fontSize: '11px' }}>{votes}</span>
                  </button>
                </div>

                {/* Route meta */}
                <div className="flex items-center gap-3 text-xs mb-3" style={{ color: '#6a6a76' }}>
                  {onUpdateRoute ? (
                    <button
                      type="button"
                      onClick={(e) => handleToggleTravelMode(route, e)}
                      disabled={togglingRouteId === route.id}
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer disabled:opacity-50"
                      style={route.travel_mode === 'WALK' ? {
                        background: 'rgba(249,93,15,0.18)',
                        borderColor: 'rgba(249,93,15,0.35)',
                        color: '#ff9a5c',
                      } : {
                        background: 'var(--color-surface-3)',
                        borderColor: 'rgba(255,255,255,0.08)',
                        color: '#a0a0ab',
                      }}
                      title={`Click to switch to ${route.travel_mode === 'DRIVE' ? 'walking' : 'driving'}`}
                    >
                      {togglingRouteId === route.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : route.travel_mode === 'DRIVE' ? (
                        <Car size={12} />
                      ) : (
                        <Footprints size={12} />
                      )}
                      <span>{route.travel_mode === 'DRIVE' ? 'Drive' : 'Walk'}</span>
                      <span className="opacity-70 font-normal">· {route.total_duration_mins ?? 0}m</span>
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      {route.travel_mode === 'DRIVE'
                        ? <Car size={12} style={{ color: '#4a4a54' }} />
                        : <Footprints size={12} style={{ color: '#4a4a54' }} />
                      }
                      {route.total_duration_mins ?? 0} min
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Ruler size={11} style={{ color: '#4a4a54' }} />
                    {distKm} km
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleExpand(route.id); }}
                    className="flex items-center gap-1 ml-auto transition-colors"
                    style={{ color: isExpanded ? '#f95d0f' : '#4a4a54' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ff9a5c')}
                    onMouseLeave={e => (e.currentTarget.style.color = isExpanded ? '#f95d0f' : '#4a4a54')}
                  >
                    <span>{route.waypoint_order.length} stops</span>
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>

                {/* Expandable stops */}
                {isExpanded && (
                  <div className="pt-3 border-t mb-3" style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                       onClick={e => e.stopPropagation()}>
                    <div className="relative flex flex-col gap-2.5">
                      {/* Journey line */}
                      {route.waypoint_order.length > 1 && (
                        <div className="absolute left-[9px] top-3 bottom-3 w-px"
                             style={{ background: 'linear-gradient(to bottom, rgba(249,93,15,0.5), rgba(249,93,15,0.1))' }} />
                      )}

                      {route.waypoint_order.map((stopId, idx) => {
                        const place = bucketItems.find(b => b.id === stopId || b.place_id === stopId);
                        const name = place?.name ?? `Stop ${idx + 1}`;
                        const category = place?.category;
                        const color = getCategoryColor(category);
                        const icon = getCategoryIcon(category);

                        return (
                          <div key={`${stopId}-${idx}`} className="flex items-center gap-3 relative z-10">
                            {/* Sequence badge */}
                            <span className="w-[18px] h-[18px] rounded-full font-extrabold text-[10px] flex items-center justify-center flex-shrink-0 text-white"
                                  style={{ background: color, boxShadow: `0 2px 8px ${color}55` }}>
                              {idx + 1}
                            </span>
                            <span className="text-xs flex-1 truncate font-medium" style={{ color: '#c8c8d0' }}>
                              {name}
                            </span>
                            {category && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0"
                                    style={{ background: `${color}14`, color: color, border: `1px solid ${color}30` }}>
                                <CategoryIcon name={icon} size={9} />
                                {category}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action row */}
                <div className="flex items-center gap-2 pt-2.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                     onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditRoute?.(route); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                    style={{ background: 'rgba(139,92,246,0.1)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.2)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; }}
                    title="Edit route"
                  >
                    <Pencil size={11} />
                    Edit
                  </button>

                  <button
                    onClick={(e) => handleDelete(route, e)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.15)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                    title="Delete route"
                  >
                    <Trash2 size={11} />
                    Delete
                  </button>

                  <div className="flex-1" />

                  <button
                    onClick={(e) => handleOpenGoogleMaps(route, e)}
                    className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                    style={{ color: '#4a4a54' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ff9a5c')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#4a4a54')}
                  >
                    Open in Maps
                    <ExternalLink size={11} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
