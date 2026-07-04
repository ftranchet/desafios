// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameErrorBoundary } from './GameErrorBoundary';

// La garantía central de PRD 5.6: un juego que explota en el render no tumba
// el shell — muestra el panel de falla con una salida al catálogo.

function BrokenGame(): never {
  throw new Error('juego roto a propósito');
}

afterEach(cleanup);

describe('GameErrorBoundary', () => {
  it('renderiza a los hijos cuando no hay error', () => {
    render(
      <GameErrorBoundary onExit={() => {}}>
        <p>juego sano</p>
      </GameErrorBoundary>,
    );
    expect(screen.getByText('juego sano')).toBeDefined();
  });

  it('atrapa el crash de un juego y muestra la salida al catálogo', () => {
    // React loguea el error atrapado por consola; se silencia para el test.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onExit = vi.fn();

    render(
      <GameErrorBoundary onExit={onExit}>
        <BrokenGame />
      </GameErrorBoundary>,
    );

    expect(screen.getByText('El juego falló')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Volver al catálogo' }));
    expect(onExit).toHaveBeenCalledOnce();

    consoleError.mockRestore();
  });
});
