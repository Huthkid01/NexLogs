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

export function sanitizeCampaignSubject(subject: string) {
  return subject
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/!{2,}/g, '!')
    .slice(0, 180);
}

export function sanitizeHtmlBody(html: string) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim()
    .slice(0, 100000);
}

export function validateCampaignContent(subject: string, htmlBody: string) {
  const sanitizedSubject = sanitizeCampaignSubject(subject);
  const sanitizedHtml = sanitizeHtmlBody(htmlBody);

  if (!sanitizedSubject) {
    throw new Error('Subject line is required');
  }

  if (!sanitizedHtml) {
    throw new Error('HTML body is required');
  }

  if (uppercaseRatio(sanitizedSubject) > 0.6) {
    throw new Error('Subject uses too many capital letters. Use sentence case to avoid spam filters.');
  }

  const trigger = SPAM_TRIGGER_WORDS.find((word) => sanitizedSubject.toLowerCase().includes(word));
  if (trigger) {
    throw new Error(`Subject includes spam trigger phrase "${trigger}". Rephrase before sending.`);
  }

  return { sanitizedSubject, sanitizedHtml };
}

export function buildDeliverabilityHeaders(appUrl: string, oneClickUnsubscribeUrl: string) {
  return {
    'Reply-To': 'support@nexlogs.store',
    'List-Unsubscribe': `<${oneClickUnsubscribeUrl}>, <mailto:support@nexlogs.store?subject=Unsubscribe%20promotional%20emails>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'X-Mailer': 'Nexlogs HTML Campaign',
  };
}

export function htmlToPlainText(html: string) {
  return html
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000);
}

export function personalizeHtml(html: string, fullName: string) {
  return html.replaceAll('{{name}}', fullName).replaceAll('{{NAME}}', fullName);
}
