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
  await page.getByRole('button', { name: 'More', exact: true }).click();
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
    const navigation = page.getByRole('button', { name: 'Open navigation', exact: true });
    if (await navigation.isVisible()) await navigation.click();
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('button', { name: 'Reminder settings', exact: true }).click();
    await expect(page.locator('.reminder-menu')).toContainText('Reminders are on while this app is open.');
    await page.locator('.reminder-menu').getByRole('button', { name: 'Turn off', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Turn reminders on', exact: true })).toHaveCount(1);
    await expect(page.locator('.reminder-menu')).toContainText('Reminders are off.');
    await page.screenshot({ path: info.outputPath(`reminders-${width}.png`) });
    expect(await page.locator('.reminder-menu').evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('journalReminder')).enabled)).toBe(false);
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
