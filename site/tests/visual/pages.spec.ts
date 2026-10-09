import { test, expect } from '@playwright/test';

// One full-page screenshot per page type, at each viewport in
// playwright.config.ts. When a change alters any of these on purpose, update
// the references with `npm run test:visual:update` and review the new images.
const PAGES: [name: string, path: string][] = [
  ['revistas',              '/revistas'],
  ['browse-magazine',       '/revistas/browse/arquitextos'],
  ['browse-edition',        '/revistas/browse/arquitextos/24.286'],
  ['browse-edition-drops',  '/revistas/browse/drops/23.140'],
  ['article',               '/revistas/read/arquitextos/24.286/101'],
  ['article-short',         '/revistas/read/arquitextos/24.286/102'],
  ['article-drops',         '/revistas/read/drops/23.140/301'],
  ['article-projetos',      '/revistas/read/projetos/20.230/601'],
  ['article-projetos-p2',   '/revistas/read/projetos/20.230/601/2'],
  ['arquivo',               '/revistas/arquivo/arquitextos'],
  ['expediente',            '/revistas/expediente/arquitextos'],
  ['normas',                '/revistas/normas/arquitextos'],
  ['autor',                 '/autor/ana-exemplo'],
  ['pesquisa',              '/pesquisa'],
  ['sobre',                 '/sobre'],
  ['numeros',               '/numeros'],
];

// Images live on Cloudflare R2. Serve a fixed grey placeholder instead so the
// tests work offline and screenshots don't depend on remote files.
const PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
  <rect width="100%" height="100%" fill="#b8b8b8"/>
  <path d="M0 0L1200 800M1200 0L0 800" stroke="#8a8a8a" stroke-width="6"/>
</svg>`;

test.beforeEach(async ({ page }) => {
  // The edition cover page picks a random article to feature; make it fixed.
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.route(/r2\.dev\//, route =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER }));
});

for (const [name, path] of PAGES) {
  test(name, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      // The footer shows the build year; hide it so screenshots survive New Year.
      mask: [page.locator('.footer-copy')],
    });
  });
}
