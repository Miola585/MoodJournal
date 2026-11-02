import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const code = 'private cover test';
const secret = 'PRIVATE JOURNAL CONTENT - never show while hidden';
const fixture = { id: 'privacy-fixture', type: 'journal', specificFeeling: 'PRIVATE TITLE', note: secret, created: '2026-11-01T12:00:00.000Z', dateKey: '2026-11-01', intensity: 5, factors: [], tags: [], mood: '', primary: false };

async function seed(page, encrypted = false) {
  await page.goto('/settings');
  await page.evaluate(async ({ fixture, code, encrypted }) => {
    localStorage.setItem('journalPrivacyCode', code);
    if (encrypted) {
      const encryption = await import('/src/utils/journalEncryption.js');
      const created = await encryption.createJournalEncryption('test encryption passphrase');
      const rows = await encryption.encryptEntriesToRows([fixture], 'local-browser', created.dataKey);
      localStorage.setItem(encryption.localEncryptedJournalKey, JSON.stringify({ version: 1, config: encryption.serializeEncryptionConfig(created.config), rows }));
    } else localStorage.setItem('journalEntriesV2', JSON.stringify([fixture]));
  }, { fixture, code, encrypted });
  await page.reload();
  if (encrypted) {
    await page.getByLabel('Journal passphrase', { exact: true }).fill('test encryption passphrase');
    await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  }
  await expect(page.locator('.settings-screen')).toBeVisible();
}

async function unlock(scope, value = code) {
  await scope.getByLabel('Passphrase or PIN', { exact: true }).fill(value);
  await scope.getByRole('button', { name: 'Reveal journal', exact: true }).click();
}

async function settings(page) {
  if (await page.getByRole('button', { name: 'Profile menu', exact: true }).count()) {
    await page.getByRole('button', { name: 'Profile menu', exact: true }).click();
    await page.getByRole('navigation', { name: 'Account and help' }).getByRole('button', { name: 'Privacy', exact: true }).click();
  } else await page.getByRole('button', { name: 'Settings', exact: true }).click();
}

for (const width of [390, 1440]) {
  test(`hidden journal has no Home, entry, or draft previews at ${width}px`, async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height: 900 });
    await seed(page);
    for (const route of ['/', '/journal/library', '/journal/library?month=2026-11', '/journal/library?view=constellations', '/checkin', '/activities', '/activities?tool=senses', '/activities?tool=scavenger', '/activities?tool=breathing', '/entries?entry=privacy-fixture', '/calendar', '/summary', '/games', '/games/night-sky']) {
      await page.goto(route);
      await expect(page.getByRole('heading', { name: 'Journal Locked', exact: true })).toBeVisible();
      await expect(page.locator('body')).not.toContainText(secret);
      await expect(page.locator('body')).not.toContainText('PRIVATE TITLE');
      await expect(page.locator('[contenteditable=true], .activity-journal-sheet, .memory-jar-illustration')).toHaveCount(0);
      await expect(page.locator('.personal-night-sky')).toHaveCount(0);
      await expect(page.locator('.pause-note, .wonders-page')).toHaveCount(0);
    }
  });
}

