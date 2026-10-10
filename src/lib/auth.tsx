import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  setProfile: (p: Profile) => void;
}

const AuthContext = createContext<AuthContextValue>({
  session: null, user: null, profile: null, loading: true,
  setProfile: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sign in anonymously on first load
    const init = async () => {
      const { data: { session: existing } } = await supabase.auth.getSession();

      if (existing) {
        setSession(existing);
        setUser(existing.user);
        // Load existing profile
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', existing.user.id)
          .single();
        if (data) setProfile(data as Profile);
        setLoading(false);
        return;
      }

      // No existing session — sign in anonymously
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.error('Anonymous sign-in failed:', error.message);
        setLoading(false);
        return;
      }
      setSession(data.session);
      setUser(data.user);
      setLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Upserts a profile row for the current user */
export async function upsertProfile(
  userId: string,
  displayName: string,
  avatarColor: string
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: displayName, avatar_color: avatarColor }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Profile;
}
