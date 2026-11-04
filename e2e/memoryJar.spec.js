import { expect, test } from '@playwright/test';
const key = 'moodJournalPrivateV1:local-browser:gameMemoryJar';
test.use({ timezoneId: 'America/New_York' });
const memories = (count, date = '2026-11-04') => Array.from({ length: count }, (_, index) => ({ id: `m-${date}-${index}`, text: `Good moment ${index + 1}`, dateKey: date, createdAt: `${date}T12:00:00Z` }));
async function seed(page, records, options = {}) {
  await page.addInitScript(({ records, key, options }) => {
    if (sessionStorage.getItem('jar-seeded')) return;
    localStorage.setItem(key, JSON.stringify(records));
    localStorage.setItem('siteTheme', options.theme || 'cafe'); localStorage.setItem('theme', options.mode || 'light');
    if (options.reduced) localStorage.setItem('reduceMotion', 'true');
    sessionStorage.setItem('jar-seeded', 'true');
  }, { records, key, options });
  await page.goto('/games/memory?month=2026-11');
  await expect(page.locator('.jar-composer')).toBeVisible();
}

test('numbered jars, undated records, history, selection and book links', async ({ page }) => {
  await seed(page, [...memories(49), { id: 'broken-date', text: 'Still kept', createdAt: 'bad' }], { reduced: true });
  await expect(page.getByText('Jar 3 of 3')).toBeVisible();
  await expect(page.locator('.jar-marble')).toHaveCount(1);
  await page.getByRole('button', { name: 'Previous jar' }).click();
  await expect(page).toHaveURL(/jar=2/); await expect(page.locator('.jar-marble')).toHaveCount(24);
  await page.getByRole('button', { name: 'Previous jar' }).click();
  await page.goBack(); await expect(page.getByText('Jar 2 of 3')).toBeVisible();
  await page.goForward(); await expect(page.getByText('Jar 1 of 3')).toBeVisible();
  await page.locator('.jar-marble').first().focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.jar-memory-detail')).toContainText('Good moment 1');
  await expect(page.getByRole('link', { name: 'Open monthly book' })).toHaveAttribute('href', '/journal/library?month=2026-11&day=2026-11-04');
  await page.keyboard.press('Escape'); await expect(page.locator('.jar-memory-detail')).toHaveCount(0);
  await page.getByLabel('Memory month').selectOption('undated');
  await expect(page.locator('.jar-marble')).toHaveCount(1);
  await page.locator('.jar-marble').click(); await expect(page.locator('.jar-memory-detail')).toContainText('Still kept');
  await expect(page.getByRole('link', { name: 'Open monthly book' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to Little breaks' }).click(); await expect(page).toHaveURL(/\/explore$/);
});

test('midnight saving uses the new day, then persists on reload and appears in the Library', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-05T04:59:00Z') });
  await seed(page, memories(1), { reduced: true });
  await page.getByLabel('A tiny good thing', { exact: true }).fill('Good moment 1');
  await expect(page.getByRole('button', { name: 'Add to jar' })).toBeDisabled();
  await page.clock.fastForward(65000);
  await expect(page.getByRole('button', { name: 'Add to jar' })).toBeEnabled();
  await page.getByRole('button', { name: 'Add to jar' }).click(); await expect(page.getByText('Saved to jar.', { exact: true })).toBeVisible();
  const records = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
  expect(records[1].dateKey).toBe('2026-11-05');
  await page.reload(); await expect(page.locator('.jar-marble')).toHaveCount(2);
  await page.locator('.jar-marble').last().click(); await page.getByRole('link', { name: 'Open monthly book' }).click();
  await expect(page.getByRole('region', { name: 'November journal book' })).toContainText('Good moment 1');
});

test('saving from an older month opens today; failed removal retains the complete memory', async ({ page }) => {
  await seed(page, memories(1, '2026-01-01'), { reduced: true });
  await page.getByLabel('Memory month').selectOption('2026-01');
  await page.getByLabel('A tiny good thing', { exact: true }).fill('A new moment');
  await page.getByRole('button', { name: 'Add to jar' }).click(); await expect(page.getByText('Saved to jar.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Memory month')).not.toHaveValue('2026-01');
  await page.locator('.jar-marble').last().click();
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key.includes('gameMemoryJar')) throw new Error('Disk full'); return window.originalSetItem.call(this, key, value); };
  });
  page.once('dialog', (dialog) => dialog.accept()); await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Disk full'); await expect(page.locator('.jar-memory-detail')).toContainText('A new moment');
  await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
  page.once('dialog', (dialog) => dialog.dismiss()); await page.getByRole('button', { name: 'Remove', exact: true }).click(); await expect(page.locator('.jar-marble')).toHaveCount(1);
  page.once('dialog', (dialog) => dialog.accept()); await page.getByRole('button', { name: 'Remove', exact: true }).click(); await expect(page.locator('.jar-marble')).toHaveCount(0);
});

