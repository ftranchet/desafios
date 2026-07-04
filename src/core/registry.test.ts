import { describe, expect, it } from 'vitest';
import type { Category } from './contract';
import { GAMES, getGameById } from './registry';

// Test de contrato del registro (PRD 5.6): valida los metadatos de TODOS los
// juegos registrados. Un juego nuevo queda cubierto automáticamente al sumar
// su línea en registry.ts — si rompe el contrato, rompe acá, no en producción.

const VALID_CATEGORIES: Category[] = ['memory', 'logic', 'math', 'speed', 'spatial', 'words'];
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe('registro de juegos: contrato de metadatos', () => {
  it('hay al menos un juego registrado', () => {
    expect(GAMES.length).toBeGreaterThan(0);
  });

  it('los ids son únicos', () => {
    const ids = GAMES.map((g) => g.metadata.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(GAMES.map((g) => [g.metadata.id, g] as const))('%s cumple el contrato', (_id, game) => {
    const meta = game.metadata;

    expect(meta.id).toMatch(KEBAB_CASE);
    expect(meta.name.trim().length).toBeGreaterThan(0);
    expect(meta.description.trim().length).toBeGreaterThan(0);
    expect(VALID_CATEGORIES).toContain(meta.category);
    expect(meta.version.trim().length).toBeGreaterThan(0);
    expect(meta.icon.trim().length).toBeGreaterThan(0);
    expect(meta.estimatedSeconds).toBeGreaterThan(0);

    // Exactamente 5 niveles, numerados 1..5 en orden, con etiqueta visible.
    expect(meta.levels).toHaveLength(5);
    meta.levels.forEach((level, index) => {
      expect(level.level).toBe(index + 1);
      expect(level.label.trim().length).toBeGreaterThan(0);
      expect(level.params).toBeTypeOf('object');
    });

    // El componente existe (función o clase React).
    expect(game.Component).toBeDefined();
  });

  it('getGameById encuentra cada juego y devuelve undefined para ids inexistentes', () => {
    for (const game of GAMES) {
      expect(getGameById(game.metadata.id)).toBe(game);
    }
    expect(getGameById('no-existe')).toBeUndefined();
  });
});
