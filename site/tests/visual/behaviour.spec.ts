import { test, expect } from '@playwright/test';

// Interactive behaviour that screenshots alone don't cover.

test.describe('entrevista: pages switch with ?page=N', () => {
  const url = '/revistas/read/entrevista/21.083/501';

  test('page 1 shows the introduction and the table of contents', async ({ page }) => {
    await page.goto(url);
    await expect(page.locator('.entrevista-page-content:visible')).toHaveText(/introdução/);
    await expect(page.locator('.entrevista-toc-item')).toHaveText(['1. Introdução', '2. Formação', '3. Projetos recentes']);
    await expect(page.locator('.entrevista-toc-item--active')).toHaveText('1. Introdução');
    await expect(page.locator('#entrevista-page-nav')).toContainText('Introdução');
  });

  test('?page=2 shows the second page', async ({ page }) => {
    await page.goto(`${url}?page=2`);
    await expect(page.locator('.entrevista-page-content:visible')).toHaveCount(1);
    await expect(page.locator('.entrevista-page-content:visible')).toHaveText(/formação/);
    await expect(page.locator('.entrevista-toc-item--active')).toHaveText('2. Formação');
    await expect(page.locator('#entrevista-page-nav')).toContainText('Formação');
  });

  test('the bottom navigation moves to the next page', async ({ page }) => {
    await page.goto(`${url}?page=2`);
    await page.locator('#entrevista-page-nav a', { hasText: '3 >' }).click();
    await expect(page).toHaveURL(/\?page=3$/);
    await expect(page.locator('.entrevista-page-content:visible')).toHaveText(/projetos recentes/);
  });

  test('the old sub-path /2 redirects to ?page=2', async ({ page }) => {
    await page.goto(`${url}/2`);
    await expect(page).toHaveURL(/501\?page=2$/);
  });
});

