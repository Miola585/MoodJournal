import { expect, test } from '@playwright/test';

const dateKey = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
};

const entries = [
  { id: 'sky-low', mood: 'Calm', intensity: 2, dateKey: dateKey(2) },
  { id: 'sky-medium', mood: 'Content', intensity: 5, dateKey: dateKey(1) },
  { id: 'sky-high', mood: 'Happy', intensity: 9, dateKey: dateKey(0) }
].map((entry) => ({ ...entry, type: 'checkin', created: `${entry.dateKey}T12:00:00`, primary: true, tags: [] }));

test.beforeEach(async ({ page }) => {
  await page.addInitScript((seed) => {
    localStorage.setItem('journalEntriesV2', JSON.stringify(seed));
  }, entries);
});

test('journal night sky shows shaped stars and a visible glow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/games');
  const stars = page.locator('.galaxy-map .galaxy-star');
  await expect(stars).toHaveCount(3);
  const pointCounts = await stars.locator('.galaxy-star-core').evaluateAll((polygons) => (
    polygons.map((polygon) => polygon.points.numberOfItems)
  ));
  expect(pointCounts).toEqual([8, 10, 12]);
  await expect(stars.nth(0)).toHaveAttribute('aria-label', /4-point star/u);
  await expect(stars.nth(1)).toHaveAttribute('aria-label', /5-point star/u);
  await expect(stars.nth(2)).toHaveAttribute('aria-label', /6-point star/u);
  await page.screenshot({ path: testInfo.outputPath('night-sky-desktop.png'), fullPage: true });
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`immersive games fill ${viewport.width}px viewport without app chrome`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/games/garden');
    await expect(page.getByRole('heading', { name: 'Your pocket garden.' })).toBeVisible();
    await expect(page.locator('.topbar, .footer, .support-help-bubble')).toHaveCount(0);
    await expect(page.locator('.garden-plant')).not.toHaveCount(0);
    await expect(page.locator('.game-route-shell')).toHaveJSProperty('offsetTop', 0);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).not.toBe('rgb(243, 232, 223)');
    await page.getByText('How to play').click();
    await expect(page.getByText('Choose a plant to see what it reflects.')).toBeVisible();
    await page.getByText('How to play').click();
    await page.screenshot({ path: testInfo.outputPath(`garden-${viewport.width}.png`), fullPage: true });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

    await page.getByRole('button', { name: 'Back to games' }).click();
    await expect(page.locator('.topbar')).toBeVisible();
    await page.goto('/games/constellation');
    await expect(page.locator('.topbar, .footer, .support-help-bubble')).toHaveCount(0);
    await expect(page.locator('.constellation-stage')).toBeVisible();
    await expect(page.locator('.game-route-shell')).toHaveJSProperty('offsetTop', 0);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).not.toBe('rgb(243, 232, 223)');
    await page.getByText('How to play').click();
    await expect(page.getByText('Drag between two stars, or tap one and then another.')).toBeVisible();
    await page.getByText('How to play').click();
    const geometry = await page.evaluate(() => ({
      headerBottom: document.querySelector('.immersive-route-header').getBoundingClientRect().bottom,
      firstStarTop: document.querySelector('.constellation-stage .star').getBoundingClientRect().top,
      ideaTops: [...document.querySelectorAll('.constellation-prompt-chips span')].map((chip) => chip.getBoundingClientRect().top),
      starTops: [...document.querySelectorAll('.constellation-stage .star')].map((star) => star.getBoundingClientRect().top),
      speckRepeat: getComputedStyle(document.querySelector('.constellation-stage'), '::before').backgroundRepeat
    }));
    expect(geometry.firstStarTop).toBeGreaterThan(geometry.headerBottom);
    expect(new Set(geometry.ideaTops).size).toBe(1);
    expect(Math.max(...geometry.starTops) - Math.min(...geometry.starTops)).toBeGreaterThan(viewport.height * 0.38);
    expect(geometry.speckRepeat).toContain('no-repeat');
    await page.screenshot({ path: testInfo.outputPath(`constellation-${viewport.width}.png`), fullPage: true });
    const firstStar = page.getByRole('button', { name: 'Star 1', exact: true });
    const spriteImage = () => firstStar.locator('.playable-star-sprite').evaluate((sprite) => getComputedStyle(sprite).backgroundImage);
    const restingSprite = await spriteImage();
    await firstStar.hover();
    const activeSprite = await spriteImage();
    expect(activeSprite).not.toBe(restingSprite);
    await firstStar.click();
    await page.getByRole('button', { name: 'Star 2', exact: true }).click();
    await expect(page.locator('.mini-insight')).toContainText('1 connection');
    expect(await spriteImage()).toBe(activeSprite);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.locator('.mini-insight')).toContainText('0 connections');
    const start = await firstStar.boundingBox();
    const end = await page.getByRole('button', { name: 'Star 3', exact: true }).boundingBox();
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await page.mouse.down();
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2 - 45);
    const previewLine = page.locator('.preview-lines line');
    await expect(previewLine).toHaveAttribute('visibility', 'visible');
    await expect.poll(() => previewLine.evaluate((line) => line.style.getPropertyValue('--preview-color'))).toBe('#d8c8ff');
    await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 10 });
    await expect.poll(() => previewLine.evaluate((line) => line.style.getPropertyValue('--preview-color'))).toBe('#ffe2a3');
    await expect(page.getByRole('button', { name: 'Star 3', exact: true })).toHaveClass(/valid-target/u);
    await page.mouse.up();
    await expect(page.locator('.mini-insight')).toContainText('1 connection');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

    await page.goto('/games/orbit');
    await expect(page.locator('.topbar, .footer, .support-help-bubble')).toHaveCount(0);
    await expect(page.locator('.orbit-map')).toBeVisible();
    await expect(page.locator('.game-route-shell')).toHaveJSProperty('offsetTop', 0);
    await expect(page.locator('.orbit-ring-line')).toHaveCount(3);
    expect(await page.locator('.orbit-ring-line').first().evaluate((ring) => getComputedStyle(ring).fill)).toBe('none');
    await page.screenshot({ path: testInfo.outputPath(`orbit-${viewport.width}.png`), fullPage: true });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}

