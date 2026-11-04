import { expect, test } from '@playwright/test';
import { createMoodColorsMap } from '../src/utils/moodColors.js';

// Serve a test-only mount from this spec so feature tests do not need an App route.
const harness = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body><div id="root"></div><script type="module">
import RefreshRuntime from '/@react-refresh';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
window.__vite_plugin_react_preamble_installed__ = true;
const { default: React } = await import('__REACT_URL__');
const { default: ReactDOM } = await import('__REACT_DOM_URL__');
const { MoodColors } = await import('/src/screens/MoodColors.jsx');
const { createPrivateStorage } = await import('/src/utils/privateStorage.js');
const { flushJournalDrafts, hasDirtyJournalForms, confirmJournalNavigation } = await import('__DRAFT_URL__');
await import('/src/styles.css');
await import('/src/styles/moodColors.css');
const root = ReactDOM.createRoot(document.getElementById('root'));
// Public fixture key, used only by this isolated encryption test.
const dataKey = await crypto.subtle.importKey('raw', new Uint8Array(32).fill(42), 'AES-GCM', false, ['encrypt', 'decrypt']);
let storage;
window.failMoodSave = false;
window.renderMoodColors = async (ownerId = 'mood-colors-test', encryptionEnabled = sessionStorage.getItem('mood-test-encrypted') === 'true') => {
  storage = createPrivateStorage({ ownerId, encryptionEnabled, dataKey });
  if (window.seedMoodRecovery) {
    await storage.write('journalDraft:mood-colors:' + sessionStorage.getItem('journalDraftTab'), window.seedMoodRecovery);
    window.seedMoodRecovery = null;
  }
  if (window.seedMoodMaps) {
    await storage.write('gameMoodColorsV1', window.seedMoodMaps);
    window.seedMoodMaps = null;
  }
  const recovery = window.delayMoodRecovery ? new Promise((resolve) => { window.finishMoodRecovery = resolve; }) : Promise.resolve();
  const read = storage.read;
  storage.read = async (key, fallback) => {
    if (key.startsWith('journalDraft:')) await recovery;
    return read(key, fallback);
  };
  const update = storage.update;
  storage.update = async (...args) => {
    if (window.failMoodSave) throw new Error('Map storage is full.');
    if (window.delayMoodSave) await new Promise((resolve) => { window.finishMoodSave = resolve; });
    return update(...args);
  };
  root.render(React.createElement('main', { className: 'app theme-warm', style: { minHeight: '100vh' } }, React.createElement(MoodColors, { privateStorage: storage })));
};
window.leaveMoodColors = async () => { await flushJournalDrafts(); root.render(null); };
window.hasDirtyMoodColors = hasDirtyJournalForms;
window.confirmMoodNavigation = confirmJournalNavigation;
window.readMoodMaps = () => storage.read('gameMoodColorsV1', []);
window.readMoodDraft = () => storage.read('journalDraft:mood-colors:' + sessionStorage.getItem('journalDraftTab'), null);
window.renderMoodColors();
</script></body></html>`;

async function mount(page) {
  const main = await (await page.request.get('/src/main.jsx')).text();
  const screen = await (await page.request.get('/src/screens/MoodColors.jsx')).text();
  const reactUrl = main.match(/"([^"\n]*\/react\.js[^"\n]*)"/u)[1];
  const domUrl = main.match(/"([^"\n]*\/react-dom_client\.js[^"\n]*)"/u)[1];
  // Vite can timestamp the shared hook after edits; an unversioned import creates a second registry.
  const draftUrl = screen.match(/"([^"\n]*\/useJournalDraft\.js[^"\n]*)"/u)[1];
  await page.route('**/__mood-colors-test', (route) => route.fulfill({
    contentType: 'text/html', body: harness.replace('__REACT_URL__', reactUrl).replace('__REACT_DOM_URL__', domUrl).replace('__DRAFT_URL__', draftUrl)
  }));
  await page.goto('/__mood-colors-test');
  await expect(page.getByRole('grid', { name: 'Mood map' })).toBeVisible({ timeout: 15_000 });
}

const tile = (page, row = 1, column = 1) => page.getByRole('button', { name: new RegExp(`^Row ${row}, column ${column}:`) });
const maps = (page) => page.evaluate(() => window.readMoodMaps());

const historyKey = 'moodJournalPrivateV1:mood-colors-test:gameMoodColorsV1';
const validSavedMap = createMoodColorsMap(new Date('2026-11-01T12:00:00.000Z'), 'saved-map');
const corruptedHistories = [
  { name: 'non-array', value: { maps: [validSavedMap] } },
  { name: 'damaged record', value: [validSavedMap, { ...validSavedMap, id: 'damaged-map', tiles: ['unknown'] }] }
];

for (const { name, value } of corruptedHistories) {
  for (const timing of ['on load', 'before save']) {
    test(`corrupted history (${name}) ${timing} prevents writes and preserves raw storage`, async ({ page }) => {
      const raw = JSON.stringify(value, null, 2);
      const seedAndTrack = ({ key, rawValue }) => {
        localStorage.setItem(key, rawValue);
        window.moodHistoryWrites = 0;
        const setItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function (storedKey, storedValue) {
          if (storedKey === key) window.moodHistoryWrites += 1;
          return setItem.call(this, storedKey, storedValue);
        };
      };
      if (timing === 'on load') await page.addInitScript(seedAndTrack, { key: historyKey, rawValue: raw });
      await mount(page);
      await tile(page).click();
      await page.getByLabel('A note (optional)').fill('Keep this draft safe');
      const save = page.getByRole('button', { name: 'Keep this map' });
      if (timing === 'before save') {
        await expect(save).toBeEnabled();
        await page.evaluate(seedAndTrack, { key: historyKey, rawValue: raw });
        await save.click();
      } else {
        await expect(save).toBeDisabled();
      }
      await expect(page.getByRole('alert')).toContainText('Saving is blocked to protect your saved maps.');
      await expect(page.getByLabel('A note (optional)')).toHaveValue('Keep this draft safe');
      await expect(tile(page)).toHaveAccessibleName('Row 1, column 1: Calm');
      await expect(page.getByRole('status')).not.toHaveText('Map kept.');
      expect(await page.evaluate((key) => localStorage.getItem(key), historyKey)).toBe(raw);
      expect(await page.evaluate(() => window.moodHistoryWrites)).toBe(0);
    });
  }
}

test('keyboard painting, boundaries, proportions, undo and clear', async ({ page }) => {
  await mount(page);
  await expect(page.getByRole('gridcell')).toHaveCount(35);
  await expect(page.locator('.mood-colors-grid button[tabindex="0"]')).toHaveCount(1);
  await tile(page).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(tile(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(tile(page, 1, 2)).toHaveAccessibleName('Row 1, column 2: Calm');
  await page.keyboard.press('ArrowDown');
  await expect(tile(page, 2, 2)).toBeFocused();
  await page.getByRole('button', { name: 'Joyful', exact: true }).click();
  await tile(page, 2, 2).click();
  await expect(page.locator('.mood-colors-proportions')).toContainText('Calm67% (2)');
  await expect(page.locator('.mood-colors-proportions')).toContainText('Joyful33% (1)');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(tile(page, 2, 2)).toHaveAccessibleName('Row 2, column 2: Empty');
  await page.getByRole('button', { name: 'Clear map', exact: true }).click();
  await expect(page.locator('.mood-colors-toolbar')).toContainText('0 / 35 painted');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.mood-colors-toolbar')).toContainText('2 / 35 painted');
  expect(await maps(page)).toEqual([]);
});

test('maps persist only on explicit save and reopen without mutating previews', async ({ page }) => {
  await mount(page);
  await tile(page).click();
  await page.getByLabel('A note (optional)').fill('A quiet moment.');
  expect(await maps(page)).toEqual([]);
  await page.getByRole('button', { name: 'Keep this map' }).click();
  await expect(page.getByRole('status')).toHaveText('Map kept.');
  const [first] = await maps(page);
  await page.reload();
  await page.getByRole('button', { name: /Open map from/ }).click();
  await expect(page.getByLabel('A note (optional)')).toHaveValue('A quiet moment.');
  await page.getByRole('button', { name: 'Hopeful', exact: true }).click();
  await tile(page).click();
  await page.getByLabel('A note (optional)').fill('A hopeful moment.');
  expect((await maps(page))[0]).toEqual(first);
  await expect(page.locator('.mood-colors-preview-note')).toHaveText('A quiet moment.');
  await page.getByRole('button', { name: 'Keep this map' }).click();
  await expect(page.getByRole('status')).toHaveText('Map kept.');
  const saved = await maps(page);
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ id: first.id, createdAt: first.createdAt, dateKey: first.dateKey, note: 'A hopeful moment.' });
  expect(saved[0].tiles[0]).toBe('hopeful');
  await expect(page.locator('.mood-colors-preview-note')).toHaveText('A hopeful moment.');
});

test('failed writes retain the entire draft and can be retried', async ({ page }) => {
  await mount(page);
  await tile(page).click();
  await page.getByLabel('A note (optional)').fill('Still here');
  await page.evaluate(() => { window.failMoodSave = true; });
  await page.getByRole('button', { name: 'Keep this map' }).click();
  await expect(page.getByRole('alert')).toHaveText('Map storage is full.');
  await expect(page.getByLabel('A note (optional)')).toHaveValue('Still here');
  await expect(tile(page)).toHaveAccessibleName('Row 1, column 1: Calm');
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
  expect(await maps(page)).toEqual([]);
  await page.evaluate(() => { window.failMoodSave = false; });
  await page.getByRole('button', { name: 'Keep this map' }).click();
  await expect(page.getByRole('status')).toHaveText('Map kept.');
  expect(await page.evaluate(() => window.hasDirtyMoodColors())).toBe(false);
});

test('dirty navigation can be canceled and memory drafts recover after leaving', async ({ page }) => {
  await mount(page);
  await tile(page).click();
  await page.getByLabel('A note (optional)').fill('Unfinished');
  await expect.poll(() => page.evaluate(() => window.hasDirtyMoodColors())).toBe(true);
  page.once('dialog', (dialog) => dialog.dismiss());
  expect(await page.evaluate(() => window.confirmMoodNavigation())).toBe(false);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'New map', exact: true }).click();
  await expect(page.getByLabel('A note (optional)')).toHaveValue('Unfinished');
  await page.evaluate(() => window.leaveMoodColors());
  await expect(page.getByRole('grid')).toHaveCount(0);
  await page.evaluate(() => window.renderMoodColors());
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.getByLabel('A note (optional)')).toHaveValue('Unfinished');
  await expect(tile(page)).toHaveAccessibleName('Row 1, column 1: Calm');
  expect(await maps(page)).toEqual([]);
});

test('owner changes clear drafts and ignore an old owner save completion', async ({ page }) => {
  await mount(page);
  await tile(page).click();
  await page.getByLabel('A note (optional)').fill('Owner one');
  await page.evaluate(() => { window.delayMoodSave = true; });
  await page.getByRole('button', { name: 'Keep this map' }).click();
  await expect(page.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  await page.evaluate(() => window.renderMoodColors('owner-two'));
  await expect(page.getByLabel('A note (optional)')).toHaveValue('');
  await expect(tile(page)).toHaveAccessibleName('Row 1, column 1: Empty');
  await page.evaluate(() => { window.delayMoodSave = false; window.finishMoodSave(); });
  await expect(page.getByRole('status')).toHaveText('');
  expect(await maps(page)).toEqual([]);
  expect(await page.evaluate(() => window.hasDirtyMoodColors())).toBe(false);
});

test('encrypted drafts recover after reload and saved records contain no plaintext note', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('mood-test-encrypted', 'true'));
  await mount(page);
  await tile(page).click();
  await page.getByLabel('A note (optional)').fill('Private color reflection');
  await expect.poll(() => page.evaluate(async () => (await window.readMoodDraft())?.draft.note)).toBe('Private color reflection');
  expect(await page.evaluate(() => Object.values(localStorage).join(' '))).not.toContain('Private color reflection');
  await page.reload();
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.getByLabel('A note (optional)')).toHaveValue('Private color reflection');
  await expect(tile(page)).toHaveAccessibleName('Row 1, column 1: Calm');
  await page.getByRole('button', { name: 'Keep this map' }).click();
  await expect(page.getByRole('status')).toHaveText('Map kept.');
  expect((await maps(page))[0].note).toBe('Private color reflection');
  expect(await page.evaluate(() => Object.values(localStorage).join(' '))).not.toContain('Private color reflection');
});

for (const choice of ['Restore', 'Discard']) {
  test(`delayed encrypted recovery blocks edits and map changes until ${choice}`, async ({ page }) => {
    const draft = {
      ...validSavedMap, id: 'recover-this-map', note: 'Original unfinished map',
      tiles: ['hopeful', ...Array(34).fill(null)]
    };
    const recovery = { version: 1, formId: 'mood-colors', savedAt: draft.updatedAt, draft };
    await page.addInitScript(({ record, saved }) => {
      sessionStorage.setItem('mood-test-encrypted', 'true');
      window.seedMoodRecovery = record;
      window.seedMoodMaps = [saved];
      window.delayMoodRecovery = true;
    }, { record: recovery, saved: validSavedMap });
    await mount(page);
    const note = page.getByLabel('A note (optional)');
    const save = page.getByRole('button', { name: 'Keep this map' });
    const preview = page.getByRole('button', { name: /Open map from/u });
    await expect(preview).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('Checking device draft...');
    await expect(page.locator('.mood-colors-workspace')).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('button', { name: 'Restore', exact: true })).toHaveCount(0);
    await expect(note).toBeDisabled();
    for (const control of [tile(page), save, preview,
      page.getByRole('button', { name: 'New map', exact: true }),
      page.getByRole('button', { name: 'Calm', exact: true }),
      page.getByRole('button', { name: 'Undo', exact: true }),
      page.getByRole('button', { name: 'Clear map', exact: true })]) {
      await expect(control).toBeDisabled();
    }
    const raw = await page.evaluate(() => Object.entries(localStorage));
    await page.getByRole('button', { name: 'New map', exact: true }).evaluate((button) => button.click());
    await preview.evaluate((button) => button.click());
    expect(await page.evaluate(() => Object.entries(localStorage))).toEqual(raw);
    expect(await page.evaluate(() => window.hasDirtyMoodColors())).toBe(false);

    await page.evaluate(() => window.finishMoodRecovery());
    await expect(page.getByRole('button', { name: choice, exact: true })).toBeVisible();
    await expect(page.locator('.mood-colors-workspace')).toHaveAttribute('aria-busy', 'false');
    await expect(note).toBeDisabled();
    await expect(preview).toBeDisabled();
    expect(await page.evaluate(() => window.readMoodDraft())).toEqual(recovery);
    await page.getByRole('button', { name: choice, exact: true }).click();
    await expect(note).toBeEnabled();
    if (choice === 'Restore') {
      await expect(note).toHaveValue(draft.note);
      await expect(tile(page)).toHaveAccessibleName('Row 1, column 1: Hopeful');
    } else {
      await expect(note).toHaveValue('');
      await expect(tile(page)).toHaveAccessibleName('Row 1, column 1: Empty');
      expect(await page.evaluate(() => window.readMoodDraft())).toBeNull();
      await tile(page).click();
      await note.fill('New map after discard');
    }
    expect(await maps(page)).toEqual([validSavedMap]);
    await save.click();
    await expect(page.getByRole('status')).toHaveText('Map kept.');
    const kept = await maps(page);
    expect(kept).toHaveLength(2);
    expect(kept.find(({ id }) => id === validSavedMap.id)).toEqual(validSavedMap);
    if (choice === 'Restore') expect(kept.find(({ id }) => id === draft.id)).toMatchObject({ note: draft.note, tiles: draft.tiles });
    else expect(kept.some(({ id }) => id === draft.id)).toBe(false);
  });
}

test.describe('responsive colors', () => {
  test.use({ hasTouch: true });
  for (const width of [320, 1440]) {
    test(`touch painting, dark theme and large text fit at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await mount(page);
      await page.getByRole('button', { name: 'Tender', exact: true }).tap();
      await tile(page, 5, 7).tap();
      await expect(tile(page, 5, 7)).toHaveAccessibleName('Row 5, column 7: Tender');
      await page.evaluate(() => { document.querySelector('.app').classList.add('dark'); document.querySelector('.app').style.setProperty('--font-scale', '1.3'); });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const rows = await page.locator('.mood-colors-row').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().width));
      expect(new Set(rows).size).toBe(1);
      const layout = await page.evaluate(() => {
        const bounds = (selector) => document.querySelector(selector).getBoundingClientRect().toJSON();
        return { grid: bounds('.mood-colors-grid'), palette: bounds('.mood-colors-palette'),
          proportions: bounds('.mood-colors-summary'), note: bounds('#mood-colors-note'), workspace: bounds('.mood-colors-workspace') };
      });
      expect(layout.palette.bottom).toBeLessThan(layout.grid.top);
      expect(layout.proportions.top).toBeGreaterThan(layout.grid.bottom);
      expect(layout.note.top).toBeGreaterThan(layout.proportions.bottom);
      expect(Math.abs(layout.note.width - layout.workspace.width)).toBeLessThan(1);
      await page.screenshot({ path: testInfo.outputPath(`mood-colors-${width}.png`), fullPage: true, animations: 'disabled' });
    });
  }
});
