import { expect, test as base } from '@playwright/test';

// Todo error no manejado del navegador hace fallar el caso que lo produjo.
// Los error boundaries pueden mostrar una recuperación de React, pero no deben
// esconder errores de eventos, timers, imports dinámicos o promesas.
export const test = base.extend<{ runtimeErrors: Error[] }>({
  runtimeErrors: [
    async ({ page }, use) => {
      const errors: Error[] = [];
      page.on('pageerror', (error) => errors.push(error));
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const location = message.location();
        const source = location.url
          ? ` (${location.url}:${location.lineNumber}:${location.columnNumber})`
          : '';
        errors.push(new Error(`console.error: ${message.text()}${source}`));
      });
      await use(errors);
      const details = errors.map((error) => error.stack ?? error.message).join('\n\n');
      expect(errors, details).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
