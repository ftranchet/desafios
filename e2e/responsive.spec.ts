import { expect, test } from './fixtures';

test('@responsive catálogo y portada no desbordan horizontalmente', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Desafíos Mentales' })).toBeVisible();

  const catalogOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(catalogOverflow).toBeLessThanOrEqual(1);

  await page.locator('a[href*="#/game/"]').first().click();
  await expect(page.getByRole('button', { name: 'Jugar' })).toBeVisible();
  const coverOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(coverOverflow).toBeLessThanOrEqual(1);
});

test('@responsive rotar durante una partida conserva los controles', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'mobile-chromium',
    'La rotación se prueba una vez en Chromium.',
  );
  await page.goto('./#/game/quick-math');
  await page.getByRole('button', { name: 'Jugar' }).click();
  await expect(page.getByRole('button', { name: 'Responder' })).toBeVisible();

  await page.setViewportSize({ width: 740, height: 360 });
  await expect(page.getByRole('button', { name: 'Responder' })).toBeVisible();
  const landscapeOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(landscapeOverflow).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 390, height: 800 });
  await expect(page.getByRole('button', { name: 'Responder' })).toBeVisible();
});
