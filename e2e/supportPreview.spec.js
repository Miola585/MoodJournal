import { expect, test } from '@playwright/test';

// Exercise the owned component with its provider, independently of App/auth routing.
const previewDocument = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/src/styles.css"><link rel="stylesheet" href="/src/styles/supportPreview.css"></head>
<body><div id="preview-root"></div><script type="module">
import RefreshRuntime from '/@react-refresh';
import React from '__DEPS__/react.js__VERSION__';
import ReactDOM from '__DEPS__/react-dom_client.js__VERSION__';
import { BrowserRouter, Routes, Route } from '__DEPS__/react-router-dom.js__VERSION__';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
window.__vite_plugin_react_preamble_installed__ = true;
const { SupportPreview, SupportPreviewProvider } = await import('/src/screens/SupportPreview.jsx');
const h = React.createElement;
ReactDOM.createRoot(document.getElementById('preview-root')).render(h(BrowserRouter, null,
  h(SupportPreviewProvider, null, h('div', { className: 'app app-shell theme-warm', style: { '--font-scale': 1 } },
    h('main', { className: 'app-container' }, h(Routes, null,
      h(Route, { path: '/support/preview', element: h(SupportPreview) }),
      h(Route, { path: '/support/preview/staff', element: h(SupportPreview, { staff: true }) })
    ))
  ))
));
</script></body></html>`;

test.beforeEach(async ({ page }) => {
  const moduleResponse = await page.request.get('/src/screens/SupportPreview.jsx');
  expect(moduleResponse.ok()).toBeTruthy();
  const source = await moduleResponse.text();
  const dependency = source.match(/from "([^"\n]+)\/react\.js(\?[^"\n]+)?"/);
  expect(dependency, 'Vite must serve the React dependency for the component harness').toBeTruthy();
  const document = previewDocument.replaceAll('__DEPS__', dependency[1]).replaceAll('__VERSION__', dependency[2] || '');
  await page.route('**/support/preview{,/**}', async (route) => {
    if (route.request().resourceType() === 'document') {
      await route.fulfill({ contentType: 'text/html', body: document });
    } else await route.continue();
  });
});

async function openPreview(page, staff = false) {
  await page.goto(staff ? '/support/preview/staff' : '/support/preview');
  await expect(page.getByRole('heading', { name: staff ? 'Support inbox' : "We're listening", exact: true })).toBeVisible();
}

async function fillRequest(page, title = 'A sample request') {
  await page.getByLabel('A short title').fill(title);
  await page.getByLabel('What happened?', { exact: true }).fill('A sample description of the issue.');
}

const details = (page) => page.getByRole('article', { name: 'Request details' });
const requestRow = (page, name) => page.locator('.sp-list').getByRole('button', { name: new RegExp(name) });

test('creates a memory-only request without contacting Supabase or writing storage', async ({ page }) => {
  const apiRequests = [];
  page.on('request', (request) => {
    if (/supabase|\/rest\/v1|\/auth\/v1|\/storage\/v1/i.test(request.url())) apiRequests.push(request.url());
  });
  await openPreview(page);
  await expect(page.getByText('Session-only demo. Nothing is delivered.')).toBeVisible();
  await expect(page.getByText(/not access-controlled/)).toBeVisible();
  await fillRequest(page, 'Created only in memory');
  await page.getByLabel('Steps to reproduce (optional)').fill('Open the calendar.');
  await page.getByLabel('Email (optional)').fill('sample@example.test');
  await page.getByRole('button', { name: 'Send demo request' }).click();
  await expect(details(page).getByRole('heading', { name: 'Created only in memory' })).toBeVisible();
  await expect(details(page).getByText('Open the calendar.', { exact: true })).toBeVisible();
  await expect(details(page).getByText('sample@example.test')).toBeVisible();
  await expect(page.getByText('Device details', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  await page.reload();
  await page.getByRole('button', { name: /My requests/ }).click();
  await expect(requestRow(page, 'Created only in memory')).toHaveCount(0);
  await expect(page.locator('.sp-request')).toHaveCount(3);
  expect(apiRequests).toEqual([]);
});

test('validates whitespace and switches request kinds with explicit device opt-in', async ({ page }) => {
  await openPreview(page);
  await fillRequest(page, '   ');
  await page.getByRole('button', { name: 'Send demo request' }).click();
  await expect(page.getByRole('alert')).toHaveText('Add a short title.');
  await page.getByRole('button', { name: /Suggest a feature/ }).click();
  await expect(page.getByLabel('Steps to reproduce (optional)')).toHaveCount(0);
  await expect(page.getByLabel('Tell us about your idea')).toBeVisible();
  await page.getByRole('button', { name: /Share feedback/ }).click();
  await expect(page.getByLabel('Your thoughts')).toBeVisible();
  await page.getByLabel('A short title').fill('Feedback with device details');
  await page.getByLabel('Include device details').check();
  await page.getByRole('button', { name: 'Send demo request' }).click();
  await page.getByText('Device details', { exact: true }).click();
  await expect(page.locator('.sp-diagnostics')).toContainText('warm');
  await expect(page.locator('.sp-diagnostics')).toContainText('Chrome');
});

test('shares staff triage and public replies while keeping internal notes out of the user view', async ({ page }) => {
  await openPreview(page);
  await fillRequest(page, 'Shared across preview routes');
  await page.getByRole('button', { name: 'Send demo request' }).click();
  await page.getByRole('link', { name: 'Staff preview' }).click();
  await requestRow(page, 'Shared across preview routes').click();
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('resolved');
  await page.getByRole('combobox', { name: 'Priority', exact: true }).selectOption('high');
  await page.getByLabel('Your reply', { exact: true }).fill('Public demo response.');
  await page.getByRole('button', { name: 'Add demo reply' }).click();
  await page.getByRole('button', { name: 'Internal note', exact: true }).click();
  await page.getByLabel('Internal note', { exact: true }).fill('Private-looking demo triage note.');
  await page.getByRole('button', { name: 'Add demo note' }).click();
  await expect(details(page).getByText('Private-looking demo triage note.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'User preview' }).click();
  await page.getByRole('button', { name: /My requests/ }).click();
  await requestRow(page, 'Shared across preview routes').click();
  await expect(details(page).getByText('Resolved', { exact: true })).toBeVisible();
  await expect(details(page).getByText('Public demo response.', { exact: true })).toBeVisible();
  await expect(page.getByText('Private-looking demo triage note.', { exact: true })).toHaveCount(0);
  await page.getByLabel('Your reply', { exact: true }).fill('A follow-up from the demo journaler.');
  await page.getByRole('button', { name: 'Add demo reply' }).click();
  await page.getByRole('link', { name: 'Staff preview' }).click();
  await requestRow(page, 'Shared across preview routes').click();
  await expect(page.getByRole('combobox', { name: 'Priority', exact: true })).toHaveValue('high');
  await expect(details(page).getByText('A follow-up from the demo journaler.', { exact: true })).toBeVisible();
});

test('staff filters combine search, kind, status, and priority, including an empty result', async ({ page }) => {
  await openPreview(page, true);
  await page.getByLabel('Search requests').fill('reminder');
  await page.getByRole('combobox', { name: 'Request type', exact: true }).selectOption('feature');
  await page.getByRole('combobox', { name: 'Filter status' }).selectOption('planned');
  await page.getByRole('combobox', { name: 'Filter priority' }).selectOption('low');
  await expect(page.locator('.sp-request')).toHaveCount(1);
  await requestRow(page, 'A gentle reminder').click();
  await page.getByRole('combobox', { name: 'Filter priority' }).selectOption('high');
  await expect(page.getByText('No requests match these filters.')).toBeVisible();
  await expect(details(page)).toHaveCount(0);
});

test('staff totals reflect all demo requests and update after creation and resolution', async ({ page }) => {
  await openPreview(page, true);
  const totals = page.getByLabel('Demo request totals');
  await expect(totals.locator('dt')).toHaveText(['New requests', 'Bug reports', 'Feature ideas', 'Resolved']);
  await expect(totals.locator('dd')).toHaveText(['1', '1', '1', '0']);
  await page.getByRole('link', { name: 'User preview' }).click();
  await fillRequest(page, 'Another demo bug');
  await page.getByRole('button', { name: 'Send demo request' }).click();
  await page.getByRole('link', { name: 'Staff preview' }).click();
  await expect(totals.locator('dd')).toHaveText(['2', '2', '1', '0']);
  await page.getByLabel('Search requests').fill('Another demo bug');
  await expect(page.locator('.sp-request')).toHaveCount(1);
  await expect(totals.locator('dd')).toHaveText(['2', '2', '1', '0']);
  await requestRow(page, 'Another demo bug').click();
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('resolved');
  await expect(totals.locator('dd')).toHaveText(['1', '2', '1', '1']);
});

test('accepts PNG, JPEG, and WEBP screenshots and keeps the image in the request', async ({ page }) => {
  await openPreview(page);
  for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
    const dataUrl = await page.evaluate((mime) => {
      const canvas = document.createElement('canvas');
      canvas.width = 4;
      canvas.height = 4;
      return canvas.toDataURL(mime);
    }, type);
    const image = Buffer.from(dataUrl.split(',')[1], 'base64');
    const buffer = type === 'image/png' ? Buffer.concat([image, Buffer.alloc(3 * 1024 * 1024 - image.length)]) : image;
    await page.getByLabel('Screenshot (optional)', { exact: true }).setInputFiles({ name: `sample.${type.split('/')[1]}`, mimeType: type, buffer });
    await expect(page.getByAltText('Selected screenshot')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send demo request' })).toBeEnabled();
  }
  await fillRequest(page);
  await page.getByRole('button', { name: 'Send demo request' }).click();
  await expect(page.getByAltText('Request screenshot')).toBeVisible();
  expect(await page.getByAltText('Request screenshot').getAttribute('src')).toMatch(/^data:image\/webp;base64,/);
});

test('rejects unsupported, oversized, corrupt, and unreadable screenshots with recoverable errors', async ({ page }) => {
  await openPreview(page);
  const upload = page.getByLabel('Screenshot (optional)', { exact: true });
  await upload.setInputFiles({ name: 'sample.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
  await expect(page.getByRole('alert')).toContainText('PNG, JPEG, or WEBP');
  await upload.setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(3 * 1024 * 1024 + 1) });
  await expect(page.getByRole('alert')).toContainText('no larger than 3 MB');
  await upload.setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(page.getByRole('alert')).toContainText('could not be read');
  await page.evaluate(() => {
    window.FileReader = class {
      readAsDataURL() { queueMicrotask(() => this.onerror()); }
    };
  });
  await upload.setInputFiles({ name: 'unreadable.png', mimeType: 'image/png', buffer: Buffer.from('sample') });
  await expect(page.getByRole('alert')).toContainText('could not be read');
  await expect(page.getByRole('button', { name: 'Send demo request' })).toBeDisabled();
  await page.getByRole('button', { name: 'Remove screenshot' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send demo request' })).toBeEnabled();
});

test('canceling an in-progress file read cannot restore a removed screenshot', async ({ page }) => {
  await openPreview(page);
  await page.evaluate(() => {
    window.FileReader = class {
      readAsDataURL() { window.pendingScreenshotReader = this; }
    };
  });
  await page.getByLabel('Screenshot (optional)', { exact: true }).setInputFiles({ name: 'pending.png', mimeType: 'image/png', buffer: Buffer.from('sample') });
  await expect(page.getByText('Reading screenshot...')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send demo request' })).toBeDisabled();
  await page.getByRole('button', { name: 'Remove screenshot' }).click();
  await page.evaluate(() => window.pendingScreenshotReader.onerror());
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByAltText('Selected screenshot')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send demo request' })).toBeEnabled();
});

for (const [width, height, dark] of [[1440, 1000, false], [760, 1000, false], [390, 844, false], [320, 700, true]]) {
  test(`preview fits ${width}px with enlarged text and mobile detail/back navigation`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    await openPreview(page);
    await page.locator('.app').evaluate((element, useDark) => {
      element.style.setProperty('--font-scale', '1.3');
      if (useDark) element.classList.add('dark');
    }, dark);
    await expect(page.locator('.sp-kinds')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Small ideas matter' })).toBeVisible();
    await expect(page.locator('.sp-sidebar')).toContainText('Leave out passwords, PINs, private journal passages, and identifying details.');
    const form = await page.locator('.sp-form').boundingBox();
    const sidebar = await page.locator('.sp-sidebar').boundingBox();
    const tabs = await page.locator('.sp-page-tabs').boundingBox();
    const heading = await page.locator('.sp-heading').boundingBox();
    expect(tabs.y + tabs.height).toBeLessThanOrEqual(heading.y);
    if (width > 760) {
      expect(form.x + form.width).toBeLessThan(sidebar.x);
      expect(form.width / sidebar.width).toBeCloseTo(3, 1);
    } else expect(form.y + form.height).toBeLessThan(sidebar.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`support-form-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: /My requests/ }).click();
    await requestRow(page, 'My calendar looks different').click();
    await expect(details(page)).toBeVisible();
    if (width <= 760) await expect(page.locator('.sp-list')).toBeHidden();
    await expect(page.getByText(/Sample internal note:/)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`support-detail-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Back to requests' }).click();
    await expect(page.locator('.sp-list')).toBeVisible();
    await page.getByRole('link', { name: 'Staff preview' }).click();
    await expect(page.locator('.sp-counter')).toHaveCount(4);
    const counters = await page.locator('.sp-counters').boundingBox();
    const filters = await page.locator('.sp-filters').boundingBox();
    expect(counters.y + counters.height).toBeLessThanOrEqual(filters.y);
    await page.screenshot({ path: info.outputPath(`support-inbox-${width}.png`), fullPage: true });
    await requestRow(page, 'My calendar looks different').click();
    await expect(details(page)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`support-staff-${width}.png`), fullPage: true });
  });
}
