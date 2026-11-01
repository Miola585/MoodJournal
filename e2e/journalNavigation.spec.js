import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'America/New_York' });

const entries = [
  { id: 'first-entry', type: 'journal', specificFeeling: 'First thought', note: 'First unique writing', created: '2026-10-31T09:00:00-04:00', dateKey: '2026-10-25', tags: [], factors: [] },
  { id: 'second-entry', type: 'journal', specificFeeling: 'Second thought', note: 'Second unique writing', created: '2026-10-31T10:00:00-04:00', dateKey: '2026-10-31', tags: [], factors: [] }
];

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-31T12:00:00-04:00') });
  await page.addInitScript((items) => {
    if (sessionStorage.getItem('journalNavigationSeeded')) return;
    localStorage.setItem('journalEntriesV2', JSON.stringify(items));
    sessionStorage.setItem('journalNavigationSeeded', 'true');
  }, entries);
});

const storedIds = (page) => page.evaluate(() => {
  const stored = JSON.parse(localStorage.getItem('journalEntriesV2'));
  return (Array.isArray(stored) ? stored : stored.entries).map((entry) => entry.id);
});

test('recent cards open the correct saved page and links survive refresh', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.home-recent-entry').filter({ hasText: 'First thought' }).locator('time')).toHaveText('Oct 25');
  await expect(page.locator('.home-recent-entry').filter({ hasText: 'Second thought' }).locator('time')).toHaveText('Oct 31');
  await page.locator('.home-recent-entry').filter({ hasText: 'First thought' }).click();
  await expect(page).toHaveURL(/\/entries\?entry=first-entry$/u);
  await expect(page.locator('#journal-entry-first-entry .entry-card')).toHaveClass(/entry-card-open/u);
  await expect(page.locator('#journal-entry-first-entry time')).toContainText('Oct 25, 2026');
  await page.reload();
  await expect(page.locator('#journal-entry-first-entry .entry-card')).toHaveClass(/entry-card-open/u);
  await page.goto('/');
  await page.locator('.home-recent-entry').filter({ hasText: 'Second thought' }).click();
  await expect(page).toHaveURL(/\/entries\?entry=second-entry$/u);
  await expect(page.locator('#journal-entry-second-entry .entry-card')).toHaveClass(/entry-card-open/u);
});

test('invalid or deleted entry links fall back to the journal list', async ({ page }) => {
  await page.goto('/entries?entry=missing-entry');
  await expect(page.getByRole('heading', { name: 'Page not found.' })).toBeVisible();
  await expect(page.locator('.entry-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Show journal' }).click();
  await expect(page).toHaveURL(/\/entries$/u);
  await page.goto('/entries?entry=first-entry');
  await page.locator('#journal-entry-first-entry').getByRole('button', { name: 'Delete' }).click();
  await page.clock.fastForward(10_100);
  await expect.poll(() => storedIds(page)).toEqual(['second-entry']);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Page not found.' })).toBeVisible();
});

test('pending deletion completes after leaving Entries', async ({ page }) => {
  await page.goto('/entries');
  await page.locator('.entry-card').filter({ hasText: 'First thought' }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'will be deleted' })).toBeVisible();
  await page.getByRole('button', { name: 'Mood Journal' }).click();
  await expect(page).toHaveURL(/\/$/u);
  await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
  await page.clock.fastForward(10_100);
  await expect.poll(() => storedIds(page)).toEqual(['second-entry']);
  await page.goto('/entries');
  await expect(page.locator('.entry-card')).toHaveCount(1);
});

test('Undo remains available across navigation and cancels deletion', async ({ page }) => {
  await page.goto('/entries');
  await page.locator('.entry-card').filter({ hasText: 'First thought' }).getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Mood Journal' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.clock.fastForward(10_100);
  await expect.poll(() => storedIds(page)).toEqual(['first-entry', 'second-entry']);
  await page.goto('/entries');
  await expect(page.locator('.entry-card')).toHaveCount(2);
});

test('a failed delete restores the entry and reports the error', async ({ page }) => {
  await page.goto('/entries');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'journalEntriesV2') throw new DOMException('Storage full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.locator('.entry-card').filter({ hasText: 'First thought' }).getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Mood Journal' }).click();
  await page.clock.fastForward(10_100);
  await expect(page.getByRole('alert').filter({ hasText: 'could not be deleted and was restored' })).toBeVisible();
  await expect.poll(() => storedIds(page)).toEqual(['first-entry', 'second-entry']);
  await page.goto('/entries');
  await expect(page.locator('.entry-card')).toHaveCount(2);
});
