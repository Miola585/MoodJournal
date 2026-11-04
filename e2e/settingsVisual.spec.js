import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const themes = ['Cozy Cafe', 'Garden', 'Sunrise / Sunset', 'Seafoam', 'Night Sky'];

test.beforeEach(async ({ page }) => {
  // Reproduce the upcoming import removal without editing the shared stylesheet.
  const stylesheet = await readFile('src/styles.css', 'utf8');
  const imports = [...stylesheet.matchAll(/@import\s+['"](.+?)['"];/g)]
    .map((match) => match[1])
    .filter((path) => !path.endsWith('/redesign.css'));
  if (stylesheet.includes('/redesign.css')) {
    await page.route(/\/src\/styles\.css(?:\?.*)?$/, (route) => route.fulfill({
      contentType: 'application/javascript',
      body: imports.map((path) => `import ${JSON.stringify(`/src/${path.replace(/^\.\//, '')}?import`)};`).join('\n')
    }));
  }
  await page.addInitScript(() => localStorage.setItem('reduceMotion', 'true'));
});

async function expectContained(page, selector) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator(selector).evaluateAll((elements) => elements.filter((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.left < 0 || bounds.right > innerWidth + 1 || element.scrollWidth > element.clientWidth + 1;
  }).map((element) => element.className))).toEqual([]);
}

for (const width of [390, 1440]) {
  test(`five themes and both color modes remain readable without redesign.css at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto('/preferences');
    const grid = page.getByRole('radiogroup', { name: 'Journal theme' });
    await expect(grid.getByRole('radio')).toHaveCount(5);
    expect(await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(width < 600 ? 2 : 5);
    await page.getByRole('slider').fill('1.3');
    for (const name of themes) {
      const choice = grid.getByRole('radio', { name, exact: true });
      await choice.click();
      await expect(choice).toHaveAttribute('aria-checked', 'true');
      for (const mode of ['light', 'dark']) {
        const label = name === 'Sunrise / Sunset' ? (mode === 'light' ? 'Sunrise' : 'Sunset') : (mode === 'light' ? 'Light' : 'Dark');
        await page.getByRole('button', { name: label, exact: true }).click();
        await expect(page.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
        await expectContained(page, '.theme-preview, .theme-preview-label, .settings-section, .settings-control-grid');
        expect(await grid.locator('img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);
        await page.screenshot({ path: info.outputPath(`${name.replaceAll(' / ', '-')}-${mode}.png`), fullPage: true, animations: 'disabled' });
      }
    }
    expect(await page.locator('.settings-section').evaluateAll((sections) => sections.every((section) => getComputedStyle(section).backgroundColor === 'rgba(0, 0, 0, 0)'))).toBe(true);
    await page.getByLabel('Font style').selectOption('classic');
    await expect(page.locator('.font-style-sample')).toHaveCSS('font-family', /Georgia/);
    await page.getByRole('button', { name: 'Reduced motion', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Reduced motion', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('button', { name: 'Add reminder', exact: true }).click();
    await expect(page.locator('input[type=time]')).toHaveCount(2);
    await page.getByRole('button', { name: 'Remove reminder 2', exact: true }).click();
    await expect(page.locator('input[type=time]')).toHaveCount(1);
  });

  test(`profile and privacy retain security copy and actions at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 960 });
    await page.addInitScript(() => { localStorage.setItem('fontScale', '1.3'); localStorage.setItem('theme', 'dark'); });
    await page.goto('/profile');
    await expect(page.getByText('Saved in this browser', { exact: true })).toBeVisible();
    await expect(page.getByText('0 entries', { exact: true })).toBeVisible();
    await expectContained(page, '.profile-details, .profile-destination');
    await page.screenshot({ path: info.outputPath('profile.png'), fullPage: true, animations: 'disabled' });
    await page.getByRole('link', { name: /Privacy Locks/ }).click();
    await expect(page.locator('.privacy-storage-status')).toContainText('Saved in this browser');
    await expect(page.locator('.privacy-storage-status')).toContainText('Entry encryption is off.');
    await page.getByText('How protection works', { exact: true }).click();
    await expect(page.getByText('PIN and journal locks only hide the interface. They do not encrypt browser storage. Stored-entry encryption protects saved content.')).toBeVisible();
    await expectContained(page, '.privacy-storage-status, .settings-privacy-row');
    await page.screenshot({ path: info.outputPath('privacy.png'), fullPage: true, animations: 'disabled' });

    await page.getByRole('button', { name: 'Set up: App PIN', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('This PIN is stored on this browser and is not encryption. Do not reuse a banking or device PIN.');
    await expect(page.getByRole('button', { name: 'Set PIN', exact: true })).toBeDisabled();
    await page.getByLabel('New app PIN', { exact: true }).fill('1234');
    await expect(page.getByRole('button', { name: 'Set PIN', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Set up: App PIN', exact: true })).toBeFocused();

    await page.getByRole('button', { name: 'Set up: Journal lock', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('This code is stored in your browser; it is an interface lock, not encryption.');
    await expect(page.getByRole('button', { name: 'Enable lock', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Done', exact: true }).click();

    await page.getByRole('button', { name: 'Learn more: Stored-entry encryption', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Losing both the passphrase and recovery key makes saved writing unrecoverable.');
    await expect(page.getByRole('dialog')).toContainText('This does not protect an unlocked journal from a compromised device or browser.');
    await expect(page.getByRole('button', { name: 'Turn on encryption', exact: true })).toBeDisabled();
    await expectContained(page, '.settings-privacy-dialog, .settings-privacy-dialog input');
    await page.screenshot({ path: info.outputPath('encryption.png'), fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export journal', exact: true }).click();
    expect((await download).suggestedFilename()).toMatch(/^mood-journal-.*\.json$/);
    await page.getByLabel('Review backup').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('not JSON') });
    await expect(page.locator('.settings-message')).toBeVisible();
  });
}
