import { test, expect, dismissBlockingOverlays } from './fixtures/auth';

/**
 * Real-user smoke against production:
 *   E2E_BASE_URL=https://www.nexlogs.site npm run test:e2e -- real-user-smoke --project=chromium
 */
test.describe('Real user smoke', () => {
  test('login, main nav buttons, category, add-funds checkout start', async ({
    authedPage: page,
  }) => {
    await page.goto('/');
    await dismissBlockingOverlays(page);
    await page.keyboard.press('Escape');

    await expect(page.locator('#quick-actions')).toBeVisible({ timeout: 20_000 });

    // Quick actions — RDP
    await page.locator('#quick-actions').getByRole('link', { name: /purchase rdp/i }).click();
    await expect(page).toHaveURL(/\/purchase-rdp/, { timeout: 20_000 });

    // Buy Numbers
    await page.goto('/');
    await dismissBlockingOverlays(page);
    await page.keyboard.press('Escape');
    await page.locator('#quick-actions').getByRole('link', { name: /buy numbers|sms/i }).click();
    await expect(page).toHaveURL(/\/buy-numbers/, { timeout: 20_000 });

    // Category dropdown → marketplace slug
    await page.goto('/');
    await dismissBlockingOverlays(page);
    await page.keyboard.press('Escape');
    const dropdown = page.locator('#categories button[aria-haspopup="listbox"]');
    await dropdown.scrollIntoViewIfNeeded();
    await dropdown.click({ force: true });
    const list = page.locator('#categories [role="listbox"]');
    await expect(list).toBeVisible();
    const nonRdp = list.getByRole('option').filter({ hasNotText: /^RDP$/i }).first();
    await expect(nonRdp).toBeVisible();
    await nonRdp.locator('button').click();
    await expect(page).toHaveURL(/\/marketplace\/[^/]+|\/purchase-rdp/, { timeout: 20_000 });

    // My Purchases (route is /purchases)
    await page.goto('/purchases');
    await expect(page.getByText(/my purchases/i).first()).toBeVisible({ timeout: 20_000 });

    // Add Funds → confirm → Kora checkout starts
    await page.goto('/add-funds', { waitUntil: 'domcontentloaded' });
    await dismissBlockingOverlays(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Add Funds' })).toBeVisible({ timeout: 20_000 });
    await page.locator('#amount').fill('2000');
    await page.getByRole('button', { name: 'Proceed to Payment' }).click();
    const confirm = page.getByRole('dialog');
    await expect(confirm).toBeVisible();

    const initResponsePromise = page.waitForResponse(
      (res) => /kora-init/i.test(res.url()) && res.request().method() === 'POST',
      { timeout: 45_000 },
    );
    await confirm.getByRole('button', { name: 'I Understand' }).click({ force: true });
    const initResponse = await initResponsePromise;
    const body = await initResponse.json().catch(() => ({}));
    expect(
      initResponse.ok(),
      `kora-init failed: ${initResponse.status()} ${JSON.stringify(body)}`,
    ).toBeTruthy();
    await page.waitForURL(/kora|korapay/i, { timeout: 30_000 });
  });
});
