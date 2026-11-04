import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'America/New_York' });
const entry = (dateKey, extra = {}) => ({ id: dateKey, dateKey, created: `${dateKey}T12:00:00`, type: 'checkin', mood: 'Calm', intensity: 5, tags: [], ...extra });
const entries = [entry('2026-10-03', { type: 'journal', note: 'A quiet afternoon.' }), entry('2026-10-17'), entry('2026-10-17', { id: 'second', primary: true, intensity: 9 }), entry('2026-11-01')];
async function seed(page, values = entries) {
  await page.goto('/');
  await page.evaluate((values) => localStorage.setItem('journalEntriesV2', JSON.stringify(values)), values);
}

test('monthly selector, primary check-ins, free writes, stable positions and history', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-04T17:00:00Z'));
  await seed(page);
  await page.goto('/games/night-sky');
  await expect(page.locator('.personal-sky-star')).toHaveCount(1);
  await page.getByLabel('Month', { exact: true }).selectOption('2026-10');
  await expect(page.locator('.personal-sky-star')).toHaveCount(2);
  await expect(page.locator('.personal-sky-star').first()).toHaveAttribute('aria-label', /Free write, 5-point star, 1 entry/);
  await expect(page.locator('.personal-sky-star').last()).toHaveAttribute('aria-label', /intensity 9 of 10.*2 entries/);
  const position = await page.locator('.personal-sky-star').first().getAttribute('style');
  await page.goBack(); await expect(page.locator('.personal-sky-star')).toHaveCount(1);
  await page.goForward(); await expect(page.locator('.personal-sky-star')).toHaveCount(2);
  await page.locator('.personal-sky-star').first().focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.personal-sky-recap')).toContainText('Free write');
  await page.getByRole('button', { name: 'Open book day', exact: true }).click();
  await expect(page).toHaveURL(/month=2026-10&day=2026-10-03/);
  await page.evaluate((value) => localStorage.setItem('journalEntriesV2', JSON.stringify([value])), entries[0]);
  await page.goto('/games/night-sky?month=2026-10');
  await expect(page.locator('.personal-sky-star')).toHaveCount(1);
  expect(await page.locator('.personal-sky-star').first().getAttribute('style')).toBe(position);
  await page.goto('/games/night-sky?month=invalid');
  await expect(page.getByLabel('Month', { exact: true })).toHaveValue('2026-11');
});

test('closing spread follows saved days, turns in both directions and returns from full sky', async ({ page }) => {
  await seed(page);
  await page.goto('/journal/library?month=2026-10&day=2026-10-17');
  await expect(page.getByText('Gathering your saved days...')).toHaveCount(0);
  await page.getByRole('button', { name: 'Monthly night sky', exact: true }).click();
  await expect(page.locator('.turn-next')).toBeVisible();
  await expect(page).toHaveURL(/month=2026-10&view=night-sky/);
  await expect(page.locator('.book-sky-summary')).toContainText('2 journal days');
  await expect(page.locator('.personal-sky-star')).toHaveCount(2);
  await page.getByRole('link', { name: 'Open full sky' }).click();
  await expect(page).toHaveURL(/games\/night-sky\?month=2026-10/);
  await page.getByRole('button', { name: 'Back to monthly book' }).click();
  await expect(page.locator('.book-monthly-sky')).toBeVisible();
  await page.getByRole('button', { name: 'Previous day' }).click();
  await expect(page.locator('.turn-previous')).toBeVisible();
  await expect(page).toHaveURL(/day=2026-10-17/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Monthly night sky', exact: true }).click();
  await expect(page.locator('.book-turn-sheet')).toHaveCount(0);
  await page.locator('.personal-sky-star').first().click();
  await page.getByRole('button', { name: 'Open book day', exact: true }).click();
  await expect(page).toHaveURL(/day=2026-10-03/);
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await page.getByRole('navigation', { name: 'Days in this book' }).getByRole('button', { name: 'Monthly night sky' }).click();
  await expect(page.locator('.book-monthly-sky')).toBeVisible();
});

test('empty current and keepsakes-only books do not invent stars or counts', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-04T17:00:00Z'));
  await seed(page, []);
  await page.evaluate(() => localStorage.setItem('moodJournalPrivateV1:local-browser:gameMemoryJar', JSON.stringify([{ id: 'memory', text: 'An afternoon', dateKey: '2026-10-02', createdAt: '2026-10-02T12:00:00' }])));
  await page.goto('/journal/library?month=2026-10&view=night-sky');
  await expect(page.locator('.book-sky-summary')).toContainText('0 journal days');
  await expect(page.locator('.personal-sky-star')).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to your library' }).click();
  await expect(page.locator('.month-volume').filter({ hasText: 'October' })).toContainText('1 saved day');
  await expect(page.locator('.month-volume').filter({ hasText: 'October' })).toContainText('0 entries');
  await page.goto('/journal/library?month=2026-11&view=night-sky');
  await expect(page.locator('.book-sky-summary')).toContainText('Still growing');
  await expect(page.locator('.personal-sky-star')).toHaveCount(0);
});

