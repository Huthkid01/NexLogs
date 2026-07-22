import { buildProductMarketplaceUrl } from './product-links.ts';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function emailLayout(options: {
  appName: string;
  appUrl: string;
  preheader: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  unsubscribeUrl?: string;
  isAccountHolder?: boolean;
}) {
  const { appName, appUrl, preheader, title, bodyHtml, ctaLabel, ctaUrl, unsubscribeUrl, isAccountHolder = true } =
    options;
  const ctaBlock =
    ctaLabel && ctaUrl
      ? `<p style="margin:20px 0 0;font-size:15px;line-height:1.7;">
          <a href="${escapeHtml(ctaUrl)}" style="color:#111827;font-weight:700;text-decoration:underline;">${escapeHtml(ctaLabel)}</a>
        </p>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;">
          <tr>
            <td style="padding:0 0 14px;font-size:13px;line-height:1.6;color:#6b7280;">
              <a href="${escapeHtml(appUrl)}" style="color:#111827;font-weight:700;text-decoration:none;">${escapeHtml(appName)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 18px;">
              <h1 style="margin:0;font-size:24px;line-height:1.35;font-weight:700;color:#111827;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0;">
              ${bodyHtml}
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
                Questions? <a href="mailto:support@nexlogs.site" style="color:#111827;text-decoration:underline;">support@nexlogs.site</a><br/>
                © ${new Date().getFullYear()} ${escapeHtml(appName)}.
              </p>
              ${
                unsubscribeUrl
                  ? `<p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:#6b7280;">
                ${
                  isAccountHolder
                    ? `You received this because you have an account on ${escapeHtml(appName)}.`
                    : `You received this marketing email from ${escapeHtml(appName)}.`
                }<br/>
                <a href="${escapeHtml(unsubscribeUrl)}" style="color:#111827;text-decoration:underline;">Unsubscribe from promotional emails</a>
              </p>`
                  : ''
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface BroadcastProduct {
  title: string;
  slug: string;
  price: number;
}

export function buildNewProductsBroadcastEmail(options: {
  appName: string;
  appUrl: string;
  fullName: string;
  subject: string;
  customMessage?: string;
  products: BroadcastProduct[];
  unsubscribeUrl?: string;
  isAccountHolder?: boolean;
}) {
  const intro = options.customMessage?.trim()
    ? `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#374151;">${escapeHtml(options.customMessage.trim())}</p>`
    : `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#374151;">We just added new products to the marketplace. Browse the latest listings below.</p>`;

  const productsHtml = options.products
    .map((product) => {
      const productUrl = buildProductMarketplaceUrl(options.appUrl, product.slug);
      return `<li style="margin:0 0 12px;font-size:15px;line-height:1.6;">
        <a href="${escapeHtml(productUrl)}" style="color:#111827;font-weight:700;text-decoration:none;">${escapeHtml(product.title)}</a>
      </li>`;
    })
    .join('');

  const productNames = options.products.map((product) => product.title).slice(0, 3).join(', ');
  const preheader = productNames
    ? `New on ${options.appName}: ${productNames}`
    : `New products are now live on ${options.appName}`;

  const html = emailLayout({
    appName: options.appName,
    appUrl: options.appUrl.replace(/\/$/, ''),
    preheader,
    title: 'New products available',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi ${escapeHtml(options.fullName || 'there')},</p>
      ${intro}
      <ul style="margin:16px 0 0;padding-left:18px;">${productsHtml}</ul>
    `,
    ctaLabel: 'Browse marketplace',
    ctaUrl: `${options.appUrl.replace(/\/$/, '')}/marketplace`,
    unsubscribeUrl: options.unsubscribeUrl,
    isAccountHolder: options.isAccountHolder,
  });

  const textUnsubscribe = options.unsubscribeUrl
    ? `\n\nUnsubscribe from promotional emails: ${options.unsubscribeUrl}`
    : '';

  const textLines = options.products
    .map((product) => {
      const productUrl = buildProductMarketplaceUrl(options.appUrl, product.slug);
      return `- ${product.title}: ${productUrl}`;
    })
    .join('\n');

  return {
    subject: options.subject,
    html,
    text: `Hi ${options.fullName || 'there'},\n\n${options.customMessage?.trim() || 'New products are available on our marketplace.'}\n\n${textLines}\n\n${options.appUrl}/marketplace${textUnsubscribe}`,
  };
}
