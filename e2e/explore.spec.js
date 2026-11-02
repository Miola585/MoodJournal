import { expect, test } from '@playwright/test';

// Mount the owned screens without adding routes or imports to App during integration.
const harness = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body><div id="root"></div><script type="module">
import RefreshRuntime from '/@react-refresh';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
window.__vite_plugin_react_preamble_installed__ = true;
const { default: React } = await import('__REACT_URL__');
const { default: ReactDOM } = await import('__REACT_DOM_URL__');
const { BrowserRouter, Routes, Route } = await import('__ROUTER_URL__');
const { Explore } = await import('/src/screens/Explore.jsx');
const { Activities } = await import('/src/screens/Activities.jsx');
const { MoodColors } = await import('/src/screens/MoodColors.jsx');
const { Games } = await import('/src/components/games/Games.jsx');
const { JournalPrivacyGate } = await import('/src/components/layout/JournalLocks.jsx');
const { createPrivateStorage } = await import('/src/utils/privateStorage.js');
const { useJournalDraft, hasDirtyJournalForms } = await import('__DRAFT_URL__');
const { moods } = await import('/src/data/journalData.js');
const { todayKey, getPrimaryEntry, groupEntriesByDate } = await import('/src/utils/journalUtils.js');
await import('/src/styles.css');
await import('/src/styles/explore.css');
await import('/src/styles/moodColors.css');
const h = React.createElement;
const privateStorage = createPrivateStorage({ ownerId: 'explore-test', encryptionEnabled: false });
function Shell() {
  const [entries, setEntries] = React.useState([]);
  const [locked, setLocked] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  useJournalDraft({ privateStorage, formId: 'explore-test-guard', draft, setDraft });
  React.useEffect(() => {
    window.setExploreEntries = setEntries;
    window.setExploreLocked = setLocked;
    window.markExploreDirty = () => setDraft('Unsaved writing');
    window.hasDirtyExplore = hasDirtyJournalForms;
  }, []);
  return h('main', { className: 'app theme-warm', style: { minHeight: '100vh', padding: '16px' } },
    h(Routes, null,
      h(Route, { path: '/explore', element: h(JournalPrivacyGate, { locked, code: 'test-only', onUnlock: () => setLocked(false) }, h(Explore, { entries, privateStorage })) }),
      h(Route, { path: '/activities', element: h(Activities, { privateStorage }) }),
      h(Route, { path: '/explore/mood-colors', element: h(MoodColors, { privateStorage }) }),
      h(Route, { path: '/games/:gameId', element: h(JournalPrivacyGate, { locked, code: 'test-only', onUnlock: () => setLocked(false) }, h(Games, { entries, privateStorage, moods, todayKey, getPrimaryEntry, groupEntriesByDate })) }),
      h(Route, { path: '/journal/write', element: h('h1', null, 'Writing destination') })
    )
  );
}
history.replaceState(null, '', '/explore');
ReactDOM.createRoot(document.getElementById('root')).render(h(BrowserRouter, null, h(Shell)));
</script></body></html>`;

async function mountExplore(page) {
  const main = await (await page.request.get('/src/main.jsx')).text();
  const screen = await (await page.request.get('/src/screens/Explore.jsx')).text();
  const dependency = (filename) => main.match(new RegExp(`"([^"\\n]*/${filename}\\.js[^"\\n]*)"`, 'u'))[1];
  // Use the screen's HMR URL so the harness shares its draft registry and tab ID.
  const draftUrl = screen.match(/"([^"\n]*\/useJournalDraft\.js[^"\n]*)"/u)[1];
  const body = harness.replace('__REACT_URL__', dependency('react'))
    .replace('__REACT_DOM_URL__', dependency('react-dom_client'))
    .replace('__ROUTER_URL__', dependency('react-router-dom'))
    .replace('__DRAFT_URL__', draftUrl);
  await page.route('**/__explore-test', (route) => route.fulfill({ contentType: 'text/html', body }));
  await page.goto('/__explore-test');
  await expect(page.getByRole('heading', { name: 'Wander somewhere gentle.', exact: true })).toBeVisible({ timeout: 15_000 });
}

test('Explore opens real games and leaves Garden unavailable', async ({ page }) => {
  await mountExplore(page);
  await expect(page.getByRole('button', { name: 'Mood Garden - Coming soon' })).toBeDisabled();
  await page.getByRole('button', { name: 'Make a constellation' }).click();
  await expect(page).toHaveURL(/\/games\/constellation$/u);
  await expect(page.locator('.constellation-stage')).toBeVisible();
  await page.goBack();
  for (const [label, id] of [['Emotional Match', 'match'], ['Mood Orbit', 'orbit'], ['Memory Jar', 'memory']]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/games/${id}$`, 'u'));
    await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
    await page.goBack();
  }
});

