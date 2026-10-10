import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { RouteVote } from '../lib/types';

export function useVotes(roomId: string | undefined, userId: string | undefined) {
  const [votes, setVotes] = useState<RouteVote[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!roomId) {
      setVotes([]);
      return;
    }

    // Since route_votes doesn't have a room_id, we fetch routes for the room first
    // Or we just fetch all votes and filter in UI? 
    // It's a hackathon, let's fetch votes where route_id IN (select id from proposed_routes where room_id = roomId)
    const fetchVotes = async () => {
      const { data: routes } = await supabase.from('proposed_routes').select('id').eq('room_id', roomId);
      if (!routes || routes.length === 0) return;
      
      const routeIds = routes.map(r => r.id);
      const { data: routeVotes } = await supabase.from('route_votes').select('*').in('route_id', routeIds);
      if (routeVotes) setVotes(routeVotes as RouteVote[]);
    };
    
    fetchVotes();

    // Realtime subscription to ALL route_votes (filtering by route_id is tricky in realtime unless we know the list of route ids)
    // For simplicity in the hackathon, just listen to all inserts/deletes on route_votes and update if we care about it
    const channel = supabase
      .channel(`votes:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'route_votes' },
        (payload) => {
          setVotes((prev) => [...prev, payload.new as RouteVote]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'route_votes' },
        (payload) => {
          setVotes((prev) => prev.filter(v => !(v.route_id === payload.old.route_id && v.user_id === payload.old.user_id)));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);

  const toggleVote = async (routeId: string) => {
    if (!userId) return;
    const existing = votes.find(v => v.route_id === routeId && v.user_id === userId);
    if (existing) {
      await supabase.from('route_votes').delete().match({ route_id: routeId, user_id: userId });
    } else {
      await supabase.from('route_votes').insert({ route_id: routeId, user_id: userId });
    }
  };

  const getVoteCount = (routeId: string) => votes.filter(v => v.route_id === routeId).length;
  const hasVoted = (routeId: string) => votes.some(v => v.route_id === routeId && v.user_id === userId);

  return { getVoteCount, hasVoted, toggleVote, votes };
}
