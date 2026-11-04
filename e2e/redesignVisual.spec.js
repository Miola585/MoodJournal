import { expect, test } from '@playwright/test';

const worlds = ['warm', 'garden', 'sunrise', 'ocean', 'night'];
test.setTimeout(120_000);

for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  test(`redesigned screens fit all five themes in both modes at ${viewport.width}px`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    for (const world of worlds) {
      for (const mode of ['light', 'dark']) {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.evaluate(({ world, mode }) => {
          localStorage.setItem('siteTheme', world);
          localStorage.setItem('theme', mode);
          localStorage.setItem('reduceMotion', 'true');
        }, { world, mode });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('region', { name: 'How are you arriving?', exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await page.screenshot({ path: info.outputPath(`${world}-${mode}-home-${viewport.width}.png`) });

        const route = viewport.width < 600 ? '/checkin' : '/calendar';
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await page.screenshot({ path: info.outputPath(`${world}-${mode}-${route.slice(1)}-${viewport.width}.png`) });
      }
    }
  });
}
