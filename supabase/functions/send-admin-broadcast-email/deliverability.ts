import {
  findRemainingSpamPhrases,
  scrubSpamFromText,
  sentenceCaseSubject,
} from '../_shared/spam-content-filter.ts';

function uppercaseRatio(value: string) {
  const letters = value.replace(/[^a-zA-Z]/g, '');
  if (!letters.length) return 0;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  return upper / letters.length;
}

export function sanitizeBroadcastSubject(subject: string) {
  const scrubbed = scrubSpamFromText(subject);
  return sentenceCaseSubject(scrubbed.text)
    .replace(/!{2,}/g, '!')
    .slice(0, 180);
}

export function sanitizeBroadcastMessage(message: string) {
  return scrubSpamFromText(message).text.slice(0, 1200);
}

export function validateBroadcastContent(subject: string, customMessage: string) {
  const subjectScrub = scrubSpamFromText(subject);
  const messageScrub = scrubSpamFromText(customMessage);
  const sanitizedSubject = sentenceCaseSubject(subjectScrub.text)
    .replace(/!{2,}/g, '!')
    .slice(0, 180);
  const sanitizedMessage = messageScrub.text.slice(0, 1200);

  if (!sanitizedSubject) {
    throw new Error('Subject line is required');
  }

  if (uppercaseRatio(sanitizedSubject) > 0.6) {
    throw new Error('Subject uses too many capital letters. Use sentence case to avoid spam filters.');
  }

  if (/[!?$]{3,}/.test(sanitizedSubject) || (sanitizedSubject.match(/!/g)?.length ?? 0) >= 3) {
    throw new Error('Subject has too much punctuation. Remove repeated ! or ? marks.');
  }

  const remaining = findRemainingSpamPhrases(`${sanitizedSubject} ${sanitizedMessage}`);
  if (remaining.length > 0) {
    throw new Error(
      `Content still includes spam trigger phrase "${remaining[0]}" after auto-filter. Rephrase before sending.`,
    );
  }

  return { sanitizedSubject, sanitizedMessage };
}

export function buildDeliverabilityHeaders(_appUrl: string, oneClickUnsubscribeUrl: string) {
  return {
    'Reply-To': 'support@nexlogs.site',
    'List-Unsubscribe': `<${oneClickUnsubscribeUrl}>, <mailto:support@nexlogs.site?subject=Unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'X-Mailer': 'Nexlogs',
  };
}
