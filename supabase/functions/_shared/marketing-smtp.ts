import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendDenoSmtp, verifyDenoSmtp } from './deno-smtp.ts';

export interface MarketingSmtpConfig {
  id: string | null;
  label: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromAddress: string;
  isDefault: boolean;
}

export interface MarketingSmtpPublicAccount {
  id: string;
  label: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  from_name: string;
  from_address: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  has_password: true;
}

function trimRequired(value: unknown, field: string) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${field} is required`);
  return text;
}

export function getDefaultMarketingSmtpConfig(): MarketingSmtpConfig {
  const host = Deno.env.get('SMTP_HOST') || 'workplace.truehost.cloud';
  const username = Deno.env.get('SMTP_USER') || '';
  const password = Deno.env.get('SMTP_PASS') || '';
  const fromAddress = Deno.env.get('EMAIL_FROM_ADDRESS') || username;
  const fromName = Deno.env.get('EMAIL_FROM_NAME') || Deno.env.get('APP_NAME') || 'Nexlogs';
  const port = Number(Deno.env.get('SMTP_PORT') || 587);
  const secure = Deno.env.get('SMTP_SECURE') === 'true' || port === 465;

  if (!username || !password || !fromAddress) {
    throw new Error('Default SMTP is not configured. Set SMTP_USER, SMTP_PASS, and EMAIL_FROM_ADDRESS secrets.');
  }

  return {
    id: null,
    label: 'Default (Edge secrets / Truehost)',
    host,
    port: Number.isFinite(port) && port > 0 ? port : 587,
    secure,
    username,
    password,
    fromName,
    fromAddress,
    isDefault: true,
  };
}

export async function resolveMarketingSmtpConfig(
  adminClient: SupabaseClient,
  smtpAccountId?: string | null,
): Promise<MarketingSmtpConfig> {
  const requestedId = smtpAccountId?.trim() || '';
  if (!requestedId || requestedId === 'default') {
    return getDefaultMarketingSmtpConfig();
  }

  const { data, error } = await adminClient
    .from('marketing_smtp_accounts')
    .select('id, label, host, port, secure, username, password, from_name, from_address, is_active')
    .eq('id', requestedId)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.is_active === false) {
    throw new Error('Selected SMTP account was not found or is inactive');
  }

  return {
    id: data.id,
    label: data.label,
    host: data.host,
    port: Number(data.port) || 587,
    secure: Boolean(data.secure),
    username: data.username,
    password: data.password,
    fromName: data.from_name || 'Nexlogs',
    fromAddress: data.from_address,
    isDefault: false,
  };
}

export function toPublicSmtpAccount(row: {
  id: string;
  label: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  from_name: string;
  from_address: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}): MarketingSmtpPublicAccount {
  return {
    id: row.id,
    label: row.label,
    host: row.host,
    port: row.port,
    secure: row.secure,
    username: row.username,
    from_name: row.from_name,
    from_address: row.from_address,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    has_password: true,
  };
}

export function parseSmtpAccountInput(body: Record<string, unknown>, options?: { requirePassword?: boolean }) {
  const requirePassword = options?.requirePassword !== false;
  const label = trimRequired(body.label, 'Label');
  const host = trimRequired(body.host, 'SMTP host');
  const username = trimRequired(body.username, 'SMTP username');
  const fromAddress = trimRequired(body.from_address ?? body.fromAddress, 'From address');
  const fromName = String(body.from_name ?? body.fromName ?? 'Nexlogs').trim() || 'Nexlogs';
  const portRaw = Number(body.port ?? 587);
  const port = Number.isFinite(portRaw) && portRaw > 0 && portRaw <= 65535 ? Math.trunc(portRaw) : 587;
  // STARTTLS ports must not use implicit SSL. Default secure from port when omitted.
  const secure =
    body.secure === false || body.secure === 'false' || port === 587 || port === 2525
      ? false
      : body.secure === true || body.secure === 'true' || port === 465
        ? true
        : false;
  const password = String(body.password ?? '').trim();

  if (requirePassword && !password) {
    throw new Error('SMTP password is required');
  }

  return {
    label,
    host,
    port,
    secure,
    username,
    password,
    from_name: fromName,
    from_address: fromAddress,
    is_active: body.is_active === false || body.is_active === 'false' ? false : true,
  };
}

export async function sendViaMarketingSmtp(
  input: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    headers?: Record<string, string>;
  },
  smtp: MarketingSmtpConfig,
) {
  const from = `"${smtp.fromName.replaceAll('"', '')}" <${smtp.fromAddress}>`;
  const uniqueAttempts = buildSmtpVerifyAttempts(smtp);
  const errors: string[] = [];

  for (const attempt of uniqueAttempts) {
    try {
      await sendDenoSmtp(
        {
          host: smtp.host,
          port: attempt.port,
          secure: attempt.secure,
          username: smtp.username,
          password: smtp.password,
        },
        {
          from,
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text,
          headers: input.headers,
        },
      );
      return { from };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${smtp.host}:${attempt.port} → ${message}`);
      console.error(`[marketing-smtp] ${smtp.host}:${attempt.port} failed:`, message);
    }
  }

  throw new Error(errors.length ? `SMTP send failed. Tried:\n${errors.join('\n')}` : 'SMTP send failed');
}

function resolveAttemptSecure(port: number, configuredSecure: boolean): boolean {
  if (port === 465) return true;
  // 587 / 2525 = STARTTLS submission (common on Bulko, Mailgun, cloud hosts)
  if (port === 587 || port === 2525) return false;
  return configuredSecure;
}

function buildSmtpVerifyAttempts(smtp: MarketingSmtpConfig) {
  const configuredPort = smtp.port || 2525;
  const configuredSecure = resolveAttemptSecure(configuredPort, smtp.secure === true);

  // Prefer configured port, then 2525 (Edge-friendly; Bulko default), then 587.
  // Only try 465 when the user explicitly configured it — Bulko refuses 465.
  const attempts = [
    { port: configuredPort, secure: configuredSecure },
    { port: 2525, secure: false },
    { port: 587, secure: false },
    ...(configuredPort === 465 ? [{ port: 465, secure: true }] : []),
  ];

  const seen = new Set<string>();
  return attempts.filter((attempt) => {
    const key = `${attempt.port}:${attempt.secure}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function verifyMarketingSmtp(smtp: MarketingSmtpConfig) {
  const errors: string[] = [];

  for (const attempt of buildSmtpVerifyAttempts(smtp)) {
    try {
      await verifyDenoSmtp({
        host: smtp.host,
        port: attempt.port,
        secure: attempt.secure,
        username: smtp.username,
        password: smtp.password,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${smtp.host}:${attempt.port} → ${message}`);
      console.error(`[marketing-smtp] verify ${smtp.host}:${attempt.port} secure=${attempt.secure} failed:`, message);
    }
  }

  throw new Error(
    errors.length
      ? `SMTP verification failed. Tried:\n${errors.join('\n')}`
      : 'SMTP verification failed',
  );
}
