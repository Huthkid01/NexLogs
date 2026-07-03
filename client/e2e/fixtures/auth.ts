import { test as base, expect, type Page } from '@playwright/test';

export function hasE2ECredentials() {
  const email = process.env.E2E_TEST_EMAIL?.trim();
  const password = process.env.E2E_TEST_PASSWORD?.trim();
  if (!email || !password) return false;
  if (email.includes('example.com') || password === 'your-test-password') return false;
  return true;
}

export async function loginWithCredentials(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    if (!hasE2ECredentials()) {
      test.skip(true, 'Set real E2E_TEST_EMAIL and E2E_TEST_PASSWORD in client/.env.e2e');
    }

    await loginWithCredentials(page, process.env.E2E_TEST_EMAIL!, process.env.E2E_TEST_PASSWORD!);
    await use(page);
  },
});

export { expect } from '@playwright/test';
