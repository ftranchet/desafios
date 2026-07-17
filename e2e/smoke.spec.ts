import { expect, test } from './fixtures';

// Humo E2E (PRD 5.6): los flujos centrales del producto en un navegador real.
// Cada spec arranca de cero (localStorage limpio) para ser determinística.

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('el catálogo muestra todos los juegos y la navegación', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Desafíos Mentales' })).toBeVisible();
  // Una tarjeta por juego registrado. El contrato unitario valida la paridad
  // exacta del registro; acá se evita duplicar un número que quedaría obsoleto
  // cada vez que el generador suma un módulo.
  const cards = page.locator('a[href*="#/game/"]');
  const hrefs = await cards.evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThan(0);
  expect(new Set(hrefs).size).toBe(hrefs.length);
  expect(hrefs.every((href) => href?.includes('#/game/'))).toBe(true);
  // Navegación: botones-ícono del encabezado (sin barra inferior).
  await expect(page.getByRole('link', { name: 'Estadísticas' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Configuración' })).toBeVisible();
});

test('partida completa de Snake: resultado y persistencia versionada', async ({ page }) => {
  await page.locator('a[href*="#/game/snake"]').first().tap();
  await page.getByRole('button', { name: 'Jugar' }).tap();
  // Sin tocar nada, la víbora avanza hacia la pared y pierde sola.
  await expect(page.getByText('Resultado')).toBeVisible({ timeout: 15_000 });

  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('dm:results');
    return raw ? (JSON.parse(raw) as { schemaVersion?: number; results?: unknown[] }) : null;
  });
  expect(stored?.schemaVersion).toBe(2);
  expect(stored?.results).toHaveLength(1);

  await page.getByRole('button', { name: 'Reintentar' }).tap();
  await expect(page.getByRole('button', { name: 'Jugar' })).toBeVisible();
});

test('el keypad de Aritmética responde y muestra el feedback', async ({ page }) => {
  await page.goto('./#/game/quick-math');
  await page.getByRole('button', { name: 'Jugar' }).tap();

  // Cuenta regresiva numérica visible (respaldo de la barra, RNF-06).
  await expect(page.locator('span[aria-label*="segundos restantes"]')).toHaveText(/\d+ s/);

  await page.getByRole('button', { name: '1', exact: true }).tap();
  await expect(page.getByLabel('Tu respuesta')).toHaveText('1');
  await page.getByRole('button', { name: 'Responder' }).tap();
  await expect(page.getByText(/¡Correcto!|Incorrecto/)).toBeVisible();
});

test('el selector ofrece las 3 dificultades y los modos declarados por juego', async ({ page }) => {
  // Aritmética declara los dos modos especiales (referencia ADR-007).
  await page.goto('./#/game/quick-math');
  for (const label of ['Fácil', 'Medio', 'Difícil']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: /Tranquilo/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Progresivo/ })).toBeVisible();

  // Cifras declara Tranquilo pero no Progresivo (ronda única pensante).
  await page.goto('./#/game/cifras');
  await expect(page.getByRole('button', { name: /Tranquilo/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Progresivo/ })).toHaveCount(0);

  // Tiempo de reacción no declara modos especiales (el juego ES un reloj).
  await page.goto('./#/game/reaction-time');
  await expect(page.getByRole('button', { name: 'Fácil', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Tranquilo/ })).toHaveCount(0);
});

test('Tranquilo en Aritmética: sin reloj y con nota de modo sin récords', async ({ page }) => {
  await page.goto('./#/game/quick-math');
  await page.getByRole('button', { name: /Tranquilo/ }).tap();
  await page.getByRole('button', { name: 'Jugar' }).tap();
  // Keypad presente, pero sin cuenta regresiva ni barra (seconds = 0).
  await expect(page.getByRole('button', { name: '1', exact: true })).toBeVisible();
  await expect(page.locator('span[aria-label*="segundos restantes"]')).toHaveCount(0);
});

test('la portada del juego permite volver, y Estadísticas/Configuración también', async ({
  page,
}) => {
  await page.goto('./#/game/simon');
  await page.getByRole('button', { name: 'Volver' }).tap();
  await expect(page.getByRole('heading', { name: 'Desafíos Mentales' })).toBeVisible();

  // Estadísticas y Configuración: se entra por los íconos del encabezado y
  // se sale con su propio Volver.
  await page.getByRole('link', { name: 'Estadísticas' }).tap();
  await expect(page.getByRole('heading', { name: 'Estadísticas' })).toBeVisible();
  await page.getByRole('button', { name: 'Volver' }).tap();
  await expect(page.getByRole('heading', { name: 'Desafíos Mentales' })).toBeVisible();

  await page.getByRole('link', { name: 'Configuración' }).tap();
  await expect(page.getByRole('heading', { name: 'Configuración' })).toBeVisible();
  await page.getByRole('button', { name: 'Volver' }).tap();
  await expect(page.getByRole('heading', { name: 'Desafíos Mentales' })).toBeVisible();
});

