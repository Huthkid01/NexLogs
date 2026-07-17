import { test, expect } from '@playwright/test';
import { hasE2ECredentials, loginWithCredentials } from './fixtures/auth';

test.describe('Authentication', () => {
  test('rejects invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('invalid-e2e@example.com');
    await page.locator('#password').fill('wrong-password-123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('logs in with valid test account', async ({ page }) => {
    test.skip(!hasE2ECredentials(), 'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD in client/.env.e2e');

    await loginWithCredentials(
      page,
      process.env.E2E_TEST_EMAIL!,
      process.env.E2E_TEST_PASSWORD!,
    );

    await page.goto('/marketplace');
    await expect(page).toHaveURL(/\/marketplace/);
    await expect(page.locator('#quick-actions')).toBeVisible();

    const purchaseWidget = page.locator('aside[aria-live="polite"]');
    await expect(purchaseWidget).toBeVisible({ timeout: 15_000 });
    await expect(purchaseWidget.getByText('A customer purchased')).toBeVisible();
    await expect(purchaseWidget.getByText('Verified purchase')).toBeVisible();
  });
});
