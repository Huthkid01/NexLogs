import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/types';
import { MOCK_USERS } from '@/mocks/demo-data';

const SESSION_KEY = 'nexlogs_mock_session';

type AuthListener = (event: string, session: Session | null) => void;
const listeners = new Set<AuthListener>();

function buildUser(record: (typeof MOCK_USERS)[number]): User {
  return {
    id: record.id,
    email: record.email,
    aud: 'authenticated',
    role: 'authenticated',
    created_at: record.profile.created_at,
    app_metadata: {},
    user_metadata: { full_name: record.profile.full_name },
  } as User;
}

function buildSession(user: User): Session {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  } as Session;
}

function readUserId(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId?: string };
    return parsed.userId ?? null;
  } catch {
    return null;
  }
}

function writeSession(userId: string | null) {
  if (userId) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function notify(event: string, session: Session | null) {
  listeners.forEach((listener) => listener(event, session));
}

export function getMockUserById(userId: string) {
  return MOCK_USERS.find((user) => user.id === userId) ?? null;
}

export function getMockBalance(userId: string): number {
  return getMockUserById(userId)?.balance ?? 0;
}

export const mockAuthService = {
  async signIn(email: string, password: string) {
    const record = MOCK_USERS.find(
      (user) => user.email.toLowerCase() === email.toLowerCase() && user.password === password
    );
    if (!record) throw new Error('Invalid login credentials');

    const user = buildUser(record);
    const session = buildSession(user);
    writeSession(record.id);
    notify('SIGNED_IN', session);
    return { user, session };
  },

  async signUp(email: string, password: string, fullName: string) {
    void email;
    void password;
    void fullName;
    throw new Error('Registration is disabled in demo mode. Use demo@nexlogs.com / Demo1234!');
  },

  async signInWithGoogle() {
    throw new Error('Google sign-in is disabled in demo mode. Use the demo email and password.');
  },

  async signOut() {
    writeSession(null);
    notify('SIGNED_OUT', null);
  },

  async resetPassword() {
    return Promise.resolve();
  },

  async updatePassword() {
    return Promise.resolve();
  },

  async getSession() {
    const userId = readUserId();
    if (!userId) return null;
    const record = getMockUserById(userId);
    if (!record) return null;
    return buildSession(buildUser(record));
  },

  async getProfile(userId: string): Promise<Profile | null> {
    return getMockUserById(userId)?.profile ?? null;
  },

  async updateProfile(userId: string, updates: Partial<Profile>) {
    const record = getMockUserById(userId);
    if (!record) throw new Error('Profile not found');
    record.profile = { ...record.profile, ...updates, updated_at: new Date().toISOString() };
    return record.profile;
  },

  onAuthStateChange(callback: AuthListener) {
    listeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            listeners.delete(callback);
          },
        },
      },
    };
  },
};
