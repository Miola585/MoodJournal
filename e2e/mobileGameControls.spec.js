import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`constellation controls and stars stay separate at ${viewport.width}px`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await page.goto('/games/constellation');
    await expect(page.locator('.constellation-toolbar')).toBeVisible();
    for (const scale of [1, 1.3]) {
      await page.evaluate((scale) => document.querySelector('.app').style.setProperty('--font-scale', scale), scale);
      await expect.poll(() => page.evaluate(() => {
        const heading = document.querySelector('.immersive-route-header').getBoundingClientRect();
        const toolbar = document.querySelector('.constellation-toolbar').getBoundingClientRect();
        const stars = [...document.querySelectorAll('.constellation-stage .star')].map((star) => star.getBoundingClientRect());
        return stars.every((star) => star.top > heading.bottom && star.bottom < toolbar.top) && document.documentElement.scrollWidth <= innerWidth;
      })).toBe(true);
      if (viewport.width < 720) {
        const finish = page.getByRole('button', { name: 'Finish constellation', exact: true });
        const size = await finish.boundingBox();
        expect(size.height).toBeGreaterThanOrEqual(44);
        expect(size.height).toBeLessThanOrEqual(60);
        expect(await finish.evaluate((button) => button.scrollWidth <= button.clientWidth)).toBe(true);
      }
      await page.screenshot({ path: info.outputPath(`constellation-controls-${viewport.width}-${scale}.png`), fullPage: true });
    }
  });
}
