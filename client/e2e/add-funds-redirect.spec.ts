import { test, expect } from '@playwright/test';
import { dismissBlockingOverlays, hasE2ECredentials, loginWithCredentials } from './fixtures/auth';

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

  test('redirects to Kora hosted checkout after confirm', async ({ page }) => {
    test.skip(!hasE2ECredentials(), 'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD in client/.env.e2e');

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') pageErrors.push(msg.text());
    });

    await loginWithCredentials(
      page,
      process.env.E2E_TEST_EMAIL!,
      process.env.E2E_TEST_PASSWORD!,
    );

    await page.goto('/add-funds', { waitUntil: 'networkidle' });
    await dismissBlockingOverlays(page);
    await page.keyboard.press('Escape');

    await page.locator('#amount').fill('2000');
    await page.getByRole('button', { name: 'Proceed to Payment' }).click();

    const confirm = page.getByRole('dialog');
    await expect(confirm).toBeVisible({ timeout: 10_000 });
    await expect(confirm.getByText(/You will pay NGN/i)).toBeVisible();

    const initResponsePromise = page.waitForResponse(
      (res) => /kora-init/i.test(res.url()) && res.request().method() === 'POST',
      { timeout: 45_000 },
    );

    await confirm.getByRole('button', { name: 'I Understand' }).click({ force: true });

    const initResponse = await initResponsePromise.catch(async (err) => {
      const toastText = await page.locator('[data-sonner-toast], [data-sonner-toaster]').allTextContents();
      throw new Error(
        `${err}\npageErrors=${JSON.stringify(pageErrors)}\ntoasts=${JSON.stringify(toastText)}\nurl=${page.url()}`,
      );
    });

    const payload = await initResponse.json().catch(() => ({}));
    expect(
      initResponse.ok(),
      `kora-init failed: ${initResponse.status()} ${JSON.stringify(payload)} errors=${JSON.stringify(pageErrors)}`,
    ).toBeTruthy();

    await page.waitForURL(/kora|korapay/i, { timeout: 30_000 });
  });
});
