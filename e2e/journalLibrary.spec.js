import { expect, test } from '@playwright/test';
import { libraryEntries, libraryData, seedLibrary } from './helpers/libraryFixture.js';

test.use({ timezoneId: 'America/New_York' });
async function seed(page) {
  await page.goto('/');
  await page.evaluate(seedLibrary, { entries: libraryEntries, data: libraryData });
  await page.goto('/journal/library');
  await expect(page.getByText('Gathering your saved days...')).toHaveCount(0);
}
const book = (page) => page.getByRole('region', { name: 'October journal book' });

test('shelf, direct links, contents and history use real saved days', async ({ page }) => {
  await seed(page);
  await expect(page.locator('.month-volume')).toHaveCount(3);
  await page.locator('.month-volume').filter({ hasText: 'October 2026' }).click();
  await expect(book(page)).toContainText('The long way home');
  await expect(book(page).locator('.rich-note-content strong')).toHaveText('The light was different today.');
  await expect(book(page).getByRole('img', { name: 'Pumpkin', exact: true })).toBeVisible();
  await expect(book(page).locator('.bound-entry')).toHaveCount(2);
  await expect(book(page)).toContainText('intensity 7');
  const noteSizing = await book(page).evaluate((element) => ({
    note: parseFloat(getComputedStyle(element.querySelector('.book-margin-note')).fontSize),
    writing: parseFloat(getComputedStyle(element.querySelector('.rich-note-content')).fontSize),
    columns: getComputedStyle(element.querySelector('.book-keepsake-content')).gridTemplateColumns.split(' ').length
  }));
  expect(noteSizing.note).toBeLessThan(noteSizing.writing);
  expect(noteSizing.columns).toBe(2);
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Days in this book' }).getByRole('button')).toHaveCount(2);
  await page.getByRole('button', { name: /Oct 17 An open window/ }).click();
  await expect(page).toHaveURL(/day=2026-10-17/);
  await expect(book(page)).toContainText('3 small wonders');
  await page.goBack();
  await expect(book(page)).toContainText('The long way home');
  await page.goForward();
  await expect(book(page)).toContainText('An open window');
  await page.reload();
  await expect(book(page)).toContainText('An open window');
  await page.goto('/journal/library?month=2026-10&day=2026-10-99');
  await expect(book(page)).toContainText('The long way home');
});

test('gallery opens a dated book and empty current month invites writing', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: /Constellations/ }).click();
  await expect(page).toHaveURL(/view=constellations/);
  const decal = page.locator('.kept-sky-card .constellation-decal').first();
  const frame = await decal.evaluate((element) => {
    const bounds = element.viewBox.baseVal;
    const art = element.getBBox();
    return { width: art.width / bounds.width, height: art.height / bounds.height };
  });
  expect(Math.max(frame.width, frame.height)).toBeGreaterThan(.75);
  await page.getByRole('button', { name: /The way back/ }).click();
  await expect(page).toHaveURL(/month=2026-10&day=2026-10-03/);
  await page.getByRole('button', { name: 'Back to your library' }).click();
  await page.locator('.month-volume').first().click();
  await expect(page.getByRole('heading', { name: 'This chapter is still yours to write.' })).toBeVisible();
});

test('writing a dated page returns to the book and saved changes are live', async ({ page }) => {
  await seed(page);
  await page.goto('/journal/library?month=2026-09&day=2026-09-12');
  await page.getByRole('link', { name: 'Write for this day' }).click();
  await expect(page.locator('input[type=date]')).toHaveValue('2026-09-12');
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('A dated page');
  await page.locator('.tiptap').fill('A newly saved library page.');
  await page.getByRole('button', { name: 'Save page', exact: true }).click();
  await expect(page).toHaveURL(/journal\/library\?month=2026-09/);
  await expect(page.locator('.bound-entry')).toContainText('A newly saved library page.');
  await expect(page.locator('.book-writing-leaf .book-entry-kind')).toHaveText('Free write');
  await page.getByRole('link', { name: 'Open this entry' }).click();
  await expect(page).toHaveURL(/entries\?entry=/);
  await expect(page.locator('.entry-card-open')).toContainText('A newly saved library page.');
});

