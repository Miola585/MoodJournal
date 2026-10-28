import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const localBrowsers = resolve('node_modules/.playwright-browsers');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(localBrowsers)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = localBrowsers;
}

const baseURL = 'http://127.0.0.1:5181';

export default defineConfig({
  testDir: './e2e',
  outputDir: '.cache/visual-check/test-results',
  reporter: 'list',
  use: { baseURL, browserName: 'chromium' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5181 --strictPort',
    env: { PLAYWRIGHT_TEST: '1' },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});
