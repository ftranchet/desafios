// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameResult } from './contract';
import { MAX_STORED_RESULTS, storage, trimResults } from './storage';

// Tests de la capa de persistencia real (con el localStorage de jsdom):
// formato versionado, tolerancia a datos legados/corruptos, tope del
// historial con retención de récords y saneo de resultados inválidos.

const RESULTS_KEY = 'dm:results';

function makeResult(overrides: Partial<GameResult> = {}): GameResult {
  return {
    gameId: 'quick-math',
    level: 3,
    score: 100,
    completed: true,
    durationMs: 5000,
    metrics: {},
    timestamp: '2026-07-04T12:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  // clearAll también invalida el caché en memoria del módulo, no solo la clave.
  storage.clearAll();
});

describe('persistencia: ida y vuelta', () => {
  it('guarda y recupera resultados, filtrables por juego', () => {
    storage.saveResult(makeResult({ gameId: 'snake', score: 50 }));
    storage.saveResult(makeResult({ score: 120 }));

    expect(storage.getResults()).toHaveLength(2);
    expect(storage.getResults('snake')).toHaveLength(1);
    expect(storage.getBest('quick-math', 3)?.score).toBe(120);
  });

  it('escribe el formato versionado', () => {
    storage.saveResult(makeResult());
    const parsed: unknown = JSON.parse(localStorage.getItem(RESULTS_KEY) ?? 'null');
    expect(parsed).toMatchObject({ schemaVersion: 1 });
  });

  it('lee el formato legado (array pelado, v0.x)', () => {
    localStorage.setItem(RESULTS_KEY, JSON.stringify([makeResult({ score: 77 })]));
    expect(storage.getResults()).toHaveLength(1);
    expect(storage.getBest('quick-math', 3)?.score).toBe(77);
  });

  it('tolera JSON corrupto y entradas rotas sin tirar excepción', () => {
    localStorage.setItem(RESULTS_KEY, '{esto no es json');
    expect(storage.getResults()).toEqual([]);

    storage.clearAll();
    localStorage.setItem(
      RESULTS_KEY,
      JSON.stringify({
        schemaVersion: 1,
        results: [makeResult(), null, 42, { gameId: '' }, 'basura'],
      }),
    );
    expect(storage.getResults()).toHaveLength(1);
  });
});

describe('persistencia: saneo de resultados', () => {
  it('rechaza un resultado sin forma de GameResult', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    storage.saveResult({ nada: true } as unknown as GameResult);
    expect(storage.getResults()).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('normaliza puntajes no finitos o negativos en vez de corromper récords', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    storage.saveResult(makeResult({ score: Number.NaN }));
    storage.saveResult(makeResult({ score: -50, durationMs: Number.POSITIVE_INFINITY }));

    const results = storage.getResults();
    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(Number.isFinite(r.score)).toBe(true);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(r.durationMs)).toBe(true);
    }
    warn.mockRestore();
  });

  it('sobrevive a un localStorage que falla al escribir (cuota, modo privado)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    expect(() => storage.saveResult(makeResult({ score: 99 }))).not.toThrow();
    // El resultado queda en memoria durante la sesión aunque no persista.
    expect(storage.getBest('quick-math', 3)?.score).toBe(99);

    setItem.mockRestore();
    warn.mockRestore();
  });
});

describe('persistencia: tope del historial con retención de récords', () => {
  it('trimResults respeta el tope y conserva el mejor por (juego, nivel)', () => {
    const oldBest = makeResult({
      gameId: 'snake',
      level: 2,
      score: 9999,
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    const filler = Array.from({ length: MAX_STORED_RESULTS + 50 }, (_, i) =>
      makeResult({ gameId: 'snake', level: 2, score: i % 100 }),
    );
    const trimmed = trimResults([oldBest, ...filler]);

    // Acotado: tope + los mejores retenidos (uno en este caso).
    expect(trimmed.length).toBeLessThanOrEqual(MAX_STORED_RESULTS + 1);
    expect(trimmed.some((r) => r.score === 9999)).toBe(true);
  });

  it('el récord sigue visible vía getBest después de rotar el historial', () => {
    storage.saveResult(makeResult({ gameId: 'snake', level: 2, score: 9999 }));
    for (let i = 0; i < MAX_STORED_RESULTS + 10; i += 1) {
      storage.saveResult(makeResult({ gameId: 'snake', level: 2, score: 10 }));
    }
    expect(storage.getResults().length).toBeLessThanOrEqual(MAX_STORED_RESULTS + 1);
    expect(storage.getBest('snake', 2)?.score).toBe(9999);
  });
});
