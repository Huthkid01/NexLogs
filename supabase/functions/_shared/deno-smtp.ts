/**
 * Minimal Deno-native SMTP client (TCP + STARTTLS / implicit TLS).
 * Avoids nodemailer on Supabase Edge — Node socket writes often fail with "write UNKNOWN".
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type Conn = Deno.Conn;

function toBase64(value: string) {
  const bytes = encoder.encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export type DenoSmtpAuth = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
};

export type DenoSmtpMessage = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
};

class SmtpSession {
  private buffer = '';
  private conn: Conn;

  constructor(conn: Conn) {
    this.conn = conn;
  }

  async readReply(): Promise<{ code: number; lines: string[] }> {
    const lines: string[] = [];
    while (true) {
      while (!this.buffer.includes('\n')) {
        const chunk = new Uint8Array(4096);
        const n = await this.conn.read(chunk);
        if (n === null) throw new Error('SMTP connection closed unexpectedly');
        this.buffer += decoder.decode(chunk.subarray(0, n));
      }

      const nl = this.buffer.indexOf('\n');
      const rawLine = this.buffer.slice(0, nl).replace(/\r$/, '');
      this.buffer = this.buffer.slice(nl + 1);

      if (rawLine.length < 3) continue;
      const code = Number(rawLine.slice(0, 3));
      if (!Number.isFinite(code)) {
        throw new Error(`Invalid SMTP reply: ${rawLine}`);
      }
      lines.push(rawLine.slice(4) || rawLine);
      // Multi-line: "250-..." continues; "250 ..." ends.
      if (rawLine.length === 3 || rawLine[3] === ' ') {
        return { code, lines };
      }
    }
  }

  async writeLine(line: string) {
    await this.conn.write(encoder.encode(`${line}\r\n`));
  }

  async writeRaw(data: string) {
    await this.conn.write(encoder.encode(data));
  }

  async expect(okCodes: number[], command?: string) {
    if (command !== undefined) {
      await this.writeLine(command);
    }
    const reply = await this.readReply();
    if (!okCodes.includes(reply.code)) {
      throw new Error(
        command
          ? `SMTP ${command.split(' ')[0]} failed (${reply.code}): ${reply.lines.join(' ')}`
          : `SMTP greeting failed (${reply.code}): ${reply.lines.join(' ')}`,
      );
    }
    return reply;
  }

  async upgradeTls(hostname: string) {
    this.conn = await Deno.startTls(this.conn, { hostname });
    this.buffer = '';
  }

  close() {
    try {
      this.conn.close();
    } catch {
      // ignore
    }
  }
}

async function withConnectTimeout<T>(ms: number, factory: () => Promise<T>): Promise<T> {
  let timer: number | undefined;
  try {
    return await Promise.race([
      factory(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`SMTP connect timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function openSession(auth: DenoSmtpAuth): Promise<SmtpSession> {
  const hostname = auth.host;
  const port = auth.port;

  const conn = await withConnectTimeout(20_000, () =>
    auth.secure
      ? Deno.connectTls({ hostname, port })
      : Deno.connect({ hostname, port }),
  );

  const session = new SmtpSession(conn);
  await session.expect([220]);

  const ehloHost = 'nexlogs.site';
  let caps = await session.expect([250], `EHLO ${ehloHost}`);

  if (!auth.secure) {
    const supportsStartTls = caps.lines.some((line) =>
      line.toUpperCase().startsWith('STARTTLS'),
    );
    if (!supportsStartTls) {
      throw new Error('SMTP server does not advertise STARTTLS');
    }
    await session.expect([220], 'STARTTLS');
    await session.upgradeTls(hostname);
    caps = await session.expect([250], `EHLO ${ehloHost}`);
  }

  const authLine = caps.lines.find((line) => line.toUpperCase().startsWith('AUTH '));
  const methods = (authLine ?? '').toUpperCase().split(/\s+/).slice(1);

  if (methods.includes('PLAIN')) {
    const token = toBase64(`\0${auth.username}\0${auth.password}`);
    await session.expect([235], `AUTH PLAIN ${token}`);
  } else if (methods.includes('LOGIN')) {
    await session.expect([334], 'AUTH LOGIN');
    await session.expect([334], toBase64(auth.username));
    await session.expect([235], toBase64(auth.password));
  } else {
    throw new Error(`SMTP AUTH not supported (got: ${authLine || 'none'})`);
  }

  return session;
}

function encodeSubject(subject: string) {
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${toBase64(subject)}?=`;
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildMime(message: DenoSmtpMessage) {
  const boundary = `nexlogs_${crypto.randomUUID().replaceAll('-', '')}`;
  const text = message.text?.trim() || stripHtml(message.html) || ' ';
  const extraHeaders = Object.entries(message.headers ?? {})
    .filter(([key]) => !/^(from|to|subject|mime-version|content-type|date)$/i.test(key))
    .map(([key, value]) => `${key}: ${value}`)
    .join('\r\n');

  const parts = [
    `From: ${message.from}`,
    `To: ${message.to}`,
    `Subject: ${encodeSubject(message.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    ...(extraHeaders ? [extraHeaders] : []),
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    message.html,
    `--${boundary}--`,
    '',
  ];

  // Dot-stuff lines that begin with '.'
  return parts
    .join('\r\n')
    .replace(/^\./gm, '..');
}

function extractAddress(fromOrTo: string) {
  const match = fromOrTo.match(/<([^>]+)>/);
  return (match?.[1] || fromOrTo).trim();
}

export async function verifyDenoSmtp(auth: DenoSmtpAuth) {
  const session = await openSession(auth);
  try {
    await session.expect([221], 'QUIT');
  } finally {
    session.close();
  }
}

export async function sendDenoSmtp(auth: DenoSmtpAuth, message: DenoSmtpMessage) {
  const session = await openSession(auth);
  try {
    const mailFrom = extractAddress(message.from);
    const rcptTo = extractAddress(message.to);
    await session.expect([250], `MAIL FROM:<${mailFrom}>`);
    await session.expect([250], `RCPT TO:<${rcptTo}>`);
    await session.expect([354], 'DATA');
    await session.writeRaw(`${buildMime(message)}\r\n.\r\n`);
    const dataReply = await session.readReply();
    if (![250, 251].includes(dataReply.code)) {
      throw new Error(`SMTP DATA failed (${dataReply.code}): ${dataReply.lines.join(' ')}`);
    }
    await session.expect([221], 'QUIT');
  } finally {
    session.close();
  }
}
