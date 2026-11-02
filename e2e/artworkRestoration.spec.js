import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
  test(`theme artwork and notebook binding remain visible at ${width}px`, async ({ page }, info) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ['warm', 'ocean', 'garden', 'sunrise', 'night']) {
      for (const mode of ['light', 'dark']) {
        await page.goto('/');
        await page.evaluate(({ theme, mode }) => {
          localStorage.setItem('siteTheme', theme);
          localStorage.setItem('theme', mode);
          localStorage.setItem('reduceMotion', 'true');
        }, { theme, mode });
        await page.goto('/activities?tool=breathing');
        await expect(page.getByRole('button', { name: 'Start breathing', exact: true })).toBeVisible();
        const art = page.locator('.theme-atmosphere .theme-art-image:visible');
        await expect(art.first()).toBeVisible();
        await expect.poll(() => art.evaluateAll((images) => images.every((img) => img.complete && img.naturalWidth > 0))).toBe(true);
        await expect(page.locator('.theme-atmosphere')).toHaveCSS('pointer-events', 'none');
        if (theme === 'warm') await expect(page.locator('.theme-art-cafe-pumpkin')).toBeVisible();
        if (theme === 'ocean') await expect(page.locator(mode === 'dark' ? '.theme-art-ocean-marine-shell' : '.theme-art-ocean-shell')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await page.screenshot({ path: info.outputPath(`${theme}-${mode}-activities.png`), animations: 'disabled' });

        await page.goto('/journal/write');
        const notebook = page.locator('.journal-editor-notebook');
        await expect(notebook).toBeVisible();
        await expect(page.locator('.theme-atmosphere .theme-art-image:visible').first()).toBeVisible();
        for (const paper of ['Plain paper', 'Lined paper']) {
          await page.getByRole('button', { name: paper, exact: true }).click();
          const binding = await notebook.evaluate((element) => {
            const style = getComputedStyle(element, '::before');
            return { display: style.display, background: style.backgroundImage, width: parseFloat(style.width), gutter: parseFloat(getComputedStyle(element).paddingLeft) };
          });
          expect(binding.display).toBe('block');
          expect(binding.background).not.toBe('none');
          expect(binding.gutter).toBeGreaterThan(binding.width);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await page.screenshot({ path: info.outputPath(`${theme}-${mode}-write.png`), animations: 'disabled' });
      }
    }
  });
}
