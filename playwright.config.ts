import { defineConfig } from '@playwright/test';

// Suite E2E de humo (PRD 5.6): recorre los flujos reales en un navegador —
// catálogo, partida completa, keypad, navegación, diálogos — para atrapar
// roturas de integración que los tests unitarios no ven. Corre contra el
// build de producción servido por `vite preview`: correr `npm run build`
// antes de `npm run test:e2e`.
//
// En entornos con Chromium preinstalado, apuntar PLAYWRIGHT_CHROMIUM_EXECUTABLE
// al binario para no descargar navegadores.

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/desafios/',
    // Viewport de celular con toque: la plataforma principal del producto.
    viewport: { width: 390, height: 800 },
    hasTouch: true,
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/desafios/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
