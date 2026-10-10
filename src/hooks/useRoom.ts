import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Room } from '../lib/types';

/**
 * Fetches room data by id. Returns null while loading and undefined if not found.
 * Phase 1: basic fetch. Phase 3: realtime will be wired here.
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
  }, [roomId]);

  return { room, loading, error };
}

/** Creates a new room and returns its id */
export async function createRoom(name: string, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('rooms')
    .insert({ name, created_by: userId })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}
