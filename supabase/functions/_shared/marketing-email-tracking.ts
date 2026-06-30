const TRANSPARENT_GIF = Uint8Array.from(
  atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
  (char) => char.charCodeAt(0),
);

export function buildMarketingTrackUrl(supabaseUrl: string) {
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/marketing-email-track`;
}

export function shouldSkipTrackedLink(url: string) {
  const normalized = url.trim().toLowerCase();
  return (
    normalized.startsWith('mailto:') ||
    normalized.startsWith('tel:') ||
    normalized.includes('/unsubscribe') ||
    normalized.includes('unsubscribe?')
  );
}

export function applyEmailTracking(html: string, trackBaseUrl: string, trackingToken: string) {
  const base = trackBaseUrl.replace(/\/$/, '');
  const token = encodeURIComponent(trackingToken);

  const withTrackedLinks = html.replace(/href="(https?:\/\/[^"#]+)"/gi, (match, url: string) => {
    if (shouldSkipTrackedLink(url)) return match;
    const tracked = `${base}?action=click&token=${token}&url=${encodeURIComponent(url)}`;
    return `href="${tracked}"`;
  });

  const pixel = `<img src="${base}?action=open&token=${token}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;margin:0;padding:0;" />`;

  if (withTrackedLinks.includes('</body>')) {
    return withTrackedLinks.replace('</body>', `${pixel}</body>`);
  }

  return `${withTrackedLinks}${pixel}`;
}

export function transparentGifResponse() {
  return new Response(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
    },
  });
}

export async function markMarketingSendResult(
  adminClient: { from: (table: string) => unknown },
  trackingToken: string,
  result: { ok: true } | { ok: false; error: string },
) {
  if (!trackingToken.trim()) return;

  const updates = result.ok
    ? { send_status: 'sent', sent_at: new Date().toISOString(), send_error: null }
    : { send_status: 'failed', send_error: result.error.slice(0, 500) };

  try {
    await (adminClient.from('email_marketing_sends') as {
      update: (values: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> };
    })
      .update(updates)
      .eq('tracking_token', trackingToken);
  } catch (error) {
    console.error('[marketing-email-tracking] failed to update send status', error);
  }
}
