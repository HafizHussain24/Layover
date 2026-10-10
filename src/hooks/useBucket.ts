import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { BucketLocation } from '../lib/types';

/**
 * Fetches and subscribes to bucket_locations for a room.
 * Phase 2: adds realtime subscription.
 */
export function useBucket(roomId: string | undefined) {
  const [items, setItems] = useState<BucketLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!roomId) {
      setItems([]);
      setLoading(false);
      return;
    }

    if (roomId === 'mock') {
      setItems([
        { id: 'm1', room_id: 'mock', added_by: 'demo', place_id: 'ChIJV4qPZ9F5oDsRD6i2906n_hQ', name: 'Fort Kochi Beach', address: 'Fort Kochi, Kochi', category: 'nature', lat: 9.9658, lng: 76.2415, rating: 4.5, review_count: 500, is_mock_rating: false, created_at: new Date().toISOString() },
        { id: 'm2', room_id: 'mock', added_by: 'demo', place_id: 'ChIJ59mD0NJ5oDsRAE9pMhU0-3Q', name: 'Mattancherry Palace', address: 'Mattancherry, Kochi', category: 'culture', lat: 9.9582, lng: 76.2593, rating: 4.6, review_count: 850, is_mock_rating: false, created_at: new Date().toISOString() },
        { id: 'm3', room_id: 'mock', added_by: 'demo', place_id: 'ChIJP6Kk-9B5oDsRL1yJ6F8eJ_Q', name: 'Marine Drive', address: 'Marine Drive, Kochi', category: 'nature', lat: 9.9791, lng: 76.2750, rating: 4.4, review_count: 1200, is_mock_rating: false, created_at: new Date().toISOString() },
        { id: 'm4', room_id: 'mock', added_by: 'demo', place_id: 'ChIJX_O9Vtl5oDsRUoB1gH5E17I', name: 'Lulu Mall', address: 'Edappally, Kochi', category: 'shopping', lat: 10.0275, lng: 76.3082, rating: 4.7, review_count: 5000, is_mock_rating: false, created_at: new Date().toISOString() },
      ]);
      setLoading(false);
      return;
    }

    // Initial fetch
    supabase
      .from('bucket_locations')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setItems((data as BucketLocation[]) ?? []);
        setLoading(false);
      });

    // Realtime subscription (Phase 3 wired)
    const channel = supabase
      .channel(`bucket:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bucket_locations', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setItems((prev) => {
            const exists = prev.some((i) => i.id === (payload.new as BucketLocation).id);
            if (exists) return prev;
            return [...prev, payload.new as BucketLocation];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bucket_locations', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setItems((prev) => prev.map((i) => (i.id === (payload.new as BucketLocation).id ? (payload.new as BucketLocation) : i)));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'bucket_locations', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setItems((prev) => prev.filter((i) => i.id !== (payload.old as { id: string }).id));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);

  const removeItem = async (id: string) => {
    await supabase.from('bucket_locations').delete().eq('id', id);
    // realtime subscription will update the list
  };

  const updateCategory = async (id: string, category: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, category } : i)));
    await supabase.from('bucket_locations').update({ category }).eq('id', id);
  };

  return { items, loading, removeItem, updateCategory };
}
