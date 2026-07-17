// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { GAMES } from './registry';

// Smoke test de render (PRD 5.6): monta y desmonta el componente de CADA
// juego registrado, en CADA modo que declara (ADR-007), con semilla fija.
// Atrapa errores de runtime en ui.tsx que los tests de lógica pura no ven.
// Declarar un modo es quedar testeado en ese modo.

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

describe('smoke de render: todos los juegos montan en todos sus modos', () => {
  for (const game of GAMES) {
    for (const mode of game.metadata.modes) {
      it(`${game.metadata.id} en modo ${mode.id} carga, monta y desmonta`, async () => {
        const { Component } = await game.load();
        const { container, unmount } = render(
          <Component
            config={{ mode: mode.id, seed: SEED }}
            onFinish={() => {}}
            onQuit={() => {}}
          />,
        );
        expect(container.firstElementChild).not.toBeNull();
        unmount();
      });
    }
  }
});
