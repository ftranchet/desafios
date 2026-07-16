#!/usr/bin/env node
// Generador de esqueleto de juego (PRD 5.5): crea src/games/<id>/ con
// logic.ts, ui.tsx, index.ts, logic.test.ts e icon.svg siguiendo los patrones
// de interacción de PRD 10.7 y el kit de ADR-005, y registra el módulo en
// src/core/registry.ts. El esqueleto compila, pasa lint y queda cubierto por
// el test de contrato y el smoke de render sin escribir nada extra.
//
// Uso: npm run new-game <game-id> ["Nombre visible"]
//   ej: npm run new-game memorama "Memorama"

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = join(ROOT, 'src', 'core', 'registry.ts');

const id = process.argv[2];
const visibleName = process.argv[3] ?? null;

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!id) fail('Falta el id del juego. Uso: npm run new-game <game-id> ["Nombre visible"]');
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id))
  fail(`El id tiene que ser kebab-case (minúsculas, dígitos y guiones): "${id}" no lo es.`);

const gameDir = join(ROOT, 'src', 'games', id);
if (existsSync(gameDir)) fail(`Ya existe src/games/${id}/.`);

const registrySource = readFileSync(REGISTRY, 'utf8');
if (registrySource.includes(`'../games/${id}'`)) fail(`"${id}" ya está registrado en registry.ts.`);

const camel = id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const pascal = camel.charAt(0).toUpperCase() + camel.slice(1);
const name = visibleName ?? pascal;

// ---------------------------------------------------------------------------
// Plantillas. La mecánica de ejemplo (contar toques exactos) es a propósito
// trivial: muestra la estructura completa — lógica pura con semilla, kit de
// interacción, contrato — para reemplazarla por la mecánica real.
// ---------------------------------------------------------------------------

const logicTs = `import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { createRng, randomInt } from '../../core/random';

// Lógica pura de "${name}" — sin React ni DOM (PRD 4.2.3).
// Esqueleto generado por \`npm run new-game\`: reemplazá la mecánica de
// ejemplo (contar toques exactos) por la real, manteniendo la estructura.

export interface LevelParams extends Record<string, number> {
  goalMin: number;
  goalMax: number;
}

// Las tres dificultades obligatorias (ADR-007). Para sumar Tranquilo o
// Progresivo: agregá los parámetros acá y declaralos en buildModes (index.ts).
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard', LevelParams> = {
  easy: { goalMin: 3, goalMax: 5 },
  medium: { goalMin: 8, goalMax: 12 },
  hard: { goalMin: 17, goalMax: 25 },
};

export function getModeParams(mode: ModeId): LevelParams {
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(\`Modo no soportado: \${mode}\`);
  return params;
}

export interface GameState {
  goal: number;
  taps: number;
}

export function createInitialState(mode: ModeId, seed: number): GameState {
  const params = getModeParams(mode);
  const rng = createRng(seed);
  return { goal: randomInt(rng, params.goalMin, params.goalMax), taps: 0 };
}

export function registerTap(state: GameState): GameState {
  return { ...state, taps: state.taps + 1 };
}

const EXACT_POINTS = 100;
const PENALTY_PER_MISS = 10;

export function computeScore(state: GameState): number {
  return Math.max(0, EXACT_POINTS - Math.abs(state.goal - state.taps) * PENALTY_PER_MISS);
}

export function buildResult(config: GameConfig, state: GameState, durationMs: number): GameResult {
  return {
    gameId: '${id}',
    mode: config.mode,
    score: computeScore(state),
    completed: true,
    durationMs,
    metrics: { goal: state.goal, taps: state.taps },
    timestamp: new Date().toISOString(),
  };
}
`;

const uiTsx = `import { useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PressButton, useAutoFocus } from '../../core/ui';
import { buildResult, createInitialState, registerTap, type GameState } from './logic';

// Interfaz de "${name}" — esqueleto generado por \`npm run new-game\`.
// Aplica los patrones de PRD 10.7: auto-foco del contenedor, PressButton
// (acción en pointerdown + teclado), atajos de teclado propios.

export function ${pascal}Game({ config, onFinish, audio }: GameProps) {
  const containerRef = useAutoFocus<HTMLDivElement>();
  const sessionStartRef = useRef(performance.now());
  const [state, setState] = useState<GameState>(() =>
    createInitialState(config.mode, config.seed ?? Date.now()),
  );

  function tap() {
    audio?.play('success');
    setState(registerTap);
  }

  function finish() {
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, state, durationMs));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === ' ') {
      event.preventDefault();
      tap();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      finish();
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex min-h-[70vh] flex-col items-center justify-center gap-6 p-6 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <p className="max-w-xs text-center text-base text-text-primary">
        Tocá el botón exactamente {state.goal} veces y enviá. Con teclado: Espacio suma, Enter
        envía.
      </p>
      <p className="font-display text-xl font-extrabold text-text-primary">{state.taps}</p>
      <PressButton ariaLabel="Sumar un toque" onPress={tap} className="px-10">
        Tocar
      </PressButton>
      <PressButton variant="primary" ariaLabel="Enviar" onPress={finish} className="px-8">
        Enviar
      </PressButton>
    </div>
  );
}
`;

