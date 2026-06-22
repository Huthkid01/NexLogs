import { randomUUID, createHash } from 'node:crypto';
import { env } from '../env.js';
import { sendMail } from '../mailer.js';
import { getServiceSupabase } from '../supabase.js';
import { buildPasswordResetEmail } from '../templates.js';

const RESET_EXPIRY_MINUTES = 60;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;

  const supabase = getServiceSupabase();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('email', normalizedEmail)
    .maybeSingle();
  const profileRow = profile as { id: string; full_name: string | null; email: string } | null;

  if (!profileRow?.id || !profileRow.email) return;

  const rawToken = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000).toISOString();

  await supabase.from('password_reset_tokens').delete().eq('user_id', profileRow.id).is('used_at', null);
  const { error: insertError } = await supabase.from('password_reset_tokens').insert({
    user_id: profileRow.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
  } as never);
  if (insertError) throw insertError;

  const resetUrl = `${env.appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const emailContent = buildPasswordResetEmail({
    appName: env.appName,
    fullName: profileRow.full_name || profileRow.email.split('@')[0],
    resetUrl,
    expiresMinutes: RESET_EXPIRY_MINUTES,
  });

  await sendMail({
    to: profileRow.email,
    ...emailContent,
  });
}

export async function completePasswordReset(token: string, password: string) {
  const trimmedToken = token.trim();
  const trimmedPassword = password.trim();
  if (!trimmedToken || trimmedPassword.length < 8) {
    throw new Error('Invalid reset request');
  }

  const supabase = getServiceSupabase();
  const tokenHash = hashToken(trimmedToken);
  const { data: resetRow, error: resetError } = await supabase
    .from('password_reset_tokens')
    .select('id, user_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();
  const row = resetRow as {
    id: string;
    user_id: string;
    expires_at: string;
    used_at: string | null;
  } | null;

  if (resetError || !row || row.used_at) {
    throw new Error('This reset link is invalid or has already been used');
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw new Error('This reset link has expired');
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(row.user_id, {
    password: trimmedPassword,
  });
  if (updateError) throw updateError;

  await supabase
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() } as never)
    .eq('id', row.id);
}