test('read errors have Retry and never present damaged data as an empty jar', async ({ page }) => {
  await seed(page, []);
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), key); await page.reload();
  await expect(page.getByRole('alert')).toBeVisible(); await expect(page.locator('.jar-canvas')).toHaveCount(0);
  await page.evaluate((key) => localStorage.setItem(key, '[]'), key);
  await page.getByRole('button', { name: 'Retry', exact: true }).click(); await expect(page.locator('.jar-invitation')).toBeVisible();
});

test('an open default jar advances across a month boundary without copying old memories', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-02-01T04:59:00Z') });
  await seed(page, memories(1, '2026-01-31'), { reduced: true });
  await page.goto('/games/memory');
  await expect(page.getByLabel('Memory month')).toHaveValue('2026-01');
  await page.clock.fastForward(65000);
  await expect(page.getByLabel('Memory month')).toHaveValue('2026-02');
  await expect(page.locator('.jar-marble')).toHaveCount(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).length, key)).toBe(1);
});

test('unavailable physics keeps memories usable and warns before reloading unsaved writing', async ({ page }) => {
  await page.route('**/memoryJarPhysics*', (route) => route.abort());
  await seed(page, memories(2));
  await expect(page.getByRole('alert')).toContainText('Movement could not load');
  await page.locator('.jar-memory-list summary').click();
  await page.locator('.jar-memory-list button').first().click();
  await expect(page.locator('.jar-memory-detail')).toContainText('Good moment 1');
  await page.getByRole('button', { name: 'Close memory' }).click();
  await page.getByLabel('A tiny good thing', { exact: true }).fill('Not saved yet');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Reload page' }).click();
  await expect(page.getByLabel('A tiny good thing', { exact: true })).toHaveValue('Not saved yet');
  await page.unroute('**/memoryJarPhysics*');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Reload page' }).click();
  await expect(page.getByRole('button', { name: 'Shuffle', exact: true })).toBeEnabled();
});

test.describe('touch jar', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test('touch drag never opens a memory and rotation cancels its pointer capture', async ({ page }) => {
    await seed(page, memories(6), { reduced: true });
    const marble = page.locator('.jar-marble').first();
    await expect(page.getByRole('button', { name: 'Shuffle', exact: true })).toBeEnabled();
    await marble.evaluate((node) => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
    const beforeDrag = await marble.getAttribute('style');
    const box = await marble.boundingBox();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 10, y: box.y + 10 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + 60, y: box.y - 30 }] });
    await expect(marble).not.toHaveAttribute('style', beforeDrag);
    await page.setViewportSize({ width: 844, height: 390 });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.locator('.jar-memory-detail')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Shuffle', exact: true }).click();
    await marble.tap(); await expect(page.locator('.jar-memory-detail')).toBeVisible();
  });
});

test('motion settles, pauses for focus, drags without opening, resizes and never writes storage', async ({ page }) => {
  await seed(page, memories(24));
  await expect(page.locator('.jar-canvas')).toHaveAttribute('data-moving', 'false', { timeout: 15000 });
  const before = await page.evaluate((key) => localStorage.getItem(key), key);
  const marble = page.locator('.jar-marble').first();
  await marble.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.jar-canvas')).toHaveAttribute('data-moving', 'false');
  await page.getByRole('button', { name: 'Shuffle', exact: true }).click();
  await expect(page.locator('.jar-canvas')).toHaveAttribute('data-moving', 'true');
  await expect(page.locator('.jar-canvas')).toHaveAttribute('data-moving', 'false', { timeout: 15000 });
  const box = await marble.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y - 100, { steps: 15 }); await page.mouse.up();
  await expect(page.locator('.jar-memory-detail')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await marble.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await expect(page.locator('.jar-canvas')).toHaveAttribute('data-moving', 'false', { timeout: 15000 });
  const positions = await page.locator('.jar-marble').evaluateAll((nodes) => nodes.map((node) => [node.style.left, node.style.top]));
  await page.setViewportSize({ width: 844, height: 390 });
  expect(await page.locator('.jar-marble').evaluateAll((nodes) => nodes.map((node) => [node.style.left, node.style.top]))).toEqual(positions);
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(before);
  await page.goto('/explore'); await expect(page.locator('.jar-canvas')).toHaveCount(0);
});

for (const preference of ['system', 'app']) test(`${preference} reduced motion settles immediately and Shuffle stays static`, async ({ page }) => {
  if (preference === 'system') await page.emulateMedia({ reducedMotion: 'reduce' });
  await seed(page, memories(24), { reduced: preference === 'app' });
  await page.getByRole('button', { name: 'Shuffle', exact: true }).click();
  await expect(page.locator('.jar-canvas')).toHaveAttribute('data-moving', 'false');
  await page.locator('.jar-memory-list summary').click();
  await expect(page.locator('.jar-memory-list li')).toHaveCount(24);
});

