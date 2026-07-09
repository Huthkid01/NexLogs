const BRAND = '#f26522';
const BRAND_DARK = '#d94e0f';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatNgn(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function emailLayout(options: {
  appName: string;
  preheader: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}) {
  const { appName, preheader, title, bodyHtml, ctaLabel, ctaUrl, footerNote } = options;
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
          <tr>
            <td style="background:linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%);padding:28px 32px;">
              <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.85);">${escapeHtml(appName)}</p>
              <h1 style="margin:8px 0 0;font-size:26px;line-height:1.25;color:#ffffff;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
              ${ctaBlock}
              ${
                footerNote
                  ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">${footerNote}</p>`
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #e5e7eb;background:#fafafa;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;text-align:center;">
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

export function buildWelcomeEmail(options: {
  appName: string;
  appUrl: string;
  fullName: string;
}) {
  const name = escapeHtml(options.fullName || 'there');
  const html = emailLayout({
    appName: options.appName,
    preheader: `Welcome to ${options.appName}! Your account is ready.`,
    title: 'Welcome aboard',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi ${name},</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Thanks for joining <strong>${escapeHtml(options.appName)}</strong>. Your account is ready — browse the marketplace, add funds to your wallet, and purchase products instantly.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#fff7f2;border:1px solid #fed7aa;border-radius:12px;">
        <tr>
          <td style="padding:18px 20px;">
            <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:${BRAND_DARK};">What you can do next</p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;">• Explore products on the marketplace<br/>• Add funds to your wallet<br/>• Track purchases in your account</p>
          </td>
        </tr>
      </table>
    `,
    ctaLabel: 'Go to marketplace',
    ctaUrl: `${options.appUrl.replace(/\/$/, '')}/marketplace`,
    footerNote: 'If you did not create this account, you can ignore this email.',
  });

  return {
    subject: `Welcome to ${options.appName}`,
    html,
    text: `Welcome to ${options.appName}, ${options.fullName}! Visit ${options.appUrl}/marketplace to get started.`,
  };
}

export function buildPurchaseEmail(options: {
  appName: string;
  appUrl: string;
  fullName: string;
  orderNumber: string;
  productLines: string[];
  totalAmount: number;
  fulfillmentType?: 'standard' | 'rdp' | 'telegram';
}) {
  const productsHtml = options.productLines
    .map(
      (line) =>
        `<li style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#374151;">${escapeHtml(line)}</li>`,
    )
    .join('');

  const fulfillmentNote =
    options.fulfillmentType === 'rdp'
      ? `<p style="margin:16px 0 0;padding:14px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;font-size:14px;line-height:1.6;color:#92400e;">Your order is being processed. Check <strong>My Purchases</strong> within 5–10 minutes for your RDP details.</p>`
      : options.fulfillmentType === 'telegram'
        ? `<p style="margin:16px 0 0;padding:14px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;font-size:14px;line-height:1.6;color:#92400e;">Copy your Order ID from <strong>My Purchases</strong>, then click the Telegram floating button on the marketplace to contact support with your Order ID and receive your order.</p>`
        : `<p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#374151;">Your product details are available in <strong>My Purchases</strong>.</p>`;

  const html = emailLayout({
    appName: options.appName,
    preheader: `Order ${options.orderNumber} confirmed — ${formatNgn(options.totalAmount)}`,
    title: 'Purchase confirmed',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi ${escapeHtml(options.fullName || 'there')},</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Thank you for your purchase. Here is your order summary:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
        <tr>
          <td style="padding:18px 20px;">
            <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Order ID</p>
            <p style="margin:0 0 14px;font-size:18px;font-weight:700;color:#111827;">${escapeHtml(options.orderNumber)}</p>
            <ul style="margin:0;padding-left:18px;">${productsHtml}</ul>
            <p style="margin:16px 0 0;font-size:18px;font-weight:700;color:${BRAND_DARK};">Total: ${formatNgn(options.totalAmount)}</p>
          </td>
        </tr>
      </table>
      ${fulfillmentNote}
    `,
    ctaLabel: 'View my purchases',
    ctaUrl: `${options.appUrl.replace(/\/$/, '')}/purchases`,
  });

  return {
    subject: `${options.appName} order confirmed — ${options.orderNumber}`,
    html,
    text: `Your ${options.appName} order ${options.orderNumber} is confirmed. Total: ${formatNgn(options.totalAmount)}.`,
  };
}

export function buildWalletDepositEmail(options: {
  appName: string;
  appUrl: string;
  fullName: string;
  amountNgn: number;
  newBalance: number;
  reference: string;
}) {
  const html = emailLayout({
    appName: options.appName,
    preheader: `${formatNgn(options.amountNgn)} added to your wallet`,
    title: 'Wallet funded',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi ${escapeHtml(options.fullName || 'there')},</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Your wallet has been credited successfully.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
        <tr>
          <td style="padding:18px 20px;">
            <p style="margin:0 0 6px;font-size:13px;color:#166534;">Amount added</p>
            <p style="margin:0 0 14px;font-size:28px;font-weight:700;color:#15803d;">${formatNgn(options.amountNgn)}</p>
            <p style="margin:0 0 6px;font-size:13px;color:#166534;">New balance</p>
            <p style="margin:0 0 14px;font-size:20px;font-weight:700;color:#14532d;">${formatNgn(options.newBalance)}</p>
            <p style="margin:0;font-size:13px;color:#166534;">Reference: ${escapeHtml(options.reference)}</p>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">You can now use your balance to purchase products on the marketplace.</p>
    `,
    ctaLabel: 'Browse marketplace',
    ctaUrl: `${options.appUrl.replace(/\/$/, '')}/marketplace`,
  });

  return {
    subject: `${options.appName} wallet credited — ${formatNgn(options.amountNgn)}`,
    html,
    text: `${formatNgn(options.amountNgn)} was added to your ${options.appName} wallet. New balance: ${formatNgn(options.newBalance)}.`,
  };
}

export function buildPasswordResetEmail(options: {
  appName: string;
  fullName: string;
  resetUrl: string;
  expiresMinutes: number;
}) {
  const html = emailLayout({
    appName: options.appName,
    preheader: 'Reset your password securely',
    title: 'Reset your password',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi ${escapeHtml(options.fullName || 'there')},</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">We received a request to reset your password. Click the button below to choose a new one.</p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#6b7280;">This link expires in ${options.expiresMinutes} minutes. If you did not request a reset, you can safely ignore this email.</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#9ca3af;word-break:break-all;">Or copy this link:<br/>${escapeHtml(options.resetUrl)}</p>
    `,
    ctaLabel: 'Reset password',
    ctaUrl: options.resetUrl,
    footerNote: 'For security, never share this link with anyone.',
  });

  return {
    subject: `Reset your ${options.appName} password`,
    html,
    text: `Reset your ${options.appName} password: ${options.resetUrl}`,
  };
}