test('arquiteturismo article: the banner shows the image at full size and pans to its hidden part', async ({ page }) => {
  await page.route(/r2\.dev\//, route => route.fulfill({ contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="1068" height="152"/>' }));
  await page.goto('/revistas/read/arquiteturismo/18.205/201');
  const banner = page.locator('.arqtur-banner');
  const img = page.locator('.arqtur-banner-img');
  await expect(img).toHaveAttribute('src', /arqtur_edition\/fixture_arqtur_banner\.jpg$/);
  await expect(img).toHaveCSS('width', '1068px');
  await expect(img).toHaveCSS('height', '152px');
  const width = await banner.evaluate(el => (el as HTMLElement).offsetWidth);
  await banner.click();
  await expect(img).toHaveCSS('transform', `matrix(1, 0, 0, 1, -${1068 - width}, 0)`);
  await banner.click();
  await expect(img).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
});

test('arquiteturismo article: banner arrows appear only on hover, pointing where it can go', async ({ page, isMobile }) => {
  test.skip(isMobile, 'no hover on touch screens');
  await page.goto('/revistas/read/arquiteturismo/18.205/201');
  const banner = page.locator('.arqtur-banner');
  const left = page.locator('.arqtur-arrow--left');
  const right = page.locator('.arqtur-arrow--right');
  await page.mouse.move(0, 0);
  await expect(left).toHaveCSS('opacity', '0');
  await expect(right).toHaveCSS('opacity', '0');
  await banner.hover();
  await expect(right).toHaveCSS('opacity', '1');
  await expect(left).toHaveCSS('opacity', '0');
  await banner.click();
  await expect(left).toHaveCSS('opacity', '1');
  await expect(right).toHaveCSS('opacity', '0');
  await page.mouse.move(0, 0);
  await expect(left).toHaveCSS('opacity', '0');
  await expect(right).toHaveCSS('opacity', '0');
});

test.describe('search: tags and author links', () => {
  test('clicking a tag on an article lists the articles with that tag', async ({ page }) => {
    await page.goto('/revistas/read/arquitextos/24.286/101');
    await page.locator('.tags a.tag', { hasText: 'concreto' }).click();
    await expect(page).toHaveURL(/\/pesquisa\?tag=concreto$/);
    await expect(page.locator('#tag-filter')).toHaveText('tag: concreto ×');
    await expect(page.locator('.search-result')).toHaveCount(1);
    await expect(page.locator('.search-result .sr-title')).toHaveText('A cidade e o concreto');
  });

  test('a tag with accents and spaces works too', async ({ page }) => {
    await page.goto('/pesquisa?tag=' + encodeURIComponent('São Paulo'));
    await expect(page.locator('.search-result')).toHaveCount(1);
  });

  test('removing the tag filter clears it', async ({ page }) => {
    await page.goto('/pesquisa?tag=concreto');
    await page.locator('#tag-filter').click();
    await expect(page).toHaveURL(/\/pesquisa$/);
    await expect(page.locator('#tag-filter')).toBeHidden();
    await expect(page.locator('.search-result')).toHaveCount(0);
  });

  test('author links in results open the author page', async ({ page }) => {
    await page.goto('/pesquisa?q=concreto');
    const link = page.locator('.search-result .sr-meta a').first();
    await expect(link).toHaveAttribute('href', '/autor/ana-exemplo');
    await link.click();
    await expect(page.locator('h1, .rule-one').first()).toBeVisible();
    expect(page.url()).toMatch(/\/autor\/ana-exemplo$/);
  });
});

test.describe('arquiteturismo cover', () => {
  const url = '/revistas/browse/arquiteturismo/18.205';
  // Math.random is pinned to 0 in these tests, so the featured pair is the
  // first two articles with a cover: 201 and 203.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { Math.random = () => 0; });
    await page.route(/r2\.dev\//, route => route.fulfill({ contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1068" height="152"/>' }));
  });

  test('two featured articles start in black and white, one at each end', async ({ page, isMobile }) => {
    await page.goto(url);
    const a = page.locator('.arqtur-capa__panel--a img:visible');
    const b = page.locator('.arqtur-capa__panel--b img:visible');
    await expect(a).toHaveAttribute('data-id', '201');
    await expect(b).toHaveAttribute('data-id', '203');
    await expect(a).toHaveCSS('filter', 'grayscale(1)');
    await expect(page.locator('.arqtur-capa__entry.is-featured')).toHaveCount(2);
    await expect(page.locator('.arqtur-capa__lead:visible')).toHaveCount(0);
  });

  test('clicking the banner slides banner and columns together by 348/1068', async ({ page, isMobile }) => {
    test.skip(isMobile, 'phones show one column, no slide');
    await page.goto(url);
    const strip = page.locator('.arqtur-capa__strip');
    const width = await strip.evaluate(el => (el as HTMLElement).offsetWidth);
    const window = await page.locator('.arqtur-capa').evaluate(el => (el as HTMLElement).offsetWidth);
    expect(width / window).toBeCloseTo(1068 / 720, 2);
    await page.locator('.arqtur-capa__banner').click();
    const shift = -width * 348 / 1068;
    await expect.poll(async () => strip.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m41))
      .toBeCloseTo(shift, 0);
    // after sliding, featured B sits at the right edge of the window
    const b = await page.locator('.arqtur-capa__panel--b').boundingBox();
    const capa = await page.locator('.arqtur-capa').boundingBox();
    expect(b!.x + b!.width).toBeCloseTo(capa!.x + capa!.width, 0);
  });

  test('hovering an article shows it in colour in both panels and its lead', async ({ page, isMobile }) => {
    test.skip(isMobile, 'no hover on touch screens');
    await page.goto(url);
    await page.locator('.arqtur-capa__entry[data-id="204"]').hover();
    await expect(page.locator('.arqtur-capa__panel--a img:visible')).toHaveAttribute('data-id', '204');
    await expect(page.locator('.arqtur-capa__panel--b img:visible')).toHaveAttribute('data-id', '204');
    await expect(page.locator('.arqtur-capa__panel--a img:visible')).toHaveCSS('filter', 'none');
    await expect(page.locator('.arqtur-capa__panel--a .arqtur-capa__lead:visible')).toContainText('Calton Hill');
    await page.mouse.move(0, 0);
    await expect(page.locator('.arqtur-capa__panel--a img:visible')).toHaveAttribute('data-id', '201');
    await expect(page.locator('.arqtur-capa__lead:visible')).toHaveCount(0);
  });

  test('hovering a panel shows its own article in colour with its lead', async ({ page, isMobile }) => {
    test.skip(isMobile, 'no hover on touch screens');
    await page.goto(url);
    await page.locator('.arqtur-capa__panel--a').hover();
    await expect(page.locator('.arqtur-capa__panel--a img:visible')).toHaveCSS('filter', 'none');
    await expect(page.locator('.arqtur-capa__panel--a .arqtur-capa__lead:visible')).toContainText('eixo monumental');
  });
});
