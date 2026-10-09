import { defineConfig, devices } from '@playwright/test';

// Screenshot tests run against the sample-data build in dist-fixture/
// (`npm run build:fixture`). Reference screenshots live in
// tests/visual/__screenshots__/ and are committed to git.
export default defineConfig({
  testDir: 'tests/visual',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      // Absorbs anti-aliasing noise between machines; a real layout change
      // moves far more than 1% of the pixels.
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    },
  },
  use: {
    baseURL: 'http://localhost:4322',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'tablet',  use: { ...devices['Desktop Chrome'], viewport: { width: 900,  height: 1100 } } },
    { name: 'mobile',  use: { ...devices['Desktop Chrome'], viewport: { width: 390,  height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'npx astro preview --outDir dist-fixture --port 4322',
    url: 'http://localhost:4322/revistas',
    reuseExistingServer: !process.env.CI,
  },
});
