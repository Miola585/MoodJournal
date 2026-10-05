import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`night crescent and public credits render at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      localStorage.setItem('siteTheme', 'night');
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('reduceMotion', 'true');
    });
    await page.goto('/activities');
    const moon = page.locator('.theme-art-night-crescent');
    await expect(moon).toBeVisible();
    await expect(moon).toHaveAttribute('src', /cresent_moon\.png/u);
    await expect.poll(() => moon.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
    expect(await moon.evaluate((image) => parseFloat(getComputedStyle(image).width))).toBeLessThanOrEqual(220);
    await expect(page.locator('img[src*="night-celestial-accent"]')).toHaveCount(0);
    expect(await page.locator('.activity-feature-art').evaluate((art) => getComputedStyle(art).backgroundImage)).toContain('cresent_moon.png');
    await page.screenshot({ path: testInfo.outputPath(`night-crescent-${viewport.width}.png`), fullPage: true });
    await page.getByRole('link', { name: 'Art credits', exact: true }).click();
    await expect(page).toHaveURL(/\/about#art-credits$/u);
    const heading = page.getByRole('heading', { name: 'Art credits', exact: true });
    await expect(heading).toBeInViewport();
    await expect(heading).toBeFocused();
    const credits = page.getByRole('region', { name: 'Art credits' });
    await expect(credits.getByRole('listitem')).toHaveCount(10);
    await expect(credits.getByRole('link', { name: 'Andy (@sparksandpixels)', exact: true })).toBeVisible();
    await expect(credits.getByRole('link', { name: 'Evgenia Belousova', exact: true })).toHaveAttribute('href', /babanovaesha657123/u);
    await expect(credits.getByRole('link', { name: '@north_studio11', exact: true })).toHaveAttribute('href', 'https://www.instagram.com/north_studio11/');
    await expect(credits.getByRole('link', { name: '@leilawart', exact: true })).toHaveAttribute('href', 'https://www.instagram.com/leilawart/');
    await expect(credits.getByRole('link', { name: 'urufaart', exact: true })).toHaveAttribute('href', /urufaart/u);
    await page.screenshot({ path: testInfo.outputPath(`art-credits-${viewport.width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
