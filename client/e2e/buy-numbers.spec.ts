import { test, expect } from './fixtures/auth';

const ORANGE_RGB = 'rgb(242, 101, 34)';

test.describe('Buy Numbers', () => {
  test('provider picker shows Service 1', async ({ authedPage: page }) => {
    await page.goto('/buy-numbers');
    await expect(page.getByRole('heading', { name: /select a service/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Service 1' })).toBeVisible();
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
    await countrySearch.fill('South Korea');

    const countryOption = page.getByRole('button', { name: /South Korea/i }).first();
    await expect(countryOption).toBeVisible({ timeout: 30_000 });
    await countryOption.click();

    await expect(page.getByText('Services')).toBeVisible();

    const serviceSearch = page.getByPlaceholder('Search services...');
    await serviceSearch.fill('Naver');

    const naverButton = page.getByRole('button', { name: 'Naver', exact: true });
    await expect(naverButton).toBeVisible({ timeout: 30_000 });

    await naverButton.hover();
    await expect(naverButton).toHaveCSS('background-color', ORANGE_RGB);
    await expect(naverButton).toHaveCSS('color', 'rgb(255, 255, 255)');
  });

  test('history section is visible for signed-in users', async ({ authedPage: page }) => {
    await page.goto('/buy-numbers/service-1');
    await expect(page.getByText(/History/)).toBeVisible();
  });
});
