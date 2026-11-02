import { expect, test } from '@playwright/test';

for (const width of [320, 390, 820, 1440]) {
  test(`studio menus, page Back and writing actions at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: width <= 760 ? 'Mobile destinations' : 'Main destinations', exact: true });
    const journal = nav.getByRole('button', { name: 'My journal', exact: true });
    await journal.focus();
    await page.keyboard.press('Enter');
    await expect(journal).toHaveAttribute('aria-expanded', 'true');
    await expect(nav.getByRole('button', { name: 'Write', exact: true })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(nav.getByRole('button', { name: 'Entries', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(journal).toBeFocused();
    await journal.click();
    await nav.getByRole('button', { name: 'Write', exact: true }).click();
    await expect(page).toHaveURL(/\/journal\/write$/);
    await expect(page.locator('main .journal-editor-context')).toBeVisible();
    await expect(page.locator('.context-header')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('write.png'), fullPage: true });
    await page.getByRole('button', { name: 'Profile menu', exact: true }).click();
    await page.getByRole('navigation', { name: 'Account and help' }).getByRole('button', { name: 'Preferences', exact: true }).click();
    await expect(page.locator('main .page-back')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath('preferences.png'), fullPage: true });
    await page.locator('main .page-back').click();
    await expect(page).toHaveURL(/\/journal\/write$/);
    await page.goto('/privacy');
    await page.screenshot({ path: info.outputPath('privacy.png'), fullPage: true });
  });
}

test('desktop menu has no repeated title and dismisses outside without losing a draft', async ({ page }) => {
  await page.goto('/journal/write');
  await page.getByRole('textbox', { name: 'Journal entry', exact: true }).fill('Keep this page.');
  const nav = page.getByRole('navigation', { name: 'Main destinations', exact: true });
  await nav.getByRole('button', { name: 'My journal', exact: true }).click();
  await expect(nav.locator('.destination-menu-heading')).toHaveCount(0);
  await page.locator('main').click({ position: { x: 2, y: 2 } });
  await expect(nav.locator('.destination-menu')).toHaveCount(0);
  await nav.getByRole('button', { name: 'Little breaks', exact: true }).click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await nav.getByRole('button', { name: 'Breathe', exact: true }).click();
  await expect(page).toHaveURL(/\/journal\/write$/);
  await expect(page.getByRole('textbox', { name: 'Journal entry', exact: true })).toContainText('Keep this page.');
});

test('senses progress survives reload, allows Back and resets explicitly', async ({ page }) => {
  await page.goto('/activities?tool=senses');
  await expect(page.locator('.sense-step')).toContainText('5 things you can see');
  await page.getByRole('button', { name: 'I noticed', exact: true }).click();
  await expect(page.locator('.sense-step')).toContainText('4 things you can feel');
  await page.reload();
  await expect(page.locator('.sense-step')).toContainText('4 things you can feel');
  await page.locator('.sense-actions').getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('.sense-step')).toContainText('5 things you can see');
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'I noticed', exact: true }).click();
  await expect(page.getByText('Grounding complete', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('.sense-progress')).toHaveAttribute('aria-label', '0 of 5 senses noticed');
});

test('preferences apply immediately and persist without a Save button', async ({ page }) => {
  await page.goto('/preferences');
  await page.getByRole('radio', { name: 'Seafoam', exact: true }).click();
  await expect(page.locator('.app')).toHaveClass(/theme-ocean/);
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.app')).toHaveClass(/theme-ocean/);
});

test('Today glass cards contain their captions and keep hover text readable', async ({ page }, info) => {
  await page.addInitScript(() => {
    localStorage.setItem('siteTheme', 'sunrise');
    localStorage.setItem('theme', 'light');
  });
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const cards = page.locator('.today-world-grid .today-jar');
    await expect(cards).toHaveCount(3);
    await expect(cards.locator('img')).toHaveCount(0);
    await expect(cards.locator('svg.destination-art')).toHaveCount(3);
    for (const card of await cards.all()) {
      await card.scrollIntoViewIfNeeded();
      const normalColor = await card.locator('strong').evaluate((element) => getComputedStyle(element).color);
      await card.hover();
      const result = await card.evaluate((element) => {
        const style = getComputedStyle(element);
        const title = element.querySelector('strong');
        const outer = element.getBoundingClientRect();
        const inner = title.getBoundingClientRect();
        return {
          border: parseFloat(style.borderTopWidth),
          blur: style.backdropFilter,
          color: getComputedStyle(title).color,
          captionSurface: getComputedStyle(title).backgroundColor,
          sceneColor: getComputedStyle(element.querySelector('stop')).stopColor,
          inside: inner.top >= outer.top && inner.bottom <= outer.bottom && inner.left >= outer.left && inner.right <= outer.right,
          fullScene: element.querySelector('.destination-art').getBoundingClientRect().width >= outer.width - 2
        };
      });
      expect(result.border).toBeGreaterThan(0);
      expect(result.blur).toContain('blur');
      expect(result.color).toBe(normalColor);
      expect(result.captionSurface).not.toBe('rgba(0, 0, 0, 0)');
      expect(result.sceneColor).not.toBe('rgb(0, 0, 0)');
      expect(result.inside).toBe(true);
      expect(result.fullScene).toBe(true);
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.locator('.today-world').screenshot({ path: info.outputPath(`glass-cards-${width}.png`) });
  }
});
