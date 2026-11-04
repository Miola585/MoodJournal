import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const entries = (page) => page.evaluate(() => {
  const saved = JSON.parse(localStorage.getItem('journalEntriesV2'));
  return Array.isArray(saved) ? saved : saved?.entries || [];
});

// Exercise save timing and recovered records without changing shared app storage.
async function openCheckInHarness(page, options = {}) {
  const { browserHash } = JSON.parse(await readFile('node_modules/.vite/deps/_metadata.json', 'utf8'));
  await page.route('**/checkin-harness', (route) => route.fulfill({
    contentType: 'text/html',
    body: `<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body><div id="root"></div><script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
    </script><script type="module">
      import React from '/node_modules/.vite/deps/react.js?v=${browserHash}';
      import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js?v=${browserHash}';
      import { BrowserRouter } from '/node_modules/.vite/deps/react-router-dom.js?v=${browserHash}';
      import { CheckIn } from '/src/screens/CheckIn.jsx';
      import { createEntry } from '/src/data/journalData.js';
      import '/src/styles.css?import';
      const options = ${JSON.stringify(options)};
      const draft = options.draft ? { ...createEntry(), ...options.draft } : null;
      window.checkinTest = { attempts: [], resolveSave: null, done: false, reads: 0, removals: [] };
      const recovery = options.delayRecovery ? new Promise(resolve => { window.checkinTest.resolveRecovery = resolve; }) : Promise.resolve();
      const storage = { ownerId: 'ritual-test', encrypted: true,
        read: async () => {
          window.checkinTest.reads += 1;
          await recovery;
          return draft ? { version: 1, formId: 'checkin:new', savedAt: new Date().toISOString(), draft } : null;
        },
        write: async () => {}, remove: async (key) => { window.checkinTest.removals.push(key); } };
      if (options.seed) history.replaceState({ usr: options.seed }, '');
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(BrowserRouter, null,
        React.createElement('main', { className: 'app' }, React.createElement(CheckIn, {
          privateStorage: storage,
          entries: options.additional ? [createEntry()] : [],
          onSave: (entry) => { window.checkinTest.attempts.push(entry); return new Promise(resolve => { window.checkinTest.resolveSave = resolve; }); },
          onDone: () => { window.checkinTest.done = true; }, onPause: () => {}
        }))));
    </script></body></html>`
  }));
  await page.goto('/checkin-harness');
  await expect(page.getByRole('button', { name: 'Bright', exact: true })).toBeVisible();
}

test('delayed encrypted recovery blocks a seeded save until Restore preserves the original moment', async ({ page }) => {
  const draft = { mood: 'Anxious', specificFeeling: 'Unsure', dateKey: '2025-03-09', intensity: 7, note: 'An earlier unfinished moment.' };
  await openCheckInHarness(page, { delayRecovery: true, draft, seed: { mood: 'Happy', dateKey: '2025-03-10' } });
  const save = page.getByRole('button', { name: 'Keep this moment', exact: true });
  await expect(page.getByRole('button', { name: 'Bright', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => window.checkinTest.reads)).toBeGreaterThan(0);
  await expect(save).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Reflect', exact: true })).toBeDisabled();
  await page.locator('.checkin-flow').evaluate((form) => form.requestSubmit());
  expect(await page.evaluate(() => window.checkinTest.attempts)).toEqual([]);
  expect(await page.evaluate(() => window.checkinTest.removals)).toEqual([]);

  await page.evaluate(() => window.checkinTest.resolveRecovery());
  await expect(page.getByText('Unsaved writing found on this device')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restore', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Discard', exact: true })).toBeEnabled();
  await expect(save).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
  await page.locator('.checkin-flow').evaluate((form) => form.requestSubmit());
  expect(await page.evaluate(() => window.checkinTest.attempts)).toEqual([]);
  expect(await page.evaluate(() => window.checkinTest.removals)).toEqual([]);

  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.getByLabel('Journal date')).toHaveValue(draft.dateKey);
  await expect(page.getByText('Intensity: 7 / 10')).toBeVisible();
  await expect(save).toBeEnabled();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByLabel('Your note')).toHaveValue(draft.note);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await save.click();
  expect(await page.evaluate(() => window.checkinTest.attempts)).toHaveLength(1);
  expect((await page.evaluate(() => window.checkinTest.attempts))[0]).toMatchObject(draft);
  await page.evaluate(() => window.checkinTest.resolveSave(true));
  await expect(page.getByRole('heading', { name: "You made room for what's here" })).toBeVisible();
});

