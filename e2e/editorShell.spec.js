import { expect, test } from '@playwright/test';

// Exercise the owned components without depending on concurrent App route edits.
async function openEditor(page, options = {}) {
  await page.addInitScript((value) => { window.editorOptions = value; }, options);
  await page.route('**/src/main.jsx*', async (route) => {
    const original = await (await route.fetch()).text();
    const entriesSource = await (await page.request.get('/src/screens/Entries.jsx')).text();
    const draftModule = entriesSource.match(/["']([^"']*\/hooks\/useJournalDraft\.js[^"']*)["']/)?.[1] || '/src/hooks/useJournalDraft.js';
    const dependencies = new Map([...original.matchAll(/["'](\/node_modules\/[^"']+\/(react(?:-dom_client|-router-dom)?\.js)(?:\?[^"']*)?)["']/g)].map((match) => [match[2], match[1]]));
    const body = `
    import React from '/node_modules/.vite/deps/react.js';
    import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
    import { BrowserRouter, useLocation, useNavigate } from '/node_modules/.vite/deps/react-router-dom.js';
    import { Entries } from '/src/screens/Entries.jsx';
    import { StickerCollection } from '/src/screens/StickerCollection.jsx';
    import { createFreeWriteEntry } from '/src/data/journalData.js';
    import { createPrivateStorage } from '/src/utils/privateStorage.js';
    import { createJournalEncryption } from '/src/utils/journalEncryption.js';
    import { flushJournalDrafts } from '${draftModule}';
    import '/src/styles.css';
    const h = React.createElement;
    const options = window.editorOptions;
    const encryption = options.encrypted ? await createJournalEncryption('editor test only passphrase') : null;
    const storage = createPrivateStorage({ ownerId: 'editor-test', encryptionEnabled: Boolean(encryption), dataKey: encryption?.dataKey });
    if (options.discovered) await storage.write('gameConstellations', [{ id: 'discovery' }]);
    const originalEntry = { ...createFreeWriteEntry(), id: 'recovered-page', specificFeeling: 'Saved title', note: 'Original saved words' };
    const formId = options.editRecovery ? 'entry:recovered-page' : 'freewrite:new';
    if (options.recover || options.editRecovery) {
      const draft = { ...createFreeWriteEntry(), id: 'recovered-page', specificFeeling: 'Recovered title', note: 'Keep my recovered words', noteDoc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Keep my recovered words', marks: [{ type: 'bold' }] }] }] }, stickers: [{ id: 'existing-coffee', stickerId: 'cafe-coffee', x: 60, y: 40, size: 20, rotation: 0, layer: 0 }], stickyNotes: [{ uid: 1, text: 'Keep my note', x: 0.4, y: 0.3 }] };
      await storage.write('journalDraft:' + formId, { version: 1, formId, savedAt: new Date().toISOString(), draft });
    }
    const read = storage.read;
    const gate = options.holdDraftRead ? new Promise((resolve) => { window.releaseDraftReads = resolve; }) : Promise.resolve();
    window.readSeededDraft = () => read('journalDraft:' + formId, null);
    window.draftMutations = [];
    for (const method of ['write', 'remove']) {
      const original = storage[method];
      storage[method] = (...args) => {
        if (args[0].startsWith('journalDraft:')) window.draftMutations.push({ method, key: args[0] });
        return original(...args);
      };
    }
    storage.read = async (key, fallback) => {
      if (key.startsWith('journalDraft:')) await gate;
      if (options.readDelay) await new Promise((resolve) => setTimeout(resolve, options.readDelay));
      if (options.discoveryError && key === 'gameConstellations') throw new Error('Test read failure');
      return read(key, fallback);
    };
    window.editorStorage = storage;
    window.savedEntries = [];
    function Shell() {
      const location = useLocation();
      const navigate = useNavigate();
      const [entries, setEntries] = React.useState(options.editRecovery ? [originalEntry] : []);
      const save = async (entry) => {
        if (window.failEditorSave) throw new Error('Test save failure');
        window.savedEntries.push(entry);
        setEntries((current) => [...current.filter((item) => item.id !== entry.id), entry]);
        return true;
      };
      return h('div', { className: 'app theme-warm ' + (options.dark ? 'dark' : 'light'), style: { '--font-scale': options.scale || 1, minHeight: '100vh', padding: '16px' } },
        h('header', { style: { position: 'sticky', top: 0, zIndex: 50, background: 'var(--surface-major)', padding: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap' } },
          h('button', { onClick: async () => { await flushJournalDrafts(); navigate('/stickers'); } }, 'Collection'),
          h('div', { id: 'journal-context-actions', style: { flex: 1 } })),
        location.pathname === '/stickers' ? h(StickerCollection, { privateStorage: storage }) : h(Entries, { entries, onSave: save, privateStorage: storage, writeMode: location.pathname === '/journal/write' })
      );
    }
    if (options.stickerId) history.replaceState({ usr: { stickerId: options.stickerId }, key: 'collection-selection', idx: 0 }, '', '/journal/write');
    ReactDOM.createRoot(document.getElementById('root')).render(h(React.StrictMode, null, h(BrowserRouter, null, h(Shell))));
  `.replace(/\/node_modules\/\.vite\/deps\/([^']+)/g, (url, file) => dependencies.get(file) || url);
    await route.fulfill({ contentType: 'text/javascript', body });
  });
  await page.goto(options.collection ? '/stickers' : options.editRecovery ? '/entries' : '/journal/write');
  if (options.editRecovery) await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.locator(options.collection ? '.sticker-collection-screen' : '.freewrite-screen')).toBeVisible();
}

async function expectRecoveryBlocked(page) {
  const form = page.locator('.freewrite-form');
  await expect(form).toHaveAttribute('inert', '');
  await expect(page.locator('.journal-writing-actions button[type="submit"]')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'New entry', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Sticker Book', exact: true })).toBeDisabled();
  // Dispatch directly as well: the handler must guard saves, not only the button.
  await form.dispatchEvent('submit');
  await page.getByRole('button', { name: 'New entry', exact: true }).evaluate((node) => node.click());
  expect(await page.evaluate(() => window.savedEntries)).toEqual([]);
  expect(await page.evaluate(() => window.draftMutations)).toEqual([]);
  expect(await page.evaluate(async () => (await window.readSeededDraft()).draft.note)).toBe('Keep my recovered words');
}

test('pending freewrite recovery blocks new content and destructive actions', async ({ page }) => {
  await openEditor(page, { encrypted: true, recover: true, holdDraftRead: true, stickerId: 'cafe-cookies' });
  await expect(page.locator('.freewrite-form')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.journal-editor-context')).toContainText('Checking device draft');
  await expectRecoveryBlocked(page);
  await page.evaluate(() => window.releaseDraftReads());
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('Recovered title');
  await expect(page.locator('.tiptap strong')).toHaveText('Keep my recovered words');
  await expect(page.locator('.journal-sticky-note')).toContainText('Keep my note');
  await expect(page.locator('.journal-placed-sticker')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'New entry', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Save page', exact: true }).click();
  expect(await page.evaluate(() => window.savedEntries[0])).toMatchObject({ id: 'recovered-page', note: 'Keep my recovered words' });
});

for (const choice of ['Restore', 'Discard']) {
  test(`editing waits for delayed recovery and preserves the ${choice} choice`, async ({ page }) => {
    await openEditor(page, { encrypted: true, editRecovery: true, holdDraftRead: true });
    await expect(page.locator('.freewrite-form')).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('.draft-recovery-notice')).toHaveCount(0);
    await expectRecoveryBlocked(page);
    await page.evaluate(() => window.releaseDraftReads());
    await expect(page.getByRole('button', { name: 'Restore', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Discard', exact: true })).toBeVisible();
    await expect(page.locator('.freewrite-form')).toHaveAttribute('aria-busy', 'false');
    await expectRecoveryBlocked(page);
    await page.getByRole('button', { name: choice, exact: true }).click();
    const restored = choice === 'Restore';
    await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(restored ? 'Recovered title' : 'Saved title');
    await expect(page.locator('.tiptap')).toHaveText(restored ? 'Keep my recovered words' : 'Original saved words');
    await expect(page.getByRole('button', { name: 'New entry', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    expect(await page.evaluate(() => window.savedEntries[0].note)).toBe(restored ? 'Keep my recovered words' : 'Original saved words');
  });
}

for (const stickerId of ['cafe-coffee', 'cafe-cookies']) {
test(`write mode restores an encrypted rich draft with ${stickerId}`, async ({ page }) => {
  const placementCount = stickerId === 'cafe-coffee' ? 1 : 2;
  await openEditor(page, { encrypted: true, recover: true, stickerId, readDelay: 80 });
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('Recovered title');
  await expect(page.locator('.tiptap strong')).toHaveText('Keep my recovered words');
  await expect(page.locator('.journal-sticky-note')).toContainText('Keep my note');
  await expect(page.locator('.journal-placed-sticker')).toHaveCount(placementCount);
  await expect(page.locator('.journal-editor-context')).toContainText('Draft kept on this device');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('Keep my recovered words');
  await page.getByRole('button', { name: 'Save page', exact: true }).click();
  const saved = await page.evaluate(() => window.savedEntries[0]);
  expect(saved.id).toBe('recovered-page');
  expect(saved.stickers).toHaveLength(placementCount);
  expect(saved.stickyNotes[0].text).toBe('Keep my note');
  await page.evaluate(() => { history.pushState({}, '', '/entries?entry=recovered-page'); dispatchEvent(new PopStateEvent('popstate')); });
  await expect(page.locator('#journal-entry-recovered-page')).toBeVisible();
});
}

test('only an accepted New entry resets dirty writing and the rich editor', async ({ page }) => {
  await openEditor(page, { stickerId: 'cafe-coffee' });
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Keep this');
  await page.getByRole('textbox', { name: 'Journal entry', exact: true }).fill('My unsaved words');
  await expect(page.locator('.journal-editor-context')).toContainText('Unsaved changes stay in this tab');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'New entry', exact: true }).click();
  await expect(page.locator('.tiptap')).toHaveText('My unsaved words');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'New entry', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('');
  await expect(page.locator('.tiptap')).toHaveText('');
  await expect(page.locator('.journal-placed-sticker')).toHaveCount(0);
  await expect(page.locator('.journal-editor-context')).toContainText('No unsaved changes');
});

test('collection selection keeps an in-tab draft and shows only populated categories', async ({ page }) => {
  await openEditor(page);
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Still here');
  await page.locator('.tiptap').fill('Preserve this writing');
  await page.getByRole('button', { name: 'Collection', exact: true }).click();
  const categories = page.getByRole('group', { name: 'Sticker categories' });
  await expect(categories.getByRole('button')).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Use Shooting star in journal' })).toBeDisabled();
  await categories.getByRole('button', { name: 'Cozy Cafe' }).click();
  await expect(page.locator('.sticker-collection-item')).toHaveCount(4);
  await page.getByRole('button', { name: 'Use Coffee in journal' }).click();
  await expect(page.locator('.tiptap')).toHaveText('Preserve this writing');
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('Still here');
  await expect(page.locator('.journal-placed-sticker')).toHaveCount(1);
  await page.getByRole('button', { name: 'Collection', exact: true }).click();
  await page.getByRole('button', { name: 'Use Coffee in journal' }).click();
  await expect(page.locator('.journal-placed-sticker')).toHaveCount(1);
  await expect(page.locator('.tiptap')).toHaveText('Preserve this writing');
});

test('discovered stickers are available and locked navigation state cannot place one', async ({ page }) => {
  await openEditor(page, { stickerId: 'night-shooting-star' });
  await expect(page.locator('.journal-placed-sticker')).toHaveCount(0);
  await page.evaluate(async () => window.editorStorage.write('gameConstellations', [{ id: 'discovered' }]));
  await page.getByRole('button', { name: 'Collection', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Use Shooting star in journal' })).toBeEnabled();
  await page.getByRole('button', { name: 'Use Shooting star in journal' }).click();
  await expect(page.getByRole('button', { name: /^Move Shooting star sticker/ })).toHaveCount(1);
});

test('save and discovery failures are visible and preserve writing', async ({ page }) => {
  await openEditor(page, { discoveryError: true });
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Retry later');
  await page.locator('.tiptap').fill('Do not lose this');
  await page.evaluate(() => { window.failEditorSave = true; });
  await page.getByRole('button', { name: 'Save page', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Could not save');
  await expect(page.locator('.tiptap')).toHaveText('Do not lose this');
  await page.getByRole('button', { name: 'Sticker Book', exact: true }).click();
  await expect(page.locator('.sticker-discovery-error')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.evaluate(() => { window.failEditorSave = false; });
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('.entry-card')).toHaveCount(1);
});

for (const width of [1440, 390, 320]) {
  test(`editor and sticker collection fit ${width}px with keyboard access`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await openEditor(page, { dark: true, scale: width < 400 ? 1.5 : 1 });
    const trigger = page.getByRole('button', { name: 'Sticker Book', exact: true });
    await trigger.click();
    const book = page.locator('#sticker-book-panel');
    await expect(book).toBeVisible();
    if (width <= 1100) {
      await expect(book).toHaveAttribute('role', 'dialog');
      await expect(page.getByRole('button', { name: 'Close Sticker Book' })).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(page.getByRole('button', { name: 'Next sticker page' })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Close Sticker Book' })).toBeFocused();
    } else {
      const bounds = await book.boundingBox();
      const header = await page.locator('header').first().boundingBox();
      expect(bounds.y).toBeGreaterThanOrEqual(header.y + header.height);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: info.outputPath('editor-book.png'), fullPage: true });
    await page.getByRole('button', { name: 'Coffee', exact: true }).click();
    await expect(page.locator('.journal-placed-sticker')).toHaveCount(1);
    if (width <= 1100) {
      await expect(book).toHaveCount(0);
      await trigger.click();
    }
    await page.keyboard.press('Escape');
    await expect(book).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.screenshot({ path: info.outputPath('editor-paper.png'), fullPage: true });
    await page.getByRole('button', { name: 'Collection', exact: true }).click();
    await expect(page.locator('.sticker-collection-item')).toHaveCount(10);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: info.outputPath('collection.png'), fullPage: true });
  });
}

test.describe('phone sticker orientation', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('tap-placed sticker keeps placement and saved data after landscape resize', async ({ page }, info) => {
    await openEditor(page, { encrypted: true });
    await page.getByRole('textbox', { name: 'Title', exact: true }).fill('A page in both orientations');
    await page.getByRole('textbox', { name: 'Journal entry', exact: true }).fill('Keep this sticker where I placed it.');
    await page.getByRole('button', { name: 'Sticker Book', exact: true }).tap();
    await page.getByRole('button', { name: 'Coffee', exact: true }).tap();
    await expect(page.locator('#sticker-book-panel')).toHaveCount(0);
    const sticker = page.locator('.journal-placed-sticker');
    await expect(sticker).toHaveCount(1);
    await expect(page.locator('.journal-editor-context')).toContainText('Draft kept on this device');
    const readDraft = () => page.evaluate(async () => (await window.editorStorage.read(`journalDraft:freewrite:new:${sessionStorage.getItem('journalDraftTab')}`, null))?.draft);
    const original = await readDraft();
    expect(original.stickers).toHaveLength(1);
    expect(original.stickers[0]).toMatchObject({ stickerId: 'cafe-coffee', x: 58, y: 32, size: 32, rotation: 0 });

    const checkPlacement = async (orientation) => {
      await sticker.scrollIntoViewIfNeeded();
      await page.evaluate(() => document.fonts.ready);
      await expect(sticker.locator('img')).toHaveJSProperty('complete', true);
      expect(await sticker.locator('img').evaluate((node) => node.naturalWidth)).toBeGreaterThan(0);
      const bounds = await sticker.evaluate((node) => ({
        sticker: node.getBoundingClientRect().toJSON(),
        layer: node.closest('.journal-sticker-layer').getBoundingClientRect().toJSON(),
        left: node.style.left, top: node.style.top, transform: node.style.transform,
        viewportWidth: innerWidth
      }));
      expect(bounds.left).toBe(`${original.stickers[0].x}%`);
      expect(bounds.top).toBe(`${original.stickers[0].y}%`);
      expect(bounds.transform).toBe('translate(-50%, -50%) rotate(0deg)');
      expect(bounds.sticker.width).toBeGreaterThan(0);
      expect(bounds.sticker.height).toBeGreaterThan(0);
      expect(bounds.sticker.left).toBeGreaterThanOrEqual(bounds.layer.left - 1);
      expect(bounds.sticker.right).toBeLessThanOrEqual(bounds.layer.right + 1);
      expect(bounds.sticker.top).toBeGreaterThanOrEqual(bounds.layer.top - 1);
      expect(bounds.sticker.bottom).toBeLessThanOrEqual(bounds.layer.bottom + 1);
      expect(bounds.sticker.left).toBeGreaterThanOrEqual(0);
      expect(bounds.sticker.right).toBeLessThanOrEqual(bounds.viewportWidth);
      expect((bounds.sticker.x + bounds.sticker.width / 2 - bounds.layer.x) / bounds.layer.width * 100).toBeCloseTo(original.stickers[0].x, 1);
      expect((bounds.sticker.y + bounds.sticker.height / 2 - bounds.layer.y) / bounds.layer.height * 100).toBeCloseTo(original.stickers[0].y, 1);
      await info.attach(`sticker-${orientation}-bounds`, { body: JSON.stringify(bounds, null, 2), contentType: 'application/json' });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: info.outputPath(`sticker-${orientation}.png`), fullPage: true });
      return bounds;
    };

    const portrait = await checkPlacement('portrait');
    await page.setViewportSize({ width: 844, height: 390 });
    const landscape = await checkPlacement('landscape');
    expect(landscape.layer.width).toBeGreaterThan(portrait.layer.width);
    expect((await readDraft()).stickers).toEqual(original.stickers);
    await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(original.specificFeeling);
    await expect(page.locator('.tiptap')).toHaveText(original.note);
    await page.getByRole('button', { name: 'Save page', exact: true }).tap();
    const saved = await page.evaluate(() => window.savedEntries[0]);
    expect(saved.stickers).toEqual(original.stickers);
    expect(saved).toMatchObject({ id: original.id, note: original.note, specificFeeling: original.specificFeeling });
  });
});

test('integrated write route uses the privacy gate and shared context slot', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('journalPrivacyCode', '2468'));
  await page.goto('/journal/write');
  await expect(page.getByRole('heading', { name: 'Journal Locked', exact: true })).toBeVisible();
  await expect(page.locator('.freewrite-screen')).toHaveCount(0);
  await page.getByLabel('Passphrase or PIN', { exact: true }).fill('2468');
  await page.getByRole('button', { name: 'Reveal journal', exact: true }).click();
  await expect(page.locator('.freewrite-screen')).toBeVisible();
  await expect(page.locator('.journal-editor-context').getByRole('button', { name: 'New entry', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Integrated editor');
  await page.locator('.tiptap').fill('Saved from the write route');
  await page.getByRole('button', { name: 'Save page', exact: true }).click();
  await expect(page).toHaveURL(/\/entries$/);
  await expect(page.locator('.entry-card')).toContainText('Integrated editor');
});

for (const [width, height] of [[320, 700], [390, 844], [760, 900], [320, 500], [390, 500]]) {
  test(`mobile editor actions remain reachable at ${width}x${height} with enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => {
      localStorage.setItem('fontScale', '1.5');
      localStorage.setItem('reduceMotion', 'true');
    });
    await page.goto('/journal/write');
    const editor = page.getByRole('textbox', { name: 'Journal entry', exact: true });
    await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Reachable actions');
    await editor.fill(Array.from({ length: 35 }, (_, index) => `Journal paragraph ${index + 1}.`).join('\n'));

    const checkActions = async (focused) => {
      if (focused) await editor.focus();
      else await page.evaluate(() => document.activeElement?.blur());
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      if (focused) await expect(editor).toBeFocused();
      else await expect(page.getByRole('navigation', { name: 'Mobile destinations', exact: true })).toBeVisible();
      const report = await page.evaluate(() => {
        const actions = [...document.querySelectorAll('.journal-writing-actions button')];
        const nav = document.querySelector('.destination-nav-mobile');
        const navVisible = nav && getComputedStyle(nav).display !== 'none';
        const navBounds = navVisible ? nav.getBoundingClientRect().toJSON() : null;
        const viewport = window.visualViewport;
        const visible = { left: viewport?.offsetLeft || 0, top: viewport?.offsetTop || 0, width: viewport?.width || innerWidth, height: viewport?.height || innerHeight };
        const boxes = actions.map((node) => ({ name: node.getAttribute('aria-label') || node.textContent, ...node.getBoundingClientRect().toJSON() }));
        const issues = [];
        boxes.forEach((box, index) => {
          if (box.width <= 0 || box.height <= 0 || box.left < visible.left || box.right > visible.left + visible.width + 1 || box.top < visible.top || box.bottom > visible.top + visible.height + 1) issues.push(`${box.name} outside viewport`);
          if (navBounds && box.left < navBounds.right && box.right > navBounds.left && box.top < navBounds.bottom && box.bottom > navBounds.top) issues.push(`${box.name} overlaps bottom navigation`);
          for (const fraction of [0.2, 0.5, 0.8]) {
            const target = document.elementFromPoint(box.left + box.width / 2, box.top + box.height * fraction);
            if (!actions[index].contains(target)) issues.push(`${box.name} covered at ${fraction} by ${target?.closest('button')?.textContent || target?.tagName || 'outside viewport'}`);
          }
        });
        return { viewport: visible, navBounds, boxes, issues, scrollY };
      });
      await test.info().attach(`editor-actions-${focused ? 'focused' : 'unfocused'}`, { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
      expect(report.boxes).toHaveLength(2);
      expect(report.scrollY).toBeGreaterThan(0);
      expect(report.issues, `Editor actions with focus ${focused}: ${JSON.stringify(report)}`).toEqual([]);
    };

    await checkActions(false);
    await checkActions(true);
    await page.getByRole('button', { name: 'Save page', exact: true }).click();
    await expect(page).toHaveURL(/\/entries$/);
    await expect(page.locator('.entry-card')).toContainText('Reachable actions');
    await page.goto('/journal/write');
    await editor.fill('Cancel this unsaved page.');
    await checkActions(false);
    await checkActions(true);
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page).toHaveURL(/\/entries$/);
    await expect(page.locator('.entry-card')).toHaveCount(1);
  });
}
