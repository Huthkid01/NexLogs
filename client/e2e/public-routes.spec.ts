import { test, expect } from '@playwright/test';

test.describe('Public routes', () => {
  test.beforeEach(async ({ page }) => {
    // Guest community promo is additive UI; keep smoke/regression free of the overlay.
    await page.addInitScript(() => {
      localStorage.setItem('nexlogs-community-promo-joined', '1');
    });
  });

  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.locator('#quick-actions')).toBeVisible();
  });

  test('guest sees a verified purchase notification', async ({ page }) => {
    await page.goto('/');

    const purchaseWidget = page.locator('aside[aria-live="polite"]');
    await expect(purchaseWidget).toBeVisible({ timeout: 15_000 });
    await expect(purchaseWidget.getByText(/purchased$/i)).toBeVisible();
    await expect(purchaseWidget.getByText('Verified purchase')).toBeVisible();
  });

  test('login page shows sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('buy numbers redirects guests to login', async ({ page }) => {
    await page.goto('/buy-numbers');
    await expect(page).toHaveURL(/\/login/);
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
  });
});
