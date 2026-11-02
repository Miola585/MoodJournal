import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'America/New_York' });
const date = '2026-11-01';
const keyFor = (owner, day = date) => `moodJournalPrivateV1:${owner}:${encodeURIComponent(`activityCompletions:${day}`)}`;
const sheet = (page) => page.locator('.activity-journal-sheet:visible');
const checkbox = (page) => sheet(page).getByRole('checkbox', { name: 'Mark complete' });
const readProgress = (page, owner, day = date) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), keyFor(owner, day));

async function openActivity(page) {
  await page.locator('.activity-feature').getByRole('button', { name: /^(Begin|Open) activity$/ }).click();
  await expect(checkbox(page)).toBeEnabled();
  return sheet(page).getByRole('heading').innerText();
}

async function mount(page, owner, delay = '') {
  await page.evaluate(({ owner, delay }) => window.mountActivityOwner(owner, delay), { owner, delay });
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-01T12:00:00-05:00') });
  await page.goto('/e2e/fixtures/activityScope.html');
  await expect(page.locator('.activity-feature')).toBeVisible();
});

test('accounts and guest keep independent same-day progress across reloads', async ({ page }) => {
  await mount(page, 'account-a');
  const title = await openActivity(page);
  await checkbox(page).click();
  await expect(checkbox(page)).toBeChecked();
  await mount(page, 'account-b');
  await openActivity(page);
  await expect(checkbox(page)).not.toBeChecked();
  expect(await readProgress(page, 'account-b')).toBeNull();
  await mount(page, 'local-browser');
  await openActivity(page);
  await expect(checkbox(page)).not.toBeChecked();
  await mount(page, 'account-a');
  await openActivity(page);
  await expect(checkbox(page)).toBeChecked();
  await page.reload();
  await mount(page, 'account-a');
  await openActivity(page);
  await expect(checkbox(page)).toBeChecked();
  expect(await readProgress(page, 'account-a')).toEqual({ [title]: true });
});

test('unowned legacy progress is preserved for guest, never adopted by accounts', async ({ page }) => {
  const title = await openActivity(page);
  await page.evaluate(({ title, date }) => localStorage.setItem(`activityCompletions:${date}`, JSON.stringify({ [title]: true })), { title, date });
  await mount(page, 'account-a');
  await openActivity(page);
  await expect(checkbox(page)).not.toBeChecked();
  expect(await page.evaluate((date) => localStorage.getItem(`activityCompletions:${date}`), date)).not.toBeNull();
  await mount(page, 'local-browser');
  await openActivity(page);
  await expect(checkbox(page)).toBeChecked();
  expect(await readProgress(page, 'local-browser')).toEqual({ [title]: true });
});

test('midnight reloads the new local day without copying yesterday', async ({ page }) => {
  await mount(page, 'account-a');
  const oldTitle = await openActivity(page);
  await checkbox(page).click();
  await expect(checkbox(page)).toBeChecked();
  await page.clock.setSystemTime(new Date('2026-11-01T23:59:59-05:00'));
  await page.clock.runFor(61_000);
  await expect(page.locator('.activity-journal-sheet:visible')).toHaveCount(0);
  const newTitle = await openActivity(page);
  await expect(checkbox(page)).not.toBeChecked();
  expect(await readProgress(page, 'account-a', '2026-11-02')).toBeNull();
  await checkbox(page).click();
  await expect(checkbox(page)).toBeChecked();
  expect(await readProgress(page, 'account-a', '2026-11-02')).toEqual({ [newTitle]: true });
  expect(await readProgress(page, 'account-a')).toEqual({ [oldTitle]: true });
});

test('a stale click after waking cannot write yesterday under today', async ({ page }) => {
  await mount(page, 'account-a');
  await openActivity(page);
  await page.clock.setSystemTime(new Date('2026-11-02T00:00:01-05:00'));
  await checkbox(page).dispatchEvent('click');
  await expect(page.locator('.activity-journal-sheet:visible')).toHaveCount(0);
  await openActivity(page);
  await expect(checkbox(page)).not.toBeChecked();
  expect(await readProgress(page, 'account-a')).toBeNull();
  expect(await readProgress(page, 'account-a', '2026-11-02')).toBeNull();
});

