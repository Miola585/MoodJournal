import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

process.env.PLAYWRIGHT_BROWSERS_PATH ||= resolve('node_modules/.playwright-browsers');
const { chromium } = await import('playwright');
const browser = await chromium.launch();
const output = resolve('.cache/visual-check/game-controls');
await mkdir(output, { recursive: true });
const files = [], errors = [], audit = [];
try {
  for (const [name, viewport] of [['narrow', { width: 320, height: 740 }], ['mobile', { width: 390, height: 844 }], ['tablet', { width: 820, height: 1180 }], ['desktop', { width: 1440, height: 1000 }], ['landscape', { width: 844, height: 390 }]]) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    page.on('pageerror', (error) => errors.push(error.message));
    for (const game of ['orbit', 'constellation']) for (const scale of [1, 1.3]) {
      await page.goto(`http://127.0.0.1:5181/games/${game}`);
      await page.locator(`.${game}-surface`).waitFor();
      await page.evaluate((scale) => document.querySelector('.app').style.setProperty('--font-scale', scale), scale);
      if (game === 'orbit') await page.getByRole('button', { name: 'Move Emotions planet' }).click();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(180);
      const file = `${name}-${game}-${scale}.png`;
      await page.screenshot({ path: resolve(output, file), fullPage: true, animations: 'disabled' });
      files.push(file);
      audit.push({ file, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
    }
    await page.goto('http://127.0.0.1:5181/explore');
    await page.locator('.explore-pauses').screenshot({ path: resolve(output, `${name}-pauses.png`) });
    files.push(`${name}-pauses.png`);
    if (['mobile', 'desktop'].includes(name)) {
      await page.goto('http://127.0.0.1:5181/activities?tool=scavenger');
      await page.getByRole('button', { name: 'Begin noticing' }).waitFor();
      await page.screenshot({ path: resolve(output, `${name}-wonders.png`), fullPage: true });
      files.push(`${name}-wonders.png`);
    }
    await page.close();
  }
  const html = `<!doctype html><html><meta charset="utf-8"><title>Small Wonders and Game Controls</title><style>body{font:16px system-ui;background:#eee;color:#222;margin:24px}section{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}a{color:inherit;min-width:0;text-decoration:none}img{width:100%;height:320px;object-fit:contain;object-position:top;background:white}p{font-size:12px}@media(max-width:760px){section{grid-template-columns:repeat(2,minmax(0,1fr))}}</style><h1>Small Wonders and Game Controls</h1><section>${files.map((file) => `<a href="${file}"><img src="${file}"><p>${file}</p></a>`).join('')}</section></html>`;
  await writeFile(resolve(output, 'gallery.html'), html);
  await writeFile(resolve(output, 'audit.json'), JSON.stringify({ audit, errors }, null, 2));
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(pathToFileURL(resolve(output, 'gallery.html')).href);
  await page.screenshot({ path: resolve(output, 'contact-sheet.png'), fullPage: true });
  console.log(JSON.stringify({ screenshots: files.length, overflow: audit.filter((item) => item.overflow), errors }));
} finally { await browser.close(); }