for (const width of [320, 820, 1440]) {
  test(`free writes, taped check-ins and their stickers share the writing page at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await seed(page);
    await page.goto('/journal/library?month=2026-10&day=2026-10-03');
    const writing = page.locator('.book-writing-leaf');
    const freeWrite = writing.locator('.bound-entry:not(.bound-checkin)');
    const checkIn = writing.locator('.bound-checkin');
    await expect(freeWrite).toContainText('Free write');
    await expect(freeWrite).toHaveClass(/bound-freewrite/);
    expect(await freeWrite.locator('.rich-note-content').evaluate((element) => getComputedStyle(element).backgroundImage)).toContain('repeating-linear-gradient');
    expect(await freeWrite.evaluate((element) => getComputedStyle(element).borderLeftStyle)).toBe('solid');
    expect(await checkIn.locator('.rich-note-content').evaluate((element) => getComputedStyle(element).backgroundImage)).toBe('none');
    await expect(freeWrite.locator('.rich-note-content strong')).toHaveText('The light was different today.');
    await expect(freeWrite.getByRole('img', { name: 'Pumpkin', exact: true })).toBeVisible();
    await expect(checkIn).toContainText('Daily check-in');
    await expect(checkIn).toContainText('A quiet afternoon with a friend.');
    await expect(checkIn).toContainText('intensity 7');
    expect(await checkIn.evaluate((element) => getComputedStyle(element, '::before').content)).toBe('""');
    await expect(page.locator('.book-keepsake-leaf .book-original-stickers')).toHaveCount(0);
    await expect(page.locator('.book-keepsake-leaf')).toContainText('My shoulders felt softer.');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`writing-and-checkin-${width}.png`), fullPage: true });
  });
}

test('recovered in-memory draft wins over a requested date and navigation still warns', async ({ page }) => {
  await seed(page);
  await page.goto('/journal/write?date=2026-10-03');
  await page.locator('.tiptap').fill('Keep this unfinished draft.');
  const menu = page.getByRole('navigation', { name: 'Main destinations', exact: true });
  await menu.getByRole('button', { name: 'My journal' }).click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await menu.getByRole('button', { name: 'Library', exact: true }).click();
  await expect(page.locator('.tiptap')).toContainText('Keep this unfinished draft.');
  await menu.getByRole('button', { name: 'My journal' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await menu.getByRole('button', { name: 'Library', exact: true }).click();
  await page.locator('.month-volume').filter({ hasText: 'September 2026' }).click();
  await page.getByRole('link', { name: 'Write for this day' }).click();
  await expect(page.locator('.tiptap')).toContainText('Keep this unfinished draft.');
  await expect(page.locator('input[type=date]')).toHaveValue('2026-10-03');
});

test('partial source errors preserve readable pages and retry does not claim empty history', async ({ page }) => {
  await seed(page);
  await page.evaluate(() => localStorage.setItem('moodJournalPrivateV1:local-browser:gameConstellations', '{broken'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Constellations');
  await page.locator('.month-volume').filter({ hasText: 'October 2026' }).click();
  await expect(book(page)).toContainText('My shoulders felt softer.');
  await page.evaluate((skies) => localStorage.setItem('moodJournalPrivateV1:local-browser:gameConstellations', JSON.stringify(skies)), libraryData.gameConstellations);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('.library-load-warning')).toHaveCount(0);
  await expect(book(page)).toContainText('The way back');
});

test('page turns have direction, reject rapid input and respect reduced motion', async ({ page }) => {
  await seed(page);
  await page.goto('/journal/library?month=2026-10');
  await book(page).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.turn-next')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/day=2026-10-17/);
  await expect(page.locator('.book-turn-sheet')).toHaveCount(0);
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.turn-previous')).toBeVisible();
  await expect(page).toHaveURL(/day=2026-10-03/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Next day' }).click();
  await expect(page).toHaveURL(/day=2026-10-17/);
  await expect(page.locator('.book-turn-sheet')).toHaveCount(0);
});

test('page sound starts off and audio failure never blocks reading', async ({ page }) => {
  await seed(page);
  await page.goto('/journal/library?month=2026-10');
  await expect(page.getByRole('button', { name: 'Page sound off' })).toHaveAttribute('aria-pressed', 'false');
  await page.evaluate(() => { window.AudioContext = class { constructor() { throw new Error('Unavailable'); } }; });
  await page.getByRole('button', { name: 'Page sound off' }).click();
  await page.getByRole('button', { name: 'Next day' }).click();
  await expect(page).toHaveURL(/day=2026-10-17/);
  await expect(page.getByText('Page sound is unavailable. You can keep reading.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Page sound off' })).toBeVisible();
});

test('mobile swipes distinguish scrolling and selection, and pages never become nested scrollers', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await seed(page);
  await page.goto('/journal/library?month=2026-10');
  await touch(page, 'touchstart', 260, 400);
  await touch(page, 'touchmove', 150, 500);
  await touch(page, 'touchend', 120, 500);
  await expect(page).not.toHaveURL(/day=2026-10-17/);
  await touch(page, 'touchstart', 260, 400);
  await touch(page, 'touchend', 120, 405);
  await expect(page).toHaveURL(/day=2026-10-17/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('.book-page-content').evaluate((el) => getComputedStyle(el).overflowY)).toBe('visible');
});

async function touch(page, type, x, y) {
  await book(page).evaluate((element, { type, x, y }) => {
    const touch = new Touch({ identifier: 1, target: element, clientX: x, clientY: y });
    element.dispatchEvent(new TouchEvent(type, { bubbles: true, touches: type === 'touchend' ? [] : [touch], changedTouches: [touch] }));
  }, { type, x, y });
}

test('constellation save dialog links to faithful geometry, and failed saving retains work', async ({ page }) => {
  await page.goto('/games/constellation');
  await page.getByRole('button', { name: 'Star 1', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Star 2', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByPlaceholder('Name your constellation').fill('A new path');
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key.includes('gameConstellations')) throw new Error('Disk full'); return window.originalSetItem.call(this, key, value); };
  });
  await page.getByRole('button', { name: 'Finish constellation' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByPlaceholder('Name your constellation')).toHaveValue('A new path');
  await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
  await page.getByRole('button', { name: 'Finish constellation' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('link', { name: 'Open monthly book' }).click();
  await expect(page.locator('.book-sky-sticker')).toContainText('A new path');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('moodJournalPrivateV1:local-browser:gameConstellations'))[0]);
  expect(saved.aspectRatio).toBeGreaterThan(0);
  expect(saved.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const line = page.locator('.book-sky-sticker svg line').first();
  const [from, to] = saved.connections[0].map((id) => saved.starPositions.find((star) => star.id === id));
  await expect(line).toHaveAttribute('x1', String(from.x));
  await expect(line).toHaveAttribute('y1', String(from.y / saved.aspectRatio));
  await expect(line).toHaveAttribute('x2', String(to.x));
  await expect(line).toHaveAttribute('y2', String(to.y / saved.aspectRatio));
});

for (const pending of [false, true]) test(`encryption lock clears the library during ${pending ? 'pending reads' : 'page turns'}`, async ({ page }) => {
  await seed(page);
  await page.evaluate(async (data) => {
    const encryption = await import('/src/utils/journalEncryption.js');
    const { createPrivateStorage } = await import('/src/utils/privateStorage.js');
    const created = await encryption.createJournalEncryption('library encryption test');
    const entries = JSON.parse(localStorage.getItem('journalEntriesV2'));
    const rows = await encryption.encryptEntriesToRows(entries, 'local-browser', created.dataKey);
    localStorage.setItem(encryption.localEncryptedJournalKey, JSON.stringify({ version: 1, config: encryption.serializeEncryptionConfig(created.config), rows }));
    localStorage.removeItem('journalEntriesV2');
    const storage = createPrivateStorage({ ownerId: 'local-browser', encryptionEnabled: true, dataKey: created.dataKey });
    for (const [key, value] of Object.entries(data)) await storage.write(key, value);
  }, libraryData);
  if (pending) await page.route('**/src/utils/journalLibrary.js*', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace('const items = [];', 'await new Promise(resolve => { window.releaseLibraryRead = resolve; }); const items = [];');
    await route.fulfill({ response, body });
  });
  await page.goto('/journal/library?month=2026-10');
  await expect(page.locator('.journal-library')).toHaveCount(0);
  await page.getByLabel('Journal passphrase', { exact: true }).fill('library encryption test');
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  if (pending) await expect(page.getByText('Gathering your saved days...')).toBeVisible();
  else {
    await expect(page.locator('.book-sky-sticker')).toBeVisible();
    await page.getByRole('button', { name: 'Next day' }).click();
    await expect(page.locator('.book-turn-sheet')).toBeVisible();
  }
  await page.evaluate(() => dispatchEvent(new StorageEvent('storage', { key: 'journalEncryptionRevision', newValue: JSON.stringify({ ownerId: 'local-browser', nonce: 'test-library-lock' }) })));
  await expect(page.locator('.journal-library')).toHaveCount(0);
  if (pending) await page.evaluate(() => window.releaseLibraryRead());
  await page.waitForTimeout(850);
  await expect(page.locator('.book-turn-sheet, .sky-decal')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('The long way home');
  await expect(page.getByLabel('Journal passphrase', { exact: true })).toBeVisible();
});
