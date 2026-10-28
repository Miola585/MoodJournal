import { expect, test } from '@playwright/test';

const savedEntries = (page) => page.evaluate(() => {
  const stored = JSON.parse(localStorage.getItem('journalEntriesV2'));
  return Array.isArray(stored) ? stored : stored?.entries || [];
});

for (const [width, scale] of [[1280, 1], [390, 1.5]]) {
  test(`hashtags create, edit and search without changing manual tags at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript((fontScale) => {
      localStorage.setItem('theme', 'dark'); localStorage.setItem('siteTheme', 'night');
      localStorage.setItem('fontScale', String(fontScale));
    }, scale);
    await page.goto('/entries');
    await page.getByRole('button', { name: 'New free write', exact: true }).click();
    await page.getByRole('textbox', { name: 'Title', exact: true }).fill('A title #not-a-tag');
    await page.locator('[contenteditable=true]').fill('A #School day with #walking and #free-write.');
    const tags = page.locator('.journal-tags');
    await expect(tags).not.toHaveAttribute('open');
    await tags.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(tags).toHaveAttribute('open');
    await expect(tags.locator('.journal-tag-preview')).toHaveText('#School#walking');
    await tags.getByRole('textbox', { name: 'Manual tags' }).pressSequentially('school, family');
    await expect(tags.getByRole('textbox')).toHaveValue('school, family');
    await tags.scrollIntoViewIfNeeded();
    expect(await tags.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: info.outputPath(`tags-${width}.png`) });
    await page.getByRole('button', { name: 'Save page', exact: true }).click();
    await expect(page.locator('.entry-card')).toHaveCount(1);
    expect((await savedEntries(page))[0].tags).toEqual(['free-write', 'school', 'family']);
    if (width <= 560) await page.getByRole('button', { name: 'Filters', exact: true }).click();
    const filter = page.getByRole('textbox', { name: 'Tag search' });
    await filter.fill('#walk'); await expect(page.locator('.entry-card')).toHaveCount(1);
    await filter.fill('not-a-tag'); await expect(page.locator('.entry-card')).toHaveCount(0);
    await filter.fill('');
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.locator('[contenteditable=true]').fill('No hashtags now.');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.locator('.entry-card')).toHaveCount(1);
    await filter.fill('walking'); await expect(page.locator('.entry-card')).toHaveCount(0);
    await filter.fill('#school'); await expect(page.locator('.entry-card')).toHaveCount(1);
  });
}

test('check-in writing hashtags work on creation and in its editor without changing type', async ({ page }) => {
  await page.goto('/checkin');
  await page.getByRole('button', { name: /Calm$/ }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.locator('textarea').fill('Today #garden #game #free-write');
  await page.getByRole('button', { name: 'Save Check-In', exact: true }).click();
  await expect.poll(async () => (await savedEntries(page)).length).toBe(1);
  expect((await savedEntries(page))[0].type).toBe('checkin');
  expect((await savedEntries(page))[0].tags).toEqual([]);
  await page.goto('/entries');
  await page.getByRole('textbox', { name: 'Tag search' }).fill('#garden');
  await expect(page.locator('.entry-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.locator('.journal-tags summary').click();
  await expect(page.getByRole('textbox', { name: 'Manual tags' })).toBeVisible();
  await page.locator('[contenteditable=true]').fill('Changed to #rest');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tag search' }).fill('rest');
  await expect(page.locator('.entry-card')).toHaveCount(1);
});

test('failed hashtag save retains the original writing and manual tags in the draft', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'locks', { value: undefined }));
  await page.goto('/entries');
  await page.getByRole('button', { name: 'New free write', exact: true }).click();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Unsaved');
  await page.locator('[contenteditable=true]').fill('Keep #my-draft');
  await page.locator('.journal-tags summary').click();
  await page.getByRole('textbox', { name: 'Manual tags' }).fill('manual');
  await page.getByRole('button', { name: 'Save page', exact: true }).click();
  await expect(page.getByText(/cannot safely coordinate journal saves/)).toBeVisible();
  await expect(page.locator('[contenteditable=true]')).toHaveText('Keep #my-draft');
  await expect(page.getByRole('textbox', { name: 'Manual tags' })).toHaveValue('manual');
  expect(await savedEntries(page)).toHaveLength(0);
});