test('delayed encrypted recovery allows a seeded moment after an explicit Discard', async ({ page }) => {
  const seed = { mood: 'Happy', dateKey: '2025-03-10' };
  await openCheckInHarness(page, { delayRecovery: true, seed, draft: { mood: 'Sad', dateKey: '2025-03-09', intensity: 9 } });
  const save = page.getByRole('button', { name: 'Keep this moment', exact: true });
  await expect(save).toBeDisabled();
  await page.evaluate(() => window.checkinTest.resolveRecovery());
  await expect(page.getByRole('button', { name: 'Discard', exact: true })).toBeVisible();
  await expect(save).toBeDisabled();
  await page.getByRole('button', { name: 'Discard', exact: true }).click();
  await expect(save).toBeEnabled();
  await save.click();
  expect((await page.evaluate(() => window.checkinTest.attempts))[0]).toMatchObject({ ...seed, intensity: 5 });
  await page.evaluate(() => window.checkinTest.resolveSave(true));
  await expect(page.getByRole('heading', { name: "You made room for what's here" })).toBeVisible();
});

test('seeded moment waits for encrypted lookup even when no draft is found', async ({ page }) => {
  await openCheckInHarness(page, { delayRecovery: true, seed: { mood: 'Happy' } });
  const save = page.getByRole('button', { name: 'Keep this moment', exact: true });
  await expect(save).toBeDisabled();
  await page.evaluate(() => window.checkinTest.resolveRecovery());
  await expect(save).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Restore', exact: true })).toHaveCount(0);
});

test('recovered intensity and all optional fields survive save failure and retry', async ({ page }) => {
  const draft = { mood: 'Anxious', specificFeeling: 'Unsure', intensity: 7, note: 'A recovered note.', factors: ['Work'], tags: ['private'], meals: 'Light', water: '2-3 cups', sleep: '5-6 hrs', copingStep: 'Sit by the window' };
  await openCheckInHarness(page, { draft });
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Anxious', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Intensity: 7 / 10')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Feeling intensity' }).locator('[aria-pressed=true]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reflect', exact: true }).click();
  await expect(page.getByLabel('Your note')).toHaveValue(draft.note);
  await page.getByRole('button', { name: 'Skip writing' }).click();
  await expect(page.getByText('Next step: Sit by the window')).toBeVisible();
  await page.getByRole('button', { name: 'Keep this moment' }).click();
  await expect(page.getByText('Saving...', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep this moment' })).toBeDisabled();
  await expect(page.getByRole('heading', { name: "You made room for what's here" })).toHaveCount(0);
  await page.evaluate(() => window.checkinTest.resolveSave(false));
  await expect(page.getByRole('alert')).toContainText('Could not save');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await page.evaluate(() => window.checkinTest.resolveSave(true));
  await expect(page.getByRole('heading', { name: "You made room for what's here" })).toBeVisible();
  const attempts = await page.evaluate(() => window.checkinTest.attempts);
  expect(attempts).toHaveLength(2);
  expect(attempts[0]).toMatchObject(draft);
  expect(attempts[1]).toEqual(attempts[0]);
});

test('intensity changes only when chosen and compact additional moments remain available', async ({ page }) => {
  await openCheckInHarness(page, { additional: true, draft: { mood: 'Sad', intensity: 6, note: 'Earlier thought.' } });
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'How are you feeling now?' })).toBeVisible();
  await expect(page.getByLabel('Optional note')).toHaveValue('Earlier thought.');
  await page.getByRole('button', { name: 'Add more detail' }).click();
  await expect(page.getByText('Intensity: 6 / 10')).toBeVisible();
  await page.getByRole('button', { name: 'A little', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Nothing right now', exact: true }).click();
  await page.getByRole('button', { name: 'Keep this moment' }).click();
  expect((await page.evaluate(() => window.checkinTest.attempts))[0]).toMatchObject({ mood: 'Sad', intensity: 2, note: 'Earlier thought.', copingStep: '' });
  await page.evaluate(() => window.checkinTest.resolveSave(true));
  await expect(page.getByRole('heading', { name: "You made room for what's here" })).toBeVisible();
});

