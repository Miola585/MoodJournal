import { expect, test } from '@playwright/test';

const passphrase = 'test-only journal passphrase';
const fixture = { id: 'encrypted-security-fixture', type: 'journal', specificFeeling: 'Private page', note: 'Private original writing', created: '2026-01-01T12:00:00.000Z', dateKey: '2026-01-01', intensity: 5, factors: [], tags: [], mood: '', primary: false };
const seed = async (page) => {
  await page.goto('/entries', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async ({ fixture, passphrase }) => {
    const encryption = await import('/src/utils/journalEncryption.js');
    const created = await encryption.createJournalEncryption(passphrase);
    const rows = await encryption.encryptEntriesToRows([fixture], 'local-browser', created.dataKey);
    localStorage.setItem(encryption.localEncryptedJournalKey, JSON.stringify({ version: 1, config: encryption.serializeEncryptionConfig(created.config), rows }));
  }, { fixture, passphrase });
  await page.reload({ waitUntil: 'domcontentloaded' });
};
const unlock = async (page) => {
  await page.getByLabel('Journal passphrase', { exact: true }).fill(passphrase);
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New free write', exact: true })).toBeVisible();
};

test('encrypted drafts are isolated by tab and a cross-tab lock preserves each draft', async ({ page, context }) => {
  await seed(page);
  await unlock(page);
  const second = await context.newPage();
  await second.goto('/entries', { waitUntil: 'domcontentloaded' });
  await unlock(second);
  for (const tab of [page, second]) await tab.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.locator('[contenteditable=true]').fill('Private draft from first tab');
  await second.locator('[contenteditable=true]').fill('Private draft from second tab');
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('moodJournalPrivateEncryptedV1:') && key.includes('journalDraft')).length)).toBe(2);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('Private draft');
  await page.evaluate(() => localStorage.setItem('journalEncryptionRevision', JSON.stringify({ ownerId: 'local-browser', nonce: crypto.randomUUID() })));
  await expect(second.getByRole('heading', { name: 'Unlock your journal', exact: true })).toBeVisible();
  await unlock(second);
  await second.getByRole('button', { name: 'Edit', exact: true }).click();
  await second.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(second.locator('[contenteditable=true]')).toContainText('Private draft from second tab');
  await expect(page.locator('[contenteditable=true]')).toContainText('Private draft from first tab');
});

test('damaged local encryption settings block writing without replacing stored data', async ({ page }) => {
  await page.goto('/entries', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('journalEncryptedStoreV1', '{damaged'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Unlock your journal', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('damaged');
  expect(await page.evaluate(() => localStorage.getItem('journalEncryptedStoreV1'))).toBe('{damaged');
  await expect(page.getByRole('button', { name: 'New free write', exact: true })).toHaveCount(0);
});
