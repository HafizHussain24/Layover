import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ProposedRoute } from '../lib/types';

export function useRoutes(roomId: string | undefined) {
  const [routes, setRoutes] = useState<ProposedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!roomId) {
      setRoutes([]);
      setLoading(false);
      return;
    }

    // Initial fetch
    supabase
      .from('proposed_routes')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setRoutes((data as ProposedRoute[]) ?? []);
        setLoading(false);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`routes:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'proposed_routes', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setRoutes((prev) => {
            const exists = prev.some((i) => i.id === (payload.new as ProposedRoute).id);
            if (exists) return prev;
            return [...prev, payload.new as ProposedRoute];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'proposed_routes', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setRoutes((prev) => prev.filter((i) => i.id !== (payload.old as { id: string }).id));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);

  return { routes, loading };
}