test('invalid date seeds are ignored and Close confirms dirty navigation', async ({ page }) => {
  await openCheckInHarness(page, { seed: { dateKey: '2999-01-01', mood: 'Happy' } });
  await expect(page.getByRole('button', { name: 'Bright', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Journal date')).not.toHaveValue('2999-01-01');
  await page.getByRole('button', { name: 'Low', exact: true }).click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Close check-in', exact: true }).click();
  await expect(page).toHaveURL(/checkin-harness$/);
  await expect(page.getByRole('button', { name: 'Low', exact: true })).toHaveAttribute('aria-pressed', 'true');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Close check-in', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('mobile dark mode and enlarged text keep every step within the screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCheckInHarness(page);
  await page.locator('.app').evaluate((element) => { element.classList.add('dark'); element.style.setProperty('--font-scale', '1.3'); });
  await page.getByRole('button', { name: 'Overwhelmed', exact: true }).click();
  for (const step of ['Notice', 'Reflect', 'Close']) {
    await page.getByRole('button', { name: step, exact: true }).click();
    await expect(page.getByRole('button', { name: step, exact: true })).toHaveAttribute('aria-current', 'step');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `.cache/visual-check/checkin-mobile-${step.toLowerCase()}.png`, fullPage: true, animations: 'disabled' });
  }
  await page.getByRole('button', { name: 'Keep this moment' }).click();
  await page.evaluate(() => window.checkinTest.resolveSave(true));
  await expect(page.getByRole('heading', { name: "You made room for what's here" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('a mood alone can be kept, then Back to today returns Home', async ({ page }) => {
  await page.goto('/checkin', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Bright', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Keep this moment' })).toBeEnabled();
  await page.getByRole('button', { name: 'Keep this moment' }).click();
  await expect(page.getByRole('heading', { name: "You made room for what's here" })).toBeVisible();
  const saved = await entries(page);
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ mood: 'Happy', note: '', specificFeeling: '' });
  await page.getByRole('button', { name: 'Back to today' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.calendar-page-preview')).toBeVisible();
  await page.getByRole('button', { name: 'Open in journal' }).click();
  await expect(page).toHaveURL(/\/entries\?entry=/);
});

test('Home shows the actual private Memory Jar count', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('moodJournalPrivateV1:local-browser:gameMemoryJar', JSON.stringify([{ id: 'one' }, { id: 'two' }, { id: 'three' }])));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: /Memory Jar Open jar/ })).toContainText('3 moments kept');
  await expect(page.locator('.destination-art-jar')).toBeVisible();
  await expect(page.locator('.today-rhythm')).toHaveAccessibleName('This week: 0 of 7 days checked in. Open weekly reflection');
});

