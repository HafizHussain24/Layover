import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ProposedRoute } from '../lib/types';
import { DEMO_ROUTES } from '../demo/seedData';

export function useRoutes(roomId: string | undefined, isDemo?: boolean) {
  const [routes, setRoutes] = useState<ProposedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (isDemo) {
      setRoutes(DEMO_ROUTES);
      setLoading(false);
      return;
    }

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
        { event: 'UPDATE', schema: 'public', table: 'proposed_routes', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setRoutes((prev) =>
            prev.map((r) => ((r.id === (payload.new as ProposedRoute).id) ? (payload.new as ProposedRoute) : r))
          );
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
  }, [roomId, isDemo]);

  const deleteRoute = async (routeId: string) => {
    if (isDemo) {
      setRoutes((prev) => prev.filter((r) => r.id !== routeId));
      return;
    }
    const { error } = await supabase.from('proposed_routes').delete().eq('id', routeId);
    if (error) throw error;
    setRoutes((prev) => prev.filter((r) => r.id !== routeId));
  };

  const updateRoute = async (routeId: string, updates: Partial<ProposedRoute>) => {
    if (isDemo) {
      setRoutes((prev) => prev.map((r) => (r.id === routeId ? { ...r, ...updates } : r)));
      return;
    }
    const { error } = await supabase.from('proposed_routes').update(updates).eq('id', routeId);
    if (error) throw error;
    setRoutes((prev) => prev.map((r) => (r.id === routeId ? { ...r, ...updates } : r)));
  };

  return { routes, loading, deleteRoute, updateRoute, setRoutes };
}
