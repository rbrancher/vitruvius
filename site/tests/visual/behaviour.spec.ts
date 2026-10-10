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

test('arquiteturismo: the banner pans on click', async ({ page }) => {
  await page.route(/r2\.dev\//, route => route.fulfill({ contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="300"/>' }));
  await page.goto('/revistas/browse/arquiteturismo/18.205');
  const img = page.locator('.arqtur-banner-img');
  await expect(img).toHaveAttribute('src', /arqtur_edition\/fixture_arqtur_banner\.jpg$/);
  await expect(img).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await page.locator('.arqtur-banner').click();
  const width = await page.locator('.arqtur-banner').evaluate(el => (el as HTMLElement).offsetWidth);
  await expect(img).toHaveCSS('transform', `matrix(1, 0, 0, 1, -${width}, 0)`);
  await page.locator('.arqtur-banner').click();
  await expect(img).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
});
