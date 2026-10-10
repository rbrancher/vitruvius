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
      // Rendering is identical across machines (bundled font, no hinting),
      // so any changed pixel counts: small changes like an italic quote
      // touch well under 1% of a page.
      maxDiffPixels: 0,
      animations: 'disabled',
    },
  },
  use: {
    baseURL: 'http://localhost:4322',
    // Ignore each machine's font hinting settings, which change letter widths
    // and therefore line breaks.
    launchOptions: { args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'] },
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
