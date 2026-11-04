import { expect, test } from '@playwright/test';

async function expectClear(page, name) {
  await expect.poll(() => page.locator(`.planet[data-planet="${name}"]`).evaluate((planet) => {
    const a = planet.getBoundingClientRect();
    return [...planet.parentElement.querySelectorAll('.planet, .orbit-center')].filter((other) => other !== planet).every((other) => {
      const b = other.getBoundingClientRect();
      return a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom;
    });
  })).toBe(true);
}

for (const width of [320, 390, 820, 1440]) {
  test(`dropping onto another planet chooses a clear spot at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/games/orbit');
    const emotion = page.getByRole('button', { name: 'Move Emotions planet' });
    const thought = page.getByRole('button', { name: 'Move Thoughts planet' });
    await expect(page.getByRole('button', { name: 'Finish orbit', exact: true })).toBeEnabled();
    const unchanged = await thought.evaluate((element) => [element.style.left, element.style.top]);
    const from = await emotion.boundingBox();
    const onto = await thought.boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(onto.x + onto.width / 2, onto.y + onto.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(emotion).toHaveClass(/between/);
    await expectClear(page, 'Emotion');
    expect(await thought.evaluate((element) => [element.style.left, element.style.top])).toEqual(unchanged);
    await page.getByRole('button', { name: 'Finish orbit', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Saved');
    await page.reload();
    await expectClear(page, 'Emotion');
    await page.screenshot({ path: info.outputPath(`orbit-spacing-${width}.png`), fullPage: true });
  });
}

test('distance buttons and keyboard avoid occupied positions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/games/orbit');
  await page.evaluate(() => {
    const date = new Date();
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    localStorage.setItem(`moodJournalPrivateV1:local-browser:${encodeURIComponent(`moodOrbit:${key}`)}`, JSON.stringify({ planets: [
      { name: 'Emotion', orbit: 'far', angle: 70 }, { name: 'Thought', orbit: 'between', angle: 70 }
    ] }));
  });
  await page.reload();
  const emotion = page.getByRole('button', { name: 'Move Emotions planet' });
  await emotion.click();
  await page.getByRole('group', { name: 'Move selected planet' }).getByRole('button', { name: 'In between', exact: true }).click();
  await expect(emotion).toHaveClass(/between/);
  await expectClear(page, 'Emotion');
  await emotion.focus();
  await page.keyboard.press('1');
  await expect(emotion).toHaveClass(/close/);
  await expectClear(page, 'Emotion');
  await page.setViewportSize({ width: 844, height: 390 });
  await emotion.focus();
  await page.keyboard.press('2');
  await expect(emotion).toHaveClass(/between/);
  await expectClear(page, 'Emotion');
});

test('touch dragging onto a planet leaves both selectable', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, hasTouch: true, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto('/games/orbit');
    const emotion = page.getByRole('button', { name: 'Move Emotions planet' });
    const thought = page.getByRole('button', { name: 'Move Thoughts planet' });
    const from = await emotion.boundingBox();
    const onto = await thought.boundingBox();
    const session = await context.newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x + from.width / 2, y: from.y + from.height / 2 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: onto.x + onto.width / 2, y: onto.y + onto.height / 2 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(emotion).toHaveClass(/between/);
    await expectClear(page, 'Emotion');
    await thought.tap();
    await expect(thought).toHaveAttribute('aria-pressed', 'true');
    await emotion.tap();
    await expect(emotion).toHaveAttribute('aria-pressed', 'true');
  } finally { await context.close(); }
});

for (const viewport of [{ width: 320, height: 720 }, { width: 390, height: 844 }, { width: 820, height: 1180 }, { width: 844, height: 390 }]) {
  test(`orbit controls do not cover the scene at ${viewport.width}px`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await page.goto('/games/orbit');
    await page.getByRole('button', { name: 'Move Emotions planet' }).click();
    for (const scale of [1, 1.3]) {
      await page.evaluate((scale) => document.querySelector('.app').style.setProperty('--font-scale', scale), scale);
      await expect.poll(() => page.evaluate(() => {
        const dock = document.querySelector('.orbit-dock').getBoundingClientRect();
        const map = document.querySelector('.orbit-map').getBoundingClientRect();
        const buttons = [...document.querySelectorAll('.orbit-ring-buttons button')].map((button) => button.getBoundingClientRect());
        return {
          separate: map.bottom <= dock.top || map.right <= dock.left,
          contained: buttons.every((button) => button.left >= dock.left && button.right <= dock.right && button.bottom <= dock.bottom),
          oneRow: buttons.every((button) => button.top === buttons[0].top),
          overflow: document.documentElement.scrollWidth > innerWidth
        };
      })).toEqual({ separate: true, contained: true, oneRow: true, overflow: false });
      await page.screenshot({ path: info.outputPath(`orbit-controls-${viewport.width}-${scale}.png`), fullPage: true });
    }
  });
}
