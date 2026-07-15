import { test as base, expect, type Page } from '@playwright/test';

export function hasE2ECredentials() {
  const email = process.env.E2E_TEST_EMAIL?.trim();
  const password = process.env.E2E_TEST_PASSWORD?.trim();
  if (!email || !password) return false;
  if (email.includes('example.com') || password === 'your-test-password') return false;
  return true;
}

function markQuickTourCompletedFromStorage() {
  localStorage.setItem('nexlogs-community-promo-joined', '1');

  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('nexlogs-quick-tour-v2-completed:')) {
      localStorage.setItem(key, '1');
    }

    const value = localStorage.getItem(key);
    if (!value || !value.includes('"user"')) continue;

    try {
      const parsed = JSON.parse(value) as {
        user?: { id?: string };
        currentSession?: { user?: { id?: string } };
      };
      const userId = parsed.user?.id || parsed.currentSession?.user?.id;
      if (userId) {
        localStorage.setItem(`nexlogs-quick-tour-v2-completed:${userId}`, '1');
      }
    } catch {
      // ignore non-json values
    }
  }
}

export async function dismissBlockingOverlays(page: Page) {
  await page.evaluate(markQuickTourCompletedFromStorage);

  const skipTour = page.getByRole('button', { name: /skip tour/i });
  if (await skipTour.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await skipTour.click();
  }
}

export async function loginWithCredentials(page: Page, email: string, password: string) {
  await page.addInitScript(() => {
    localStorage.setItem('nexlogs-community-promo-joined', '1');
  });

  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).not.toHaveURL(/\/login$/);

  await page.waitForTimeout(700);
  await dismissBlockingOverlays(page);

  // Tour may mount a moment after auth hydrates.
  await page.waitForTimeout(700);
  await dismissBlockingOverlays(page);
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