const indexTs = `import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS } from './logic';
import { ${pascal}Game } from './ui';

export const ${camel}: GameModule = {
  metadata: {
    id: '${id}',
    name: '${name}',
    // TODO: elegí la categoría real: memory | logic | math | speed | spatial | words
    category: 'logic',
    // TODO: una línea en español que describa la mecánica real.
    description: 'Esqueleto generado: contá los toques exactos y enviá.',
    // TODO: 2-4 oraciones — objetivo + interacción — para la portada (ADR-010).
    howToPlay:
      'Esqueleto generado: tocá el botón exactamente la cantidad de veces que pide el objetivo y enviá. Con teclado: Espacio suma, Enter envía.',
    version: '0.1.0',
    // Tranquilo/Progresivo se declaran acá cuando el juego los implemente.
    modes: buildModes({
      easy: MODE_PARAMS.easy,
      medium: MODE_PARAMS.medium,
      hard: MODE_PARAMS.hard,
    }),
    estimatedSeconds: 60,
    icon,
  },
  Component: ${pascal}Game,
};
`;

const logicTest = `import { describe, expect, it } from 'vitest';
import {
  buildResult,
  computeScore,
  createInitialState,
  getModeParams,
  registerTap,
} from './logic';

// Tests con semilla fija (PRD 12.3): generación, jugada y puntaje.

const SEED = 123;

describe('${id}: generación', () => {
  it('misma semilla, misma partida', () => {
    expect(createInitialState('medium', SEED)).toEqual(createInitialState('medium', SEED));
  });

  it('el objetivo respeta los parámetros de cada modo', () => {
    for (const mode of ['easy', 'medium', 'hard'] as const) {
      const params = getModeParams(mode);
      const state = createInitialState(mode, SEED);
      expect(state.goal).toBeGreaterThanOrEqual(params.goalMin);
      expect(state.goal).toBeLessThanOrEqual(params.goalMax);
    }
  });
});

describe('${id}: jugada y puntaje', () => {
  it('registerTap incrementa sin mutar el estado anterior', () => {
    const state = createInitialState('easy', SEED);
    const next = registerTap(state);
    expect(next.taps).toBe(state.taps + 1);
    expect(state.taps).toBe(0);
  });

  it('puntaje máximo al acertar exacto, decreciente al pasarse', () => {
    let state = createInitialState('easy', SEED);
    for (let i = 0; i < state.goal; i += 1) state = registerTap(state);
    expect(computeScore(state)).toBe(100);
    expect(computeScore(registerTap(state))).toBeLessThan(100);
  });

  it('buildResult emite un GameResult válido', () => {
    const state = createInitialState('easy', SEED);
    const result = buildResult({ mode: 'easy', seed: SEED }, state, 1234);
    expect(result.gameId).toBe('${id}');
    expect(result.mode).toBe('easy');
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.completed).toBe(true);
  });
});
`;

// Glifo genérico con la paleta del sistema (reemplazar por uno propio, 10.4).
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="11" fill="none" stroke="#3fd0c9" stroke-width="2.5" />
  <circle cx="16" cy="16" r="4.5" fill="#ffcd4b" />
</svg>
`;

// ---------------------------------------------------------------------------

mkdirSync(gameDir, { recursive: true });
writeFileSync(join(gameDir, 'logic.ts'), logicTs);
writeFileSync(join(gameDir, 'ui.tsx'), uiTsx);
writeFileSync(join(gameDir, 'index.ts'), indexTs);
writeFileSync(join(gameDir, 'logic.test.ts'), logicTest);
writeFileSync(join(gameDir, 'icon.svg'), iconSvg);

// Registro: import después del último import de juegos, entrada antes de `];`.
const lines = registrySource.split('\n');
const lastImportIndex = lines.reduce(
  (acc, line, i) => (line.startsWith('import {') && line.includes("'../games/") ? i : acc),
  -1,
);
if (lastImportIndex === -1) fail('No se encontraron imports de juegos en registry.ts.');
lines.splice(lastImportIndex + 1, 0, `import { ${camel} } from '../games/${id}';`);
const closeIndex = lines.findIndex((line) => line.trim() === '];');
if (closeIndex === -1) fail('No se encontró el cierre del array GAMES en registry.ts.');
lines.splice(closeIndex, 0, `  ${camel},`);
writeFileSync(REGISTRY, lines.join('\n'));

console.log(`✓ src/games/${id}/ creado y registrado en registry.ts.

Próximos pasos (PRD 5.5 y checklist 12.3):
  1. Reemplazá la mecánica de ejemplo en logic.ts (funciones puras, con semilla).
  2. Construí la interfaz real en ui.tsx con el kit de core/ui (patrones 10.7).
  3. Completá categoría, descripción y duración estimada en index.ts.
  4. Dibujá el ícono propio en icon.svg (paleta del sistema, 10.4).
  5. Ajustá logic.test.ts a la mecánica real (semilla fija).
  6. npm run test — el contrato y el smoke de render ya te cubren.
`);
