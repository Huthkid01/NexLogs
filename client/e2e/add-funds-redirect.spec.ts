import { test, expect } from '@playwright/test';
import { hasE2ECredentials, loginWithCredentials } from './fixtures/auth';

test.describe('Add Funds redirect flow', () => {
  test('does not show verifying banner on a normal visit', async ({ page }) => {
    test.skip(!hasE2ECredentials(), 'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD in client/.env.e2e');

    await loginWithCredentials(
      page,
      process.env.E2E_TEST_EMAIL!,
      process.env.E2E_TEST_PASSWORD!,
    );

    await page.goto('/add-funds', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Add Funds' })).toBeVisible();
    await expect(page.getByText('Verifying your payment...')).toHaveCount(0);
  });

  test('redirects to Kora hosted checkout after submit', async ({ page }) => {
    test.skip(!hasE2ECredentials(), 'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD in client/.env.e2e');

    await loginWithCredentials(
      page,
      process.env.E2E_TEST_EMAIL!,
      process.env.E2E_TEST_PASSWORD!,
    );

    await page.goto('/add-funds', { waitUntil: 'networkidle' });
    await page.locator('#amount').fill('100');
    await page.getByRole('button', { name: 'Proceed to Payment' }).click();

    await page.waitForURL((url) => !url.pathname.startsWith('/add-funds'), { timeout: 30_000 });
    await expect(page).toHaveURL(/kora|korapay/i);
  });
});
