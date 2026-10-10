import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAnonymous: boolean;
  setProfile: (p: Profile) => void;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: Error | null }>;
  signInWithOtp: (email: string, redirectTo?: string) => Promise<{ error: Error | null }>;
  linkWithGoogle: (redirectTo?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  isAnonymous: true,
  setProfile: () => {},
  signInWithGoogle: async () => ({ error: null }),
  signInWithOtp: async () => ({ error: null }),
  linkWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

function getRedirectUrl(customPath?: string): string {
  const base = window.location.origin;
  const path = customPath || window.location.pathname;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileForUser = useCallback(async (targetUser: User): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUser.id)
        .maybeSingle();

      if (!error && data) {
        const meta = targetUser.user_metadata || {};
        return {
          ...data,
          avatar_url: data.avatar_url || meta.avatar_url || meta.picture || null,
          email: targetUser.email || null,
        } as Profile;
      }

      // If user has OAuth metadata but no profile row yet
      const meta = targetUser.user_metadata || {};
      const inferredName = meta.full_name || meta.name || targetUser.email?.split('@')[0];
      const avatarUrl = meta.avatar_url || meta.picture || null;

      if (inferredName) {
        const fallbackColor = '#f95d0f';
        const { data: upserted } = await supabase
          .from('profiles')
          .upsert({
            id: targetUser.id,
            display_name: inferredName,
            avatar_color: fallbackColor,
            avatar_url: avatarUrl,
          })
          .select()
          .maybeSingle();

        if (upserted) {
          return {
            ...upserted,
            email: targetUser.email || null,
          } as Profile;
        }
      }
    } catch (err) {
      console.warn('Could not load profile:', err);
    }
    return null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfileForUser(user);
    if (p) setProfile(p);
  }, [user, fetchProfileForUser]);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data: { session: existing } } = await supabase.auth.getSession();

        if (existing) {
          if (!isMounted) return;
          setSession(existing);
          setUser(existing.user);
          const p = await fetchProfileForUser(existing.user);
          if (isMounted && p) setProfile(p);
          setLoading(false);
          return;
        }

        // No session yet — start frictionless guest session
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error('Anonymous sign-in failed:', error.message);
          if (isMounted) setLoading(false);
          return;
        }
        if (isMounted) {
          setSession(data.session);
          setUser(data.user);
          setLoading(false);
        }
      } catch (e) {
        console.error('Auth initialization error:', e);
        if (isMounted) setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!isMounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const p = await fetchProfileForUser(s.user);
        if (isMounted) setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [fetchProfileForUser]);

  const signInWithGoogle = async (customRedirect?: string) => {
    try {
      const redirectUrl = getRedirectUrl(customRedirect);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      if (error) return { error: new Error(error.message) };
      if (data?.url) {
        window.location.assign(data.url);
      }
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Failed to sign in with Google') };
    }
  };

  const linkWithGoogle = async (customRedirect?: string) => {
    try {
      const redirectUrl = getRedirectUrl(customRedirect);
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) return { error: new Error(error.message) };
      if (data?.url) {
        window.location.assign(data.url);
      }
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Failed to link Google account') };
    }
  };

  const signInWithOtp = async (email: string, customRedirect?: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: getRedirectUrl(customRedirect),
        },
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Failed to send magic link') };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
      // Clean guest session reset
      const { data } = await supabase.auth.signInAnonymously();
      if (data?.session) {
        setSession(data.session);
        setUser(data.user);
      }
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const isAnonymous = Boolean(user?.is_anonymous);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        isAnonymous,
        setProfile,
        signInWithGoogle,
        signInWithOtp,
        linkWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
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
    .upsert(
      { id: userId, display_name: displayName, avatar_color: avatarColor },
      { onConflict: 'id' }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Profile;
}
