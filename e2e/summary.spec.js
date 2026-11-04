import { expect, test } from '@playwright/test';

test.setTimeout(60_000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const now = new Date();
    const dateKey = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    localStorage.setItem('journalEntriesV2', JSON.stringify([
      { id: 'summary-checkin', type: 'checkin', mood: 'Happy', intensity: 6, factors: ['Sleep'], dateKey, created: now.toISOString(), primary: true, tags: [] },
    ]));
  });
});

test('Summary loads only on navigation and preserves the current page while loading', async ({ page }) => {
  const summaryModule = /\/(?:src\/screens\/Summary\.jsx|assets\/Summary-[^/]+\.js)(?:\?.*)?$/u;
  const requested = [];
  page.on('request', (request) => requested.push(request.url()));
  let releaseModule;
  const waiting = new Promise((resolve) => { releaseModule = resolve; });
  await page.route(summaryModule, async (route) => {
    await waiting;
    await route.continue();
  });
  await page.goto('/calendar');
  await expect(page.locator('.calendar-screen')).toBeVisible();
  expect(requested.some((url) => summaryModule.test(url) || /recharts/i.test(url))).toBe(false);
  try {
    await page.getByRole('navigation', { name: 'Main destinations' }).getByRole('button', { name: 'My journal', exact: true }).click();
    await page.getByRole('navigation', { name: 'Main destinations' }).getByRole('button', { name: 'Weekly reflection', exact: true }).click();
    await expect.poll(() => requested.some((url) => summaryModule.test(url))).toBe(true);
    // React Router transitions retain the current page until the lazy route is ready.
    await expect(page.locator('.calendar-screen')).toBeVisible();
  } finally {
    releaseModule();
  }
  await expect(page).toHaveURL(/\/summary$/u);
  await expect(page.getByRole('heading', { name: 'Your week, gently gathered', exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.summary-data-details')).not.toHaveAttribute('open', '');
  await page.locator('.summary-data-details summary').click();
  expect(requested.some((url) => summaryModule.test(url))).toBe(true);
  await expect(page.locator('.recharts-wrapper')).toHaveCount(3);
  await expect(page.locator('.recharts-line-dot')).toHaveCount(1);
  await expect(page.locator('.recharts-pie-sector')).toHaveCount(1);
  await expect(page.locator('.recharts-bar-rectangle')).toHaveCount(1);
  await page.getByRole('button', { name: 'Previous week', exact: true }).click();
  await expect(page.getByText('This week is still unwritten')).toBeVisible();
  await expect(page.locator('.summary-empty-sprout')).toBeVisible();
  await expect(page.locator('.summary-day-rhythm')).toHaveCount(0);
  await expect(page.locator('.summary-data-details')).toHaveCount(0);
  await page.getByRole('button', { name: 'Next week', exact: true }).click();
  await page.locator('.summary-data-details summary').click();
  await expect(page.locator('.recharts-wrapper')).toHaveCount(3);
});

test('Summary supports direct links, refresh, and mobile charts', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let releaseModule;
  const waiting = new Promise((resolve) => { releaseModule = resolve; });
  await page.route(/\/(?:src\/screens\/Summary\.jsx|assets\/Summary-[^/]+\.js)(?:\?.*)?$/u, async (route) => {
    await waiting;
    await route.continue();
  });
  try {
    await page.goto('/summary', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading page...', { exact: true })).toBeVisible();
  } finally {
    releaseModule();
  }
  await expect(page.getByRole('heading', { name: 'Your week, gently gathered', exact: true })).toBeVisible({ timeout: 15_000 });
  await page.locator('.summary-data-details summary').click();
  await expect(page.locator('.recharts-wrapper')).toHaveCount(3);
  await page.reload();
  await page.locator('.summary-data-details summary').click();
  await expect(page.locator('.recharts-wrapper')).toHaveCount(3);
  await expect(page.locator('.recharts-line-dot')).toBeVisible();
  await expect(page.locator('.recharts-pie-sector')).toBeVisible();
  await expect(page.locator('.recharts-bar-rectangle')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('summary-mobile.png'), fullPage: true });
});
