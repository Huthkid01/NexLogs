import { isMockMode } from '@/lib/mock-mode';
import { mockAuthService } from '@/mocks/mock-auth';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

export const authService = {
  async signUp(email: string, password: string, fullName: string) {
    if (isMockMode()) return mockAuthService.signUp(email, password, fullName);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    if (isMockMode()) return mockAuthService.signIn(email, password);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    try {
      const userId = data.user?.id ?? data.session?.user?.id;
      if (userId) {
        await supabase.from('activity_logs').insert({ user_id: userId, action: 'signed_in', entity: 'auth', metadata: { provider: 'email' } } as never);
      }
    } catch {
      return data;
    }
    return data;
  },

  async signInWithGoogle() {
    if (isMockMode()) return mockAuthService.signInWithGoogle();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (isMockMode()) return mockAuthService.signOut();
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (userId) {
        await supabase.from('activity_logs').insert({ user_id: userId, action: 'signed_out', entity: 'auth' } as never);
      }
    } catch {
      return supabase.auth.signOut();
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    if (isMockMode()) return mockAuthService.resetPassword();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  async updatePassword(password: string) {
    if (isMockMode()) return mockAuthService.updatePassword();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  async getSession() {
    if (isMockMode()) return mockAuthService.getSession();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getProfile(userId: string): Promise<Profile | null> {
    if (isMockMode()) return mockAuthService.getProfile(userId);
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) return null;
    return data as Profile;
  },

  async updateProfile(userId: string, updates: Partial<Profile>) {
    if (isMockMode()) return mockAuthService.updateProfile(userId, updates);
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() } as never)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  },

  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    if (isMockMode()) return mockAuthService.onAuthStateChange(callback);
    return supabase.auth.onAuthStateChange(callback);
  },
};
