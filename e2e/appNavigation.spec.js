import { expect, test } from '@playwright/test';

const destinations = (page, mobile = false) => page.getByRole('navigation', { name: mobile ? 'Mobile destinations' : 'Main destinations', exact: true });
const journalTabs = (page) => page.locator('.destination-nav:visible .destination-menu');
const exploreTabs = journalTabs;
async function openMenu(page, label) {
  const trigger = page.locator('.destination-nav:visible').getByRole('button', { name: label, exact: true });
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
}

for (const width of [390, 1440]) {
  test(`account pages return to their previous app screen at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/activities?tool=senses');
    await page.getByRole('button', { name: 'Profile menu', exact: true }).click();
    await page.getByRole('navigation', { name: 'Account and help' }).getByRole('button', { name: 'Profile', exact: true }).click();
    await page.getByRole('link', { name: /Preferences/ }).click();
    const back = page.locator('main .page-back');
    await expect(back).toBeVisible();
    await page.screenshot({ path: info.outputPath('preferences-back.png') });
    await back.click();
    await expect(page).toHaveURL(/\/profile$/);
    await back.click();
    await expect(page).toHaveURL(/\/activities\?tool=senses$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/profile$/);
    await page.getByRole('link', { name: /Privacy/ }).click();
    await back.click();
    await expect(page).toHaveURL(/\/profile$/);
  });
}

for (const path of ['/profile', '/preferences', '/privacy', '/settings']) {
  test(`direct ${path} has a safe Today fallback`, async ({ page }) => {
    await page.goto(path);
    await page.locator('main .page-back').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.today-checkin')).toBeVisible();
  });
}

async function expectCurrent(nav, label) {
  await expect(nav.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(nav.locator(':scope > .destination-group > [aria-current="page"], :scope > [data-destination][aria-current="page"]')).toHaveCount(1);
}

async function expectContained(page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
}

async function expectShellControlsFit(page) {
  const report = await page.evaluate(() => {
    const nav = document.querySelector(innerWidth <= 760 ? '.destination-nav-mobile' : '.destination-nav-top');
    const controls = [...document.querySelectorAll('.brand, .profile-menu > button, .header-actions .icon-toggle'), ...nav.querySelectorAll('button')];
    const label = (node) => node.getAttribute('aria-label') || node.textContent.trim();
    const bounds = (node) => ({ name: label(node), ...node.getBoundingClientRect().toJSON() });
    const boxes = controls.map(bounds);
    const regions = [...boxes, { ...bounds(nav), name: 'Destination navigation' }, { ...bounds(document.querySelector('.brand span')), name: 'Brand text' }];
    const issues = [];
    for (const box of regions) {
      if (box.width <= 0 || box.height <= 0 || box.left < -1 || box.right > innerWidth + 1 || box.top < -1 || box.bottom > innerHeight + 1) issues.push(`${box.name} outside viewport: ${JSON.stringify(box)}`);
    }
    for (let first = 0; first < boxes.length; first++) {
      for (let second = first + 1; second < boxes.length; second++) {
        const a = boxes[first];
        const b = boxes[second];
        if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) issues.push(`${a.name} overlaps ${b.name}`);
      }
      const box = boxes[first];
      for (const fraction of [0.25, 0.5, 0.75]) {
        const target = document.elementFromPoint(box.left + box.width * fraction, box.top + box.height / 2);
        if (!controls[first].contains(target)) issues.push(`${box.name} hit target at ${fraction}: ${target?.closest('button')?.getAttribute('aria-label') || target?.tagName || 'outside viewport'}`);
      }
    }
    return { viewport: { width: innerWidth, height: innerHeight }, regions, issues };
  });
  await test.info().attach('shell-control-bounds', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
  expect(report.issues, `Shell control geometry at ${report.viewport.width}px`).toEqual([]);
}

test('desktop destinations and contextual tabs follow routes, history, and refresh', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const nav = destinations(page);
  await expect(nav.getByRole('button')).toHaveText(['Today', 'My journal', 'Little breaks']);
  await expect(destinations(page, true)).toBeHidden();
  await expectCurrent(nav, 'Today');
  await expect(page.locator('.today-checkin').getByRole('button')).toHaveText(['Check in']);
  await page.getByRole('button', { name: 'Check in', exact: true }).click();
  await expect(page).toHaveURL(/\/checkin$/);
  await expectCurrent(nav, 'Today');
  await page.getByRole('button', { name: 'Close check-in', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);

  await openMenu(page, 'My journal');
  await journalTabs(page).getByRole('button', { name: 'Write', exact: true }).click();
  await expect(page).toHaveURL(/\/journal\/write$/);
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toBeVisible();
  await expectCurrent(nav, 'My journal');
  await openMenu(page, 'My journal');
  await expect(journalTabs(page).locator('button[data-destination]')).toHaveText(['Write', 'Entries', 'Library', 'Calendar', 'Weekly reflection']);
  await expectCurrent(journalTabs(page), 'Write');
  await expect(page.locator('.journal-editor-context').getByRole('button', { name: 'New entry', exact: true })).toBeVisible();
  for (const [tab, route] of [['Entries', '/entries'], ['Library', '/journal/library'], ['Calendar', '/calendar'], ['Weekly reflection', '/summary']]) {
    await openMenu(page, 'My journal');
    await journalTabs(page).getByRole('button', { name: tab, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await page.locator(route === '/summary' ? '.summary-screen' : route === '/calendar' ? '.calendar-screen' : '.entries-screen').waitFor();
    await openMenu(page, 'My journal');
    await expectCurrent(journalTabs(page), tab);
    await expectCurrent(nav, 'My journal');
    await expect(page.locator('.journal-editor-context')).toHaveCount(0);
  }
  await page.goBack();
  await expect(page).toHaveURL(/\/calendar$/);
  await openMenu(page, 'My journal');
  await expectCurrent(journalTabs(page), 'Calendar');
  await page.goForward();
  await expect(page).toHaveURL(/\/summary$/);
  await page.reload();
  await openMenu(page, 'My journal');
  await expectCurrent(journalTabs(page), 'Weekly reflection');

  await openMenu(page, 'Little breaks');
  await exploreTabs(page).getByRole('button', { name: 'All activities', exact: true }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expectCurrent(nav, 'Little breaks');
  await openMenu(page, 'Little breaks');
  await expect(exploreTabs(page).locator('button[data-destination]')).toHaveText(['All activities', 'Breathe', 'Five senses', 'Scavenger hunt', 'Mood Colors', 'Sticker collection']);
  await openMenu(page, 'Little breaks');
  await expectCurrent(exploreTabs(page), 'All activities');
  await exploreTabs(page).getByRole('button', { name: 'Sticker collection', exact: true }).click();
  await expect(page).toHaveURL(/\/explore\/stickers$/);
  await openMenu(page, 'Little breaks');
  await expectCurrent(exploreTabs(page), 'Sticker collection');
  await page.reload();
  await openMenu(page, 'Little breaks');
  await expectCurrent(exploreTabs(page), 'Sticker collection');
  await page.goBack();
  await expect(page).toHaveURL(/\/explore$/);
  await openMenu(page, 'Little breaks');
  await expectCurrent(exploreTabs(page), 'All activities');
});

test('legacy games redirect replaces history and preserves Explore metadata', async ({ page }) => {
  await page.goto('/entries');
  await page.goto('/games');
  await expect(page).toHaveURL(/\/explore$/);
  await expectCurrent(destinations(page), 'Little breaks');
  await openMenu(page, 'Little breaks');
  await expectCurrent(exploreTabs(page), 'All activities');
  await page.goBack();
  await expect(page).toHaveURL(/\/entries$/);
  await openMenu(page, 'My journal');
  await expectCurrent(journalTabs(page), 'Entries');
  await page.goForward();
  await expect(page).toHaveURL(/\/explore$/);
});

for (const width of [390, 1280]) {
  test(`Profile menu routes and keyboard dismissal at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Profile menu', exact: true });
    const menu = page.getByRole('navigation', { name: 'Account and help', exact: true });
    await expect(trigger).toHaveAttribute('aria-controls', 'profile-navigation');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Admin', exact: true })).toHaveCount(0);
    await expect(menu.getByRole('button', { name: 'Game archive', exact: true })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
    for (const [label, route] of [['Profile', '/profile'], ['Preferences', '/preferences'], ['Privacy', '/privacy'], ['About', '/about'], ['Help & feedback', '/support']]) {
      await trigger.click();
      await menu.getByRole('button', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${route}$`));
      await expect(menu).toHaveCount(0);
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    }
    await trigger.click();
    await page.getByRole('main').click({ position: { x: 1, y: 1 } });
    await expect(menu).toHaveCount(0);
  });
}

for (const width of [320, 390, 560, 760, 761]) {
  test(`navigation fits ${width}px with enlarged text and correct mobile breakpoint`, async ({ page }) => {
    const mobile = width <= 760;
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem('fontScale', '1.5');
      localStorage.setItem('reduceMotion', 'true');
    });
    await page.goto('/');
    const nav = destinations(page, mobile);
    await expect(nav).toBeVisible();
    await expect(destinations(page, !mobile)).toBeHidden();
    await expect(nav.getByRole('button')).toHaveText(['Today', 'My journal', 'Little breaks']);
    if (width === 320 || width === 761) {
      await expectShellControlsFit(page);
      await page.evaluate(() => document.fonts.ready);
      await expectShellControlsFit(page);
    }
    if (mobile) {
      expect(await nav.evaluate((node) => getComputedStyle(node).position)).toBe('fixed');
      const box = await nav.boundingBox();
      expect(box.y + box.height).toBeLessThanOrEqual(900);
      expect(box.y).toBeGreaterThan(700);
    }
    for (const [label, route] of [['My journal', '/journal/write'], ['Little breaks', '/explore'], ['Today', '/']]) {
      await nav.getByRole('button', { name: label, exact: true }).click();
      if (label !== 'Today') await nav.getByRole('button', { name: label === 'My journal' ? 'Write' : 'All activities', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${route}$`));
      await expectCurrent(nav, label);
      await expectContained(page);
      if (width === 320 || width === 761) await expectShellControlsFit(page);
    }
    for (const [route, label] of [['/entries', 'Entries'], ['/calendar', 'Calendar'], ['/summary', 'Weekly reflection'], ['/journal/write', 'Write']]) {
      await page.goto(route);
      await openMenu(page, 'My journal');
      const tabs = journalTabs(page);
      await expectCurrent(tabs, label);
      await expectCurrent(nav, 'My journal');
      await expectContained(page);
      await expect(page.locator('.context-header')).toHaveCount(0);
      await page.keyboard.press('Escape');
    }
    await page.goto('/explore/stickers');
    await openMenu(page, 'Little breaks');
  await expectCurrent(exploreTabs(page), 'Sticker collection');
    await expectContained(page);
  });
}