for (const encrypted of [false, true]) {
  test(`settings block export, import and protection changes while hidden (encrypted=${encrypted})`, async ({ page }, info) => {
    await page.setViewportSize({ width: encrypted ? 390 : 1440, height: 900 });
    await seed(page, encrypted);
    const downloads = [];
    page.on('download', (download) => downloads.push(download));
    await expect(page.getByRole('button', { name: /^Export (journal|data)$/ })).toHaveCount(0);
    await expect(page.locator('input[type=file]')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(secret);
    await unlock(page, 'wrong code');
    await expect(page.getByText('That passphrase or PIN did not match.')).toBeVisible();
    expect(downloads).toHaveLength(0);
    await page.getByRole('button', { name: /^(Manage|Learn more): Stored-entry encryption$/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Journal Locked', exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /^(Change passphrase|Turn on encryption)$/ })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('locked-encryption-dialog.png'), fullPage: true });
    await dialog.getByRole('button', { name: 'Done', exact: true }).click();
    await page.screenshot({ path: info.outputPath('locked-settings.png'), fullPage: true });
    await unlock(page);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /^Export (journal|data)$/ }).click();
    const download = await downloadPromise;
    const data = JSON.parse(await readFile(await download.path(), 'utf8'));
    expect(data.journalEntriesV2[0].note).toBe(secret);
    await expect(page.locator('input[type=file]')).toHaveCount(1);
  });
}

test('lock removal, replacement and reveal require the existing code', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Manage: Journal lock', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Remove lock', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('The current journal code did not match.');
  await dialog.getByLabel('Current journal code').fill('wrong code');
  await dialog.getByLabel('Journal lock', { exact: true }).fill('replacement code');
  await dialog.getByRole('button', { name: 'Update lock', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('The current journal code did not match.');
  await dialog.getByRole('button', { name: 'Reveal journal', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('The current journal code did not match.');
  expect(await page.evaluate(() => localStorage.getItem('journalPrivacyCode'))).toBe(code);
  await dialog.getByLabel('Current journal code').fill(code);
  await dialog.getByRole('button', { name: 'Update lock', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('journalPrivacyCode'))).toBe('replacement code');
  await expect(page.getByRole('button', { name: /^Export (journal|data)$/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Manage: Journal lock', exact: true }).click();
  await expect(dialog.getByLabel('Current journal code')).toHaveValue('');
  await dialog.getByLabel('Current journal code').fill(code);
  await dialog.getByRole('button', { name: 'Remove lock', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await dialog.getByLabel('Current journal code').fill('replacement code');
  await dialog.getByRole('button', { name: 'Remove lock', exact: true }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('journalPrivacyCode'))).toBeNull();
  await expect(page.getByRole('button', { name: /^Export (journal|data)$/ })).toBeVisible();
});

test('unlocking restores normal editing and Hide now clears previous verification', async ({ page }) => {
  await seed(page);
  await page.goto('/entries');
  await unlock(page);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.locator('[contenteditable=true]').fill('Verified writing after unlock');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect.poll(() => page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('journalEntriesV2'));
    return (Array.isArray(stored) ? stored : stored.entries).find(entry => entry.id === 'privacy-fixture')?.note;
  })).toBe('Verified writing after unlock');
  await settings(page);
  await page.getByRole('button', { name: 'Manage: Journal lock', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Remove lock', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await dialog.getByRole('button', { name: 'Hide now', exact: true }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByLabel('Passphrase or PIN', { exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: /^Export (journal|data)$/ })).toHaveCount(0);
  await page.locator('button.brand').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.settings-screen')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Journal Locked', exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Verified writing after unlock');
  await unlock(page);
  await expect(page.getByRole('heading', { name: 'Journal Locked', exact: true })).toHaveCount(0);
});

test('hiding cancels a pending backup read and drops its private preview', async ({ page }) => {
  await seed(page);
  await unlock(page);
  await page.evaluate(() => {
    const read = FileReader.prototype.readAsText;
    FileReader.prototype.readAsText = function (...args) { window.finishBackupRead = () => read.apply(this, args); };
  });
  await page.locator('input[type=file]').setInputFiles({ name: 'PRIVATE BACKUP NAME.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ journalEntriesV2: [{ ...fixture, id: 'imported-private-entry' }] })) });
  await page.getByRole('button', { name: 'Manage: Journal lock', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Hide now', exact: true }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await page.evaluate(() => window.finishBackupRead());
  await expect(page.locator('.import-preview')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('PRIVATE BACKUP NAME');
  await unlock(page);
  await expect(page.locator('.import-preview')).toHaveCount(0);
  await page.locator('input[type=file]').setInputFiles({ name: 'fresh.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ journalEntriesV2: [fixture] })) });
  await page.evaluate(() => window.finishBackupRead());
  await expect(page.locator('.import-preview')).toBeVisible();
});
