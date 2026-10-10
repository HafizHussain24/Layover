import type { ProposedRoute } from '../lib/types';

interface ProposedRoutesProps {
  routes: ProposedRoute[];
  votesHook: {
    getVoteCount: (routeId: string) => number;
    hasVoted: (routeId: string) => boolean;
    toggleVote: (routeId: string) => Promise<void>;
  };
  onSelectRoute: (route: ProposedRoute | null) => void;
  selectedRouteId: string | null;
}

export default function ProposedRoutes({ routes, votesHook, onSelectRoute, selectedRouteId }: ProposedRoutesProps) {
  if (routes.length === 0) return null;

  // Find max votes to assign "Final Itinerary" badge
  const voteCounts = routes.map(r => ({ id: r.id, count: votesHook.getVoteCount(r.id) }));
  const maxVotes = Math.max(...voteCounts.map(v => v.count), 0);
  const winningRouteIds = maxVotes > 0 ? voteCounts.filter(v => v.count === maxVotes).map(v => v.id) : [];

  const handleOpenGoogleMaps = (route: ProposedRoute, e: React.MouseEvent) => {
    e.stopPropagation();
    // Use place IDs to build Google Maps directions URL
    const origin = route.waypoint_order[0];
    const destination = route.waypoint_order[route.waypoint_order.length - 1];
    const waypoints = route.waypoint_order.slice(1, -1).join('|');
    
    // Fallback: A basic maps search if we don't build the full URL (Google Maps URLs with place IDs are tricky)
    // Actually, we can use the place IDs with api=1
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&origin_place_id=${origin}&destination=${destination}&destination_place_id=${destination}&travelmode=${route.travel_mode.toLowerCase()}`;
    if (waypoints.length > 0) {
      url += `&waypoints=${waypoints}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-800/60">
      <h3 className="font-bold text-white text-sm px-4">Proposed Routes</h3>
      <div className="flex flex-col divide-y divide-slate-800/60">
        {routes.map(route => {
          const isWinner = winningRouteIds.includes(route.id);
          const isSelected = selectedRouteId === route.id;
          const votes = votesHook.getVoteCount(route.id);
          const voted = votesHook.hasVoted(route.id);

          return (
            <div 
              key={route.id} 
              className={`p-4 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-900/30' : 'hover:bg-slate-800/30'}`}
              onClick={() => onSelectRoute(isSelected ? null : route)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-white text-sm truncate">{route.route_name}</h4>
                    {isWinner && (
                      <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                        🏆 Final
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{route.travel_mode === 'DRIVE' ? '🚗' : '🚶'} {route.total_duration_mins ?? 0} min</span>
                    <span>{((route.total_distance_m ?? 0) / 1000).toFixed(1)} km</span>
                    <span>{route.waypoint_order.length} stops</span>
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
                  >
                    <span>▲</span>
                    <span>{votes}</span>
                  </button>
                </div>
              </div>
              
              {isSelected && (
                <div className="mt-3 flex justify-end">
                  <button 
                    onClick={(e) => handleOpenGoogleMaps(route, e)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                  >
                    Open in Google Maps ↗
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
