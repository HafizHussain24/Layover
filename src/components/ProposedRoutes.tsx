import { useState, useEffect } from 'react';
import type { ProposedRoute, BucketLocation } from '../lib/types';
import { getCategoryColor, getCategoryIcon } from '../lib/categories';

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
  onDeleteRoute?: (routeId: string) => Promise<void> | void;
  bucketItems?: BucketLocation[];
}

export default function ProposedRoutes({ 
  routes, 
  votesHook, 
  onSelectRoute, 
  selectedRouteId,
  onEditRoute,
  onDeleteRoute,
  bucketItems = [],
}: ProposedRoutesProps) {
  const [expandedRouteIds, setExpandedRouteIds] = useState<Set<string>>(new Set());

  // Automatically expand the active route on the map
  useEffect(() => {
    if (selectedRouteId) {
      setExpandedRouteIds(prev => new Set(prev).add(selectedRouteId));
    }
  }, [selectedRouteId]);

  const toggleExpand = (routeId: string) => {
    setExpandedRouteIds(prev => {
      const next = new Set(prev);
      if (next.has(routeId)) {
        next.delete(routeId);
      } else {
        next.add(routeId);
      }
      return next;
    });
  };

  if (routes.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800/80 m-4">
        <div className="text-3xl mb-2 opacity-50">🗺️</div>
        <p className="text-sm text-slate-300 font-semibold">No saved routes yet</p>
        <p className="text-xs text-slate-500 mt-1">
          Pick stops below to build, optimize, and save your first route!
        </p>
      </div>
    );
  }

  // Find max votes to assign "Final Itinerary" badge
  const voteCounts = routes.map(r => ({ id: r.id, count: votesHook.getVoteCount(r.id) }));
  const maxVotes = Math.max(...voteCounts.map(v => v.count), 0);
  const winningRouteIds = maxVotes > 0 ? voteCounts.filter(v => v.count === maxVotes).map(v => v.id) : [];

  const handleOpenGoogleMaps = (route: ProposedRoute, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Match route stops with bucket locations if available
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
      if (waypoints.length > 0) {
        url += `&waypoints=${waypoints}`;
      }
    }

    window.open(url, '_blank');
  };

  const handleDelete = async (route: ProposedRoute, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete route "${route.route_name ?? 'Untitled Route'}"?`)) {
      if (onDeleteRoute) {
        await onDeleteRoute(route.id);
      }
      if (selectedRouteId === route.id) {
        onSelectRoute(null);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <h3 className="font-bold text-white text-sm">Proposed Routes</h3>
        <span className="text-[11px] text-slate-400">{routes.length} saved</span>
      </div>
      
      <div className="flex flex-col divide-y divide-slate-800/60">
        {routes.map(route => {
          const isWinner = winningRouteIds.includes(route.id);
          const isSelected = selectedRouteId === route.id;
          const isExpanded = expandedRouteIds.has(route.id);
          const votes = votesHook.getVoteCount(route.id);
          const voted = votesHook.hasVoted(route.id);

          return (
            <div 
              key={route.id} 
              className={`p-4 cursor-pointer transition-all ${
                isSelected 
                  ? 'bg-indigo-950/40 border-l-4 border-indigo-500 pl-3' 
                  : 'hover:bg-slate-800/30'
              }`}
              onClick={() => {
                onSelectRoute(isSelected ? null : route);
                toggleExpand(route.id);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-semibold text-white text-sm truncate">{route.route_name}</h4>
                    {isWinner && (
                      <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                        🏆 Final
                      </span>
                    )}
                    {isSelected && (
                      <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded text-[9px] font-medium whitespace-nowrap">
                        Active on map
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{route.travel_mode === 'DRIVE' ? '🚗' : '🚶'} {route.total_duration_mins ?? 0} min</span>
                    <span>{((route.total_distance_m ?? 0) / 1000).toFixed(1)} km</span>
                    <span className="inline-flex items-center gap-1 text-slate-300">
                      <span>{route.waypoint_order.length} stops</span>
                      <span className="text-[10px] text-indigo-400 font-bold">{isExpanded ? '▴' : '▾'}</span>
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      votesHook.toggleVote(route.id);
                    }}
                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                      voted 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                    title={voted ? 'Remove vote' : 'Vote for this route'}
                  >
                    <span>▲</span>
                    <span>{votes}</span>
                  </button>
                </div>
              </div>

              {/* Expandable Stops Sequence */}
              {isExpanded && (
                <div 
                  className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-col gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span>Stops in order ({route.waypoint_order.length}):</span>
                    <button
                      type="button"
                      onClick={() => toggleExpand(route.id)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 underline"
                    >
                      Hide stops ▴
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 pl-1 relative mt-1">
                    {/* Vertical connecting journey line */}
                    {route.waypoint_order.length > 1 && (
                      <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-indigo-500/30 z-0" />
                    )}

                    {route.waypoint_order.map((stopId, idx) => {
                      const place = bucketItems.find(b => b.id === stopId || b.place_id === stopId);
                      const name = place?.name ?? `Stop ${idx + 1}`;
                      const category = place?.category;
                      const color = getCategoryColor(category);
                      const icon = getCategoryIcon(category);

                      return (
                        <div key={`${stopId}-${idx}`} className="flex items-center gap-2.5 relative z-10 text-xs">
                          {/* Sequence Badge */}
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0 shadow-sm border border-indigo-400/40">
                            {idx + 1}
                          </span>

                          {/* Stop Name */}
                          <span className="text-slate-200 font-medium truncate flex-1">
                            {name}
                          </span>

                          {/* Category Badge */}
                          {category && (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 border"
                              style={{
                                backgroundColor: `${color}18`,
                                color: color,
                                borderColor: `${color}35`,
                              }}
                            >
                              <span>{icon}</span>
                              <span>{category}</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons: Edit, Delete, Open in Maps */}
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800/80">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditRoute?.(route);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 rounded border border-indigo-500/20 transition-colors"
                  title="Edit stops and re-optimize"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <span>Edit</span>
                </button>

                <button
                  onClick={(e) => handleDelete(route, e)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-red-400 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 rounded border border-red-500/20 transition-colors"
                  title="Delete route"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  <span>Delete</span>
                </button>

                <div className="flex-1" />

                <button 
                  onClick={(e) => handleOpenGoogleMaps(route, e)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline"
                >
                  <span>Open in Maps</span>
                  <span>↗</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

