import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

process.env.PLAYWRIGHT_BROWSERS_PATH ||= resolve('node_modules/.playwright-browsers');
const { chromium } = await import('playwright');
const browser = await chromium.launch();
const output = resolve('.cache/visual-check/app-redesign');
await mkdir(output, { recursive: true });
const results = [];
const errors = [];
const quick = process.argv.includes('--quick');
const only = process.argv.find((argument) => argument.startsWith('--only='))?.slice(7).split(',');
const previous = only ? JSON.parse(await readFile(resolve(output, 'audit.json'), 'utf8')).results : [];
const themes = quick ? ['sunrise'] : ['warm', 'sunrise', 'night', 'garden', 'ocean'];
const modes = quick ? ['dark'] : ['light', 'dark'];
const routes = [
  ['today', '/', '.today-screen'],
  ['write', '/journal/write', '.freewrite-screen .tiptap'],
  ['entries', '/entries', '.entries-screen'],
  ['calendar', '/calendar', '.calendar-screen'],
  ['week', '/summary', '.summary-screen'],
  ['explore', '/explore', '.explore-screen'],
  ['activities', '/activities', '.activity-feature'],
  ['colors', '/explore/mood-colors', '.mood-colors-screen'],
  ['stickers', '/explore/stickers', '.sticker-collection-screen'],
  ['preferences', '/preferences', '.settings-screen'],
  ['privacy', '/privacy', '.settings-screen'],
  ['profile', '/profile', '.profile-screen'],
  ['support', '/support/preview', '.support-preview'],
  ['staff', '/support/preview/staff', '.support-preview'],
  ['notice', '/checkin', '.checkin-mood-grid']
];
async function capture(page, name, theme, mode, device, fullPage = false) {
  await page.getByText('Loading page...', { exact: true }).waitFor({ state: 'hidden' });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  await page.locator('img').evaluateAll((images) => Promise.all(images.map((img) => img.decode().catch(() => {}))));
  await page.waitForFunction(() => [...document.images].every((img) => !img.offsetWidth || (img.complete && img.naturalWidth > 0)));
  const audit = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    brokenImages: [...document.images].filter((image) => image.offsetWidth > 0 && (!image.complete || !image.naturalWidth)).map((image) => image.src),
    innerScrollers: [...document.querySelectorAll('main *')].filter((element) => {
      const style = getComputedStyle(element);
      return ['auto', 'scroll'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 2 && !element.closest('dialog, .editor-sticker-book') && !['TEXTAREA'].includes(element.tagName);
    }).map((element) => element.className)
  }));
  const file = `${theme}-${mode}-${device}-${name}.png`;
  await page.screenshot({ path: resolve(output, file), fullPage, animations: 'disabled' });
  results.push({ name, theme, mode, device, file, ...audit });
}
try {
  for (const theme of themes) for (const mode of modes) for (const [device, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push({ theme, mode, device, error: error.message }));
    // Network-independent capture also verifies the declared system-font fallbacks.
    await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
    await page.addInitScript(({ theme, mode }) => { localStorage.setItem('siteTheme', theme); localStorage.setItem('theme', mode); localStorage.setItem('reduceMotion', 'true'); }, { theme, mode });
    for (const [name, path, selector] of routes) {
      if (only && !only.includes(name)) continue;
      await page.goto(`http://127.0.0.1:5181${path}`, { waitUntil: 'domcontentloaded' });
      await page.locator(selector).first().waitFor({ timeout: 20000 });
      await capture(page, name, theme, mode, device);
      if (name === 'write') {
        await page.getByRole('button', { name: 'Sticker Book', exact: true }).click();
        await capture(page, 'drawer', theme, mode, device);
      }
      if (name === 'activities') {
        await page.locator('.activity-feature').getByRole('button', { name: 'Begin activity' }).click();
        await capture(page, 'active-pause', theme, mode, device, true);
      }
    }
    if (!only || only.includes('notice')) {
    await page.getByRole('button', { name: 'Low', exact: true }).click();
    await capture(page, 'notice-selected', theme, mode, device);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await capture(page, 'reflect', theme, mode, device);
    await page.getByRole('button', { name: 'Skip writing', exact: true }).click();
    await capture(page, 'close', theme, mode, device);
    await page.getByRole('button', { name: 'Keep this moment', exact: true }).click();
    await page.getByRole('button', { name: 'Back to today' }).waitFor();
    await capture(page, 'complete', theme, mode, device);
    await page.getByRole('button', { name: 'Back to today' }).click();
    await capture(page, 'today-populated', theme, mode, device);
    for (const [name, path, selector] of routes.filter(([name]) => ['calendar', 'week', 'entries'].includes(name))) {
      await page.goto(`http://127.0.0.1:5181${path}`, { waitUntil: 'domcontentloaded' });
      await page.locator(selector).first().waitFor();
      await capture(page, `${name}-populated`, theme, mode, device);
    }
    }
    console.log(`${theme} ${mode} ${device}: captured`);
    await context.close();
  }
} finally {
  const replaced = new Set(results.map((result) => result.file));
  results.push(...previous.filter((result) => !replaced.has(result.file)));
  await writeFile(resolve(output, 'audit.json'), JSON.stringify({ results, errors }, null, 2));
  const styles = '<style>body{font:16px system-ui;background:#eee;color:#222;margin:24px}h1{font-size:26px}section{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}figure{margin:0;background:white;padding:8px}img{width:100%;height:260px;object-fit:contain;object-position:top}figcaption{font-size:12px;margin:8px}a{color:inherit}@media(max-width:760px){section{grid-template-columns:repeat(2,minmax(0,1fr))}}</style>';
  for (const name of [...new Set(results.map((result) => result.name))]) {
    await writeFile(resolve(output, `${name}.html`), `${styles}<h1>${name}</h1><section>${results.filter((result) => result.name === name).map((result) => `<figure><a href="${result.file}"><img src="${result.file}"></a><figcaption>${result.theme} / ${result.mode} / ${result.device}</figcaption></figure>`).join('')}</section>`);
  }
  await writeFile(resolve(output, 'index.html'), `${styles}<h1>Mood Journal: desktop and mobile review</h1><p>Local screenshots, not generated artwork. Open any image at full resolution.</p><p>${[...new Set(results.map((result) => result.name))].map((name) => `<a href="${name}.html">${name}</a>`).join(' &middot; ')}</p><section>${results.filter((r) => r.theme === 'sunrise' && r.mode === 'dark' && ['today', 'write', 'notice-selected', 'explore', 'colors', 'calendar'].includes(r.name)).map((r) => `<figure><a href="${r.file}"><img src="${r.file}"></a><figcaption>${r.name} / ${r.device}</figcaption></figure>`).join('')}</section>`);
  const sheet = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  for (const name of [...new Set(results.map((r) => r.name))]) {
    await sheet.goto(pathToFileURL(resolve(output, `${name}.html`)).href);
    await sheet.screenshot({ path: resolve(output, `${name}-contact.png`), fullPage: true });
  }
  console.log(JSON.stringify({ screenshots: results.length, errors, layoutIssues: results.filter((r) => r.overflow || r.brokenImages.length || r.innerScrollers.length) }));
  await browser.close();
}
