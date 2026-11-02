import { expect, test } from '@playwright/test';

test('Small wonders keeps its progress and earlier finds, and completes one prompt at a time', async ({ page }) => {
  await page.addInitScript(() => {
    const today = new Date().toLocaleDateString('en-CA');
    localStorage.setItem(`groundingHunt:${today}`, JSON.stringify(['A previous texture']));
  });
  await page.goto('/activities?tool=scavenger');
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await page.getByText('Earlier finds today (1)').click();
  await expect(page.getByText('A previous texture', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Outside', exact: true }).click();
  await page.getByRole('button', { name: 'Begin noticing' }).click();
  await expect(page.getByRole('heading', { name: 'Something catching the light' })).toBeVisible();
  await page.getByRole('button', { name: 'Try another' }).click();
  await expect(page.getByRole('heading', { name: "A texture you hadn't noticed" })).toBeVisible();
  await page.getByRole('button', { name: 'Found it' }).click();
  await expect(page.locator('.wonders-progress')).toHaveAttribute('aria-label', '1 of 3 wonders noticed');
  await page.reload();
  await expect(page.locator('.wonders-progress')).toHaveAttribute('aria-label', '1 of 3 wonders noticed');
  for (let index = 0; index < 2; index++) await page.getByRole('button', { name: 'Found it' }).click();
  await expect(page.getByRole('heading', { name: 'The ordinary has its wonders.' })).toBeVisible();
  await expect(page.locator('.wonders-collected li')).toHaveCount(3);
  await page.reload();
  await expect(page.locator('.wonders-collected li')).toHaveCount(3);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Start a new hunt' }).click();
  await page.getByRole('button', { name: '5 wonders' }).click();
  await page.getByRole('button', { name: 'Begin noticing' }).click();
  await page.getByRole('button', { name: 'Finish here' }).click();
  await expect(page.getByRole('heading', { name: 'A pause counts, too.' })).toBeVisible();
  await page.locator('main .page-back').click();
  await expect(page).toHaveURL(/\/explore$/);
});

test('grounding notes save privately, survive reload, retain text on failure and warn before leaving', async ({ page }) => {
  await page.goto('/activities?tool=senses');
  await page.getByText("Anything you'd like to note?", { exact: false }).click();
  const note = page.getByRole('textbox', { name: 'Your grounding note' });
  await note.fill('A little steadier.');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.locator('main .page-back').click();
  await expect(note).toHaveValue('A little steadier.');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.getByText('Note saved on this device.', { exact: true })).toBeVisible();
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.includes('groundingNoteV1')));
  expect(keys).toHaveLength(1);
  expect(keys[0]).toMatch(/^moodJournalPrivateV1:local-browser:/);
  await page.reload();
  await page.getByText("Anything you'd like to note?", { exact: false }).click();
  await expect(note).toHaveValue('A little steadier.');
  await note.fill('Keep this failed save too.');
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key.includes('groundingNoteV1')) throw new Error('Storage is full'); return window.originalSetItem.call(this, key, value); };
  });
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Storage is full');
  await expect(note).toHaveValue('Keep this failed save too.');
  await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(page.getByText('Note saved on this device.', { exact: true })).toBeVisible();
});

test('breathing petals contract in, expand out, pause and respect reduced motion', async ({ page }) => {
  await page.goto('/activities?tool=breathing');
  await page.getByRole('button', { name: 'Start breathing', exact: true }).click();
  const bloom = page.locator('.breathing-bloom');
  const scaleAt = (ms) => bloom.evaluate((element, time) => {
    const animation = element.getAnimations()[0];
    animation.pause();
    animation.currentTime = time;
    const matrix = new DOMMatrix(getComputedStyle(element).transform);
    return Math.hypot(matrix.a, matrix.b);
  }, ms);
  expect(await scaleAt(0)).toBeCloseTo(1);
  expect(await scaleAt(4000)).toBeCloseTo(.72);
  expect(await scaleAt(8000)).toBeCloseTo(.72);
  expect(await scaleAt(12000)).toBeCloseTo(1);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(bloom).toHaveCSS('animation-play-state', 'paused');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.clock.install();
  await page.getByRole('button', { name: 'Start breathing', exact: true }).click();
  await page.clock.runFor(4000);
  await expect(page.locator('.breathing-flower')).toContainText('Hold');
  await page.clock.runFor(4000);
  await expect(page.locator('.breathing-flower')).toContainText('Breathe out');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(bloom).toHaveCSS('animation-name', 'none');
  await page.clock.runFor(4000);
  await expect(page.locator('.breathing-flower')).toContainText('Rest');
});

