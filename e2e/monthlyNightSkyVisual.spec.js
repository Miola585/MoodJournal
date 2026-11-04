import { expect, test } from '@playwright/test';
const folder = '.cache/monthly-night-skies';
async function arrange(page, { theme, mode, count, fontScale = 1 }) {
  await page.clock.setFixedTime(new Date('2026-11-04T17:00:00Z'));
  await page.goto('/');
  await page.evaluate(({ theme, mode, count, fontScale }) => {
    localStorage.setItem('siteTheme', theme); localStorage.setItem('theme', mode);
    localStorage.setItem('fontScale', String(fontScale)); localStorage.setItem('reduceMotion', 'true');
    localStorage.setItem('journalEntriesV2', JSON.stringify(Array.from({ length: count }, (_, i) => {
      const dateKey = `2026-10-${String(i + 1).padStart(2, '0')}`;
      return { id: dateKey, dateKey, created: `${dateKey}T12:00:00`, type: i % 4 === 0 ? 'journal' : 'checkin', mood: ['Calm', 'Happy', 'Sad', 'Overwhelmed'][i % 4], intensity: 2 + i % 7, factors: i % 2 ? ['Sleep', 'School'] : [], tags: [], note: 'A little of today.' };
    })));
    if (!count) localStorage.setItem('moodJournalPrivateV1:local-browser:gameMemoryJar', JSON.stringify([{ id: 'keepsake', text: 'The first cool morning.', dateKey: '2026-10-01' }]));
    else localStorage.removeItem('moodJournalPrivateV1:local-browser:gameMemoryJar');
  }, { theme, mode, count, fontScale });
}
async function checkTargets(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const rectangles = await page.locator('.personal-sky-star').evaluateAll((nodes) => nodes.map((node) => {
    const r = node.getBoundingClientRect(), f = node.parentElement.getBoundingClientRect();
    return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height, contained: r.x >= f.x && r.right <= f.right && r.y >= f.y && r.bottom <= f.bottom };
  }));
  rectangles.forEach((r, i) => {
    expect(r.contained).toBe(true); expect(r.width).toBeGreaterThanOrEqual(44); expect(r.height).toBeGreaterThanOrEqual(44);
    rectangles.slice(i + 1).forEach((b) => expect(r.right <= b.x || b.right <= r.x || r.bottom <= b.y || b.bottom <= r.y).toBe(true));
  });
}
for (const theme of ['warm', 'garden', 'sunrise', 'ocean', 'night']) for (const mode of ['light', 'dark']) test(`monthly skies gallery ${theme} ${mode}`, async ({ page }) => {
  test.setTimeout(90000);
  for (const width of [1366, 390]) for (const count of [0, 6, 31]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await arrange(page, { theme, mode, count });
    for (const view of ['book', 'sky', 'reflection']) {
      if (view === 'reflection') {
        await page.goto('/journal/library?month=2026-10&view=reflection');
        await expect(page.getByRole('heading', { name: 'Your month in view.' })).toBeVisible();
        await expect(page.locator('.book-month-chart')).toHaveCount(count ? 2 : 0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await page.screenshot({ path: `${folder}/${theme}-${mode}-${width}-${count}-${view}.png`, fullPage: true });
        continue;
      }
      await page.goto(view === 'book' ? '/journal/library?month=2026-10&view=night-sky' : '/games/night-sky?month=2026-10');
      await expect(page.locator('.personal-sky-field')).toBeVisible();
      await expect(page.locator('.personal-sky-star')).toHaveCount(count);
      await page.evaluate(() => document.fonts.ready);
      await checkTargets(page);
      if (view === 'book') {
        const field = await page.locator('.personal-sky-field').boundingBox();
        const book = await page.locator('.month-book').boundingBox();
        expect(field.width / book.width).toBeGreaterThan(.9);
      }
      await page.screenshot({ path: `${folder}/${theme}-${mode}-${width}-${count}-${view}.png`, fullPage: true });
    }
  }
});
for (const viewport of [{ width: 320, height: 740 }, { width: 768, height: 1024 }, { width: 844, height: 390 }]) test(`full sky enlarged text and keyboard ${viewport.width}`, async ({ page }) => {
  await page.setViewportSize(viewport);
  await arrange(page, { theme: 'ocean', mode: 'light', count: 31, fontScale: 1.5 });
  for (const view of ['book', 'sky', 'reflection']) {
    if (view === 'reflection') {
      await page.goto('/journal/library?month=2026-10&view=reflection');
      await expect(page.getByRole('heading', { name: 'Your month in view.' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.getByText('Chart values', { exact: true }).click();
      await expect(page.getByRole('table').first()).toBeVisible();
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: `${folder}/enlarged-${viewport.width}-${view}.png`, fullPage: true });
      continue;
    }
    await page.goto(view === 'book' ? '/journal/library?month=2026-10&view=night-sky' : '/games/night-sky?month=2026-10');
    await expect(page.locator('.personal-sky-star')).toHaveCount(31);
    await page.locator('.personal-sky-star').first().focus(); await page.keyboard.press('Enter');
    await expect(page.locator('.personal-sky-star').first()).toHaveAttribute('aria-pressed', 'true');
    await checkTargets(page);
    await page.getByRole('button', { name: 'Open book day', exact: true }).scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: `${folder}/enlarged-${viewport.width}-${view}.png`, fullPage: true });
  }
});
