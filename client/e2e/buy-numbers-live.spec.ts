import { test, expect } from './fixtures/auth';

/**
 * Live SMS Pool tests — charges real wallet balance.
 * Run only when explicitly enabled:
 *   E2E_RUN_LIVE_SMS=true npm run test:e2e -- buy-numbers-live
 */
const runLiveSms = process.env.E2E_RUN_LIVE_SMS === 'true';

test.describe('Buy Numbers — live SMS (optional)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(() => {
    test.skip(!runLiveSms, 'Set E2E_RUN_LIVE_SMS=true to run live SMS tests');
  });

  test('can open order summary after selecting country, service, and price', async ({ authedPage: page }) => {
    await page.goto('/buy-numbers/service-1');

    await page.getByPlaceholder('Search countries...').fill('United States');
    await page.getByRole('button', { name: /United States/i }).first().click();

    await page.getByPlaceholder('Search services...').fill('Google');
    const googleButton = page.getByRole('button', { name: 'Google', exact: true });
    await expect(googleButton).toBeVisible({ timeout: 30_000 });
    await googleButton.click();

    const priceButton = page
      .locator('button')
      .filter({ has: page.locator('text=/available/i') })
      .filter({ hasNot: page.locator('[disabled]') })
      .first();

    await expect(priceButton).toBeVisible({ timeout: 30_000 });
    await priceButton.click();

    await expect(page.getByRole('heading', { name: /order summary/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /confirm & reserve/i })).toBeVisible();
  });
});
