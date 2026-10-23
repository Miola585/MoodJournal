import { expect, test } from '@playwright/test';

const entry = { id: 'security-fixture', type: 'journal', specificFeeling: 'Original', note: 'Original writing', created: '2026-01-01T12:00:00.000Z', dateKey: '2026-01-01', intensity: 5, factors: [], tags: [], mood: '', primary: false };
const readEntries = (page) => page.evaluate(() => {
  const value = JSON.parse(localStorage.getItem('journalEntriesV2'));
  return Array.isArray(value) ? value : value.entries;
});

test('two tabs preserve newer writing and can save a conflicting draft separately', async ({ context, page }, testInfo) => {
  await page.goto('/entries', { waitUntil: 'domcontentloaded' });
  await page.evaluate((value) => localStorage.setItem('journalEntriesV2', JSON.stringify([value])), entry);
  await page.reload({ waitUntil: 'domcontentloaded' });
  const second = await context.newPage();
  await second.goto('/entries', { waitUntil: 'domcontentloaded' });
  for (const tab of [page, second]) {
    await tab.getByRole('button', { name: 'Edit', exact: true }).click();
  }
  await page.locator('[contenteditable="true"]').fill('Newer writing in first tab');
  await second.locator('[contenteditable="true"]').fill('My unsaved second-tab writing');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect.poll(async () => (await readEntries(page))[0].note).toContain('Newer writing');
  await second.getByRole('button', { name: 'Save changes', exact: true }).click();
  const dialog = second.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Review latest' }).click();
  await expect(dialog).toContainText('Newer writing in first tab');
  await second.setViewportSize({ width: 390, height: 844 });
  await second.screenshot({ path: testInfo.outputPath('conflict-mobile.png') });
  expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await dialog.getByRole('button', { name: 'Save as separate entry' }).click();
  await expect(dialog).toHaveCount(0);
  const saved = await readEntries(second);
  expect(saved).toHaveLength(2);
  expect(saved.find((item) => item.id === entry.id).note).toContain('Newer writing');
  expect(saved.find((item) => item.id !== entry.id).note).toContain('second-tab writing');
});

test('empty backup is parsed but cannot replace a local journal', async ({ page }) => {
  await page.goto('/settings');
  await page.locator('input[type=file]').setInputFiles({ name: 'empty.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ journalEntriesV2: [] })) });
  await expect(page.getByText(/An empty backup cannot replace/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Replace journal/ })).toBeDisabled();
});

test('local browser without Web Locks explains blocked saves and keeps writing', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true }));
  await page.goto('/entries');
  await page.getByRole('button', { name: 'New free write', exact: true }).click();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Unsaved page');
  await page.locator('[contenteditable="true"]').fill('Keep this unsaved writing');
  await page.getByRole('button', { name: 'Save page', exact: true }).click();
  await expect(page.getByText(/cannot safely coordinate journal saves/)).toBeVisible();
  await expect(page.locator('[contenteditable="true"]')).toContainText('Keep this unsaved writing');
});