for (const explicit of [false, true]) test(`local year rollover keeps history and advances only the default sky (${explicit})`, async ({ page }) => {
  await page.clock.install({ time: new Date('2027-01-01T04:59:00Z') });
  await seed(page, [entry('2026-12-31')]);
  await page.goto(`/games/night-sky${explicit ? '?month=2026-12' : ''}`);
  await expect(page.locator('.personal-sky-star')).toHaveCount(1);
  await page.clock.fastForward(65000);
  await expect(page.getByLabel('Month', { exact: true })).toHaveValue(explicit ? '2026-12' : '2027-01');
  await expect(page.locator('.personal-sky-star')).toHaveCount(explicit ? 1 : 0);
  await page.goto('/journal/library?month=2026-12&view=night-sky');
  await expect(page.locator('.personal-sky-star')).toHaveCount(1);
  await page.reload(); await expect(page.locator('.personal-sky-star')).toHaveCount(1);
});

test('closing spread stays private after encryption locks during a turn', async ({ page }) => {
  await seed(page);
  await page.evaluate(async () => {
    const encryption = await import('/src/utils/journalEncryption.js');
    const created = await encryption.createJournalEncryption('monthly sky encryption test');
    const rows = await encryption.encryptEntriesToRows(JSON.parse(localStorage.getItem('journalEntriesV2')), 'local-browser', created.dataKey);
    localStorage.setItem(encryption.localEncryptedJournalKey, JSON.stringify({ version: 1, config: encryption.serializeEncryptionConfig(created.config), rows }));
    localStorage.removeItem('journalEntriesV2');
  });
  await page.goto('/journal/library?month=2026-10&day=2026-10-17');
  await expect(page.locator('.personal-sky-star')).toHaveCount(0);
  await page.getByLabel('Journal passphrase', { exact: true }).fill('monthly sky encryption test');
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await expect(page.getByText('Gathering your saved days...')).toHaveCount(0);
  await page.getByRole('button', { name: 'Monthly night sky', exact: true }).click();
  await expect(page.locator('.turn-next')).toBeVisible();
  await page.evaluate(() => dispatchEvent(new StorageEvent('storage', { key: 'journalEncryptionRevision', newValue: JSON.stringify({ ownerId: 'local-browser', nonce: 'monthly-lock' }) })));
  await expect(page.locator('.journal-library')).toHaveCount(0);
  await page.waitForTimeout(800);
  await expect(page.locator('.personal-sky-star, .book-turn-sheet')).toHaveCount(0);
  await expect(page.getByLabel('Journal passphrase', { exact: true })).toBeVisible();
});

