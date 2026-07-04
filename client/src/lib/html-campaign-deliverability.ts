import type { DeliverabilityCheck } from '@/lib/broadcast-email-deliverability';

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

export function sanitizeHtmlCampaignSubject(subject: string) {
  return subject
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/!{2,}/g, '!')
    .slice(0, 180);
}

export function sanitizeHtmlCampaignBody(html: string) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim()
    .slice(0, 100000);
}

function htmlToPlainText(html: string) {
  return html
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPreheader(html: string) {
  const hiddenMatch = html.match(
    /<div[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  );
  if (hiddenMatch?.[1]) {
    return htmlToPlainText(hiddenMatch[1]).slice(0, 140);
  }

  const plain = htmlToPlainText(html);
  return plain.slice(0, 140);
}

export function runHtmlCampaignDeliverabilityChecks(options: {
  subject: string;
  htmlBody: string;
  recipientCount: number;
}) {
  const subject = sanitizeHtmlCampaignSubject(options.subject);
  const htmlBody = sanitizeHtmlCampaignBody(options.htmlBody);
  const plainText = htmlToPlainText(htmlBody).toLowerCase();
  const combined = `${subject} ${plainText}`.toLowerCase();
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
      detail: `Remove or rephrase "${trigger}" in the subject or email body.`,
    });
  } else {
    checks.push({
      id: 'spam-words',
      level: 'pass',
      title: 'No common spam trigger phrases',
      detail: 'Content avoids high-risk marketing spam words.',
    });
  }

  const hasPromoHero = /background:#f26522;padding:\s*(24|28)px/i.test(htmlBody);
  const ctaButtonCount = htmlBody.match(/display:inline-block;padding:14px/g)?.length ?? 0;
  if (hasPromoHero || ctaButtonCount > 1) {
    checks.push({
      id: 'gmail-promotions',
      level: 'warn',
      title: 'May land in Gmail Promotions',
      detail:
        'Heavy color blocks, banners, and multiple buttons look like marketing mail. Keep the layout plain and text-first for a better chance of reaching Primary.',
    });
  } else if (ctaButtonCount === 1) {
    checks.push({
      id: 'gmail-promotions',
      level: 'warn',
      title: 'Bulk sends may still use Promotions in Gmail',
      detail:
        'That is normal for list emails. Plain text-style templates and a conversational subject improve Primary placement.',
    });
  } else {
    checks.push({
      id: 'gmail-promotions',
      level: 'pass',
      title: 'Layout looks like a personal account email',
      detail: 'Simple formatting without promo banners helps Primary inbox placement in Gmail.',
    });
  }

  if (!htmlBody) {
    checks.push({
      id: 'html-empty',
      level: 'fail',
      title: 'HTML body is required',
      detail: 'Add HTML content or choose a template before sending.',
    });
  } else if (plainText.length < 40) {
    checks.push({
      id: 'html-text',
      level: 'warn',
      title: 'Very little readable text',
      detail: 'Image-only or empty emails often land in spam. Add clear text content.',
    });
  } else {
    checks.push({
      id: 'html-text',
      level: 'pass',
      title: 'Email body has readable text',
      detail: `${plainText.length} characters of plain text detected.`,
    });
  }

  if (/<script\b/i.test(options.htmlBody)) {
    checks.push({
      id: 'html-script',
      level: 'fail',
      title: 'Script tags are not allowed',
      detail: 'Remove script tags from the HTML — they are stripped on send and hurt deliverability.',
    });
  } else {
    checks.push({
      id: 'html-script',
      level: 'pass',
      title: 'No script tags in HTML',
      detail: 'HTML is safe for email clients and spam filters.',
    });
  }

  if (options.recipientCount < 1) {
    checks.push({
      id: 'recipients',
      level: 'fail',
      title: 'No recipients selected',
      detail: 'Add at least one contact in the To field.',
    });
  } else {
    checks.push({
      id: 'recipients',
      level: 'pass',
      title: 'Recipients selected',
      detail: `${options.recipientCount} contact(s) will receive this campaign.`,
    });
  }

  checks.push({
    id: 'unsubscribe',
    level: 'pass',
    title: 'Unsubscribe link included automatically',
    detail: 'Each promotional send includes a personalized unsubscribe footer and List-Unsubscribe headers.',
  });

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
    detail: 'Emails are sent gradually to protect sender reputation.',
  });

  const failures = checks.filter((check) => check.level === 'fail');
  const warnings = checks.filter((check) => check.level === 'warn');

  return {
    checks,
    canSend: failures.length === 0,
    failures,
    warnings,
    sanitizedSubject: subject,
    sanitizedHtml: htmlBody,
    preheader: extractPreheader(htmlBody),
  };
}

export function personalizeHtmlPreview(html: string, fullName = 'Alex') {
  return html.replaceAll('{{name}}', fullName).replaceAll('{{NAME}}', fullName);
}
