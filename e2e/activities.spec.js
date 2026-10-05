import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`activities use one illustrated picker at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/activities');
    const feature = page.locator('.activity-feature');
    const title = feature.getByRole('heading');
    const firstTitle = await title.innerText();
    await expect(feature).toHaveCount(1);
    await expect(page.locator('.activity-selector')).toHaveCount(0);
    await expect(page.locator('.activity-journal-sheet:visible')).toHaveCount(0);
    await expect(feature).toContainText('Suggested for today');
    expect(await feature.locator('.activity-feature-art').evaluate((art) => getComputedStyle(art).backgroundImage)).not.toBe('none');
    const next = page.getByRole('button', { name: 'Next activity', exact: true });
    await next.click();
    await expect(title).not.toHaveText(firstTitle);
    await expect(next).toBeFocused();
    await expect(feature.getByRole('status')).toContainText('2 / 3');
    await page.getByRole('button', { name: 'Previous activity', exact: true }).click();
    await expect(title).toHaveText(firstTitle);
    await page.getByRole('button', { name: 'Previous activity', exact: true }).click();
    await expect(feature.getByRole('status')).toContainText('3 / 3');
    await next.click();
    await expect(title).toHaveText(firstTitle);
    await page.screenshot({ path: testInfo.outputPath(`activities-picker-${viewport.width}.png`), fullPage: true });
    await feature.getByRole('button', { name: 'Begin activity' }).click();
    const sheet = page.locator('.activity-journal-sheet:visible');
    await expect(sheet).toBeFocused();
    await expect(sheet.getByRole('heading', { name: firstTitle })).toBeVisible();
    await expect(sheet.getByRole('checkbox')).toHaveCount(1);
    await page.screenshot({ path: testInfo.outputPath(`activities-open-${viewport.width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await sheet.getByRole('button', { name: 'Close activity' }).click();
    await expect(feature.getByRole('button', { name: 'Begin activity' })).toBeFocused();
    await expect(page.locator('.activity-journal-sheet:visible')).toHaveCount(0);
  });
}

test('browsing pauses an activity and preserves its timer, note and completion', async ({ page }) => {
  await page.goto('/activities');
  const feature = page.locator('.activity-feature');
  await feature.getByRole('button', { name: 'Begin activity' }).click();
  const sheet = page.locator('.activity-journal-sheet:visible');
  await sheet.getByRole('textbox').fill('A small pause helped.');
  const startTime = await sheet.locator('.activity-timer strong').innerText();
  await sheet.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(sheet.locator('.activity-timer strong')).not.toHaveText(startTime);
  await page.getByRole('button', { name: 'Next activity', exact: true }).click();
  await expect(page.locator('.activity-journal-sheet:visible')).toHaveCount(0);
  await page.getByRole('button', { name: 'Previous activity', exact: true }).click();
  await feature.getByRole('button', { name: 'Begin activity' }).click();
  await expect(sheet.getByRole('textbox')).toHaveValue('A small pause helped.');
  await expect(sheet.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
  const pausedTime = await sheet.locator('.activity-timer strong').innerText();
  await page.waitForTimeout(1100);
  await expect(sheet.locator('.activity-timer strong')).toHaveText(pausedTime);
  await sheet.getByText('Mark complete', { exact: true }).click();
  await expect(sheet.getByRole('checkbox', { name: 'Mark complete' })).toBeChecked();
  await sheet.getByRole('button', { name: 'Close activity' }).click();
  await expect(feature).toContainText('Completed today');
  await expect(feature.getByRole('button', { name: 'Open activity' })).toBeVisible();
  await page.reload();
  await expect(feature).toContainText('Completed today');
  await feature.getByRole('button', { name: 'Open activity' }).click();
  await expect(sheet.getByRole('textbox')).toHaveValue('A small pause helped.');
});
