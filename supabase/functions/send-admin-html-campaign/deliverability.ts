import {
  findRemainingSpamPhrases,
  scrubSpamFromHtml,
  scrubSpamFromText,
  sentenceCaseSubject,
} from '../_shared/spam-content-filter.ts';

function uppercaseRatio(value: string) {
  const letters = value.replace(/[^a-zA-Z]/g, '');
  if (!letters.length) return 0;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  return upper / letters.length;
}

export function sanitizeCampaignSubject(subject: string) {
  const scrubbed = scrubSpamFromText(subject);
  return sentenceCaseSubject(scrubbed.text)
    .replace(/!{2,}/g, '!')
    .slice(0, 180);
}

export function sanitizeHtmlBody(html: string) {
  const withoutScripts = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim()
    .slice(0, 100000);
  return scrubSpamFromHtml(withoutScripts).text;
}

export function validateCampaignContent(subject: string, htmlBody: string) {
  const subjectScrub = scrubSpamFromText(subject);
  const htmlScrub = scrubSpamFromHtml(
    htmlBody
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .trim()
      .slice(0, 100000),
  );
  const sanitizedSubject = sentenceCaseSubject(subjectScrub.text)
    .replace(/!{2,}/g, '!')
    .slice(0, 180);
  const sanitizedHtml = htmlScrub.text;

  if (!sanitizedSubject) {
    throw new Error('Subject line is required');
  }

  if (!sanitizedHtml) {
    throw new Error('HTML body is required');
  }

  if (uppercaseRatio(sanitizedSubject) > 0.6) {
    throw new Error('Subject uses too many capital letters. Use sentence case to avoid spam filters.');
  }

  const plainForCheck = sanitizedHtml
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const remaining = findRemainingSpamPhrases(`${sanitizedSubject} ${plainForCheck}`);
  if (remaining.length > 0) {
    throw new Error(
      `Content still includes spam trigger phrase "${remaining[0]}" after auto-filter. Rephrase before sending.`,
    );
  }

  return { sanitizedSubject, sanitizedHtml };
}

export function buildDeliverabilityHeaders(appUrl: string, oneClickUnsubscribeUrl: string) {
  return {
    'Reply-To': 'support@nexlogs.site',
    'List-Unsubscribe': `<${oneClickUnsubscribeUrl}>, <mailto:support@nexlogs.site?subject=Unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'X-Mailer': 'Nexlogs',
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
