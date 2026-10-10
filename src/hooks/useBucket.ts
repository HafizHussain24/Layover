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

  return { items, loading, removeItem };
}
