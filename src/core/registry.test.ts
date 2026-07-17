import { describe, expect, it } from 'vitest';
import type { Category } from './contract';
import { DIFFICULTY_MODE_IDS, MODE_LABELS, SPECIAL_MODE_IDS } from './modes';
import { GAMES, getGameById } from './registry';

// Test de contrato del registro (PRD 5.6): valida los metadatos de TODOS los
// juegos registrados. Un juego nuevo queda cubierto automáticamente al sumar
// su línea en registry.ts — si rompe el contrato, rompe acá, no en producción.

const VALID_CATEGORIES: Category[] = ['memory', 'logic', 'math', 'speed', 'spatial', 'words'];
const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const SCAFFOLD_PLACEHOLDER = /(?:TODO|esqueleto generado)/i;

describe('registro de juegos: contrato de metadatos', () => {
  it('hay al menos un juego registrado', () => {
    expect(GAMES.length).toBeGreaterThan(0);
  });

  it('los ids son únicos', () => {
    const ids = GAMES.map((g) => g.metadata.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('los nombres visibles son únicos', () => {
    const names = GAMES.map((game) => game.metadata.name.trim().toLocaleLowerCase('es-AR'));
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(GAMES.map((g) => [g.metadata.id, g] as const))('%s cumple el contrato', (_id, game) => {
    const meta = game.metadata;

    expect(meta.id).toMatch(KEBAB_CASE);
    expect(meta.name.trim().length).toBeGreaterThan(0);
    expect(meta.description.trim().length).toBeGreaterThan(0);
    expect(meta.howToPlay.trim().length).toBeGreaterThan(0);
    expect(`${meta.description} ${meta.howToPlay}`).not.toMatch(SCAFFOLD_PLACEHOLDER);
    expect(VALID_CATEGORIES).toContain(meta.category);
    expect(meta.version).toMatch(SEMVER);
    expect(meta.icon.trim().length).toBeGreaterThan(0);
    expect(Number.isFinite(meta.estimatedSeconds)).toBe(true);
    expect(meta.estimatedSeconds).toBeGreaterThan(0);
    expect(Object.isFrozen(meta)).toBe(true);
    expect(Object.isFrozen(meta.modes)).toBe(true);

    // Estructura de modos (ADR-007): las tres dificultades primero y en orden
    // canónico; después, solo modos especiales conocidos, sin repetir; los
    // labels canónicos y descripción en los especiales (garantía de buildModes).
    const ids = meta.modes.map((m) => m.id);
    expect(ids.slice(0, 3)).toEqual([...DIFFICULTY_MODE_IDS]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const extra of ids.slice(3)) {
      expect(SPECIAL_MODE_IDS).toContain(extra);
    }
    for (const mode of meta.modes) {
      expect(mode.label).toBe(MODE_LABELS[mode.id]);
      if ((SPECIAL_MODE_IDS as readonly string[]).includes(mode.id)) {
        expect(mode.description?.trim().length).toBeGreaterThan(0);
      }
    }

    expect(game.load).toBeTypeOf('function');
  });

  it.each(GAMES.map((game) => [game.metadata.id, game] as const))(
    '%s carga su módulo de forma diferida',
    async (_id, definition) => {
      const game = await definition.load();
      expect(game.metadata).toBe(definition.metadata);
      expect(game.Component).toBeDefined();
    },
  );

  it('getGameById encuentra cada juego y devuelve undefined para ids inexistentes', () => {
    for (const game of GAMES) {
      expect(getGameById(game.metadata.id)).toBe(game);
    }
    expect(getGameById('no-existe')).toBeUndefined();
  });
});
