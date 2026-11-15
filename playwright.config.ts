import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
    },
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'node scripts/preview.mjs',
      url: 'http://127.0.0.1:4173',
      env: { PORT: '4173' },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'node scripts/preview.mjs',
      url: 'http://127.0.0.1:4174',
      env: { PORT: '4174', PREVIEW_DIR: 'preview-admin', SPA_FALLBACK: '1' },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
