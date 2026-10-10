import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

export function usePresence(roomId: string | undefined, profile: Profile | null) {
  const [presentUsers, setPresentUsers] = useState<Profile[]>([]);

  useEffect(() => {
    if (!roomId || !profile) {
      setPresentUsers([]);
      return;
    }

    const channel = supabase.channel(`presence:${roomId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ user: Profile }>();
        const users = Object.values(state).flatMap((s) => s.map((p) => p.user));
        // deduplicate by id
        const unique = Array.from(new Map(users.map((u) => [u.id, u])).values());
        setPresentUsers(unique);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user: profile });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, profile]);

  return presentUsers;
}