test('late reads and queued writes cannot cross an account boundary', async ({ page }) => {
  await mount(page, 'account-a');
  await openActivity(page);
  await checkbox(page).click();
  await expect(checkbox(page)).toBeChecked();
  await mount(page, 'account-a', 'read');
  await expect.poll(() => page.evaluate(() => Boolean(window.releaseActivityRead))).toBe(true);
  await mount(page, 'account-b');
  await openActivity(page);
  await page.evaluate(() => window.releaseActivityRead());
  await expect(checkbox(page)).not.toBeChecked();
  await mount(page, 'account-b', 'write');
  await openActivity(page);
  await checkbox(page).dispatchEvent('click');
  await expect.poll(() => page.evaluate(() => Boolean(window.releaseActivityWrite))).toBe(true);
  await mount(page, 'account-c');
  await openActivity(page);
  await page.evaluate(() => window.releaseActivityWrite());
  await expect(checkbox(page)).not.toBeChecked();
  expect(await readProgress(page, 'account-b')).toBeNull();
  expect(await readProgress(page, 'account-c')).toBeNull();
});

test('bad reads do not overwrite progress and failed writes offer retry', async ({ page }) => {
  await page.evaluate((key) => localStorage.setItem(key, 'broken json'), keyFor('account-a'));
  await mount(page, 'account-a');
  await page.locator('.activity-feature').getByRole('button', { name: 'Begin activity' }).click();
  await expect(checkbox(page)).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('could not be read');
  expect(await page.evaluate((key) => localStorage.getItem(key), keyFor('account-a'))).toBe('broken json');
  await page.evaluate((key) => localStorage.setItem(key, '{}'), keyFor('account-a'));
  await page.getByRole('button', { name: 'Retry progress' }).click();
  await expect(checkbox(page)).toBeEnabled();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.restoreActivityWrites = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (key, value) {
      if (key.includes('activityCompletions')) throw new Error('Storage is full');
      return original.call(this, key, value);
    };
  });
  await checkbox(page).dispatchEvent('click');
  await expect(page.getByRole('alert')).toContainText('Storage is full');
  await expect(checkbox(page)).not.toBeChecked();
  await page.evaluate(() => window.restoreActivityWrites());
  await page.getByRole('button', { name: 'Retry progress' }).click();
  await expect(checkbox(page)).toBeChecked();
});

test('returning to a saved local day restores that day without replacing it', async ({ page }) => {
  await mount(page, 'account-a');
  const firstTitle = await openActivity(page);
  await checkbox(page).click();
  await expect(checkbox(page)).toBeChecked();
  await page.clock.setSystemTime(new Date('2026-11-02T08:00:00-05:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  const nextTitle = await openActivity(page);
  await checkbox(page).click();
  await expect(checkbox(page)).toBeChecked();
  await page.clock.setSystemTime(new Date('2026-11-01T18:00:00-05:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await openActivity(page);
  await expect(checkbox(page)).toBeChecked();
  expect(await readProgress(page, 'account-a')).toEqual({ [firstTitle]: true });
  expect(await readProgress(page, 'account-a', '2026-11-02')).toEqual({ [nextTitle]: true });
});

test('midnight invalidates a pending read and queued completion', async ({ page }) => {
  await mount(page, 'account-a', 'read');
  await expect.poll(() => page.evaluate(() => Boolean(window.releaseActivityRead))).toBe(true);
  await page.evaluate(() => { window.yesterdayRead = window.releaseActivityRead; });
  await page.clock.setSystemTime(new Date('2026-11-02T00:00:01-05:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await mount(page, 'account-a');
  await openActivity(page);
  await page.evaluate(() => window.yesterdayRead());
  await expect(checkbox(page)).not.toBeChecked();
  await mount(page, 'account-a', 'write');
  await openActivity(page);
  await checkbox(page).dispatchEvent('click');
  await expect.poll(() => page.evaluate(() => Boolean(window.releaseActivityWrite))).toBe(true);
  await page.clock.setSystemTime(new Date('2026-11-03T00:00:01-05:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await openActivity(page);
  await page.evaluate(() => window.releaseActivityWrite());
  await expect(checkbox(page)).not.toBeChecked();
  expect(await readProgress(page, 'account-a', '2026-11-02')).toBeNull();
  expect(await readProgress(page, 'account-a', '2026-11-03')).toBeNull();
});
