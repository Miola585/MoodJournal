import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'America/New_York' });
test.setTimeout(60_000);

test('Home and Summary agree on Sunday and previous calendar week', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-01T12:00:00-05:00') });
  await page.addInitScript(() => {
    localStorage.setItem('journalEntriesV2', JSON.stringify([
      { id: 'oct-25', type: 'checkin', mood: 'Calm', intensity: 4, dateKey: '2026-10-25', created: '2026-10-25T12:00:00-04:00', primary: true, factors: [], tags: [] },
      { id: 'oct-31', type: 'checkin', mood: 'Calm', intensity: 5, dateKey: '2026-10-31', created: '2026-10-31T12:00:00-04:00', primary: true, factors: [], tags: [] },
      { id: 'nov-1', type: 'checkin', mood: 'Happy', intensity: 6, dateKey: '2026-11-01', created: '2026-11-01T12:00:00-05:00', primary: true, factors: [], tags: [] }
    ]));
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.home-rhythm-card strong')).toHaveText('1');
  await page.goto('/summary');
  await expect(page.getByText(/Nov 1 - Nov 7/u)).toBeVisible();
  await expect(page.locator('.summary-stat').first().locator('strong')).toHaveText('1');
  await page.getByRole('button', { name: 'Previous week' }).click();
  await expect(page.getByText(/Oct 25 - Oct 31/u)).toBeVisible();
  await expect(page.locator('.summary-stat').first().locator('strong')).toHaveText('2');
  await page.getByRole('button', { name: 'Next week' }).click();
  await expect(page.getByText(/Nov 1 - Nov 7/u)).toBeVisible();
});
