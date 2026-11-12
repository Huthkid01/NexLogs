import { test, expect, dismissBlockingOverlays } from './fixtures/auth';

/**
 * Live smoke for stock-based shop category filtering + category marketplace pages.
 * Run against production with:
 *   E2E_BASE_URL=https://www.nexlogs.site npm run test:e2e -- shop-categories-live
 */
async function openCategoryDropdown(page: import('@playwright/test').Page) {
  await dismissBlockingOverlays(page);
  // Side drawer can leave a off-viewport "Close menu" control; Escape is safer than clicking it.
  await page.keyboard.press('Escape');
  await page.locator('#categories').scrollIntoViewIfNeeded();
  const dropdown = page.locator('#categories button[aria-haspopup="listbox"]');
  await expect(dropdown).toBeVisible({ timeout: 20_000 });
  await dropdown.click({ force: true });
  const list = page.locator('#categories [role="listbox"]');
  await expect(list).toBeVisible({ timeout: 10_000 });
  return list;
}

test.describe('Shop category stock filtering (live)', () => {
  test('home category dropdown only lists in-stock own categories (+ RDP)', async ({
    authedPage: page,
  }) => {
    await page.goto('/');
    await expect(page.locator('#quick-actions')).toBeVisible({ timeout: 20_000 });

    const list = await openCategoryDropdown(page);

    // RDP always stays visible.
    await expect(list.getByRole('option', { name: /^RDP$/i })).toBeVisible();

    const anon =
      process.env.E2E_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';
    expect(anon, 'anon key for public-catalog check').toBeTruthy();

    const homeResp = await page.request.post(
      `${process.env.E2E_SUPABASE_URL ?? 'https://opmjctjzwkvwsxenddfi.supabase.co'}/functions/v1/public-catalog`,
      {
        headers: {
          Authorization: `Bearer ${anon}`,
          apikey: anon,
          'Content-Type': 'application/json',
        },
        data: { action: 'home', limit: 6 },
      },
    );
    expect(homeResp.ok()).toBeTruthy();
    const payload = await homeResp.json();
    expect(payload.success).toBeTruthy();
    expect(payload.shopAvailability).toBeTruthy();

    const platforms: string[] = payload.shopAvailability.platforms ?? [];
    const categorySlugs: string[] = payload.shopAvailability.categorySlugs ?? [];

    const platformMapped: Array<{ name: RegExp; platform: string }> = [
      { name: /instagram/i, platform: 'instagram' },
      { name: /facebook/i, platform: 'facebook' },
      { name: /twitter/i, platform: 'x' },
      { name: /tiktok/i, platform: 'tiktok' },
      { name: /snapchat/i, platform: 'snapchat' },
    ];

    for (const { name, platform } of platformMapped) {
      const count = await list.getByRole('option', { name }).count();
      expect(count > 0, `${name} visibility vs platform stock`).toBe(platforms.includes(platform));
    }

    const telegramCount = await list.getByRole('option', { name: /telegram/i }).count();
    expect(telegramCount > 0, 'TELEGRAM visibility vs category stock').toBe(
      categorySlugs.includes('telegram'),
    );
  });

  test('selecting a stocked category opens /marketplace/:slug', async ({ authedPage: page }) => {
    await page.goto('/');
    await expect(page.locator('#quick-actions')).toBeVisible({ timeout: 20_000 });

    const list = await openCategoryDropdown(page);

    const snapchat = list.getByRole('option', { name: /snapchat/i });
    const telegram = list.getByRole('option', { name: /telegram/i });
    const target =
      (await snapchat.count()) > 0 ? snapchat : (await telegram.count()) > 0 ? telegram : null;
    expect(target, 'expected a stocked non-RDP category').toBeTruthy();

    await target!.locator('button').click();
    await expect(page).toHaveURL(/\/marketplace\/(snapchat|telegram)/, { timeout: 20_000 });
    await expect(page.locator('button[aria-haspopup="listbox"]').first()).toBeVisible();
  });
});
