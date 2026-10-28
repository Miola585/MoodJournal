import { expect, test } from '@playwright/test';

for (const [width, fontScale] of [[1280, 1], [1280, 1.5], [900, 1], [850, 1], [768, 1.5], [390, 1.5], [320, 1.5]]) {
  test(`entry archive fits ${width}px with font scale ${fontScale}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript((scale) => {
      localStorage.setItem('siteTheme', 'night');
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('fontScale', String(scale));
    }, fontScale);
    await page.goto('/entries');
    await expect(page.getByRole('heading', { name: 'No saved entries yet.' })).toBeVisible();

    const assertContained = async () => {
      const overflow = await page.locator('.entries-screen').evaluate((screen) => {
        const bounds = screen.getBoundingClientRect();
        return [...screen.querySelectorAll('.page-header, .archive-toolbar, .archive-empty-state, .entry-card, input, select, button')]
          .filter((node) => node.getClientRects().length)
          .filter((node) => {
            const rect = node.getBoundingClientRect();
            return rect.left < Math.max(0, bounds.left) - 1 || rect.right > Math.min(innerWidth, bounds.right) + 1;
          })
          .map((node) => node.className || node.tagName);
      });
      expect(overflow).toEqual([]);
    };
    await assertContained();
    await page.getByRole('textbox', { name: 'Keyword search' }).fill('test');
    if (width <= 560) await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await page.getByRole('button', { name: 'Bookmarked', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Bookmarked', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await assertContained();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByRole('textbox', { name: 'Keyword search' })).toHaveValue('');
    await page.screenshot({ path: testInfo.outputPath(`entries-${width}-${fontScale}.png`), fullPage: true });

    await page.evaluate(() => localStorage.setItem('journalEntriesV2', JSON.stringify([{
      id: 'layout-entry', type: 'journal', specificFeeling: 'A saved page', note: 'Writing that should stay within the page.',
      created: '2026-01-01T12:00:00.000Z', dateKey: '2026-01-01', intensity: 5, factors: [], tags: [], mood: '', primary: false,
    }])));
    await page.reload();
    await expect(page.locator('.entry-card')).toBeVisible();
    await assertContained();
    await page.getByRole('button', { name: 'New free write', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toBeVisible();
  });
}
