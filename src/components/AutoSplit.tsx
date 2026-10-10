import { useState } from 'react';
import type { BucketLocation } from '../lib/types';
import { kMeansCluster } from '../lib/kmeans';
import { computeRoutes } from '../lib/routes';
import { supabase } from '../lib/supabase';

interface AutoSplitProps {
  roomId: string;
  userId: string | undefined;
  availablePlaces: BucketLocation[];
}

export default function AutoSplit({ roomId, userId, availablePlaces }: AutoSplitProps) {
  const [days, setDays] = useState(2);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorStr, setErrorStr] = useState<string | null>(null);

  const handleSplit = async () => {
    if (!userId || availablePlaces.length < days) {
      setErrorStr('Need more places in bucket list to split.');
      return;
    }
    
    setIsProcessing(true);
    setErrorStr(null);

    try {
      // 1. Cluster locations
      const clusters = kMeansCluster(availablePlaces, days);

      // 2. Generate a route for each cluster
      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i];
        if (cluster.length < 2) continue; // Cannot route 1 stop, skip or save dummy

        // Sort cluster roughly to give a sensible start/end (e.g. by longitude to go West to East)
        cluster.sort((a, b) => a.lng - b.lng);

        const origin = cluster[0];
        const destination = cluster[cluster.length - 1];
        const intermediates = cluster.slice(1, -1);

        const response = await computeRoutes({
          origin: { placeId: origin.place_id },
          destination: { placeId: destination.place_id },
          intermediates: intermediates.map(s => ({ placeId: s.place_id })),
          travelMode: 'DRIVE',
          optimizeWaypointOrder: true,
        });

        if (response.routes && response.routes.length > 0) {
          const route = response.routes[0];
          
          let finalStops = [...cluster];
          if (route.optimizedIntermediateWaypointIndex) {
            const optimizedIntermediates = route.optimizedIntermediateWaypointIndex.map(
              idx => cluster[idx + 1]
            );
            finalStops = [cluster[0], ...optimizedIntermediates, cluster[cluster.length - 1]];
          }

          await supabase.from('proposed_routes').insert({
            room_id: roomId,
            created_by: userId,
            route_name: `Day ${i + 1} (Auto-generated)`,
            travel_mode: 'DRIVE',
            waypoint_order: finalStops.map(s => s.place_id),
            total_duration_mins: Math.round(parseInt(route.duration) / 60),
            total_distance_m: route.distanceMeters,
            encoded_polyline: route.polyline.encodedPolyline,
          });
        }
      }
    } catch (err: any) {
      setErrorStr(err.message || 'Failed to auto-split');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/60">
      <div className="flex-1 flex items-center gap-2 text-xs">
        <span className="text-slate-400">Auto-split into</span>
        <select 
          value={days}
          onChange={e => setDays(parseInt(e.target.value))}
          className="bg-slate-800 border border-slate-700 text-white rounded p-1 outline-none"
          disabled={isProcessing}
        >
          <option value={2}>2 days</option>
          <option value={3}>3 days</option>
          <option value={4}>4 days</option>
        </select>
      </div>
      <button 
        onClick={handleSplit}
        disabled={isProcessing || availablePlaces.length < 2}
        className="btn btn-secondary !py-1 !px-2 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10 whitespace-nowrap"
        title="Uses K-Means clustering to geographically group your places into days"
      >
        {isProcessing ? 'Thinking...' : '🤖 Magic Split'}
      </button>
      {errorStr && (
        <div className="w-full text-red-400 text-[10px] mt-1">{errorStr}</div>
      )}
    </div>
  );
}
