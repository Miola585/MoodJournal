import { expect, test } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`privacy settings stay compact and dialogs work at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    if (width === 1440) await page.addInitScript(() => {
      localStorage.setItem('siteTheme', 'night');
      localStorage.setItem('theme', 'dark');
    });
    await page.goto('/settings');
    const setup = page.getByRole('button', { name: 'Set up: Journal lock', exact: true });
    await expect(page.locator('.settings-privacy-row')).toHaveCount(3);
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await setup.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`privacy-rows-${width}.png`) });
    await setup.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading')).toBeFocused();
    const appearance = await dialog.evaluate((node) => ({
      background: getComputedStyle(node).backgroundColor,
      backdrop: getComputedStyle(node, '::backdrop').backdropFilter,
    }));
    expect(appearance.background).toMatch(/^rgb\(/);
    expect(appearance.backdrop).toBe('blur(12px)');
    await dialog.getByLabel('Journal lock', { exact: true }).fill('my private cover');
    await page.screenshot({ path: testInfo.outputPath(`privacy-setup-${width}.png`) });
    expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(setup).toBeFocused();
    await setup.click();
    await expect(dialog.getByLabel('Journal lock', { exact: true })).toHaveValue('');
    await dialog.getByLabel('Journal lock', { exact: true }).fill('my private cover');
    await dialog.getByRole('button', { name: 'Enable lock', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const manage = page.getByRole('button', { name: 'Manage: Journal lock' });
    await manage.click();
    await dialog.getByRole('button', { name: 'Remove lock' }).click();
    await dialog.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(setup).toBeVisible();

    await page.getByRole('button', { name: 'Set up: App PIN' }).click();
    await dialog.getByLabel('New app PIN').fill('12');
    await expect(dialog.getByRole('button', { name: 'Set PIN', exact: true })).toBeDisabled();
    await dialog.getByLabel('New app PIN').fill('1234');
    await expect(dialog.getByRole('button', { name: 'Set PIN', exact: true })).toBeEnabled();
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => localStorage.getItem('journalPin'))).toBeNull();

    await page.getByRole('button', { name: 'Learn more: Stored-entry encryption' }).click();
    await dialog.getByLabel('Journal passphrase', { exact: true }).fill('four unrelated words here');
    await dialog.getByLabel('Confirm passphrase').fill('not the same phrase');
    await dialog.getByRole('button', { name: 'Turn on encryption', exact: true }).click();
    await expect(dialog.getByRole('status')).toHaveText('The two passphrases do not match.');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
}

test('encryption recovery key remains available until acknowledged', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Learn more: Stored-entry encryption' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Journal passphrase', { exact: true }).fill('four unrelated words here');
  await dialog.getByLabel('Confirm passphrase').fill('four unrelated words here');
  await dialog.getByRole('button', { name: 'Turn on encryption', exact: true }).click();
  await expect(dialog.getByText('Save this recovery key now')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close privacy settings' })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Lock journal now' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'I stored it safely' }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Manage: Stored-entry encryption' })).toBeVisible();
});

test('app PIN can be set, unlocked and removed through its dialog', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Set up: App PIN' }).click();
  await page.getByLabel('New app PIN').fill('1234');
  await page.getByRole('button', { name: 'Set PIN', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Journal Locked' })).toBeVisible();
  await page.getByLabel('Enter PIN', { exact: true }).fill('1234');
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await page.getByRole('button', { name: 'Manage: App PIN' }).click();
  await expect(page.getByLabel('New app PIN')).toHaveValue('');
  await page.getByRole('button', { name: 'Remove PIN', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Set up: App PIN' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('journalPin'))).toBeNull();
});