test('saved changes update mounted skies and owner changes clear selections', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-20T16:00:00Z'));
  await page.goto('/e2e/fixtures/monthly-sky.html');
  await page.locator('.personal-sky-star').click();
  await expect(page.locator('.personal-sky-recap')).toContainText('intensity 2');
  const position = await page.locator('.personal-sky-star').getAttribute('style');
  await page.getByRole('button', { name: 'Edit mood' }).click();
  await expect(page.locator('.personal-sky-recap')).toContainText('intensity 9');
  expect((await page.locator('.personal-sky-star').getAttribute('style')).split('--star-color')[0]).toBe(position.split('--star-color')[0]);
  await page.getByRole('button', { name: 'Move date' }).click();
  await expect(page.locator('.personal-sky-star')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo deletion' }).click();
  await expect(page.locator('.personal-sky-star')).toHaveCount(1);
  await page.getByRole('button', { name: 'Delete day' }).click();
  await expect(page.locator('.personal-sky-star')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo deletion' }).click();
  await page.locator('.personal-sky-star').click();
  await page.getByRole('button', { name: 'Owner B' }).click();
  await expect(page.locator('.personal-sky-star')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.personal-sky-star')).toHaveAttribute('aria-label', /Free write/);
  await expect(page.locator('.personal-sky-recap')).not.toContainText('Calm');
  await page.getByRole('button', { name: 'Lock now' }).click();
  await expect(page.locator('.personal-night-sky')).toHaveCount(0);
});

test('owner switch and locking cannot restore a closing spread from a pending read', async ({ page }) => {
  await page.addInitScript(() => { window.holdSkyRead = true; });
  await page.goto('/e2e/fixtures/monthly-sky.html?library=1');
  await expect(page.getByText('Gathering your saved days...')).toBeVisible();
  await page.locator('.personal-sky-star').click();
  await page.getByRole('button', { name: 'Owner B' }).click();
  await expect(page.locator('.personal-sky-star')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.personal-sky-star')).toHaveAttribute('aria-label', /Free write/);
  await page.getByRole('button', { name: 'Lock now' }).click();
  await page.evaluate(() => window.releaseSkyRead());
  await expect(page.locator('.journal-library, .personal-sky-star')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Journal Locked' })).toBeVisible();
});

test('monthly reflection follows the sky with truthful daily graphs and totals', async ({ page }) => {
  await seed(page);
  await page.goto('/journal/library?month=2026-10&view=night-sky');
  await expect(page.getByText('Gathering your saved days...')).toHaveCount(0);
  await page.getByRole('button', { name: 'Monthly reflection', exact: true }).click();
  await expect(page.locator('.turn-next')).toBeVisible();
  await expect(page).toHaveURL(/view=reflection/);
  await expect(page.getByRole('heading', { name: 'Your month in view.' })).toBeVisible();
  await expect(page.locator('.book-month-totals').getByText('2', { exact: true })).toHaveCount(2);
  await expect(page.locator('.book-month-insights')).toContainText('9.0/10');
  await expect(page.locator('.book-month-chart')).toHaveCount(2);
  await page.getByText('Chart values', { exact: true }).click();
  await expect(page.getByRole('table').first()).toContainText('2026-10-17');
  await expect(page.getByRole('table').first()).not.toContainText('2026-10-03');
  await expect(page.getByRole('table').last()).toContainText('Calm');
  await page.getByRole('button', { name: 'Monthly night sky', exact: true }).click();
  await expect(page.locator('.turn-previous')).toBeVisible();
  await expect(page).toHaveURL(/view=night-sky/);
  await page.goBack(); await expect(page).toHaveURL(/view=reflection/);
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Days in this book' }).getByRole('button').last()).toHaveText('Monthly reflection');
  await page.evaluate((value) => localStorage.setItem('journalEntriesV2', JSON.stringify([value])), entries[0]);
  await page.reload();
  await expect(page.locator('.book-month-chart')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'A month in your own words.' })).toBeVisible();
  await expect(page.locator('.book-month-insights')).not.toContainText('/10');
});
