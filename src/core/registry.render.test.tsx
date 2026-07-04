// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { GAMES } from './registry';

// Smoke test de render (PRD 5.6): monta y desmonta el componente de CADA
// juego registrado con semilla fija. Atrapa errores de runtime en ui.tsx
// (hooks mal usados, referencias rotas, crashes al montar) que los tests de
// lógica pura no pueden ver. Un juego nuevo queda cubierto al registrarse.

beforeAll(() => {
  // jsdom no implementa canvas: getContext devuelve null y además loguea
  // "Not implemented". Los juegos ya toleran el null (encadenamiento
  // opcional); el stub solo silencia el ruido.
  HTMLCanvasElement.prototype.getContext = vi
    .fn()
    .mockReturnValue(null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

afterEach(cleanup);

const SEED = 42;

describe('smoke de render: todos los juegos montan sin errores', () => {
  for (const game of GAMES) {
    for (const level of [1, 3, 5]) {
      it(`${game.metadata.id} nivel ${level} monta y desmonta`, () => {
        const { unmount } = render(
          <game.Component config={{ level, seed: SEED }} onFinish={() => {}} onQuit={() => {}} />,
        );
        expect(document.body.textContent).toBeDefined();
        unmount();
      });
    }
  }
});
