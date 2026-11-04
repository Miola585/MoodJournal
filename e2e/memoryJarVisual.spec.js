import { expect, test } from '@playwright/test';
const folder = '.cache/memory-jar-gallery';

async function arrange(page, { theme, mode, count, fontScale = 1 }) {
  await page.goto('/games/memory');
  await page.evaluate(({ theme, mode, count, fontScale }) => {
    localStorage.setItem('siteTheme', theme); localStorage.setItem('theme', mode);
    localStorage.setItem('reduceMotion', 'true'); localStorage.setItem('fontScale', String(fontScale));
    localStorage.setItem('moodJournalPrivateV1:local-browser:gameMemoryJar', JSON.stringify(Array.from({ length: count }, (_, index) => ({ id: `visual-${index}`, text: index === 0 ? 'An unhurried afternoon. A warm drink, an open window, and a conversation I wanted to remember.' : `Little moment ${index + 1}`, dateKey: '2026-11-04', createdAt: '2026-11-04T12:00:00Z' }))));
  }, { theme, mode, count, fontScale });
  await page.goto('/games/memory?month=2026-11');
  await expect(page.locator('.jar-composer')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  if (count) await expect(page.getByRole('button', { name: 'Shuffle', exact: true })).toBeEnabled();
  await expect(page.locator('.jar-canvas')).toHaveAttribute('data-moving', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('.jar-layout').evaluate((el) => getComputedStyle(el).overflowY)).toBe('visible');
  expect(await page.locator('.jar-marble').evaluateAll((nodes) => nodes.every((node) => {
    const bounds = node.getBoundingClientRect(), jar = node.parentElement.getBoundingClientRect();
    return bounds.width > 20 && Math.abs(bounds.width - bounds.height) < 1 && bounds.x >= jar.x && bounds.right <= jar.right && bounds.bottom <= jar.bottom;
  }))).toBe(true);
}

for (const theme of ['warm', 'garden', 'sunrise', 'ocean', 'night']) for (const mode of ['light', 'dark']) test(`jar gallery ${theme} ${mode}: empty, populated, full on desktop and phone`, async ({ page }) => {
  test.setTimeout(60000);
  for (const width of [1366, 390]) for (const count of [0, 6, 24]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await arrange(page, { theme, mode, count });
    await page.screenshot({ path: `${folder}/${theme}-${mode}-${width}-${count}.png`, fullPage: true });
  }
});

for (const viewport of [{ width: 320, height: 740 }, { width: 768, height: 1024 }, { width: 844, height: 390 }]) test(`jar details and enlarged text ${viewport.width}`, async ({ page }) => {
  await page.setViewportSize(viewport);
  await arrange(page, { theme: 'ocean', mode: 'light', count: 24, fontScale: 1.5 });
  await page.locator('.jar-marble').first().focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.jar-memory-detail')).toContainText('An unhurried afternoon');
  await page.getByRole('button', { name: 'Remove', exact: true }).scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: `${folder}/large-text-${viewport.width}.png`, fullPage: true });
});