test('quick pauses open the requested single tool and Mood Colors', async ({ page }) => {
  await mountExplore(page);
  for (const [label, tool, heading] of [['Breathing', 'breathing', 'Breathe with the circle.'], ['5-4-3-2-1 Senses', 'senses', "Come back to what's around you."]]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/activities\\?tool=${tool}$`, 'u'));
    await expect(page.getByRole('tablist')).toHaveCount(0);
    await expect(page.locator('.grounding-workspace').getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.locator('.grounding-workspace')).toBeFocused();
    await expect(page.locator('.activity-feature')).toHaveCount(0);
    await page.goBack();
  }
  await page.getByRole('button', { name: 'Mood Colors', exact: true }).click();
  await expect(page).toHaveURL(/\/explore\/mood-colors$/u);
  await expect(page.getByRole('grid', { name: 'Mood map' })).toBeVisible();
});

test('direct activity links survive reload, follow history and reject unknown tools', async ({ page }) => {
  await page.goto('/activities?tool=senses&source=explore');
  await expect(page.locator('.grounding-workspace')).toHaveAttribute('id', 'grounding-panel-senses');
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await expect(page.locator('.activity-journal-sheet:visible')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.grounding-workspace')).toHaveAttribute('id', 'grounding-panel-senses');
  const nav = page.getByRole('navigation', { name: 'Main destinations', exact: true });
  await nav.getByRole('button', { name: 'Little breaks', exact: true }).click();
  await nav.getByRole('button', { name: 'Breathe', exact: true }).click();
  await expect(page).toHaveURL(/tool=breathing/u);
  await expect(page.getByRole('button', { name: 'Start breathing', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start breathing', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause breathing', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.locator('.grounding-workspace')).toHaveAttribute('id', 'grounding-panel-senses');
  await expect(page).toHaveURL(/tool=senses&source=explore/u);
  await page.goForward();
  await expect(page.getByRole('button', { name: 'Continue breathing', exact: true })).toBeVisible();
  await page.goto('/activities?tool=unknown');
  await expect(page.locator('.activity-feature')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Grounding activities' })).toBeVisible();
  await expect(page.locator('.grounding-workspace')).toHaveCount(0);
});

test('all Explore destinations honor the journal draft navigation guard', async ({ page }) => {
  await mountExplore(page);
  await page.evaluate(() => window.markExploreDirty());
  await expect.poll(() => page.evaluate(() => window.hasDirtyExplore())).toBe(true);
  for (const name of ['Make a constellation', 'Emotional Match', 'Mood Orbit', 'Memory Jar', 'Breathing', '5-4-3-2-1 Senses', 'Mood Colors', 'Personal Night Sky']) {
    const dialogSeen = page.waitForEvent('dialog');
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name, exact: true }).click();
    expect((await dialogSeen).message()).toContain('unsaved journal changes');
    await expect(page).toHaveURL(/\/explore$/u);
  }
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Personal Night Sky', exact: true }).click();
  await expect(page).toHaveURL(/\/games\/night-sky$/u);
});

test('Night Sky uses supplied saved days, honors the privacy gate and has an actionable empty state', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('journalEntries', JSON.stringify([{ dateKey: '2026-10-01', mood: 'Sad' }])));
  await mountExplore(page);
  await expect(page.locator('.galaxy-star')).toHaveCount(0);
  await expect(page.locator('.galaxy-section')).toHaveCount(0);
  await page.getByRole('button', { name: 'Personal Night Sky', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your first star is waiting' })).toBeVisible();
  await page.getByRole('button', { name: 'Start writing' }).click();
  await expect(page).toHaveURL(/\/journal\/write$/u);
  await page.goBack();
  await page.evaluate(() => window.setExploreEntries([
    { id: 'saved-one', dateKey: '2026-10-28', mood: 'Calm', intensity: 4, primary: true },
    { id: 'saved-two', dateKey: '2026-10-28', mood: 'Sad', intensity: 6 },
    { id: 'saved-three', dateKey: '2026-10-29', mood: 'Happy', intensity: 8 }
  ]));
  await expect(page.locator('.galaxy-star')).toHaveCount(2);
  await expect(page.getByRole('button', { name: /2026-10-28: Calm, intensity 4/u })).toBeVisible();
  await page.evaluate(() => window.setExploreLocked(true));
  await expect(page.getByRole('heading', { name: 'Journal Locked' })).toBeVisible();
  await expect(page.locator('.galaxy-star')).toHaveCount(0);
  await page.evaluate(() => { window.setExploreEntries([]); window.setExploreLocked(false); });
  await expect(page.getByRole('heading', { name: 'Your first star is waiting' })).toBeVisible();
});

for (const width of [320, 820, 1440]) {
  test(`Explore art and large text fit light and dark layouts at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await mountExplore(page);
    await expect(page.locator('.explore-screen img')).toHaveCount(0);
    await expect(page.locator('.explore-screen .destination-art')).toHaveCount(6);
    for (const dark of [false, true]) {
      await page.evaluate((enabled) => {
        document.querySelector('.app').classList.toggle('dark', enabled);
        document.querySelector('.app').style.setProperty('--font-scale', '1.3');
      }, dark);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const bounds = await page.locator('.explore-games, .explore-pauses').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()));
      expect(bounds[0].bottom).toBeLessThan(bounds[1].top);
      for (const card of await page.locator('.explore-game').all()) {
        const layout = await card.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const caption = element.querySelector('.explore-game-caption').getBoundingClientRect();
          const art = element.querySelector('.destination-art');
          return {
            inside: caption.left >= bounds.left && caption.right <= bounds.right + 1 && caption.bottom <= bounds.bottom + 1,
            fullWidth: art.getBoundingClientRect().width >= bounds.width - 2,
            sceneColor: getComputedStyle(art.querySelector('stop')).stopColor
          };
        });
        expect(layout.inside).toBe(true);
        expect(layout.fullWidth).toBe(true);
        expect(layout.sceneColor).not.toBe('rgb(0, 0, 0)');
      }
      const feature = await page.locator('.explore-feature').evaluate((element) => {
        const outer = element.getBoundingClientRect();
        const copy = element.querySelector('.explore-feature-copy').getBoundingClientRect();
        const button = element.querySelector('button').getBoundingClientRect();
        return copy.left >= outer.left && copy.right <= outer.right && button.bottom <= outer.bottom;
      });
      expect(feature).toBe(true);
      const jar = await page.locator('.explore-game-art-memory').evaluate((container) => ({
        container: container.getBoundingClientRect().toJSON(), art: container.querySelector('svg').getBoundingClientRect().toJSON()
      }));
      expect(jar.art.width).toBeGreaterThan(20);
      expect(jar.art.top).toBeGreaterThanOrEqual(jar.container.top);
      expect(jar.art.bottom).toBeLessThanOrEqual(jar.container.bottom + 1);
      expect(jar.art.left).toBeGreaterThanOrEqual(jar.container.left);
      expect(jar.art.right).toBeLessThanOrEqual(jar.container.right + 1);
      for (const art of await page.locator('.explore-pause-art .destination-art').all()) {
        expect(await art.evaluate((element) => element.getBoundingClientRect().width <= element.parentElement.getBoundingClientRect().width)).toBe(true);
        await expect(art).toHaveAttribute('viewBox', '100 38 200 200');
      }
      const stickers = page.getByRole('button', { name: 'Your sticker collection', exact: true });
      const textColor = await stickers.evaluate((element) => getComputedStyle(element).color);
      await stickers.hover();
      await expect(stickers).toHaveCSS('color', textColor);
      expect(await stickers.evaluate((element) => getComputedStyle(element).transform)).toBe('none');
      await page.locator('.explore-pauses').screenshot({ path: testInfo.outputPath(`pauses-${width}-${dark ? 'dark' : 'light'}.png`) });
      await page.screenshot({ path: testInfo.outputPath(`explore-${width}-${dark ? 'dark' : 'light'}.png`), fullPage: true, animations: 'disabled' });
    }
  });
}
