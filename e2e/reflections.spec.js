import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'America/New_York', locale: 'en-US' });

const entries = [
  { id: 'nov-main', type: 'checkin', mood: 'Happy', intensity: 6, dateKey: '2026-11-01', created: '2026-11-01T12:00:00-05:00', primary: true, note: 'A slow morning with a little time to breathe.', factors: ['Sleep'], tags: [] },
  { id: 'nov-second', type: 'checkin', mood: 'Calm', intensity: 3, dateKey: '2026-11-01', created: '2026-11-01T11:00:00-05:00', primary: false, note: 'An earlier check-in.', factors: [], tags: [] },
  { id: 'oct-page', type: 'freewrite', dateKey: '2026-10-31', created: '2026-10-31T12:00:00-04:00', specificFeeling: 'A page to remember', note: 'A quiet afternoon at home.', tags: [] },
  { id: 'oct-main', type: 'checkin', mood: 'Calm', intensity: 4, dateKey: '2026-10-25', created: '2026-10-25T12:00:00-04:00', primary: true, factors: [], tags: [] }
];

// Mount only these screens, with the final stylesheet order and no redesign.css.
// App routing and imports can be integrated independently by their owner.
async function mountReflection(page, screen, { populated = false, dark = false, fontScale = 1 } = {}) {
  await page.clock.install({ time: new Date('2026-11-01T12:00:00-05:00') });
  const moduleResponse = await page.request.get(`/src/screens/${screen}.jsx`);
  expect(moduleResponse.ok()).toBeTruthy();
  const source = await moduleResponse.text();
  const dependency = source.match(/from "([^"\n]+)\/react\.js(\?[^"\n]+)?"/);
  expect(dependency).toBeTruthy();
  const dependencyPath = (module) => `${dependency[1]}/${module}.js${dependency[2] || ''}`;
  const styles = ['base', 'themes', 'layout', 'journal', 'responsive', 'ui-system', 'appShell', 'reflections'];
  const document = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    ${styles.map((style) => `<link rel="stylesheet" href="/src/styles/${style}.css">`).join('')}
    </head><body><div id="reflection-root"></div><script type="module">
    import React from '${dependencyPath('react')}';
    import ReactDOM from '${dependencyPath('react-dom_client')}';
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    const { ${screen}: Screen } = await import('/src/screens/${screen}.jsx');
    const h = React.createElement;
    function Harness() {
      const [entries, setEntries] = React.useState(${JSON.stringify(populated ? entries : [])});
      const [action, setAction] = React.useState('');
      return h('div', { className: 'app app-shell theme-warm${dark ? ' dark' : ''}', style: { '--font-scale': ${fontScale} } }, h('main', { className: 'app-container' },
        h(Screen, { entries,
          nav: h('div', { className: 'tab-indicator' }, '${screen}'),
          onPrimary: (id) => setEntries(current => current.map(entry => entry.dateKey === current.find(item => item.id === id).dateKey && entry.type === 'checkin' ? { ...entry, primary: entry.id === id } : entry)),
          onBookmark: (id, bookmarked) => setEntries(current => current.map(entry => entry.id === id ? { ...entry, bookmarked } : entry)),
          onCheckIn: (date) => setAction('checkin:' + (typeof date === 'string' ? date : 'today')),
          onOpenEntry: (id) => setAction('entry:' + id)
        }), h('output', { 'aria-label': 'Navigation result' }, action)
      ));
    }
    ReactDOM.createRoot(document.getElementById('reflection-root')).render(h(Harness));
    </script></body></html>`;
  await page.route(`**/__reflection_${screen}`, (route) => route.fulfill({ contentType: 'text/html', body: document }));
  await page.goto(`/__reflection_${screen}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

test('Calendar uses its month as the title, keeps Sunday first, and navigates dates', async ({ page }) => {
  await mountReflection(page, 'Calendar');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('November 2026');
  await expect(page.locator('.page-header-eyebrow')).toHaveText('Your month');
  await expect(page.locator('.weekday')).toHaveText(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  await expect(page.locator('.calendar-cell').first()).toHaveAttribute('aria-current', 'date');
  await page.getByRole('button', { name: 'Previous month' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('October 2026');
  await expect(page.locator('.calendar-cell-empty')).toHaveCount(4);
  await expect(page.getByRole('region', { name: 'Thursday, October 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Check in for this day' }).click();
  await expect(page.getByLabel('Navigation result')).toHaveText('checkin:2026-10-01');
  await page.getByRole('button', { name: 'Next month' }).click();
  await page.getByRole('button', { name: /^Monday, November 2,/ }).click();
  await expect(page.getByText('This day has not arrived yet.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check in for this day' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Sunday, November 1' })).toBeVisible();
  await expect(page.locator('.calendar-cell[aria-current="date"]')).toHaveAttribute('aria-pressed', 'true');
});

test('Calendar preserves paper previews, bookmarking, primary selection, and opening an entry', async ({ page }) => {
  await mountReflection(page, 'Calendar', { populated: true });
  await expect(page.locator('.calendar-page-preview')).toHaveCount(2);
  const first = page.locator('.calendar-page-preview').filter({ hasText: 'A slow morning' });
  await first.getByRole('button', { name: 'Bookmark this page' }).click();
  await expect(first.getByRole('button', { name: 'Remove bookmark' })).toHaveAttribute('aria-pressed', 'true');
  await first.getByRole('button', { name: 'View page' }).click();
  await expect(first.locator('.entry-page')).toContainText('A slow morning');
  await first.getByRole('button', { name: 'Close page' }).click();
  await first.getByRole('button', { name: 'Open in journal' }).click();
  await expect(page.getByLabel('Navigation result')).toHaveText('entry:nov-main');
  const second = page.locator('.calendar-page-preview').filter({ hasText: 'An earlier check-in.' });
  await second.getByRole('button', { name: 'Set as main' }).click();
  await expect(second.locator('.primary-marker')).toHaveText('Main');
  await expect(first.getByRole('button', { name: 'Set as main' })).toBeVisible();
  await page.getByRole('button', { name: 'Previous month' }).click();
  await page.getByRole('button', { name: /Saturday, October 31/ }).click();
  await expect(page.locator('.calendar-cell.selected .calendar-entry-markers')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A page to remember' })).toBeVisible();
});

test('Summary shows a focused empty week with a working check-in action', async ({ page }, info) => {
  await mountReflection(page, 'Summary');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your week, gently gathered');
  await expect(page.locator('.page-header p')).toHaveText('Nov 1 - Nov 7');
  await expect(page.getByRole('heading', { name: 'This week is still unwritten' })).toBeVisible();
  await expect(page.locator('.summary-empty-sprout')).toBeVisible();
  await expect(page.locator('.summary-day-rhythm')).toHaveCount(0);
  await expect(page.locator('.summary-data-details')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('summary-empty.png'), fullPage: true });
  await page.getByRole('button', { name: 'Check in now' }).click();
  await expect(page.getByLabel('Navigation result')).toHaveText('checkin:today');
  await expect(page.getByRole('button', { name: 'Next week' })).toBeDisabled();
  await page.getByRole('button', { name: 'Previous week' }).click();
  await expect(page.locator('.page-header p')).toHaveText('Oct 25 - Oct 31');
  await page.getByRole('button', { name: 'This week', exact: true }).click();
  await expect(page.locator('.page-header p')).toHaveText('Nov 1 - Nov 7');
});

test('Summary keeps the seven-day rhythm, daily primary counts, and chart disclosure', async ({ page }) => {
  await mountReflection(page, 'Summary', { populated: true });
  await expect(page.getByRole('list', { name: 'Days checked in this week' }).getByRole('listitem')).toHaveCount(7);
  await expect(page.locator('.summary-day-mark.filled')).toHaveCount(1);
  await expect(page.locator('.summary-day-mark').first()).toHaveAttribute('aria-label', 'Sun, Nov 1: Check-in saved');
  await expect(page.locator('.summary-data-details')).not.toHaveAttribute('open', '');
  await page.locator('.summary-data-details summary').click();
  await expect(page.locator('.summary-stat').first().locator('strong')).toHaveText('1');
  await expect(page.locator('.recharts-wrapper')).toHaveCount(3);
  await expect(page.locator('.recharts-line-dot')).toBeVisible();
  await page.getByRole('button', { name: 'Previous week' }).click();
  await expect(page.locator('.page-header p')).toHaveText('Oct 25 - Oct 31');
  await expect(page.locator('.summary-day-mark.filled')).toHaveCount(1);
  await expect(page.locator('.summary-stat').first().locator('strong')).toHaveText('1');
  await page.getByRole('button', { name: 'Previous week' }).click();
  await expect(page.locator('.summary-day-rhythm')).toHaveCount(0);
  await expect(page.locator('.summary-data-details')).toHaveCount(0);
});

for (const [width, height, dark] of [[1440, 1000, false], [390, 844, false], [320, 740, true]]) {
  for (const screen of ['Calendar', 'Summary']) {
    test(`${screen} fits ${width}px with enlarged text and the final stylesheet order`, async ({ page }, info) => {
      await page.setViewportSize({ width, height });
      await mountReflection(page, screen, { populated: true, dark, fontScale: 1.3 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      const tab = await page.locator('.tab-indicator').boundingBox();
      const header = await page.locator('.page-header').boundingBox();
      expect(tab.y + tab.height).toBeLessThanOrEqual(header.y);
      if (screen === 'Calendar') {
        const board = await page.locator('.calendar-board').boundingBox();
        const detail = await page.locator('.calendar-detail').boundingBox();
        if (width > 1050) {
          expect(board.width).toBeGreaterThan(detail.width);
          expect(board.x + board.width).toBeLessThan(detail.x);
        } else expect(board.y + board.height).toBeLessThan(detail.y);
        await page.getByRole('button', { name: 'View page' }).first().click();
        const bookmark = await page.locator('.entry-bookmark').first().boundingBox();
        const date = await page.locator('.entry-card-topline time').first().boundingBox();
        expect(bookmark.x + bookmark.width).toBeLessThanOrEqual(date.x);
      } else {
        await page.locator('.summary-data-details summary').click();
        await expect(page.locator('.recharts-line-dot')).toBeVisible();
        await expect(page.locator('.recharts-pie-sector')).toBeVisible();
        await expect(page.locator('.recharts-bar-rectangle')).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: info.outputPath(`${screen.toLowerCase()}-${width}.png`), fullPage: true });
      if (screen === 'Summary') {
        await page.getByRole('button', { name: 'Previous week' }).click();
        await page.getByRole('button', { name: 'Previous week' }).click();
        await expect(page.locator('.summary-empty-sprout')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
        await page.screenshot({ path: info.outputPath(`summary-empty-${width}.png`), fullPage: true });
      }
    });
  }
}
