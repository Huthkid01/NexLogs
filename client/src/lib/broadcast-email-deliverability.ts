export type DeliverabilityLevel = 'pass' | 'warn' | 'fail';

export interface DeliverabilityCheck {
  id: string;
  level: DeliverabilityLevel;
  title: string;
  detail: string;
}

const SPAM_TRIGGER_WORDS = [
  'free money',
  'act now',
  'click here',
  'winner',
  'congratulations',
  '100% free',
  'risk free',
  'no obligation',
  'limited time',
  'urgent',
  'cash bonus',
  'earn extra cash',
];

function uppercaseRatio(value: string) {
  const letters = value.replace(/[^a-zA-Z]/g, '');
  if (!letters.length) return 0;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  return upper / letters.length;
}

export function sanitizeBroadcastSubject(subject: string) {
  return subject
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/!{2,}/g, '!')
    .slice(0, 180);
}

export function sanitizeBroadcastMessage(message: string) {
  return message.trim().replace(/\s+/g, ' ').slice(0, 1200);
}

export function runDeliverabilityChecks(options: {
  subject: string;
  customMessage?: string;
  productCount: number;
}) {
  const subject = sanitizeBroadcastSubject(options.subject);
  const message = sanitizeBroadcastMessage(options.customMessage ?? '');
  const combined = `${subject} ${message}`.toLowerCase();
  const checks: DeliverabilityCheck[] = [];

  if (!subject) {
    checks.push({
      id: 'subject-empty',
      level: 'fail',
      title: 'Subject line is required',
      detail: 'Add a clear subject before sending.',
    });
  } else if (subject.length > 78) {
    checks.push({
      id: 'subject-length',
      level: 'warn',
      title: 'Subject may be truncated in inbox',
      detail: `Keep subjects under 78 characters (current: ${subject.length}).`,
    });
  } else {
    checks.push({
      id: 'subject-length',
      level: 'pass',
      title: 'Subject length looks good',
      detail: `${subject.length} characters — fits most inbox previews.`,
    });
  }

  if (uppercaseRatio(subject) > 0.6) {
    checks.push({
      id: 'subject-caps',
      level: 'fail',
      title: 'Too many capital letters in subject',
      detail: 'Use sentence case. ALL CAPS subjects are often flagged as spam.',
    });
  } else {
    checks.push({
      id: 'subject-caps',
      level: 'pass',
      title: 'Subject casing looks natural',
      detail: 'Avoid shouting with all caps to improve inbox placement.',
    });
  }

  if (/[!?$]{3,}/.test(subject) || (subject.match(/!/g)?.length ?? 0) >= 3) {
    checks.push({
      id: 'subject-punctuation',
      level: 'fail',
      title: 'Subject has aggressive punctuation',
      detail: 'Remove repeated ! or ? marks — they trigger spam filters.',
    });
  } else {
    checks.push({
      id: 'subject-punctuation',
      level: 'pass',
      title: 'Subject punctuation is clean',
      detail: 'No spam-like punctuation patterns detected.',
    });
  }

  const trigger = SPAM_TRIGGER_WORDS.find((word) => combined.includes(word));
  if (trigger) {
    checks.push({
      id: 'spam-words',
      level: 'fail',
      title: 'Spam trigger phrase detected',
      detail: `Remove or rephrase "${trigger}" to reduce spam scoring.`,
    });
  } else {
    checks.push({
      id: 'spam-words',
      level: 'pass',
      title: 'No common spam trigger phrases',
      detail: 'Content avoids high-risk marketing spam words.',
    });
  }

  if (options.productCount < 1) {
    checks.push({
      id: 'products',
      level: 'fail',
      title: 'No products selected',
      detail: 'Select at least one active product for the email body.',
    });
  } else {
    checks.push({
      id: 'products',
      level: 'pass',
      title: 'Product list included',
      detail: `${options.productCount} product(s) will appear in the email.`,
    });
  }

  if (message.length > 600) {
    checks.push({
      id: 'message-length',
      level: 'warn',
      title: 'Intro message is quite long',
      detail: 'Shorter intros usually perform better in inbox placement.',
    });
  }

  checks.push({
    id: 'plain-text',
    level: 'pass',
    title: 'Plain-text version included',
    detail: 'Each send includes HTML and plain text for better deliverability.',
  });

  checks.push({
    id: 'sender-domain',
    level: 'pass',
    title: 'Sender uses support@nexlogs.store',
    detail: 'Ensure SPF, DKIM, and DMARC are enabled on Hostinger for nexlogs.store.',
  });

  checks.push({
    id: 'rate-limit',
    level: 'pass',
    title: 'Send throttling enabled',
    detail: 'Emails go out one by one: 10 per batch, then a 5 second pause before the next batch.',
  });

  const failures = checks.filter((check) => check.level === 'fail');
  const warnings = checks.filter((check) => check.level === 'warn');

  return {
    checks,
    canSend: failures.length === 0,
    failures,
    warnings,
    sanitizedSubject: subject,
    sanitizedMessage: message,
  };
}
