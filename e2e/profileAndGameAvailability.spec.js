import { expect, test } from '@playwright/test';

for (const width of [390, 1280]) {
  test(`profile routes and game availability at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Profile menu', exact: true })).toBeVisible();
    await expect(page.getByText('Mood Garden')).toHaveCount(0);
    await page.getByRole('button', { name: 'Profile menu', exact: true }).click();
    await page.getByRole('navigation', { name: 'Account and help' }).getByRole('button', { name: 'Profile', exact: true }).click();
    await expect(page).toHaveURL(/\/profile$/u);
    await expect(page.getByText(/Saved in this browser/)).toBeVisible();
    await page.getByRole('link', { name: /Privacy Locks/u }).click();
    await expect(page).toHaveURL(/\/privacy$/u);
    await expect(page.getByRole('heading', { name: 'Privacy', exact: true }).first()).toBeVisible();
    await expect(page.getByText('Stored-entry encryption', { exact: true })).toBeVisible();
    await expect(page.getByText('Appearance', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Profile menu', exact: true }).click();
    await page.getByRole('navigation', { name: 'Account and help' }).getByRole('button', { name: 'Profile', exact: true }).click();
    await page.getByRole('link', { name: /Preferences Theme/u }).click();
    await expect(page).toHaveURL(/\/preferences$/u);
    await expect(page.getByText('Appearance', { exact: true })).toBeVisible();
    await expect(page.getByText('Stored-entry encryption', { exact: true })).toHaveCount(0);
    await page.goto('/games');
    await expect(page).toHaveURL(/\/explore$/u);
    await expect(page.getByRole('button', { name: 'Mood Garden - Coming soon', exact: true })).toBeDisabled();
    await page.goto('/games/garden');
    await expect(page).toHaveURL(/\/explore$/u);
    await page.goto('/game-archive');
    await expect(page).toHaveURL(/\/explore$/u);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}
