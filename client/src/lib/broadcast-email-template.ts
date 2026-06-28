import { APP_NAME, APP_URL } from '@/constants';
import { buildProductMarketplaceUrl } from '@/lib/product-deep-link';
import { buildEmailHeroRow, buildEmailLogoHeader } from '@/lib/email-branding';

const BRAND = '#f26522';
const FROM_ADDRESS = 'support@nexlogs.store';
const FROM_NAME = 'Nexlogs';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export interface BroadcastPreviewProduct {
  title: string;
  slug: string;
  price: number;
}

function emailLayout(options: {
  appName: string;
  appUrl: string;
  preheader: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  const { appName, appUrl, preheader, title, bodyHtml, ctaLabel, ctaUrl } = options;
  const logoHeader = buildEmailLogoHeader(appUrl, appName);
  const heroRow = buildEmailHeroRow(title);
  const ctaBlock =
    ctaLabel && ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
          <tr>
            <td style="border-radius:8px;background:${BRAND};">
              <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">${escapeHtml(ctaLabel)}</a>
            </td>
          </tr>
        </table>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.08);">
          ${logoHeader}
          ${heroRow}
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #e5e7eb;background:#fafafa;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;text-align:center;">
                Questions? <a href="mailto:${FROM_ADDRESS}" style="color:${BRAND};text-decoration:none;">${FROM_ADDRESS}</a><br/>
                © ${new Date().getFullYear()} ${escapeHtml(appName)}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildBroadcastEmailPreview(options: {
  subject: string;
  customMessage?: string;
  products: BroadcastPreviewProduct[];
  recipientName?: string;
}) {
  const appUrl = APP_URL.replace(/\/$/, '');
  const fullName = options.recipientName?.trim() || 'Customer';
  const subject = options.subject.trim() || `New products available on ${APP_NAME}`;

  const intro = options.customMessage?.trim()
    ? `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#374151;">${escapeHtml(options.customMessage.trim())}</p>`
    : `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#374151;">We just added new products to the marketplace. Browse the latest listings below.</p>`;

  const productsHtml = options.products
    .map((product) => {
      const productUrl = buildProductMarketplaceUrl(appUrl, product.slug);
      return `<li style="margin:0 0 12px;font-size:15px;line-height:1.6;">
        <a href="${escapeHtml(productUrl)}" style="color:#111827;font-weight:700;text-decoration:none;">${escapeHtml(product.title)}</a>
      </li>`;
    })
    .join('');

  const productNames = options.products.map((product) => product.title).slice(0, 3).join(', ');
  const preheader = productNames
    ? `New on ${APP_NAME}: ${productNames}`
    : `New products are now live on ${APP_NAME}`;

  const html = emailLayout({
    appName: APP_NAME,
    appUrl,
    preheader,
    title: 'New products available',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi ${escapeHtml(fullName)},</p>
      ${intro}
      <ul style="margin:16px 0 0;padding-left:18px;">${productsHtml}</ul>
    `,
    ctaLabel: 'Browse marketplace',
    ctaUrl: `${appUrl}/marketplace`,
  });

  return {
    subject,
    preheader,
    fromLabel: `${FROM_NAME} <${FROM_ADDRESS}>`,
    html,
  };
}
