import { defineConfig } from '@playwright/test';

// La suite completa corre una sola vez en el viewport principal. Los proyectos
// secundarios ejecutan únicamente los casos @responsive: así se cubren motor,
// orientación y tamaños representativos sin multiplicar todo el smoke E2E.
const environment =
  (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env ?? {};
const ci = Boolean(environment.CI);
const executablePath = environment.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const chromiumLaunch = executablePath ? { launchOptions: { executablePath } } : {};

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  workers: ci ? 2 : undefined,
  reporter: ci ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/desafios/',
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 800 },
        hasTouch: true,
        ...chromiumLaunch,
      },
    },
    {
      name: 'mobile-landscape-chromium',
      grep: /@responsive/,
      use: {
        browserName: 'chromium',
        viewport: { width: 740, height: 360 },
        hasTouch: true,
        ...chromiumLaunch,
      },
    },
    {
      name: 'small-mobile-chromium',
      grep: /@responsive/,
      use: {
        browserName: 'chromium',
        viewport: { width: 320, height: 568 },
        hasTouch: true,
        ...chromiumLaunch,
      },
    },
    {
      name: 'tablet-chromium',
      grep: /@responsive/,
      use: {
        browserName: 'chromium',
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
        ...chromiumLaunch,
      },
    },
    {
      name: 'desktop-chromium',
      grep: /@responsive/,
      use: {
        browserName: 'chromium',
        viewport: { width: 1366, height: 768 },
        ...chromiumLaunch,
      },
    },
    {
      name: 'mobile-webkit',
      grep: /@responsive/,
      use: {
        browserName: 'webkit',
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/desafios/',
    reuseExistingServer: !ci,
    timeout: 60_000,
  },
});
