import { supabase } from '@/lib/supabase';

export interface LiveSupportCallSession {
  roomUrl: string;
  roomName: string;
  expiresAt: number;
}

export async function startLiveSupportCall(): Promise<LiveSupportCallSession> {
  const { data, error } = await supabase.functions.invoke('live-support-call', {
    body: {},
  });

  if (error) {
    throw new Error(error.message || 'Could not start live support call');
  }

  if (!data?.ok || !data?.roomUrl) {
    throw new Error(data?.error || 'Live support call is unavailable');
  }

  return {
    roomUrl: String(data.roomUrl),
    roomName: String(data.roomName || ''),
    expiresAt: Number(data.expiresAt || 0),
  };
}
