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
              ${escapeHtml(appName)}
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
              ${
                footerNote
                  ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">${footerNote}</p>`
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
                Questions? <a href="mailto:support@nexlogs.site" style="color:#111827;text-decoration:underline;">support@nexlogs.site</a><br/>
                © ${new Date().getFullYear()} ${escapeHtml(appName)}.
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
      ? `<p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#374151;">Your order is being processed. Check <strong>My Purchases</strong> within 5–10 minutes for your RDP details.</p>`
      : options.fulfillmentType === 'telegram'
        ? `<p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#374151;">Copy your Order ID from <strong>My Purchases</strong>, then click the Telegram floating button on the marketplace to contact support with your Order ID and receive your order.</p>`
        : `<p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#374151;">Your product details are available in <strong>My Purchases</strong>.</p>`;

  const html = emailLayout({
    appName: options.appName,
    preheader: `Order ${options.orderNumber} confirmed — ${formatNgn(options.totalAmount)}`,
    title: 'Purchase confirmed',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi ${escapeHtml(options.fullName || 'there')},</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Thank you for your purchase. Here is your order summary:</p>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#111827;"><strong>Order ID:</strong> ${escapeHtml(options.orderNumber)}</p>
      <ul style="margin:0;padding-left:18px;">${productsHtml}</ul>
      <p style="margin:16px 0 0;font-size:16px;line-height:1.7;color:#111827;"><strong>Total:</strong> ${formatNgn(options.totalAmount)}</p>
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
      <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#111827;"><strong>Amount added:</strong> ${formatNgn(options.amountNgn)}</p>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#111827;"><strong>New balance:</strong> ${formatNgn(options.newBalance)}</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#111827;"><strong>Reference:</strong> ${escapeHtml(options.reference)}</p>
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

export function buildOrderDetailsReadyEmail(options: {
  appName: string;
  appUrl: string;
  fullName: string;
  orderNumber: string;
  productTitle: string;
  fulfillmentType: 'standard' | 'rdp' | 'telegram';
}) {
  const fulfillmentNote =
    options.fulfillmentType === 'telegram'
      ? 'Your Telegram order details are now available in My Purchases.'
      : options.fulfillmentType === 'rdp'
        ? 'Your RDP login details are now available in My Purchases.'
        : 'Your order details are now available in My Purchases.';

  const html = emailLayout({
    appName: options.appName,
    preheader: `Order ${options.orderNumber} — details are ready`,
    title: 'Your order details are ready',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi ${escapeHtml(options.fullName || 'there')},</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">${escapeHtml(fulfillmentNote)}</p>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#111827;"><strong>Order ID:</strong> ${escapeHtml(options.orderNumber)}</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#111827;"><strong>Product:</strong> ${escapeHtml(options.productTitle)}</p>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">Sign in and open <strong>My Purchases</strong> to view and copy your details.</p>
    `,
    ctaLabel: 'Open My Purchases',
    ctaUrl: `${options.appUrl.replace(/\/$/, '')}/purchases`,
    footerNote: 'For your security, full account details are only shown inside your Nexlogs account.',
  });

  return {
    subject: `${options.appName} — your order details are ready`,
    html,
    text: `${fulfillmentNote} Order ${options.orderNumber}. Open My Purchases: ${options.appUrl.replace(/\/$/, '')}/purchases`,
  };
}
