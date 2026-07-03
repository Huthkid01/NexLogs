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

export function validateBroadcastContent(subject: string, customMessage: string) {
  const sanitizedSubject = sanitizeBroadcastSubject(subject);
  const sanitizedMessage = sanitizeBroadcastMessage(customMessage);
  const combined = `${sanitizedSubject} ${sanitizedMessage}`.toLowerCase();

  if (!sanitizedSubject) {
    throw new Error('Subject line is required');
  }

  if (uppercaseRatio(sanitizedSubject) > 0.6) {
    throw new Error('Subject uses too many capital letters. Use sentence case to avoid spam filters.');
  }

  if (/[!?$]{3,}/.test(sanitizedSubject) || (sanitizedSubject.match(/!/g)?.length ?? 0) >= 3) {
    throw new Error('Subject has too much punctuation. Remove repeated ! or ? marks.');
  }

  const trigger = SPAM_TRIGGER_WORDS.find((word) => combined.includes(word));
  if (trigger) {
    throw new Error(`Content includes spam trigger phrase "${trigger}". Rephrase before sending.`);
  }

  return { sanitizedSubject, sanitizedMessage };
}

export function buildDeliverabilityHeaders(_appUrl: string, oneClickUnsubscribeUrl: string) {
  return {
    'Reply-To': 'support@nexlogs.store',
    'List-Unsubscribe': `<${oneClickUnsubscribeUrl}>, <mailto:support@nexlogs.store?subject=Unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'X-Mailer': 'Nexlogs',
  };
}
