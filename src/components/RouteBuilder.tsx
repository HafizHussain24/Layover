import { useState } from 'react';
import type { BucketLocation } from '../lib/types';
import { computeRoutes } from '../lib/routes';
import { supabase } from '../lib/supabase';

interface RouteBuilderProps {
  roomId: string;
  userId: string | undefined;
  availablePlaces: BucketLocation[];
}

export default function RouteBuilder({ roomId, userId, availablePlaces }: RouteBuilderProps) {
  const [stops, setStops] = useState<BucketLocation[]>([]);
  const [travelMode, setTravelMode] = useState<'DRIVE' | 'WALK'>('DRIVE');
  const [isComputing, setIsComputing] = useState(false);
  const [errorStr, setErrorStr] = useState<string | null>(null);

  const handleAddStop = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const placeId = e.target.value;
    if (!placeId) return;
    const place = availablePlaces.find(p => p.id === placeId);
    if (place && !stops.find(s => s.id === placeId) && stops.length < 6) {
      setStops([...stops, place]);
    }
    e.target.value = ''; // reset select
  };

  const handleRemove = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const handleMove = (index: number, dir: 'up' | 'down') => {
    if (dir === 'up' && index > 0) {
      const newStops = [...stops];
      [newStops[index - 1], newStops[index]] = [newStops[index], newStops[index - 1]];
      setStops(newStops);
    } else if (dir === 'down' && index < stops.length - 1) {
      const newStops = [...stops];
      [newStops[index + 1], newStops[index]] = [newStops[index], newStops[index + 1]];
      setStops(newStops);
    }
  };

  const handleComputeAndSave = async (optimize: boolean) => {
    if (!userId || stops.length < 2) return;
    setIsComputing(true);
    setErrorStr(null);

    try {
      const response = await computeRoutes({
        origin: { placeId: stops[0].place_id },
        destination: { placeId: stops[stops.length - 1].place_id },
        intermediates: stops.slice(1, -1).map(s => ({ placeId: s.place_id })),
        travelMode,
        optimizeWaypointOrder: optimize,
      });

      if (!response.routes || response.routes.length === 0) {
        throw new Error('No routes found');
      }

      const route = response.routes[0];
      
      // If optimized, the API returns the new order of intermediates
      let finalStops = [...stops];
      if (optimize && route.optimizedIntermediateWaypointIndex) {
        const optimizedIntermediates = route.optimizedIntermediateWaypointIndex.map(
          idx => stops[idx + 1]
        );
        finalStops = [stops[0], ...optimizedIntermediates, stops[stops.length - 1]];
        setStops(finalStops); // update UI to show new order
      }

      // Save to Supabase
      const routeName = `${finalStops[0].name} to ${finalStops[finalStops.length - 1].name}`;
      await supabase.from('proposed_routes').insert({
        room_id: roomId,
        created_by: userId,
        route_name: routeName,
        travel_mode: travelMode,
        waypoint_order: finalStops.map(s => s.place_id),
        total_duration_mins: Math.round(parseInt(route.duration) / 60),
        total_distance_m: route.distanceMeters,
        encoded_polyline: route.polyline.encodedPolyline,
      });

      setStops([]); // clear builder
    } catch (err: any) {
      setErrorStr(err.message || 'Failed to compute route');
    } finally {
      setIsComputing(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-bold text-white text-sm">Build a Route</h3>
      
      {errorStr && (
        <div className="bg-red-900/50 border border-red-500/50 text-red-200 text-xs p-2 rounded">
          {errorStr}
        </div>
      )}

      {stops.length > 0 && (
        <div className="flex flex-col gap-1">
          {stops.map((stop, i) => (
            <div key={stop.id} className="flex items-center gap-2 bg-slate-800/50 p-2 rounded text-xs border border-slate-700/50">
              <span className="w-4 h-4 flex items-center justify-center bg-indigo-500/20 text-indigo-400 rounded-full flex-shrink-0 text-[10px] font-bold">
                {i + 1}
              </span>
              <span className="flex-1 truncate text-white">{stop.name}</span>
              <div className="flex items-center">
                <button onClick={() => handleMove(i, 'up')} disabled={i === 0} className="px-1 text-slate-400 hover:text-white disabled:opacity-30">▲</button>
                <button onClick={() => handleMove(i, 'down')} disabled={i === stops.length - 1} className="px-1 text-slate-400 hover:text-white disabled:opacity-30">▼</button>
                <button onClick={() => handleRemove(i)} className="px-1 ml-1 text-red-400 hover:text-red-300">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {stops.length < 6 && (
        <select 
          onChange={handleAddStop} 
          className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded p-2 outline-none focus:border-indigo-500"
          value=""
        >
          <option value="" disabled>+ Add a stop from bucket list</option>
          {availablePlaces.filter(p => !stops.find(s => s.id === p.id)).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
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
            onClick={() => handleComputeAndSave(true)}
            disabled={stops.length < 3 || isComputing}
            className="btn btn-secondary !py-1.5 !px-3 text-xs border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
            title="Automatically reorders stops to save time (needs 3+ stops)"
          >
            {isComputing ? '...' : '✨ Optimize'}
          </button>
          <button 
            onClick={() => handleComputeAndSave(false)}
            disabled={stops.length < 2 || isComputing}
            className="btn btn-primary !py-1.5 !px-3 text-xs"
          >
            {isComputing ? '...' : 'Save Route'}
          </button>
        </div>
      </div>
    </div>
  );
}
