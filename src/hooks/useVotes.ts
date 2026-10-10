import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Fetches and subscribes to route_votes for all routes in a room.
 * Returns a map of route_id -> count, and the set of route_ids voted by currentUser.
 */
export function useVotes(
  roomIds: string[], // list of proposed_route ids in the room
  currentUserId: string | null
) {
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());

  const reloadVotes = async () => {
    if (roomIds.length === 0) return;

    const { data } = await supabase
      .from('route_votes')
      .select('route_id, user_id')
      .in('route_id', roomIds);

    if (!data) return;

    const counts: Record<string, number> = {};
    const mine = new Set<string>();

    for (const vote of data) {
      counts[vote.route_id] = (counts[vote.route_id] ?? 0) + 1;
      if (vote.user_id === currentUserId) mine.add(vote.route_id);
    }

    setVoteCounts(counts);
    setMyVotes(mine);
  };

  useEffect(() => {
    reloadVotes();

    if (roomIds.length === 0) return;

    const channel = supabase
      .channel(`votes:${roomIds.join(',')}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'route_votes' },
        () => {
          // Re-fetch on any vote change for simplicity (low frequency)
          reloadVotes();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [JSON.stringify(roomIds), currentUserId]);

  const toggleVote = async (routeId: string) => {
    if (!currentUserId) return;

    if (myVotes.has(routeId)) {
      // Remove vote
      await supabase
        .from('route_votes')
        .delete()
        .eq('route_id', routeId)
        .eq('user_id', currentUserId);
    } else {
      // Add vote
      await supabase
        .from('route_votes')
        .insert({ route_id: routeId, user_id: currentUserId });
    }
    // Realtime will trigger reloadVotes
  };

  return { voteCounts, myVotes, toggleVote };
}
