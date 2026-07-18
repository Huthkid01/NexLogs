import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  const host = Deno.env.get('SMTP_HOST') || 'smtp.hostinger.com';
  const username = Deno.env.get('SMTP_USER') || '';
  const password = Deno.env.get('SMTP_PASS') || '';
  const fromAddress = Deno.env.get('EMAIL_FROM_ADDRESS') || username;
  const fromName = Deno.env.get('EMAIL_FROM_NAME') || Deno.env.get('APP_NAME') || 'Nexlogs';
  const port = Number(Deno.env.get('SMTP_PORT') || 465);
  const secure = Deno.env.get('SMTP_SECURE') !== 'false';

  if (!username || !password || !fromAddress) {
    throw new Error('Default SMTP is not configured. Set SMTP_USER, SMTP_PASS, and EMAIL_FROM_ADDRESS secrets.');
  }

  return {
    id: null,
    label: 'Default (support@nexlogs.store)',
    host,
    port: Number.isFinite(port) && port > 0 ? port : 465,
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
    port: Number(data.port) || 465,
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
  const portRaw = Number(body.port ?? 465);
  const port = Number.isFinite(portRaw) && portRaw > 0 && portRaw <= 65535 ? Math.trunc(portRaw) : 465;
  const secure = body.secure === false || body.secure === 'false' ? false : true;
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
  const nodemailer = await import('npm:nodemailer@6.9.16');
  const from = `"${smtp.fromName.replaceAll('"', '')}" <${smtp.fromAddress}>`;

  const attempts = smtp.isDefault
    ? [
        { port: smtp.port || 465, secure: smtp.secure !== false },
        { port: 465, secure: true },
        { port: 587, secure: false },
      ]
    : [{ port: smtp.port || 465, secure: smtp.secure !== false }];

  // Deduplicate attempts
  const seen = new Set<string>();
  const uniqueAttempts = attempts.filter((attempt) => {
    const key = `${attempt.port}:${attempt.secure}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let lastError: Error | null = null;

  for (const attempt of uniqueAttempts) {
    try {
      const transport = nodemailer.default.createTransport({
        host: smtp.host,
        port: attempt.port,
        secure: attempt.secure,
        auth: {
          user: smtp.username,
          pass: smtp.password,
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
      });

      await new Promise<void>((resolve, reject) => {
        transport.sendMail(
          {
            from,
            to: input.to,
            subject: input.subject,
            html: input.html,
            text: input.text,
            headers: input.headers,
          },
          (error: Error | null) => {
            if (error) reject(error);
            else resolve();
          },
        );
      });
      return { from };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = error instanceof Error ? error : new Error(message);
      console.error(`[marketing-smtp] ${smtp.host}:${attempt.port} failed:`, message);
    }
  }

  throw lastError ?? new Error('SMTP send failed');
}

export async function verifyMarketingSmtp(smtp: MarketingSmtpConfig) {
  const nodemailer = await import('npm:nodemailer@6.9.16');
  const transport = nodemailer.default.createTransport({
    host: smtp.host,
    port: smtp.port || 465,
    secure: smtp.secure !== false,
    auth: {
      user: smtp.username,
      pass: smtp.password,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });

  await transport.verify();
  return true;
}
