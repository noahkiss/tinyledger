import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 120000,
  retries: 1,
  workers: 2,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'screenshots',
      use: {
        browserName: 'chromium',
      },
    },
  ],
});
