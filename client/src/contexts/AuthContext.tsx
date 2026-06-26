import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { authService } from '@/services/auth.service';
import type { Profile } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (user) {
      const p = await authService.getProfile(user.id);
      setProfile(p);
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchProfile = (userId: string) => {
      void authService.getProfile(userId).then((p) => {
        if (mounted) setProfile(p);
      });
    };

    const applySession = (sess: Session | null) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        fetchProfile(sess.user.id);
      } else if (mounted) {
        setProfile(null);
      }
      if (mounted) setLoading(false);
    };

    authService.getSession().then((s) => {
      if (!mounted) return;
      applySession(s);
    });

    const { data: { subscription } } = authService.onAuthStateChange((event, s) => {
      if (event === 'INITIAL_SESSION') return;

      const sess = s as Session | null;
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(sess);
        setUser(sess?.user ?? null);
        if (sess?.user) fetchProfile(sess.user.id);
        if (mounted) setLoading(false);
        return;
      }

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        if (mounted) setLoading(false);
        return;
      }

      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        fetchProfile(sess.user.id);
      } else if (mounted) {
        setProfile(null);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isAdmin: profile?.role === 'admin',
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
