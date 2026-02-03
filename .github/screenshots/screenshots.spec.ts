import { test } from '@playwright/test';
import * as path from 'path';

const DOCS_DIR = path.join(__dirname, '../../docs');

interface ScreenshotConfig {
  name: string;
  path: string;
  viewport: { width: number; height: number };
  setup?: (page: any) => Promise<void>;
}

// Desktop screenshots
const DESKTOP_CONFIGS: ScreenshotConfig[] = [
  {
    name: 'workspace-selector',
    path: '/',
    viewport: { width: 1280, height: 800 },
  },
  {
    name: 'dashboard',
    path: '/w/demo',
    viewport: { width: 1280, height: 900 },
  },
  {
    name: 'transactions',
    path: '/w/demo/transactions',
    viewport: { width: 1280, height: 800 },
  },
  {
    name: 'new-transaction',
    path: '/w/demo/transactions/new',
    viewport: { width: 1280, height: 900 },
  },
  {
    name: 'reports',
    path: '/w/demo/reports',
    viewport: { width: 1280, height: 900 },
  },
  {
    name: 'taxes',
    path: '/w/demo/taxes',
    viewport: { width: 1280, height: 900 },
  },
  {
    name: 'recurring',
    path: '/w/demo/recurring',
    viewport: { width: 1280, height: 800 },
  },
  {
    name: 'settings',
    path: '/w/demo/settings',
    viewport: { width: 1280, height: 800 },
  },
];

// Mobile screenshots
const MOBILE_CONFIGS: ScreenshotConfig[] = [
  {
    name: 'workspace-selector',
    path: '/',
    viewport: { width: 390, height: 844 },
  },
  {
    name: 'dashboard',
    path: '/w/demo',
    viewport: { width: 390, height: 844 },
  },
  {
    name: 'transactions',
    path: '/w/demo/transactions',
    viewport: { width: 390, height: 844 },
  },
  {
    name: 'new-transaction',
    path: '/w/demo/transactions/new',
    viewport: { width: 390, height: 844 },
  },
  {
    name: 'reports',
    path: '/w/demo/reports',
    viewport: { width: 390, height: 844 },
  },
];

function generateScreenshots(configs: ScreenshotConfig[], prefix: string) {
  return configs.map((config) => ({
    ...config,
    outputName: `${prefix}${config.name}`,
  }));
}

const DESKTOP_SCREENSHOTS = generateScreenshots(DESKTOP_CONFIGS, 'screenshot-');
const MOBILE_SCREENSHOTS = generateScreenshots(MOBILE_CONFIGS, 'mobile-');
const ALL_SCREENSHOTS = [...DESKTOP_SCREENSHOTS, ...MOBILE_SCREENSHOTS];

test.describe('Screenshot Capture', () => {
  for (const shot of ALL_SCREENSHOTS) {
    test(`capture ${shot.outputName}`, async ({ page }) => {
      await page.setViewportSize(shot.viewport);
      await page.goto(shot.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      if (shot.setup) {
        await shot.setup(page);
      }

      await page.screenshot({
        path: path.join(DOCS_DIR, `${shot.outputName}.png`),
        type: 'png',
      });
    });
  }
});