test('keyboard mood selection and date validation keep invalid entries unsaved', async ({ page }) => {
  await page.goto('/checkin', { waitUntil: 'domcontentloaded' });
  const calm = page.locator('.checkin-mood-grid .mood').filter({ hasText: 'Calm' });
  await calm.focus();
  await page.keyboard.press('Enter');
  await expect(calm).toHaveAttribute('aria-pressed', 'true');
  const future = await page.evaluate(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  await page.locator('input[type=date]').fill(future);
  await expect(page.getByRole('alert')).toContainText('Choose today or an earlier date.');
  await expect(page.getByRole('button', { name: 'Keep this moment' })).toBeDisabled();
  expect(await entries(page)).toHaveLength(0);
});

test('Home opens a fresh Notice without mood choices and Calendar seeds its chosen date', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Check in feeling / })).toHaveCount(0);
  await expect(page.locator('.home-mood-choice')).toHaveCount(0);
  await page.getByRole('button', { name: 'Check in', exact: true }).click();
  await expect(page.getByRole('heading', { name: "What's here right now?" })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Notice', exact: true })).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('group', { name: 'Current feeling' }).locator('[aria-pressed=true]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
  await page.goto('/calendar');
  await page.getByRole('button', { name: 'Previous month' }).click();
  await page.locator('.calendar-cell-day').first().click();
  const expectedDate = await page.evaluate(() => {
    const now = new Date();
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}-01`;
  });
  await page.getByRole('button', { name: 'Check in for this day' }).click();
  await expect(page.locator('input[type=date]')).toHaveValue(expectedDate);
  await expect(page.getByRole('button', { name: 'Low', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('optional feeling, intensity, support, and details use existing entry fields', async ({ page }) => {
  await page.goto('/checkin');
  await page.getByRole('button', { name: /Content$/ }).click();
  await page.getByRole('button', { name: 'Settled' }).click();
  await expect(page.getByRole('button', { name: 'Noticeable', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'A lot', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('.journal-writing-field textarea').fill('A calm afternoon.');
  const prompt = await page.locator('#checkin-writing-prompt').textContent();
  await page.getByRole('button', { name: 'Try another prompt' }).click();
  await expect(page.locator('#checkin-writing-prompt')).not.toHaveText(prompt);
  await expect(page.locator('.journal-writing-field textarea')).toHaveValue('A calm afternoon.');
  await page.getByRole('button', { name: 'Anything shaping it?' }).click();
  await page.getByRole('button', { name: 'Sleep', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Reach out' }).click();
  await page.getByRole('button', { name: 'Add details' }).click();
  await page.getByRole('button', { name: 'Light meal' }).click();
  await page.getByRole('button', { name: 'Keep this moment' }).click();
  await expect(page.getByRole('heading', { name: "You made room for what's here" })).toBeVisible();
  expect((await entries(page))[0]).toMatchObject({ mood: 'Content', specificFeeling: 'Settled', intensity: 8, note: 'A calm afternoon.', copingStep: 'Reach out', factors: ['Sleep'], meals: 'Light' });
  await page.getByRole('button', { name: 'Take a pause' }).click();
  await expect(page).toHaveURL(/\/activities$/);
});

test('failed save keeps the draft and does not show success', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true }));
  await page.goto('/checkin');
  await page.getByRole('button', { name: /Calm$/ }).click();
  await page.getByRole('button', { name: 'Keep this moment' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not save');
  await expect(page.getByRole('heading', { name: "You made room for what's here" })).toHaveCount(0);
  expect(await entries(page)).toHaveLength(0);
});

test('encrypted draft recovery is available from a fresh Home check-in', async ({ page }) => {
  const passphrase = 'test-only journal passphrase';
  await page.goto('/checkin', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async (value) => {
    const encryption = await import('/src/utils/journalEncryption.js');
    const created = await encryption.createJournalEncryption(value);
    localStorage.setItem(encryption.localEncryptedJournalKey, JSON.stringify({
      version: 1,
      config: encryption.serializeEncryptionConfig(created.config),
      rows: []
    }));
  }, passphrase);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByLabel('Journal passphrase', { exact: true }).fill(passphrase);
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await page.getByRole('button', { name: /Calm$/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('.journal-writing-field textarea').fill('An unfinished thought.');
  await expect(page.getByText('Draft kept on this device')).toBeVisible();
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Close check-in', exact: true }).click();
  await page.getByRole('button', { name: 'Check in', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Current feeling' }).locator('[aria-pressed=true]')).toHaveCount(0);
  await expect(page.getByText('Unsaved writing found on this device')).toBeVisible();
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.locator('.checkin-mood-grid .mood').filter({ hasText: 'Calm' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Reflect', exact: true }).click();
  await expect(page.locator('.journal-writing-field textarea')).toHaveValue('An unfinished thought.');
});
