// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from './AppErrorBoundary';

// Última red del shell: una excepción en cualquier pantalla fuera del juego
// (catálogo, estadísticas, selector de modo, resultado) no deja la app en
// blanco — muestra un panel con la opción de recargar.

function BrokenScreen(): never {
  throw new Error('pantalla rota a propósito');
}

afterEach(cleanup);

describe('AppErrorBoundary', () => {
  it('renderiza a los hijos cuando no hay error', () => {
    render(
      <AppErrorBoundary>
        <p>shell sano</p>
      </AppErrorBoundary>,
    );
    expect(screen.getByText('shell sano')).toBeDefined();
  });

  it('atrapa el crash de una pantalla y muestra el panel de recarga', () => {
    // React loguea el error atrapado por consola; se silencia para el test.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AppErrorBoundary>
        <BrokenScreen />
      </AppErrorBoundary>,
    );

    expect(screen.getByText('Algo salió mal')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeDefined();

    consoleError.mockRestore();
  });
});
