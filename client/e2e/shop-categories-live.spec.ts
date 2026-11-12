import { test, expect, dismissBlockingOverlays } from './fixtures/auth';

/**
 * Live smoke for stock-based shop category filtering + category marketplace pages.
 * Run against production with:
 *   E2E_BASE_URL=https://www.nexlogs.site npm run test:e2e -- shop-categories-live
 */
async function openCategoryDropdown(page: import('@playwright/test').Page) {
  await dismissBlockingOverlays(page);
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
  test('home category dropdown shows stocked categories including Loggsplug (+ RDP)', async ({
    authedPage: page,
  }) => {
    await page.goto('/');
    await expect(page.locator('#quick-actions')).toBeVisible({ timeout: 20_000 });

    const list = await openCategoryDropdown(page);

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
    expect(platforms.length + categorySlugs.length).toBeGreaterThan(0);

    const optionCount = await list.getByRole('option').count();
    // RDP + at least one stocked marketplace/Loggsplug category.
    expect(optionCount).toBeGreaterThan(1);

    // Exact static SNAPCHAT label tracks platform stock when present.
    const snapchatStatic = list.getByRole('option', { name: /^Snapchat logo SNAPCHAT$|^SNAPCHAT$/i });
    const snapchatVisible = (await snapchatStatic.count()) > 0;
    expect(snapchatVisible).toBe(platforms.includes('snapchat'));
  });

  test('selecting a stocked category opens /marketplace/:slug', async ({ authedPage: page }) => {
    await page.goto('/');
    await expect(page.locator('#quick-actions')).toBeVisible({ timeout: 20_000 });

    const list = await openCategoryDropdown(page);
    const options = list.getByRole('option');
    const count = await options.count();
    expect(count).toBeGreaterThan(0);

    let targetIndex = -1;
    for (let i = 0; i < count; i++) {
      const text = (await options.nth(i).innerText()).trim().toUpperCase();
      if (text === 'RDP' || text.endsWith(' RDP')) continue;
      targetIndex = i;
      break;
    }
    expect(targetIndex).toBeGreaterThanOrEqual(0);

    await options.nth(targetIndex).locator('button').click();
    await expect(page).toHaveURL(/\/marketplace\/[^/]+|\/purchase-rdp/, { timeout: 20_000 });
  });
});
