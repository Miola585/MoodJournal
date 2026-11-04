import { expect, test } from '@playwright/test';

async function mockNotifications(page, outcome = 'granted') {
  await page.addInitScript((result) => {
    window.notificationRequests = 0;
    window.deliveredNotifications = [];
    class FakeNotification {
      static permission = 'default';
      static async requestPermission() { window.notificationRequests++; this.permission = result; return result; }
      constructor(title, options) { window.deliveredNotifications.push({ title, ...options }); }
    }
    window.Notification = FakeNotification;
  }, outcome);
}

test('newsletter redirects with history replacement and has no navigation entry', async ({ page }) => {
  await page.goto('/entries');
  await page.goto('/newsletter');
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.locator('.newsletter-form')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/entries$/);
  await page.goto('/settings');
  await expect(page.getByRole('button', { name: 'Community updates' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Profile menu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Newsletter', exact: true })).toHaveCount(0);
});

for (const width of [1280, 390]) {
  test(`settings and reminder menu share permission and enabled state at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark'); localStorage.setItem('siteTheme', 'night');
      localStorage.setItem('fontScale', '1.5');
    });
    await mockNotifications(page);
    await page.goto('/settings');
    expect(await page.evaluate(() => window.notificationRequests)).toBe(0);
    await page.getByRole('button', { name: 'Turn reminders on', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Turn reminders off', exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.notificationRequests)).toBe(1);
    await page.getByRole('button', { name: 'Add reminder', exact: true }).click();
    await expect(page.locator('.reminder-time-list input')).toHaveCount(2);
    await page.getByRole('button', { name: 'Profile menu', exact: true }).click();
    await page.getByRole('button', { name: 'Reminder settings', exact: true }).click();
    await expect(page.locator('.reminder-menu')).toContainText('Reminders are on while this app is open.');
    await page.locator('.reminder-menu').getByRole('button', { name: 'Turn off', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Turn reminders on', exact: true })).toHaveCount(1);
    await expect(page.locator('.reminder-menu')).toContainText('Reminders are off.');
    const menu = page.getByRole('navigation', { name: 'Account and help', exact: true });
    const menuBounds = await menu.evaluate((node) => {
      const box = node.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight };
    });
    expect(menuBounds.left >= 0 && menuBounds.right <= menuBounds.viewportWidth + 1 && menuBounds.top >= 0 && menuBounds.bottom <= menuBounds.viewportHeight, `Profile reminder menu must fit the viewport: ${JSON.stringify(menuBounds)}`).toBe(true);
    await page.screenshot({ path: info.outputPath(`reminders-${width}.png`) });
    expect(await page.locator('.reminder-menu').evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('journalReminder')).enabled)).toBe(false);
    for (const height of [900, 500]) {
      await page.setViewportSize({ width, height });
      const bounds = await menu.evaluate((node) => {
        node.scrollTop = node.scrollHeight;
        const box = node.getBoundingClientRect();
        const nav = document.querySelector('.destination-nav-mobile');
        const navTop = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect().top : innerHeight;
        const last = node.querySelector('.reminder-menu p:last-of-type').getBoundingClientRect();
        const scrollTop = node.scrollTop;
        node.scrollTop += last.top - box.top - 10;
        const start = node.querySelector('.reminder-menu p:last-of-type').getBoundingClientRect();
        return { top: box.top, bottom: box.bottom, limit: navTop, startTop: start.top, lastBottom: last.bottom, scrollTop };
      });
      expect(bounds.top).toBeGreaterThanOrEqual(0);
      expect(bounds.bottom, `Profile menu clears bottom navigation at ${width}x${height}`).toBeLessThanOrEqual(bounds.limit);
      expect(bounds.scrollTop).toBeGreaterThan(0);
      expect(bounds.startTop).toBeGreaterThanOrEqual(bounds.top);
      expect(bounds.startTop).toBeLessThan(bounds.bottom);
      expect(bounds.lastBottom).toBeGreaterThan(bounds.top);
      expect(bounds.lastBottom).toBeLessThanOrEqual(bounds.bottom);
    }
  });
}

test('denied and unsupported permission never claims reminders are working', async ({ page }) => {
  await mockNotifications(page, 'denied');
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Turn reminders on', exact: true }).click();
  await expect(page.getByText(/Notifications are blocked/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Turn reminders on', exact: true })).toBeVisible();
  await page.evaluate(() => { window.Notification = undefined; window.dispatchEvent(new Event('focus')); });
  await expect(page.getByText('Notifications are not supported in this browser.')).toBeVisible();
});

test('notification delivery errors and preference write failures are visible', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 0, 1, 18, 59, 50) });
  await mockNotifications(page);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Turn reminders on', exact: true }).click();
  await page.evaluate(() => {
    window.Notification = class { static permission = 'granted'; constructor() { throw new Error('Browser blocked delivery'); } };
  });
  await page.clock.runFor(10000);
  await expect(page.getByText(/browser could not deliver a reminder/)).toBeVisible();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key === 'journalReminder') throw new Error('Storage full'); return original.call(this, key, value); };
  });
  await page.getByRole('button', { name: 'Turn reminders off', exact: true }).click();
  await expect(page.getByText(/preferences could not be saved/)).toBeVisible();
});
