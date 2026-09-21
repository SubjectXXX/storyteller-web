import { expect, test } from '@playwright/test';

test('library to active-play fixture journey is keyboard operable', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /choose the world/i })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Protagonist name').fill('Arden');
  await page.getByRole('button', { name: 'Start story' }).click();
  await expect(page.getByRole('heading', { name: 'The receiver wakes' })).toBeVisible();
  const sizes = await page.locator('html').evaluate((node) => ({ scroll: node.scrollWidth, client: node.clientWidth }));
  expect(sizes.scroll).toBe(sizes.client);
  await page.screenshot({ path: testInfo.outputPath('active-play.png'), fullPage: true });
});

test('settings and wallet expose fixture state language', async ({ page }, testInfo) => {
  await page.goto('/settings');
  await expect(page.getByText('Inherited from your defaults')).toBeVisible();
  await page.getByLabel('Font family').selectOption('Atkinson Hyperlegible');
  await expect(page.getByText(/rain writes silver lines/i)).toHaveCSS('font-family', /Atkinson/);
  await page.screenshot({ path: testInfo.outputPath('settings.png'), fullPage: true });
  await page.getByRole('button', { name: 'Wallet', exact: true }).click();
  await page.getByRole('button', { name: /review external checkout handoff/i }).click();
  await expect(page.getByText(/never grants credits by itself/i)).toBeVisible();
  await page.getByRole('button', { name: /continue to fake provider/i }).click();
  await expect(page.getByText(/verified provider webhook/i)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('wallet-pending.png'), fullPage: true });
});

test('async and quota states remain recoverable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'empty' }).click();
  await expect(page.getByRole('heading', { name: /no scenarios match/i })).toBeVisible();
  await page.getByRole('button', { name: /clear filters/i }).click();
  await page.getByRole('button', { name: 'error' }).click();
  await expect(page.getByRole('alert')).toContainText('could not be refreshed');
  await page.goto('/play');
  await page.getByRole('button', { name: 'streaming' }).click();
  await expect(page.getByRole('status')).toContainText('Generating');
  await page.getByRole('button', { name: 'quota' }).click();
  await expect(page.getByRole('status')).toContainText('credits required');
  await expect(page.getByRole('button', { name: /submit do action/i })).toBeDisabled();
});
