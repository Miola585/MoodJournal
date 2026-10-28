import { expect, test } from '@playwright/test';

const intersects = (first, second) => first.left < second.right && first.right > second.left
  && first.top < second.bottom && first.bottom > second.top;

async function assertContained(page) {
  const excess = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(excess).toBeLessThanOrEqual(1);
}

for (const [width, height] of [[320, 700], [390, 844], [768, 900], [1440, 900]]) {
  test(`core screens fit ${width}px at enlarged text`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => {
      localStorage.setItem('siteTheme', 'warm');
      localStorage.setItem('theme', 'light');
      localStorage.setItem('fontScale', '1.3');
    });
    for (const route of ['/', '/checkin', '/entries', '/settings']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await assertContained(page);
      await page.screenshot({ path: info.outputPath(`${width}-${route === '/' ? 'home' : route.slice(1)}.png`) });
    if (route === '/' && width <= 560) {
      const help = await page.locator('.support-help-bubble').boundingBox();
      const arrow = await page.locator('.home-space-card').first().locator('.home-space-open svg').boundingBox();
      expect(intersects(help, arrow)).toBe(false);
    }
    }
    await page.goto('/checkin', { waitUntil: 'domcontentloaded' });
    if (width <= 560) {
      const help = await page.getByRole('button', { name: 'Help & feedback' }).boundingBox();
      const title = await page.getByRole('heading', { name: 'Daily Mood Check-In' }).boundingBox();
      expect(intersects(help, title)).toBe(false);
      await expect(page.locator('.support-help-bubble')).toBeHidden();
    }
    await page.getByRole('button', { name: /Happy$/ }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByRole('heading', { name: /kind of happy/i })).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.locator('.journal-writing-field textarea').fill('A small note about today.');
    await expect(page.getByRole('button', { name: 'Save Check-In' })).toBeEnabled();
    await page.getByRole('button', { name: 'Continue to context' }).click();
    await expect(page.getByRole('heading', { name: 'Add anything that might help later.' })).toBeVisible();
  });
}

test('phone filters keep their values, and writing controls do not collide', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/entries', { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'Keyword search' }).fill('quiet');
  await expect(page.getByRole('textbox', { name: 'Tag search' })).toBeHidden();
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tag search' }).fill('#rest');
  await page.getByRole('button', { name: 'Bookmarked', exact: true }).click();
  await page.getByRole('button', { name: /Filters/ }).click();
  await expect(page.getByRole('textbox', { name: 'Keyword search' })).toHaveValue('quiet');
  await page.getByRole('button', { name: /Filters/ }).click();
  await expect(page.getByRole('textbox', { name: 'Tag search' })).toHaveValue('#rest');
  await expect(page.getByRole('button', { name: 'Bookmarked', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('button', { name: 'New free write' }).click();
  await page.screenshot({ path: info.outputPath('phone-editor.png') });
  const help = await page.getByRole('button', { name: 'Help & feedback' }).boundingBox();
  const save = await page.getByRole('button', { name: 'Save page' }).boundingBox();
  const title = await page.getByRole('textbox', { name: 'Title', exact: true }).boundingBox();
  const bookmark = await page.locator('.freewrite-notebook .notebook-page-corner').boundingBox();
  expect(intersects(help, save)).toBe(false);
  expect(intersects(title, bookmark)).toBe(false);
  await expect(page.locator('.support-help-bubble')).toBeHidden();
  await assertContained(page);
  await page.getByRole('button', { name: 'Help & feedback' }).click();
  await expect(page).toHaveURL(/\/support$/);
});

test('mobile Help opens support and theme swatches remain compact', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/checkin', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Help & feedback' }).click();
  await expect(page).toHaveURL(/\/support$/);
  await page.goto('/settings', { waitUntil: 'domcontentloaded' });
  const themeGrid = page.locator('.theme-preview-grid');
  await expect(themeGrid.getByRole('radio')).toHaveCount(5);
  await expect.poll(() => themeGrid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(2);
});

test('Night Sky mobile art and editor controls stay clear', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.addInitScript(() => {
    localStorage.setItem('siteTheme', 'night');
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('fontScale', '1.3');
  });
  await page.goto('/entries', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'New free write' }).click();
  await page.screenshot({ path: info.outputPath('night-editor-320.png') });
  await assertContained(page);
  await expect(page.getByRole('button', { name: 'Add note' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save page' })).toBeVisible();
});

test('another mood moment keeps its compact mobile actions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/checkin', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Calm$/ }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.locator('.journal-writing-field textarea').fill('A quiet morning.');
  await page.getByRole('button', { name: 'Save Check-In' }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('journalEntriesV2'))?.entries?.length)).toBe(1);
  await page.goto('/checkin', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'How are you feeling now?' })).toBeVisible();
  await page.getByRole('button', { name: /Happy$/ }).click();
  await expect(page.getByRole('button', { name: 'Save mood moment' })).toBeEnabled();
  await assertContained(page);
});

test('other theme artwork stays clear of Home headings on phones', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ['garden', 'sunrise', 'ocean']) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((value) => localStorage.setItem('siteTheme', value), theme);
    await page.reload({ waitUntil: 'domcontentloaded' });
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    const art = page.locator('.theme-art-image:visible');
    await expect(art).toHaveCount(1);
    expect(intersects(await art.boundingBox(), await heading.boundingBox())).toBe(false);
    await assertContained(page);
    await page.screenshot({ path: info.outputPath(`${theme}-home-phone.png`) });
  }
});
