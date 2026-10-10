import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// One full-page screenshot per page type, at each viewport in
// playwright.config.ts. When a change alters any of these on purpose, update
// the references with `npm run test:visual:update` and review the new images.
const PAGES: [name: string, path: string][] = [
  ['revistas',              '/revistas'],
  ['browse-magazine',       '/revistas/browse/arquitextos'],
  ['browse-edition',        '/revistas/browse/arquitextos/24.286'],
  ['browse-edition-drops',  '/revistas/browse/drops/23.140'],
  ['browse-edition-arqtur', '/revistas/browse/arquiteturismo/18.205'],
  ['article',               '/revistas/read/arquitextos/24.286/101'],
  ['article-short',         '/revistas/read/arquitextos/24.286/102'],
  ['article-markdown',      '/revistas/read/arquitextos/24.285/105'],
  ['article-drops',         '/revistas/read/drops/23.140/301'],
  ['article-entrevista',    '/revistas/read/entrevista/21.083/501'],
  ['article-entrevista-p2', '/revistas/read/entrevista/21.083/501?page=2'],
  ['article-projetos',      '/revistas/read/projetos/20.230/601'],
  ['article-projetos-p2',   '/revistas/read/projetos/20.230/601/2'],
  ['arquivo',               '/revistas/arquivo/arquitextos'],
  ['expediente',            '/revistas/expediente/arquitextos'],
  ['normas',                '/revistas/normas/arquitextos'],
  ['autor',                 '/autor/ana-exemplo'],
  ['pesquisa',              '/pesquisa'],
  ['pesquisa-tag',          '/pesquisa?tag=concreto'],
  ['sobre',                 '/sobre'],
  ['numeros',               '/numeros'],
];

// Legacy images live on Cloudflare R2, new ones in public/imagens/. Serve a
// fixed grey placeholder for both so screenshots don't depend on image files.
const PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
  <rect width="100%" height="100%" fill="#b8b8b8"/>
  <path d="M0 0L1200 800M1200 0L0 800" stroke="#8a8a8a" stroke-width="6"/>
</svg>`;

const BANNER_PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="1068" height="152">
  <rect width="100%" height="100%" fill="#9fb3c8"/>
  <path d="M0 0L1068 152M1068 0L0 152" stroke="#6b829a" stroke-width="4"/>
</svg>`;

// The site's font is 'Courier New', which each machine substitutes with
// whatever it has installed. Bundle one font (Liberation Mono, same metrics)
// so screenshots look identical on every machine and in CI.
const FONT_DIR = path.join(import.meta.dirname, 'fonts');
const FONT_FACES = ['Courier New', 'Courier'].flatMap(family => [
  ['Regular', 'normal', 'normal'], ['Bold', 'bold', 'normal'],
  ['Italic', 'normal', 'italic'], ['BoldItalic', 'bold', 'italic'],
].map(([file, weight, style]) =>
  `@font-face { font-family: '${family}'; font-weight: ${weight}; font-style: ${style};
    src: url('/__test-fonts/LiberationMono-${file}.ttf'); }`)).join('\n');

test.beforeEach(async ({ page }) => {
  await page.route('**/__test-fonts/*', route => route.fulfill({
    contentType: 'font/ttf',
    body: fs.readFileSync(path.join(FONT_DIR, path.basename(new URL(route.request().url()).pathname))),
  }));
  await page.route(url => url.host === 'localhost:4322', async route => {
    if (route.request().resourceType() !== 'document') return route.fallback();
    const res = await route.fetch();
    const html = (await res.text()).replace('<head>', `<head><style>${FONT_FACES}</style>`);
    await route.fulfill({ response: res, body: html });
  });
  // The edition cover page picks a random article to feature; make it fixed.
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.route(/r2\.dev\/|localhost:4322\/imagens\//, route =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER }));
  // Registered last, so matched first: arquiteturismo banners are 1068x152.
  await page.route(/r2\.dev\/.*\/arqtur_edition\//, route =>
    route.fulfill({ contentType: 'image/svg+xml', body: BANNER_PLACEHOLDER }));
});

for (const [name, url] of PAGES) {
  test(name, async ({ page }) => {
    const res = await page.goto(url);
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => [...document.fonts].some(f => f.status === 'loaded')),
      'bundled test font should be in use').toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth),
      'nothing may stick out past the right edge (sideways scrolling)')
      .toBeLessThanOrEqual(page.viewportSize()!.width);
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      // The footer shows the build year; hide it so screenshots survive New Year.
      mask: [page.locator('.footer-copy')],
    });
  });
}
