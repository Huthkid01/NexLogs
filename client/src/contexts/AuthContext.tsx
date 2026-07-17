import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { authService } from '@/services/auth.service';
import { resetDisplayCurrencyForLogin } from '@/contexts/display-currency';
import { queueQuickTourForUser } from '@/lib/quick-tour';
import { clearSessionActivity, touchSessionActivity } from '@/lib/session-idle';
import type { Profile } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  commitSession: (session: Session | null) => Promise<void>;
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

  const commitSession = useCallback(async (sess: Session | null) => {
    setSession(sess);
    setUser(sess?.user ?? null);

    if (sess?.user) {
      touchSessionActivity();
      try {
        const p = await authService.getProfile(sess.user.id);
        setProfile(p);
      } catch {
        setProfile(null);
      }
    } else {
      setProfile(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (userId: string) => {
      try {
        const p = await authService.getProfile(userId);
        if (mounted) setProfile(p);
      } catch {
        if (mounted) setProfile(null);
      }
    };

    const applySession = async (sess: Session | null, finishLoading = false) => {
      setSession(sess);
      setUser(sess?.user ?? null);

      if (sess?.user) {
        await loadProfile(sess.user.id);
      } else if (mounted) {
        setProfile(null);
      }

      if (finishLoading && mounted) {
        setLoading(false);
      }
    };

    const handleSignedIn = (sess: Session | null) => {
      resetDisplayCurrencyForLogin();
      touchSessionActivity();
      if (sess?.user?.id) {
        queueQuickTourForUser(sess.user.id);
      }
      void applySession(sess, true);
    };

    void authService.getSession().then((s) => {
      if (!mounted) return;
      void applySession(s, true);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = authService.onAuthStateChange((event, s) => {
      if (event === 'INITIAL_SESSION') return;

      const sess = s as Session | null;

      if (event === 'SIGNED_OUT') {
        clearSessionActivity();
        setSession(null);
        setUser(null);
        setProfile(null);
        if (mounted) setLoading(false);
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        setSession(sess);
        setUser(sess?.user ?? null);
        return;
      }

      if (event === 'SIGNED_IN') {
        handleSignedIn(sess);
        return;
      }

      void applySession(sess, true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await authService.signOut();
    } finally {
      clearSessionActivity();
      setUser(null);
      setProfile(null);
      setSession(null);
    }
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
        commitSession,
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