test('encrypted grounding notes never leave readable copies in storage', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const encryption = await import('/src/utils/journalEncryption.js');
    const created = await encryption.createJournalEncryption('grounding encryption test');
    localStorage.setItem(encryption.localEncryptedJournalKey, JSON.stringify({ version: 1, config: encryption.serializeEncryptionConfig(created.config), rows: [] }));
  });
  await page.goto('/activities?tool=senses');
  await page.getByLabel('Journal passphrase', { exact: true }).fill('grounding encryption test');
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await page.locator('.pause-note summary').click();
  await page.getByRole('textbox', { name: 'Your grounding note' }).fill('PRIVATE GROUNDING NOTE');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.getByText('Note saved on this device.', { exact: true })).toBeVisible();
  const stored = await page.evaluate(() => Object.entries(localStorage));
  expect(stored.some(([key]) => key.startsWith('moodJournalPrivateEncryptedV1:') && key.includes('groundingNoteV1'))).toBe(true);
  expect(stored.some(([, value]) => value.includes('PRIVATE GROUNDING NOTE'))).toBe(false);
  await page.reload();
  await expect(page.locator('.pause-note')).toHaveCount(0);
  await page.getByLabel('Journal passphrase', { exact: true }).fill('grounding encryption test');
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await page.locator('.pause-note summary').click();
  await expect(page.getByRole('textbox', { name: 'Your grounding note' })).toHaveValue('PRIVATE GROUNDING NOTE');
});

test('failed hunt writes keep the current prompt and allow retry', async ({ page }) => {
  await page.goto('/activities?tool=scavenger');
  await page.getByRole('button', { name: 'Begin noticing' }).click();
  await expect(page.getByRole('button', { name: 'Found it' })).toBeVisible();
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key.includes('gameSmallWondersV1')) throw new Error('Storage is full'); return window.originalSetItem.call(this, key, value); };
  });
  await page.getByRole('button', { name: 'Found it' }).click();
  await expect(page.getByRole('alert')).toContainText('Your progress is unchanged');
  await expect(page.locator('.wonders-progress')).toHaveAttribute('aria-label', '0 of 3 wonders noticed');
  await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
  await page.getByRole('button', { name: 'Found it' }).click();
  await expect(page.locator('.wonders-progress')).toHaveAttribute('aria-label', '1 of 3 wonders noticed');
});

for (const width of [320, 820, 1440]) {
  test(`pause pages and hover fit at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const tool of ['breathing', 'senses', 'scavenger']) {
      await page.goto(`/activities?tool=${tool}`);
      await expect(page.locator('.grounding-workspace, .wonders-page')).toBeVisible();
      await page.evaluate(() => document.querySelector('.app').style.setProperty('--font-scale', '1.3'));
      const back = page.locator('main .page-back');
      await back.hover();
      expect(await back.evaluate((element) => parseFloat(getComputedStyle(element).paddingLeft))).toBeGreaterThanOrEqual(12);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: info.outputPath(`${tool}-${width}.png`), fullPage: true });
    }
  });
}

test('grounding notes stay reachable after rotation and in a shortened writing viewport', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/activities?tool=senses');
  await page.locator('.pause-note summary').click();
  const note = page.getByRole('textbox', { name: 'Your grounding note' });
  await note.fill('Still here after rotating.');
  for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 400 }]) {
    await page.setViewportSize(viewport);
    await expect(note).toHaveValue('Still here after rotating.');
    const save = page.getByRole('button', { name: 'Save note', exact: true });
    await save.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const button = await save.boundingBox();
    const dock = await page.locator('.destination-nav-mobile').boundingBox();
    expect(button.y).toBeGreaterThan(66);
    expect(button.y + button.height).toBeLessThanOrEqual(dock?.y ?? viewport.height);
    await page.screenshot({ path: info.outputPath(`note-${viewport.width}x${viewport.height}.png`) });
  }
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.getByText('Note saved on this device.', { exact: true })).toBeVisible();
});
