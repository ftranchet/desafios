import { describe, expect, it } from 'vitest';
import { buildResult, closestToTarget, combine, computeScore, generatePuzzle } from './logic';

describe('generatePuzzle', () => {
  it('es determinística con la misma semilla', () => {
    const a = generatePuzzle(3, 42);
    const b = generatePuzzle(3, 42);
    expect(a).toEqual(b);
  });

  it('siempre devuelve 6 números', () => {
    for (let level = 1; level <= 5; level += 1) {
      const puzzle = generatePuzzle(level, level * 7);
      expect(puzzle.numbers).toHaveLength(6);
    }
  });

  it('respeta la cantidad de números grandes del nivel', () => {
    const largePool = [25, 50, 75, 100];
    for (let level = 1; level <= 5; level += 1) {
      const puzzle = generatePuzzle(level, level * 13);
      const largeCount = puzzle.numbers.filter((n) => largePool.includes(n)).length;
      const expected = level <= 2 ? 1 : level <= 4 ? 2 : 3;
      expect(largeCount).toBe(expected);
    }
  });

  it('el objetivo cae dentro del rango del nivel', () => {
    const puzzle = generatePuzzle(1, 5);
    expect(puzzle.target).toBeGreaterThanOrEqual(100);
    expect(puzzle.target).toBeLessThanOrEqual(300);
  });

  it('lanza si el nivel es inválido', () => {
    expect(() => generatePuzzle(0, 1)).toThrow();
  });
});

describe('combine', () => {
  it('suma sin importar el orden', () => {
    expect(combine(3, 5, '+')).toBe(8);
    expect(combine(5, 3, '+')).toBe(8);
  });

  it('resta siempre mayor menos menor', () => {
    expect(combine(3, 10, '-')).toBe(7);
    expect(combine(10, 3, '-')).toBe(7);
  });

  it('rechaza restas que darían cero', () => {
    expect(combine(5, 5, '-')).toBeNull();
  });

  it('multiplica sin importar el orden', () => {
    expect(combine(4, 6, '*')).toBe(24);
  });

  it('divide solo si es exacto', () => {
    expect(combine(4, 20, '/')).toBe(5);
    expect(combine(3, 10, '/')).toBeNull();
  });
});

describe('closestToTarget', () => {
  it('elige el valor más cercano', () => {
    expect(closestToTarget([10, 250, 999], 253)).toBe(250);
  });

  it('funciona con un solo valor', () => {
    expect(closestToTarget([42], 100)).toBe(42);
  });
});

describe('computeScore', () => {
  it('da el puntaje máximo más bono de tiempo en un acierto exacto', () => {
    const { score, metrics } = computeScore(253, 253, 30_000, 90_000);
    expect(metrics.exact).toBe(1);
    expect(metrics.distance).toBe(0);
    expect(score).toBe(1000 + Math.round((30_000 / 90_000) * 200));
  });

  it('da puntaje decreciente según la distancia, sin bono de tiempo', () => {
    expect(computeScore(253, 253, 0, 90_000).score).toBe(1000);
    expect(computeScore(253, 258, 0, 90_000).score).toBe(700);
    expect(computeScore(253, 263, 0, 90_000).score).toBe(400);
    expect(computeScore(253, 275, 0, 90_000).score).toBe(150);
    expect(computeScore(253, 300, 0, 90_000).score).toBe(0);
  });
});

describe('buildResult', () => {
  it('arma un GameResult válido', () => {
    const result = buildResult({ level: 1, seed: 1 }, 253, 253, 10_000, 20_000, true);
    expect(result.gameId).toBe('cifras');
    expect(result.level).toBe(1);
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(20_000);
    expect(result.score).toBeGreaterThan(0);
  });
});
