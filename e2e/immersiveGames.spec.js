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
    await expect(firstStar).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('button', { name: 'Star 2', exact: true })).toHaveAttribute('aria-pressed', 'false');
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
    await expect(page.locator('.planet img')).toHaveCount(6);
    await expect(page.locator('.orbit-center img')).toHaveAttribute('src', /Sun\.png/u);
    await expect.poll(() => page.locator('.orbit-center img').evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(page.locator('.orbit-center')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect.poll(() => page.locator('.planet img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);
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

test('constellation undo preserves shared endpoints and saves only remaining connected stars', async ({ page }) => {
  await page.goto('/games/constellation');
  const star = (id) => page.getByRole('button', { name: `Star ${id}`, exact: true });
  await star(1).press('Enter');
  await star(2).press('Enter');
  await star(2).press('Enter');
  await star(3).press('Enter');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(star(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(star(2)).toHaveAttribute('aria-pressed', 'true');
  await expect(star(3)).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Finish constellation' }).click();
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('moodJournalPrivateV1:local-browser:gameConstellations') || '[]');
    return saved[0]?.stars;
  })).toEqual([1, 2]);
});

test('garden care ignores the old shared flag and survives a reload', async ({ page }) => {
  await page.addInitScript((today) => localStorage.setItem(`gardenTendedToday:${today}`, 'true'), dateKey(0));
  await page.goto('/games/garden');
  await expect(page.getByRole('button', { name: 'Tend garden' })).toBeEnabled();
  await page.getByRole('button', { name: 'Tend garden' }).click();
  await expect(page.getByRole('button', { name: 'Tended today' })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Tended today' })).toBeDisabled();
});

test('constellation rejects duplicate connections in either direction without a preview or twinkle', async ({ page }) => {
  await page.goto('/games/constellation');
  const star = (id) => page.getByRole('button', { name: `Star ${id}`, exact: true });
  await star(1).click();
  await star(2).click();
  await expect(page.locator('.endpoint-sparkle')).toHaveCount(0);
  for (const [fromId, toId] of [[1, 2], [2, 1]]) {
    const from = await star(fromId).boundingBox();
    const to = await star(toId).boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
    await expect(page.locator('.preview-lines line')).toHaveAttribute('visibility', 'hidden');
    await expect(page.locator('.valid-target')).toHaveCount(0);
    await page.mouse.up();
    await expect(page.locator('.mini-insight')).toContainText('1 connection');
    await expect(page.locator('.endpoint-sparkle')).toHaveCount(0);
  }
  await star(2).press('Enter');
  await star(1).press('Enter');
  await expect(page.locator('.mini-insight')).toContainText('1 connection');
  await expect(page.locator('.endpoint-sparkle')).toHaveCount(0);
});

test('constellation undo has a clear enabled style distinct from its disabled state', async ({ page }, testInfo) => {
  await page.goto('/games/constellation');
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  await expect(undo).toBeDisabled();
  await expect(undo).toHaveCSS('background-color', 'rgb(37, 34, 57)');
  await page.getByRole('button', { name: 'Star 1', exact: true }).click();
  await page.getByRole('button', { name: 'Star 2', exact: true }).click();
  await expect(undo).toBeEnabled();
  await expect(undo).toHaveCSS('opacity', '1');
  await expect(undo).toHaveCSS('color', 'rgb(244, 239, 255)');
  await expect(undo).toHaveCSS('background-color', 'rgb(64, 57, 87)');
  await page.screenshot({ path: testInfo.outputPath('constellation-undo-enabled.png'), fullPage: true });
  await undo.hover();
  await expect(undo).toHaveCSS('background-color', 'rgb(85, 73, 112)');
  await undo.click();
  await expect(undo).toBeDisabled();
  await expect(undo).toHaveCSS('background-color', 'rgb(37, 34, 57)');
});

test('garden care shows a save error without claiming it was tended', async ({ page }) => {
  await page.goto('/games/garden');
  await expect(page.getByRole('button', { name: 'Tend garden' })).toBeEnabled();
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.includes('gardenCare')) throw new Error('Garden storage is full.');
      return setItem.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Tend garden' }).click();
  await expect(page.getByRole('alert')).toContainText('Garden storage is full.');
  await expect(page.getByRole('button', { name: 'Tend garden' })).toBeEnabled();
});

test.describe('touch games', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('orbit touch drag and landscape keep artwork and controls usable', async ({ page }, testInfo) => {
    await page.goto('/games/orbit');
    const planet = page.getByRole('button', { name: 'Move Emotions planet' });
    const bounds = await planet.boundingBox();
    const scene = await page.locator('.orbit-map').boundingBox();
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: scene.x + scene.width * 0.9, y: scene.y + scene.height / 2 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(planet).toHaveClass(/far/u);
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('.orbit-map')).toBeVisible();
    const landscapeScene = await page.locator('.orbit-map').boundingBox();
    expect(landscapeScene.height).toBeGreaterThan(180);
    await expect(page.getByRole('button', { name: 'Finish orbit', exact: true })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath('orbit-landscape.png'), fullPage: true });
  });

  test('constellation touch connections and landscape avoid the title and toolbar', async ({ page }, testInfo) => {
    await page.goto('/games/constellation');
    await page.getByRole('button', { name: 'Star 1', exact: true }).tap();
    await page.getByRole('button', { name: 'Star 2', exact: true }).tap();
    await expect(page.locator('.mini-insight')).toContainText('1 connection');
    await expect(page.locator('.endpoint-sparkle')).toHaveCount(0);
    await page.getByRole('button', { name: 'Star 2', exact: true }).tap();
    await page.getByRole('button', { name: 'Star 1', exact: true }).tap();
    await expect(page.locator('.mini-insight')).toContainText('1 connection');
    await expect(page.locator('.endpoint-sparkle')).toHaveCount(0);
    await page.getByRole('button', { name: 'Undo', exact: true }).tap();
    await expect(page.getByRole('button', { name: 'Star 1', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await page.setViewportSize({ width: 844, height: 390 });
    const layout = await page.evaluate(() => ({
      introBottom: document.querySelector('.immersive-game-intro').getBoundingClientRect().bottom,
      toolbarTop: document.querySelector('.constellation-toolbar').getBoundingClientRect().top,
      stars: [...document.querySelectorAll('.constellation-stage .star')].map((star) => ({ top: star.getBoundingClientRect().top, bottom: star.getBoundingClientRect().bottom }))
    }));
    expect(Math.min(...layout.stars.map((star) => star.top))).toBeGreaterThan(layout.introBottom);
    expect(Math.max(...layout.stars.map((star) => star.bottom))).toBeLessThan(layout.toolbarTop);
    await page.screenshot({ path: testInfo.outputPath('constellation-landscape.png'), fullPage: true });
  });
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
