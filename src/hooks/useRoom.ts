import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Room } from '../lib/types';

export interface DestinationData {
  name: string | null;
  lat: number | null;
  lng: number | null;
}

/**
 * Fetches room data by id and subscribes to realtime updates (e.g., destination changes).
 */
export function useRoom(roomId: string | undefined) {
  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setLoading(false);
      return;
    }

    if (roomId === 'demo' || roomId === 'mock') {
      setRoom({
        id: roomId,
        name: 'Kochi Weekend [DEMO]',
        created_by: null,
        created_at: new Date().toISOString(),
        destination_name: 'Kochi, Kerala',
        destination_lat: 9.9312,
        destination_lng: 76.2673,
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setRoom(data as Room);
        setLoading(false);
      });

    // Realtime subscription for room updates (e.g., trip destination changed by a friend)
    const channel = supabase
      .channel(`room-meta-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          setRoom(payload.new as Room);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { room, setRoom, loading, error };
}

/** Creates a new room with optional initial destination and returns its id */
export async function createRoom(
  name: string, 
  userId: string,
  destination?: { name?: string; lat?: number; lng?: number }
): Promise<string> {
  const payload: Record<string, any> = {
    name,
    created_by: userId,
  };

  if (destination && destination.name && destination.lat && destination.lng) {
    payload.destination_name = destination.name;
    payload.destination_lat = destination.lat;
    payload.destination_lng = destination.lng;
  }

  try {
    const { data, error } = await supabase
      .from('rooms')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      // If error is due to destination columns not existing yet in Supabase, retry without them
      if (error.message.includes('destination') || error.message.includes('column')) {
        console.warn('Destination columns missing in rooms table, creating room without initial destination fields. Run migration 002 to persist destinations.');
        const fallback = await supabase
          .from('rooms')
          .insert({ name, created_by: userId })
          .select('id')
          .single();
        if (fallback.error) throw new Error(fallback.error.message);
        return fallback.data.id as string;
      }
      throw new Error(error.message);
    }
    return data.id as string;
  } catch (err: any) {
    throw new Error(err.message || 'Failed to create room');
  }
}

/** Updates room destination in Supabase */
export async function updateRoomDestination(
  roomId: string,
  destination: DestinationData
): Promise<void> {
  const { error } = await supabase
    .from('rooms')
    .update({
      destination_name: destination.name,
      destination_lat: destination.lat,
      destination_lng: destination.lng,
    })
    .eq('id', roomId);

  if (error) {
    console.warn('Failed to update destination in Supabase (ensure migration 002 is executed):', error.message);
    throw new Error(error.message);
  }
}

/** Deletes a room from Supabase and clears from local recent storage */
export async function deleteRoom(roomId: string): Promise<void> {
  // Always clean from local storage
  try {
    const stored = localStorage.getItem('waymark_recent_trips') || localStorage.getItem('wanderroom_recent_trips');
    if (stored) {
      const filtered = JSON.parse(stored).filter((t: any) => t.id !== roomId);
      localStorage.setItem('waymark_recent_trips', JSON.stringify(filtered));
    }
  } catch (_) {}

  // If mock/demo room, no database row to delete
  if (roomId === 'demo' || roomId === 'mock') {
    return;
  }

  // Delete from Supabase rooms table (cascades to bucket_locations, proposed_routes, route_votes)
  const { error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', roomId);

  if (error) {
    console.warn('Failed to delete room row in Supabase:', error.message);
    throw new Error(error.message);
  }
}

