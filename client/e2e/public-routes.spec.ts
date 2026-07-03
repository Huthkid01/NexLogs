import { test, expect } from '@playwright/test';

test.describe('Public routes', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.locator('#quick-actions')).toBeVisible();
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
