import { test, expect } from './fixtures/auth';

const ORANGE_RGB = 'rgb(242, 101, 34)';

test.describe('Buy Numbers', () => {
  test('provider picker shows Service 1', async ({ authedPage: page }) => {
    await page.goto('/buy-numbers');
    await expect(page.getByRole('heading', { name: /select a service/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Service 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Service 2' })).toBeVisible();
  });

  test('opens SMS verification flow for Service 2', async ({ authedPage: page }) => {
    await page.goto('/buy-numbers/service-2');
    await expect(page.getByRole('heading', { name: /SMS Verification \(Service 2\)/i })).toBeVisible();
    await expect(page.getByText('Select Country')).toBeVisible();
    await expect(page.getByPlaceholder('Search countries...')).toBeVisible();
  });

  test('Service 2 loads countries and WhatsApp prices', async ({ authedPage: page }) => {
    await page.goto('/buy-numbers/service-2');

    const countrySearch = page.getByPlaceholder('Search countries...');
    await countrySearch.click();
    await countrySearch.fill('USA');

    const usaOption = page.getByRole('button', { name: /^USA\b/i }).first();
    await expect(usaOption).toBeVisible({ timeout: 30_000 });
    await usaOption.click();

    await expect(page.getByPlaceholder('Search services...')).toBeVisible({ timeout: 15_000 });

    const serviceSearch = page.getByPlaceholder('Search services...');
    await serviceSearch.fill('whatsapp');

    const whatsappButton = page.getByRole('button', { name: /whatsapp/i }).first();
    await expect(whatsappButton).toBeVisible({ timeout: 30_000 });
    await whatsappButton.click();

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

  test('opens SMS verification flow for Service 1', async ({ authedPage: page }) => {
    await page.goto('/buy-numbers/service-1');
    await expect(page.getByRole('heading', { name: /SMS Verification/i })).toBeVisible();
    await expect(page.getByText('Select Country')).toBeVisible();
    await expect(page.getByPlaceholder('Search countries...')).toBeVisible();
  });

  test('service buttons show orange background on hover', async ({ authedPage: page }) => {
    await page.goto('/buy-numbers/service-1');

    const countrySearch = page.getByPlaceholder('Search countries...');
    await countrySearch.click();
    await countrySearch.fill('United States');

    const countryOption = page.getByRole('button', { name: /United States/i }).first();
    await expect(countryOption).toBeVisible({ timeout: 30_000 });
    await countryOption.click();

    await expect(page.getByText('Services')).toBeVisible();

    const serviceSearch = page.getByPlaceholder('Search services...');
    await serviceSearch.fill('Google');

    const serviceButton = page.getByRole('button', { name: 'Google', exact: true });
    await expect(serviceButton).toBeVisible({ timeout: 30_000 });

    await serviceButton.hover();
    await expect(serviceButton).toHaveCSS('background-color', ORANGE_RGB);
    await expect(serviceButton).toHaveCSS('color', 'rgb(255, 255, 255)');
  });

  test('history section is visible for signed-in users', async ({ authedPage: page }) => {
    await page.goto('/buy-numbers/service-1');
    await expect(page.getByText(/History/)).toBeVisible();
  });
});
