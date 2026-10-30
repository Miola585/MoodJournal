import { expect, test } from '@playwright/test';

const key = (name) => `moodJournalPrivateV1:local-browser:${encodeURIComponent(name)}`;
const connect = async (page) => {
  await page.getByRole('button', { name: 'Star 1', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Star 2', exact: true }).press('Enter');
};

for (const width of [1280, 390]) {
  test(`constellation archive route shows hand-drawn saves at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/games/constellation');
    await connect(page);
    await page.getByPlaceholder('Name your constellation').fill('My first sky');
    await page.getByRole('button', { name: 'Finish constellation' }).click();
    await expect(page.locator('.game-success-card')).toBeVisible();
    await expect(page.locator('.game-success-card .mini-sky img')).toHaveCount(2);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.getByRole('button', { name: 'Back to games' }).click();
    if (width < 600) await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('button', { name: 'Game Archive', exact: true }).click();
    await expect(page).toHaveURL(/\/game-archive$/);
    const archive = page.getByRole('region', { name: 'Constellation archive', exact: true });
    await expect(archive.locator('.archive-sky img')).toHaveCount(2);
    await expect(archive.locator('.archive-sky line')).toHaveCount(1);
    await expect(archive.getByRole('heading', { name: 'My first sky' })).toBeVisible();
    await expect.poll(() => archive.locator('img').evaluateAll((images) => images.every((img) => img.complete && img.naturalWidth > 0))).toBe(true);
    expect(await archive.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`archive-constellation-${width}.png`) });
    await page.reload();
    await expect(archive.getByRole('heading', { name: 'My first sky' })).toBeVisible();
    await page.getByRole('link', { name: 'Mood Orbit', exact: true }).click();
    await expect(page).toHaveURL(/game=orbit/);
    await expect(page.getByText('No saved orbits yet.')).toBeVisible();
    await page.goBack();
    await expect(archive.getByRole('heading', { name: 'My first sky' })).toBeVisible();
  });
}

test('orbit archive preserves old dates and two different same-day arrangements', async ({ page }, testInfo) => {
  await page.goto('/games/orbit');
  await page.evaluate((storageKey) => localStorage.setItem(storageKey, JSON.stringify({ planets: [], reflection: 'An older day' })), key('moodOrbit:2026-01-01'));
  await page.getByRole('button', { name: 'Reflect', exact: true }).click();
  await page.getByLabel('Anything you would like to remember?').fill('First arrangement');
  await page.getByRole('button', { name: 'Save orbit and reflection' }).click();
  await expect(page.locator('.orbit-message')).toContainText('Saved');
  await page.getByRole('button', { name: 'Move Emotions planet' }).press('3');
  await page.getByRole('button', { name: 'Reflect', exact: true }).click();
  await page.getByLabel('Anything you would like to remember?').fill('Second arrangement');
  await page.getByRole('button', { name: 'Save orbit and reflection' }).click();
  await expect(page.locator('.orbit-message')).toContainText('Saved');
  await page.goto('/game-archive?game=orbit');
  const archive = page.getByRole('region', { name: 'Mood Orbit archive' });
  await expect(archive.locator('.game-archive-item')).toHaveCount(3);
  await expect(archive.locator('.game-archive-day')).toHaveCount(2);
  await expect(archive.locator('.game-archive-detail')).toContainText('Second arrangement');
  await expect(archive.locator('.archive-orbit img')).toHaveCount(7);
  await archive.locator('.game-archive-item').nth(1).click();
  await expect(archive.locator('.game-archive-detail')).toContainText('First arrangement');
  await expect(archive.locator('.archive-orbit-distances > div').first()).toContainText('Emotions');
  await page.screenshot({ path: testInfo.outputPath('archive-orbit.png') });
  await archive.getByLabel('Search archive').fill('older');
  await expect(archive.locator('.game-archive-item')).toHaveCount(1);
  await expect(archive.locator('.game-archive-detail')).toContainText('An older day');
});

test('memory archive keeps older memories beyond the visible jar capacity', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/games/memory');
  await page.evaluate((storageKey) => localStorage.setItem(storageKey, JSON.stringify(Array.from({ length: 24 }, (_, index) => ({ id: `memory-${index}`, text: `Older moment ${index}`, createdAt: '2026-01-01T12:00:00Z' })))), key('gameMemoryJar'));
  await page.reload();
  await page.getByPlaceholder('A tiny good thing from today...').fill('A new little moment');
  await page.getByRole('button', { name: 'Add to jar' }).click();
  await expect(page.getByText('Saved to jar.', { exact: true })).toBeVisible();
  await page.goto('/game-archive?game=memory');
  const archive = page.getByRole('region', { name: 'Memory Jar archive' });
  await expect(archive.getByRole('status')).toContainText('25 saved moments');
  await archive.getByLabel('Search archive').fill('Older moment 23');
  await expect(archive.locator('.game-archive-writing')).toHaveText('Older moment 23');
  expect(await archive.locator('.archive-memory-art').evaluate((node) => {
    const art = node.getBoundingClientRect();
    const detail = node.closest('.game-archive-detail').getBoundingClientRect();
    return art.top >= detail.top && art.bottom <= detail.bottom;
  })).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('archive-memory-mobile.png') });
  await page.goto('/games/memory');
  await expect(page.locator('.memory-marble')).toHaveCount(24);
});

test('the same memory can be saved again on another local day without changing its archive record', async ({ page }) => {
  await page.goto('/games/memory', { waitUntil: 'domcontentloaded' });
  const yesterday = await page.evaluate(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString();
  });
  await page.evaluate(({ storageKey, createdAt }) => {
    localStorage.setItem(storageKey, JSON.stringify([
      { id: 'older-walk', text: 'Grateful for a walk', createdAt }
    ]));
  }, { storageKey: key('gameMemoryJar'), createdAt: yesterday });
  await page.reload();
  await page.getByPlaceholder('A tiny good thing from today...').fill('Grateful for a walk');
  await expect(page.getByRole('button', { name: 'Add to jar' })).toBeEnabled();
  await page.getByRole('button', { name: 'Add to jar' }).click();
  await expect(page.getByText('Saved to jar.', { exact: true })).toBeVisible();
  const saved = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)), key('gameMemoryJar'));
  expect(saved).toHaveLength(2);
  expect(saved.find((entry) => entry.id === 'older-walk')).toMatchObject({ text: 'Grateful for a walk', createdAt: yesterday });
  await page.goto('/game-archive?game=memory', { waitUntil: 'domcontentloaded' });
  const archive = page.getByRole('region', { name: 'Memory Jar archive' });
  await expect(archive.getByRole('status')).toContainText('2 saved moments');
  await expect(archive.locator('.game-archive-item')).toHaveCount(2);
});

test('the same-day memory check remains case-insensitive', async ({ page }) => {
  await page.goto('/games/memory', { waitUntil: 'domcontentloaded' });
  await page.evaluate((storageKey) => {
    localStorage.setItem(storageKey, JSON.stringify([
      { id: 'todays-walk', text: 'Grateful for a walk', createdAt: new Date().toISOString() }
    ]));
  }, key('gameMemoryJar'));
  await page.reload();
  await page.getByPlaceholder('A tiny good thing from today...').fill('gRaTeFuL fOr A wAlK');
  await expect(page.getByRole('button', { name: 'Add to jar' })).toBeDisabled();
  await expect(page.getByText('You already saved this memory today.')).toBeVisible();
  const saved = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)), key('gameMemoryJar'));
  expect(saved).toHaveLength(1);
});

test('failed memory saves retain the text and never claim success', async ({ page }) => {
  await page.goto('/games/memory');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.includes('gameMemoryJar')) throw new Error('Storage is full');
      return original.call(this, key, value);
    };
  });
  await page.getByPlaceholder('A tiny good thing from today...').fill('Keep my unsaved memory');
  await page.getByRole('button', { name: 'Add to jar' }).click();
  await expect(page.getByRole('alert')).toContainText('Storage is full');
  await expect(page.getByPlaceholder('A tiny good thing from today...')).toHaveValue('Keep my unsaved memory');
  await expect(page.getByText('Saved to jar.', { exact: true })).toHaveCount(0);
});

test('archives show empty and read-error states with a working retry', async ({ page }) => {
  await page.goto('/game-archive?game=memory');
  const archive = page.getByRole('region', { name: 'Memory Jar archive' });
  await expect(archive).toContainText('No saved memories yet.');
  await page.evaluate((storageKey) => localStorage.setItem(storageKey, '{broken'), key('gameMemoryJar'));
  await page.reload();
  await expect(archive.getByRole('alert')).toContainText('damaged');
  await page.evaluate((storageKey) => localStorage.setItem(storageKey, '[]'), key('gameMemoryJar'));
  await archive.getByRole('button', { name: 'Try again' }).click();
  await expect(archive).toContainText('No saved memories yet.');
});

test('the archive route respects the journal privacy lock', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((storageKey) => {
    localStorage.setItem('journalPrivacyCode', '1234');
    localStorage.setItem(storageKey, JSON.stringify([
      { id: 'private-memory', text: 'A private little moment', createdAt: '2026-01-01T12:00:00Z' },
    ]));
  }, key('gameMemoryJar'));
  await page.goto('/game-archive?game=memory');
  await expect(page.getByRole('heading', { name: 'Journal Locked' })).toBeVisible();
  await expect(page.getByText('A private little moment')).toHaveCount(0);
  await page.getByLabel('Passphrase or PIN').fill('1234');
  await page.getByRole('button', { name: 'Reveal journal' }).click();
  await expect(page.locator('.game-archive-writing')).toHaveText('A private little moment');
});
