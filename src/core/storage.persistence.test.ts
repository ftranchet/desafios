// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameResult } from './contract';
import { MAX_STORED_RESULTS, storage, trimResults } from './storage';

// Tests de la capa de persistencia real (con el localStorage de jsdom):
// esquema v2 por modo (ADR-007), migración desde v1/legado (niveles 1-5),
// tope del historial con retención de récords y saneo de resultados.

const RESULTS_KEY = 'dm:results';

function makeResult(overrides: Partial<GameResult> = {}): GameResult {
  return {
    gameId: 'quick-math',
    mode: 'medium',
    score: 100,
    completed: true,
    durationMs: 5000,
    metrics: {},
    timestamp: '2026-07-04T12:00:00.000Z',
    ...overrides,
  };
}

// Un resultado del esquema viejo (v1): con nivel numérico, sin modo.
function makeV1Result(level: number, score: number) {
  return {
    gameId: 'quick-math',
    level,
    score,
    completed: true,
    durationMs: 5000,
    metrics: {},
    timestamp: '2026-06-01T12:00:00.000Z',
  };
}

beforeEach(() => {
  // clearAll también invalida el caché en memoria del módulo, no solo la clave.
  storage.clearAll();
});

describe('persistencia: ida y vuelta (esquema v2)', () => {
  it('guarda y recupera resultados, filtrables por juego', () => {
    storage.saveResult(makeResult({ gameId: 'snake', score: 50 }));
    storage.saveResult(makeResult({ score: 120 }));

    expect(storage.getResults()).toHaveLength(2);
    expect(storage.getResults('snake')).toHaveLength(1);
    expect(storage.getBest('quick-math', 'medium')?.score).toBe(120);
  });

  it('escribe el formato versionado v2', () => {
    storage.saveResult(makeResult());
    const parsed: unknown = JSON.parse(localStorage.getItem(RESULTS_KEY) ?? 'null');
    expect(parsed).toMatchObject({ schemaVersion: 2 });
  });

  it('el modo Tranquilo nunca tiene récord (ADR-007)', () => {
    storage.saveResult(makeResult({ mode: 'zen', score: 9999 }));
    expect(storage.getBest('quick-math', 'zen')).toBeNull();
  });

  it('tolera JSON corrupto y entradas rotas sin tirar excepción', () => {
    localStorage.setItem(RESULTS_KEY, '{esto no es json');
    expect(storage.getResults()).toEqual([]);

    storage.clearAll();
    localStorage.setItem(
      RESULTS_KEY,
      JSON.stringify({
        schemaVersion: 2,
        results: [makeResult(), null, 42, { gameId: '' }, 'basura'],
      }),
    );
    expect(storage.getResults()).toHaveLength(1);
  });
});

describe('persistencia: migración desde el esquema de niveles (v1/legado)', () => {
  it('migra el array pelado legado mapeando nivel → modo (1-2→easy, 3→medium, 4-5→hard)', () => {
    localStorage.setItem(
      RESULTS_KEY,
      JSON.stringify([
        makeV1Result(1, 10),
        makeV1Result(2, 20),
        makeV1Result(3, 30),
        makeV1Result(4, 40),
        makeV1Result(5, 50),
      ]),
    );
    const results = storage.getResults();
    expect(results.map((r) => r.mode)).toEqual(['easy', 'easy', 'medium', 'hard', 'hard']);
    expect(storage.getBest('quick-math', 'easy')?.score).toBe(20);
    expect(storage.getBest('quick-math', 'medium')?.score).toBe(30);
    expect(storage.getBest('quick-math', 'hard')?.score).toBe(50);
  });

  it('migra el envoltorio v1 (schemaVersion 1 con niveles)', () => {
    localStorage.setItem(
      RESULTS_KEY,
      JSON.stringify({ schemaVersion: 1, results: [makeV1Result(3, 77)] }),
    );
    expect(storage.getBest('quick-math', 'medium')?.score).toBe(77);
  });

  it('los récords migrados sobreviven a la primera escritura v2', () => {
    localStorage.setItem(RESULTS_KEY, JSON.stringify([makeV1Result(5, 500)]));
    storage.saveResult(makeResult({ mode: 'hard', score: 100 }));
    const parsed: unknown = JSON.parse(localStorage.getItem(RESULTS_KEY) ?? 'null');
    expect(parsed).toMatchObject({ schemaVersion: 2 });
    expect(storage.getBest('quick-math', 'hard')?.score).toBe(500);
  });
});

describe('persistencia: saneo de resultados', () => {
  it('rechaza un resultado sin forma de GameResult v2', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    storage.saveResult({ nada: true } as unknown as GameResult);
    storage.saveResult({ ...makeResult(), mode: 'nivel-99' } as unknown as GameResult);
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
    expect(storage.getBest('quick-math', 'medium')?.score).toBe(99);

    setItem.mockRestore();
    warn.mockRestore();
  });
});

describe('persistencia: tope del historial con retención de récords', () => {
  it('trimResults respeta el tope y conserva el mejor por (juego, modo)', () => {
    const oldBest = makeResult({
      gameId: 'snake',
      mode: 'easy',
      score: 9999,
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    const filler = Array.from({ length: MAX_STORED_RESULTS + 50 }, (_, i) =>
      makeResult({ gameId: 'snake', mode: 'easy', score: i % 100 }),
    );
    const trimmed = trimResults([oldBest, ...filler]);

    // Acotado: tope + los mejores retenidos (uno en este caso).
    expect(trimmed.length).toBeLessThanOrEqual(MAX_STORED_RESULTS + 1);
    expect(trimmed.some((r) => r.score === 9999)).toBe(true);
  });

  it('el récord sigue visible vía getBest después de rotar el historial', () => {
    storage.saveResult(makeResult({ gameId: 'snake', mode: 'easy', score: 9999 }));
    for (let i = 0; i < MAX_STORED_RESULTS + 10; i += 1) {
      storage.saveResult(makeResult({ gameId: 'snake', mode: 'easy', score: 10 }));
    }
    expect(storage.getResults().length).toBeLessThanOrEqual(MAX_STORED_RESULTS + 1);
    expect(storage.getBest('snake', 'easy')?.score).toBe(9999);
  });
});
