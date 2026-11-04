import { expect, test } from '@playwright/test';

for (const width of [320, 390, 820, 1440]) {
  test(`the hub offers four unhurried pauses at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/explore');
    const grid = page.locator('.explore-pauses');
    await expect(grid.locator('button')).toHaveCount(4);
    await expect(page.getByRole('button', { name: 'More little breaks' })).toHaveCount(0);
    for (const name of ['Breathing', '5-4-3-2-1 Senses', 'Mood Colors', 'Scavenger hunt']) {
      await expect(grid.getByRole('button', { name, exact: true })).toHaveCount(1);
    }
    await expect(grid).not.toContainText(/minute|timer|countdown/i);
    const huntArt = grid.locator('.explore-pause-scavenger svg.destination-art-wonders');
    await expect(huntArt).toBeVisible();
    await expect(huntArt).toHaveAttribute('viewBox', '65 0 280 280');
    await expect(page.locator('.activity-feature, .activity-timer')).toHaveCount(0);
    const columns = await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(width > 600 ? 2 : 1);
    await grid.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`breaks-grid-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const route of ['/activities', '/activities?activity=Let%20your%20shoulders%20go', '/activities?tool=unknown']) {
  test(`retired timed activity link returns to the hub: ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(/\/explore$/);
    await expect(page.locator('.explore-pauses')).toBeVisible();
    await expect(page.locator('.activity-feature, .activity-timer, .activity-journal-sheet')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.explore-pauses button')).toHaveCount(4);
  });
}

test('earlier activity notes remain in the monthly book after retiring timers', async ({ page }) => {
  await page.goto('/explore');
  await page.evaluate(() => {
    localStorage.setItem(`moodJournalPrivateV1:local-browser:${encodeURIComponent('activityNotes:2026-09-12')}`, JSON.stringify({ 'Let your shoulders go': 'An earlier note I still want to keep.' }));
  });
  await page.goto('/activities');
  await expect(page).toHaveURL(/\/explore$/);
  await page.goto('/journal/library?month=2026-09&day=2026-09-12');
  await expect(page.locator('.book-margin-note')).toContainText('An earlier note I still want to keep.');
  await expect(page.locator('.book-margin-note')).toContainText('Let your shoulders go');
  await expect(page.locator('.activity-timer')).toHaveCount(0);
});

test('grounding destinations open separate pages with working browser history', async ({ page }) => {
  await page.goto('/explore');
  await page.getByRole('button', { name: 'Breathing', exact: true }).click();
  await page.getByRole('button', { name: 'Start breathing', exact: true }).click();
  await expect(page.locator('.activity-feature, .activity-timer')).toHaveCount(0);
  await page.goBack();
  await expect(page.locator('.breathing-bubble')).toHaveCount(0);
  await expect(page.locator('.explore-pauses')).toBeVisible();
  await page.getByRole('button', { name: 'Scavenger hunt', exact: true }).click();
  await expect(page).toHaveURL(/tool=scavenger/);
  await expect(page.getByRole('button', { name: 'Begin noticing' })).toBeVisible();
  await expect(page.locator('svg.destination-art-wonders')).toBeVisible();
});