test('la portada del juego explica cómo se juega', async ({ page }) => {
  await page.goto('./#/game/sudoku');
  await expect(page.getByRole('heading', { name: 'Sudoku' })).toBeVisible();
  await expect(page.getByText('¿Cómo se juega?')).toBeVisible();
  await expect(page.getByText(/Completá la grilla 9×9/)).toBeVisible();
});

test('la dificultad por defecto de Configuración se aplica en todos los juegos', async ({
  page,
}) => {
  await page.goto('./#/config');
  await page.getByRole('button', { name: 'Difícil', exact: true }).tap();

  // Cualquier juego arranca con esa dificultad preseleccionada.
  await page.goto('./#/game/simon');
  await expect(page.getByRole('button', { name: 'Difícil', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('salir de una partida pide confirmación y Escape la cancela', async ({ page }) => {
  await page.goto('./#/game/cascada');
  await page.getByRole('button', { name: 'Jugar' }).tap();
  await page.getByRole('button', { name: 'Salir' }).tap();

  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  // La partida sigue: el tablero está presente.
  await expect(page.locator('canvas')).toBeVisible();
});

test('Back del navegador confirma y registra el abandono', async ({ page }) => {
  await page.goto('./');
  await page.locator('a[href*="#/game/cascada"]').click();
  await page.getByRole('button', { name: 'Jugar' }).tap();

  await page.evaluate(() => history.back());
  const firstDialog = page.getByRole('alertdialog');
  await expect(firstDialog).toBeVisible();
  await firstDialog.getByRole('button', { name: 'Seguir jugando' }).tap();
  await expect(page.locator('canvas')).toBeVisible();

  await page.evaluate(() => history.back());
  const finalDialog = page.getByRole('alertdialog');
  await expect(finalDialog).toBeVisible();
  await finalDialog.getByRole('button', { name: 'Salir' }).tap();
  await expect(page.getByRole('heading', { name: 'Desafíos Mentales' })).toBeVisible();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('dm:results') ?? '{}'));
  expect(stored.results).toEqual(
    expect.arrayContaining([expect.objectContaining({ gameId: 'cascada', completed: false })]),
  );
});

test('configuración: los toggles cambian de estado', async ({ page }) => {
  await page.goto('./#/config');
  const soundToggle = page.getByRole('switch', { name: 'Sonido' });
  await expect(soundToggle).toHaveAttribute('aria-checked', 'true');
  await soundToggle.tap();
  await expect(soundToggle).toHaveAttribute('aria-checked', 'false');
});

test('las estadísticas abren vacías con la invitación a jugar', async ({ page }) => {
  await page.goto('./#/stats');
  await expect(page.getByRole('heading', { name: 'Estadísticas' })).toBeVisible();
  await expect(
    page.getByText('Todavía no jugaste ninguna partida', { exact: false }),
  ).toBeVisible();
});

test('favoritos: marcar un juego lo suma a la sección y sobrevive un reload', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByText('Favoritos')).toHaveCount(0);

  await page.getByRole('button', { name: 'Agregar a favoritos' }).first().tap();
  await expect(page.getByRole('heading', { name: 'Favoritos' })).toBeVisible();
  // Dos tarjetas del mismo juego (la de la sección y la de la grilla general)
  // ya ofrecen "Quitar de favoritos".
  await expect(page.getByRole('button', { name: 'Quitar de favoritos' })).toHaveCount(2);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Favoritos' })).toBeVisible();

  await page.getByRole('button', { name: 'Quitar de favoritos' }).first().tap();
  await expect(page.getByText('Favoritos')).toHaveCount(0);
});

test('una ruta que no existe no deja la app en blanco', async ({ page }) => {
  await page.goto('./#/esto-no-existe');
  await expect(page.getByRole('heading', { name: 'No encontramos esta pantalla' })).toBeVisible();
  await page.getByRole('link', { name: 'Ir al catálogo' }).tap();
  await expect(page.getByRole('heading', { name: 'Desafíos Mentales' })).toBeVisible();
});
