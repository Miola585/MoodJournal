import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { libraryEntries, libraryData, seedLibrary } from '../e2e/helpers/libraryFixture.js';

process.env.PLAYWRIGHT_BROWSERS_PATH ||= resolve('node_modules/.playwright-browsers');
const { chromium } = await import('playwright');
const browser = await chromium.launch();
const output = resolve('.cache/visual-check/monthly-library');
await mkdir(output, { recursive: true });
const results = [], errors = [];
const quick = process.argv.includes('--quick');
async function capture(page, name) {
  await page.locator('.journal-library').waitFor();
  await page.getByText('Gathering your saved days...').waitFor({ state: 'hidden' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('img').evaluateAll((images) => Promise.all(images.map((image) => image.decode().catch(() => {}))));
  const audit = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    brokenImages: [...document.images].filter((image) => image.offsetWidth && (!image.complete || !image.naturalWidth)).map((image) => image.src),
    innerScrollers: [...document.querySelectorAll('main *')].filter((element) => ['auto', 'scroll'].includes(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight + 2).map((element) => element.className)
  }));
  const file = `${name}.png`;
  await page.screenshot({ path: resolve(output, file), fullPage: true, animations: 'disabled' });
  results.push({ file, ...audit });
}
try {
  for (const theme of quick ? ['night'] : ['warm', 'sunrise', 'night', 'garden', 'ocean']) for (const mode of quick ? ['light'] : ['light', 'dark']) for (const [device, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce', timezoneId: 'America/New_York' });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:5181/journal/library');
    await page.evaluate(seedLibrary, { entries: [], data: {}, theme, mode });
    await page.reload();
    await capture(page, `${theme}-${mode}-${device}-empty-shelf`);
    await page.locator('.month-volume').click();
    await capture(page, `${theme}-${mode}-${device}-empty-book`);
    await page.evaluate(seedLibrary, { entries: libraryEntries, data: libraryData, theme, mode });
    await page.goto('http://127.0.0.1:5181/journal/library');
    await capture(page, `${theme}-${mode}-${device}-shelf`);
    await page.goto('http://127.0.0.1:5181/journal/library?month=2026-10');
    await capture(page, `${theme}-${mode}-${device}-book`);
    await page.goto('http://127.0.0.1:5181/journal/library?view=constellations');
    await capture(page, `${theme}-${mode}-${device}-gallery`);
    await context.close();
  }
  if (!quick) for (const [name, viewport, scale] of [['320px', { width: 320, height: 740 }, 1], ['tablet', { width: 820, height: 1180 }, 1], ['landscape', { width: 844, height: 390 }, 1], ['large-text', { width: 390, height: 844 }, 1.3]]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:5181/journal/library');
    const entries = libraryEntries.map((entry, i) => i ? entry : { ...entry, noteDoc: null, note: `${entry.note}\n\n${'A long page that has room for every word. '.repeat(150)}\nThe last sentence stays visible.` });
    const data = { ...libraryData, 'activityNotes:2026-10-03': Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`Moment ${i + 1}`, 'A small thing I wanted to remember. '.repeat(12)])) };
    await page.evaluate(seedLibrary, { entries, data, theme: 'warm', mode: 'light' });
    await page.evaluate((scale) => localStorage.setItem('fontScale', JSON.stringify(scale)), scale);
    await page.goto('http://127.0.0.1:5181/journal/library?month=2026-10');
    await capture(page, `${name}-long-book`);
    await context.close();
  }
  await writeFile(resolve(output, 'audit.json'), JSON.stringify({ results, errors }, null, 2));
  const gallery = `<!doctype html><html><meta charset="utf-8"><title>Monthly Journal Library</title><style>body{font:16px system-ui;background:#efefef;color:#222;margin:24px}h1{font-size:24px}section{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}a{color:inherit;text-decoration:none;min-width:0}img{display:block;width:100%;height:280px;object-fit:contain;object-position:top;background:white}p{overflow-wrap:anywhere;font-size:12px}@media(max-width:760px){section{grid-template-columns:repeat(2,minmax(0,1fr))}}</style><h1>Monthly Journal Library</h1><p>Captured desktop and mobile views. Select an image for full size.</p><section>${results.map(({ file }) => `<a href="${file}"><img src="${file}"><p>${file}</p></a>`).join('')}</section></html>`;
  await writeFile(resolve(output, 'index.html'), gallery);
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  await page.goto(pathToFileURL(resolve(output, 'index.html')).href);
  await page.screenshot({ path: resolve(output, 'contact-sheet.png'), fullPage: true });
  for (const theme of quick ? ['night'] : ['warm', 'sunrise', 'night', 'garden', 'ocean']) {
    await page.locator('section > a').evaluateAll((links, theme) => links.forEach((link) => { link.hidden = !link.getAttribute('href').startsWith(`${theme}-`); }), theme);
    await page.screenshot({ path: resolve(output, `${theme}-contact-sheet.png`), fullPage: true });
  }
  const selected = ['warm-light-desktop-shelf', 'warm-light-desktop-book', 'night-light-mobile-shelf', 'night-light-mobile-book', 'garden-dark-desktop-gallery', 'ocean-dark-mobile-empty-book'];
  const smallGallery = gallery.replace(/<section>[\s\S]*<\/section>/, `<section>${selected.map((name) => `<a href="${name}.png"><img src="${name}.png"><p>${name}</p></a>`).join('')}</section>`);
  if (!quick) await writeFile(resolve(output, 'gallery.html'), smallGallery);
  console.log(JSON.stringify({ screenshots: results.length, failures: results.filter((r) => r.overflow || r.brokenImages.length || r.innerScrollers.length), errors, gallery: resolve(output, 'index.html') }));
} finally { await browser.close(); }
