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
    authService.getSession().then((s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        authService.getProfile(s.user.id).then(setProfile);
      }
      setLoading(false);
    });

    const { data: { subscription } } = authService.onAuthStateChange(async (_event, s) => {
      const sess = s as Session | null;
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        const p = await authService.getProfile(sess.user.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
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