test('owner changes and a new storage session clear previews, drafts and pending reads', async ({ page }) => {
  await page.goto('/e2e/fixtures/memory-jar.html');
  await page.evaluate(() => localStorage.setItem('moodJournalPrivateV1:jar-owner-a:gameMemoryJar', JSON.stringify([{ id: 'private-a', text: 'Only account A', dateKey: '2026-11-04' }])));
  await page.reload(); await page.locator('.jar-marble').click();
  await page.getByLabel('A tiny good thing', { exact: true }).fill('Private unfinished text');
  await page.getByRole('button', { name: 'Owner B', exact: true }).click();
  await expect(page.locator('.jar-marble')).toHaveCount(0);
  await expect(page.getByLabel('A tiny good thing', { exact: true })).toHaveValue('');
  await expect(page.locator('body')).not.toContainText('Only account A');
  await page.evaluate(() => { window.holdJarRead = true; });
  await page.getByRole('button', { name: 'Owner A', exact: true }).click();
  await expect(page.getByText('Opening your memories...')).toBeVisible();
  await expect.poll(() => page.evaluate(() => typeof window.releaseJarRead)).toBe('function');
  await page.evaluate(() => { window.holdJarRead = false; });
  await page.getByRole('button', { name: 'Owner B', exact: true }).click();
  await page.evaluate(() => window.releaseJarRead());
  await expect(page.locator('.jar-marble')).toHaveCount(0);
  await page.getByLabel('A tiny good thing', { exact: true }).fill('Session draft');
  await page.getByRole('button', { name: 'New storage session', exact: true }).click();
  await expect(page.getByLabel('A tiny good thing', { exact: true })).toHaveValue('');
});

test('locking during pending reads discards results and simulation', async ({ page }) => {
  await page.goto('/e2e/fixtures/memory-jar.html');
  await page.evaluate(() => { window.holdJarRead = true; });
  await page.getByRole('button', { name: 'New storage session', exact: true }).click();
  await expect.poll(() => page.evaluate(() => typeof window.releaseJarRead)).toBe('function');
  await page.getByRole('button', { name: 'Toggle lock', exact: true }).click();
  await page.evaluate(() => window.releaseJarRead());
  await expect(page.locator('.memory-workspace')).toHaveCount(0);
  await expect(page.getByText('Journal locked', { exact: true })).toBeVisible();
});

test('an owner change cancels a pending mutation and clears its writing and result', async ({ page }) => {
  await page.goto('/e2e/fixtures/memory-jar.html');
  await page.getByLabel('A tiny good thing', { exact: true }).fill('A pending private memory');
  await page.evaluate(() => { window.holdJarWrite = true; });
  await page.getByRole('button', { name: 'Add to jar' }).click();
  await expect.poll(() => page.evaluate(() => typeof window.releaseJarWrite)).toBe('function');
  await page.getByRole('button', { name: 'Owner B', exact: true }).click();
  await page.evaluate(() => { window.holdJarWrite = false; window.releaseJarWrite(); });
  await expect(page.getByLabel('A tiny good thing', { exact: true })).toHaveValue('');
  await expect(page.locator('.jar-marble')).toHaveCount(0);
  await expect(page.getByText('Saved to jar.', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Owner A', exact: true }).click();
  await expect(page.locator('.jar-marble')).toHaveCount(0);
});

test('encrypted memories are gated, save as ciphertext, and clear on encryption lock', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const encryption = await import('/src/utils/journalEncryption.js');
    const { createPrivateStorage } = await import('/src/utils/privateStorage.js');
    const created = await encryption.createJournalEncryption('jar encryption test');
    localStorage.setItem(encryption.localEncryptedJournalKey, JSON.stringify({ version: 1, config: encryption.serializeEncryptionConfig(created.config), rows: [] }));
    const storage = createPrivateStorage({ ownerId: 'local-browser', encryptionEnabled: true, dataKey: created.dataKey });
    await storage.write('gameMemoryJar', [{ id: 'encrypted-memory', text: 'Private glass memory', dateKey: '2026-11-04' }]);
  });
  await page.goto('/games/memory?month=2026-11'); await expect(page.locator('.memory-workspace')).toHaveCount(0);
  await page.getByLabel('Journal passphrase', { exact: true }).fill('jar encryption test');
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await page.getByLabel('A tiny good thing', { exact: true }).fill('Another private memory');
  await page.getByRole('button', { name: 'Add to jar' }).click(); await expect(page.getByText('Saved to jar.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('Another private memory');
  await page.evaluate(() => dispatchEvent(new StorageEvent('storage', { key: 'journalEncryptionRevision', newValue: JSON.stringify({ ownerId: 'local-browser', nonce: 'jar-test-lock' }) })));
  await expect(page.locator('.memory-workspace')).toHaveCount(0);
  await expect(page.getByLabel('Journal passphrase', { exact: true })).toBeVisible();
});