test('mood orbit selects without moving, supports distances and saves a reflection', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/games/orbit');
  const emotion = page.getByRole('button', { name: 'Move Emotions planet' });
  const originalPosition = await emotion.evaluate((planet) => `${planet.style.left},${planet.style.top}`);
  await emotion.click();
  await expect(emotion).toHaveAttribute('aria-pressed', 'true');
  expect(await emotion.evaluate((planet) => `${planet.style.left},${planet.style.top}`)).toBe(originalPosition);
  await page.getByRole('group', { name: 'Move selected planet' }).getByRole('button', { name: /Further away/u }).click();
  await expect(emotion).toHaveClass(/far/u);
  const selectedDistance = page.getByRole('group', { name: 'Move selected planet' }).getByRole('button', { name: 'Further away' });
  await expect(selectedDistance).toHaveAttribute('aria-pressed', 'true');
  await expect(selectedDistance.locator('span')).toHaveCount(0);
  expect(await selectedDistance.evaluate((button) => getComputedStyle(button, '::before').content)).toBe('none');
  await page.waitForTimeout(220);
  const planetBounds = await emotion.boundingBox();
  const sceneBounds = await page.locator('.orbit-map').boundingBox();
  await page.mouse.move(planetBounds.x + planetBounds.width / 2, planetBounds.y + planetBounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(sceneBounds.x + sceneBounds.width / 2, sceneBounds.y + sceneBounds.height * 0.8, { steps: 8 });
  await expect(page.locator('.orbit-ring-line.between')).toHaveClass(/active/u);
  await page.mouse.up();
  await expect(emotion).toHaveClass(/between/u);
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(emotion).toHaveClass(/close/u);
  await page.getByRole('button', { name: 'Reflect' }).click();
  await expect(page.getByRole('dialog', { name: 'Your orbit today' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Anything you would like to remember?' }).fill('A little closer today.');
  await page.getByRole('button', { name: 'Save orbit and reflection' }).click();
  await expect(page.getByRole('status')).toContainText('Saved.');
  await page.reload();
  await page.getByRole('button', { name: 'Reflect' }).click();
  await expect(page.getByRole('textbox', { name: 'Anything you would like to remember?' })).toHaveValue('A little closer today.');
});

test('mood orbit fits a narrow phone even when a planet moves to the far edge', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/games/orbit');
  await page.getByRole('button', { name: 'Move Emotions planet' }).click();
  await page.getByRole('group', { name: 'Move selected planet' }).getByRole('button', { name: /Further away/u }).click();
  const bounds = await page.getByRole('button', { name: 'Move Emotions planet' }).boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
