#!/usr/bin/env node
// Generador transaccional de módulos de juego.
//
// Uso:
//   npm run new-game -- <game-id> ["Nombre visible"] [--dry-run]
//
// El registro expone marcadores explícitos para evitar modificar por accidente
// otro array o bloque de imports. Todos los archivos se preparan en directorios
// temporales y recién se publican cuando la entrada de registro ya fue validada.

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMPORT_MARKER = '// new-game:metadata-imports';
const ENTRY_MARKER = '// new-game:entries';
const MAX_ID_LENGTH = 64;
const MAX_NAME_LENGTH = 80;

// Palabras reservadas o contextuales que no conviene generar como export de
// un módulo TypeScript estricto (incluye keywords nuevas como `using`).
const RESERVED_IDENTIFIERS = new Set([
  'abstract',
  'any',
  'arguments',
  'as',
  'asserts',
  'async',
  'await',
  'bigint',
  'boolean',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'constructor',
  'debugger',
  'declare',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'eval',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'is',
  'keyof',
  'let',
  'metadata',
  'module',
  'new',
  'never',
  'null',
  'number',
  'object',
  'override',
  'package',
  'private',
  'protected',
  'prototype',
  'public',
  'readonly',
  'require',
  'return',
  'static',
  'string',
  'super',
  'switch',
  'symbol',
  'this',
  'throw',
  'true',
  'try',
  'type',
  'typeof',
  'undefined',
  'unique',
  'unknown',
  'using',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);

export class NewGameError extends Error {}

function countOccurrences(source, value) {
  return source.split(value).length - 1;
}

function toCamelCase(id) {
  return id.replace(/-([a-z0-9])/g, (_, character) => character.toUpperCase());
}

function toPascalCase(identifier) {
  return identifier.charAt(0).toUpperCase() + identifier.slice(1);
}

function asTypeScriptString(value) {
  // JSON produce un literal de string válido y evita que nombres con comillas,
  // backticks o `${...}` se conviertan en código generado.
  return JSON.stringify(value).replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
}

export function validateGameId(rawId) {
  if (typeof rawId !== 'string' || rawId.length === 0) {
    throw new NewGameError(
      'Falta el id del juego. Uso: npm run new-game -- <game-id> ["Nombre visible"] [--dry-run]',
    );
  }
  if (rawId.length > MAX_ID_LENGTH) {
    throw new NewGameError(`El id no puede superar ${MAX_ID_LENGTH} caracteres.`);
  }
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(rawId)) {
    throw new NewGameError(
      `El id debe ser kebab-case y empezar con una letra minúscula: "${rawId}" no es válido.`,
    );
  }

  const identifier = toCamelCase(rawId);
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(identifier) || RESERVED_IDENTIFIERS.has(identifier)) {
    throw new NewGameError(`El id "${rawId}" genera el identificador reservado "${identifier}".`);
  }

  return { id: rawId, camel: identifier, pascal: toPascalCase(identifier) };
}

export function validateVisibleName(rawName, fallback) {
  if (rawName === null || rawName === undefined) return fallback;

  const name = rawName.trim();
  if (name.length === 0) throw new NewGameError('El nombre visible no puede estar vacío.');
  if (name.length > MAX_NAME_LENGTH) {
    throw new NewGameError(`El nombre visible no puede superar ${MAX_NAME_LENGTH} caracteres.`);
  }
  const containsForbiddenCharacter = [...name].some((character) => {
    const codePoint = character.codePointAt(0);
    return (
      codePoint <= 0x1f ||
      (codePoint >= 0x7f && codePoint <= 0x9f) ||
      codePoint === 0x2028 ||
      codePoint === 0x2029
    );
  });
  if (containsForbiddenCharacter) {
    throw new NewGameError('El nombre visible no puede contener caracteres de control ni saltos.');
  }
  return name;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Lee de forma segura el literal de `name` de metadata.ts sin ejecutar el
 * módulo. La propiedad debe ser un string estático: el catálogo necesita poder
 * auditar nombres duplicados antes de escribir un alta nueva.
 */
export function extractMetadataName(source) {
  const property = /(?:^|\n)[\t ]*name[\t ]*:[\t ]*/.exec(source);
  if (!property) throw new NewGameError('metadata.ts no declara un campo name estático.');

  let index = property.index + property[0].length;
  const quote = source[index];
  if (quote !== "'" && quote !== '"') {
    throw new NewGameError('metadata.ts debe declarar name como un literal de string.');
  }
  index += 1;

  let value = '';
  const simpleEscapes = {
    b: '\b',
    f: '\f',
    n: '\n',
    r: '\r',
    t: '\t',
    v: '\v',
    0: '\0',
    "'": "'",
    '"': '"',
    '\\': '\\',
  };

  while (index < source.length) {
    const character = source[index];
    if (character === quote) return value;
    if (character === '\n' || character === '\r') {
      throw new NewGameError('El literal name de metadata.ts no puede contener saltos.');
    }
    if (character !== '\\') {
      value += character;
      index += 1;
      continue;
    }

    index += 1;
    const escaped = source[index];
    if (escaped === undefined) break;
    if (escaped === '\n') {
      index += 1;
      continue;
    }
    if (escaped === '\r') {
      index += source[index + 1] === '\n' ? 2 : 1;
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(simpleEscapes, escaped)) {
      value += simpleEscapes[escaped];
      index += 1;
      continue;
    }
    if (escaped === 'x') {
      const hexadecimal = source.slice(index + 1, index + 3);
      if (!/^[\da-f]{2}$/i.test(hexadecimal)) {
        throw new NewGameError('metadata.ts contiene un escape hexadecimal inválido en name.');
      }
      value += String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      index += 3;
      continue;
    }
    if (escaped === 'u') {
      if (source[index + 1] === '{') {
        const close = source.indexOf('}', index + 2);
        const hexadecimal = close === -1 ? '' : source.slice(index + 2, close);
        const codePoint = Number.parseInt(hexadecimal, 16);
        if (!/^[\da-f]{1,6}$/i.test(hexadecimal) || codePoint > 0x10ffff) {
          throw new NewGameError('metadata.ts contiene un escape Unicode inválido en name.');
        }
        value += String.fromCodePoint(codePoint);
        index = close + 1;
        continue;
      }
      const hexadecimal = source.slice(index + 1, index + 5);
      if (!/^[\da-f]{4}$/i.test(hexadecimal)) {
        throw new NewGameError('metadata.ts contiene un escape Unicode inválido en name.');
      }
      value += String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      index += 5;
      continue;
    }

    // JavaScript interpreta `\z` como `z`; conservar ese comportamiento sin
    // evaluar código alcanza para comparar el texto visible.
    value += escaped;
    index += 1;
  }

  throw new NewGameError('metadata.ts contiene un literal name sin cerrar.');
}

function normalizedVisibleName(name) {
  return name.trim().toLocaleLowerCase('es-AR');
}

export function assertUniqueVisibleName(gamesRoot, proposedName) {
  let gameDirectories;
  try {
    gameDirectories = readdirSync(gamesRoot, { withFileTypes: true });
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
    if (code === 'ENOENT') return;
    throw new NewGameError(`No se pudo revisar los nombres existentes: ${errorMessage(error)}`);
  }

  const normalizedProposedName = normalizedVisibleName(proposedName);
  for (const entry of gameDirectories) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const metadataPath = join(gamesRoot, entry.name, 'metadata.ts');
    let existingName;
    try {
      existingName = extractMetadataName(readFileSync(metadataPath, 'utf8'));
    } catch (error) {
      throw new NewGameError(
        `No se pudo validar ${entry.name}/metadata.ts: ${errorMessage(error)}`,
      );
    }
    if (normalizedVisibleName(existingName) === normalizedProposedName) {
      throw new NewGameError(
        `El nombre visible "${proposedName}" ya pertenece al juego "${entry.name}".`,
      );
    }
  }
}

export function parseCliArgs(args) {
  const positional = [];
  let dryRun = false;

  for (const argument of args) {
    if (argument === '--dry-run') {
      if (dryRun) throw new NewGameError('La opción --dry-run está repetida.');
      dryRun = true;
    } else if (argument.startsWith('-')) {
      throw new NewGameError(`Opción desconocida: ${argument}`);
    } else {
      positional.push(argument);
    }
  }

  if (positional.length > 2) {
    throw new NewGameError('Se esperaba un id y, opcionalmente, un nombre visible.');
  }

  const identifiers = validateGameId(positional[0]);
  return {
    ...identifiers,
    name: validateVisibleName(positional[1], identifiers.pascal),
    dryRun,
  };
}

function normalizeOptions(options) {
  const identifiers = validateGameId(options?.id);
  if (options?.camel !== undefined && options.camel !== identifiers.camel) {
    throw new NewGameError('El identificador derivado no coincide con el id del juego.');
  }
  if (options?.pascal !== undefined && options.pascal !== identifiers.pascal) {
    throw new NewGameError('El nombre de componente derivado no coincide con el id del juego.');
  }
  return {
    ...identifiers,
    name: validateVisibleName(options?.name, identifiers.pascal),
    dryRun: options?.dryRun === true,
  };
}

export function updateRegistrySource(registrySource, options) {
  const { id, camel } = normalizeOptions(options);
  if (countOccurrences(registrySource, IMPORT_MARKER) !== 1) {
    throw new NewGameError(`registry.ts debe contener exactamente un marcador ${IMPORT_MARKER}.`);
  }
  if (countOccurrences(registrySource, ENTRY_MARKER) !== 1) {
    throw new NewGameError(`registry.ts debe contener exactamente un marcador ${ENTRY_MARKER}.`);
  }
  if (registrySource.includes(`../games/${id}/metadata`)) {
    throw new NewGameError(`"${id}" ya está registrado en registry.ts.`);
  }
  const metadataBinding = `${camel}Metadata`;
  if (new RegExp(`\\b${metadataBinding}\\b`).test(registrySource)) {
    throw new NewGameError(
      `El id "${id}" colisiona con el identificador ya registrado "${metadataBinding}".`,
    );
  }

  const importLine = `import { metadata as ${metadataBinding} } from '../games/${id}/metadata';`;
  const entryLine = `  defineGame(${metadataBinding}, () =>\n    import('../games/${id}').then(({ default: game }) => game),\n  ),`;

  return registrySource
    .replace(IMPORT_MARKER, `${IMPORT_MARKER}\n${importLine}`)
    .replace(ENTRY_MARKER, `${ENTRY_MARKER}\n${entryLine}`);
}

export function buildGameFiles(options) {
  const { id, camel, pascal, name } = normalizeOptions(options);
  const idLiteral = asTypeScriptString(id);
  const nameLiteral = asTypeScriptString(name);

  const logicTs = `import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { createRng, randomInt } from '../../core/random';

// Lógica pura, sin React ni DOM. Reemplazá la mecánica de ejemplo por la real.
export interface LevelParams {
  goalMin: number;
  goalMax: number;
}

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
    gameId: ${idLiteral},
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
import { GameLayout, PressButton, useAutoFocus } from '../../core/ui';
import { buildResult, createInitialState, registerTap, type GameState } from './logic';

export function ${pascal}Game({ config, onFinish, audio }: GameProps) {
  const containerRef = useAutoFocus<HTMLDivElement>();
  const sessionStartRef = useRef(performance.now());
  const finishedRef = useRef(false);
  const [state, setState] = useState<GameState>(() =>
    createInitialState(config.mode, config.seed ?? Date.now()),
  );
  const stateRef = useRef(state);

  function tap() {
    if (finishedRef.current) return;
    audio?.play('success');
    const next = registerTap(stateRef.current);
    stateRef.current = next;
    setState(next);
  }

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, stateRef.current, durationMs));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Los PressButton resuelven su propio teclado; no dupliques su click sintético.
    if (event.target !== event.currentTarget) return;
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
      className="flex min-h-[70dvh] w-full flex-col items-center p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary short:min-h-0 short:p-2"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <GameLayout
        hud={
          <p className="font-display text-xl font-extrabold text-text-primary">
            {state.taps} / {state.goal}
          </p>
        }
        board={
          <p className="max-w-xs text-center text-base text-text-primary">
            Tocá el botón exactamente {state.goal} veces. Con teclado: Espacio suma, Enter envía.
          </p>
        }
        panel={
          <div className="flex w-full flex-col gap-3">
            <PressButton ariaLabel="Sumar un toque" onPress={tap} className="w-full px-10">
              Tocar
            </PressButton>
            <PressButton
              variant="primary"
              ariaLabel="Enviar"
              onPress={finish}
              className="w-full px-8"
            >
              Enviar
            </PressButton>
          </div>
        }
      />
    </div>
  );
}
`;

  const metadataTs = `import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: ${idLiteral},
  name: ${nameLiteral},
  // TODO: elegí la categoría real: memory | logic | math | speed | spatial | words.
  category: 'logic',
  // TODO: reemplazá la descripción y las instrucciones junto con la mecánica.
  description: 'Esqueleto generado: contá los toques exactos y enviá.',
  howToPlay:
    'Esqueleto generado: tocá el botón exactamente la cantidad de veces indicada y enviá.',
  version: '0.1.0',
  modes: buildModes(),
  estimatedSeconds: 60,
  icon,
};
`;

  const indexTs = `import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { ${pascal}Game } from './ui';

export const ${camel}: GameModule = {
  metadata,
  Component: ${pascal}Game,
};

export default ${camel};
`;

  const logicTest = `import { describe, expect, it } from 'vitest';
import {
  buildResult,
  computeScore,
  createInitialState,
  getModeParams,
  registerTap,
} from './logic';

const SEED = 123;

describe(${idLiteral} + ': generación', () => {
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

describe(${idLiteral} + ': jugada y puntaje', () => {
  it('registerTap incrementa sin mutar el estado anterior', () => {
    const state = createInitialState('easy', SEED);
    const next = registerTap(state);
    expect(next.taps).toBe(state.taps + 1);
    expect(state.taps).toBe(0);
  });

  it('puntaje máximo al acertar exacto, decreciente al pasarse', () => {
    let state = createInitialState('easy', SEED);
    for (let index = 0; index < state.goal; index += 1) state = registerTap(state);
    expect(computeScore(state)).toBe(100);
    expect(computeScore(registerTap(state))).toBeLessThan(100);
  });

  it('buildResult emite un GameResult válido', () => {
    const state = createInitialState('easy', SEED);
    const result = buildResult({ mode: 'easy', seed: SEED }, state, 1234);
    expect(result.gameId).toBe(${idLiteral});
    expect(result.mode).toBe('easy');
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.completed).toBe(true);
  });
});
`;

  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="8.5" fill="none" stroke="#3fd0c9" stroke-width="2" />
  <circle cx="12" cy="12" r="3.5" fill="#ffcd4b" />
</svg>
`;

  return new Map([
    ['logic.ts', logicTs],
    ['ui.tsx', uiTsx],
    ['metadata.ts', metadataTs],
    ['index.ts', indexTs],
    ['logic.test.ts', logicTest],
    ['icon.svg', iconSvg],
  ]);
}

function cleanup(path) {
  if (!path || !existsSync(path)) return true;
  try {
    rmSync(path, { recursive: true, force: true });
    return true;
  } catch {
    // El error original es más útil. Los temporales incluyen pid y timestamp,
    // por lo que tampoco pueden sobrescribir un alta posterior.
    return false;
  }
}

export function createGame(options, root = DEFAULT_ROOT, operations = {}) {
  const normalizedOptions = normalizeOptions(options);
  const absoluteRoot = resolve(root);
  const gamesRoot = join(absoluteRoot, 'src', 'games');
  const gameDir = join(gamesRoot, normalizedOptions.id);
  const registryPath = join(absoluteRoot, 'src', 'core', 'registry.ts');
  const lockDir = join(dirname(registryPath), '.new-game.lock');

  if (existsSync(gameDir)) {
    throw new NewGameError(`Ya existe src/games/${normalizedOptions.id}/.`);
  }

  let registrySource;
  try {
    registrySource = readFileSync(registryPath, 'utf8');
  } catch (error) {
    throw new NewGameError(`No se pudo leer src/core/registry.ts: ${errorMessage(error)}`);
  }

  updateRegistrySource(registrySource, normalizedOptions);
  const files = buildGameFiles(normalizedOptions);
  assertUniqueVisibleName(gamesRoot, normalizedOptions.name);

  if (normalizedOptions.dryRun) {
    return { gameDir, registryPath, files: [...files.keys()], dryRun: true };
  }

  mkdirSync(gamesRoot, { recursive: true });
  try {
    // mkdir sin `recursive` funciona como un lock exclusivo entre procesos: un
    // solo generador puede validar y publicar el registro a la vez.
    mkdirSync(lockDir);
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
    if (code === 'EEXIST') {
      throw new NewGameError(
        'Ya hay otra alta de juego en curso. Si ningún proceso sigue activo, eliminá src/core/.new-game.lock y reintentá.',
      );
    }
    throw new NewGameError(`No se pudo tomar el lock del generador: ${errorMessage(error)}`);
  }

  let stagedGameDir = null;
  let stagedRegistryDir = null;
  let gamePublished = false;

  try {
    // Revalidar bajo lock cierra la carrera entre la simulación inicial y la
    // publicación: otro proceso no puede dejar una carpeta o registro nuevo en
    // medio de esta transacción.
    if (existsSync(gameDir)) {
      throw new NewGameError(`Ya existe src/games/${normalizedOptions.id}/.`);
    }
    assertUniqueVisibleName(gamesRoot, normalizedOptions.name);
    const lockedRegistrySource = readFileSync(registryPath, 'utf8');
    const lockedNextRegistrySource = updateRegistrySource(lockedRegistrySource, normalizedOptions);

    stagedGameDir = mkdtempSync(join(gamesRoot, `.${normalizedOptions.id}-`));
    stagedRegistryDir = mkdtempSync(join(dirname(registryPath), '.new-game-registry-'));
    const stagedRegistryPath = join(stagedRegistryDir, 'registry.ts');
    for (const [filename, source] of files) {
      writeFileSync(join(stagedGameDir, filename), source, { encoding: 'utf8', flag: 'wx' });
    }
    writeFileSync(stagedRegistryPath, lockedNextRegistrySource, { encoding: 'utf8', flag: 'wx' });

    // La carpeta se publica primero. Si el reemplazo atómico del registro
    // falla, se elimina la carpeta para volver al estado inicial.
    renameSync(stagedGameDir, gameDir);
    gamePublished = true;
    (operations.publishRegistry ?? renameSync)(stagedRegistryPath, registryPath);
  } catch (error) {
    const rolledBack = !gamePublished || cleanup(gameDir);
    const recovery = rolledBack
      ? 'no se conservaron cambios parciales'
      : `no se pudo revertir ${gameDir}; revisalo antes de reintentar`;
    throw new NewGameError(`No se pudo crear el juego; ${recovery}: ${errorMessage(error)}`);
  } finally {
    cleanup(stagedGameDir);
    cleanup(stagedRegistryDir);
    if (!cleanup(lockDir)) {
      console.warn(`No se pudo liberar el lock ${lockDir}; el alta sí terminó.`);
    }
  }

  return { gameDir, registryPath, files: [...files.keys()], dryRun: false };
}

export function runCli(args, root = DEFAULT_ROOT) {
  const options = parseCliArgs(args);
  const result = createGame(options, root);

  if (result.dryRun) {
    console.log(`✓ Simulación válida: se crearían src/games/${options.id}/ y su registro.`);
    console.log(`  Archivos: ${result.files.join(', ')}`);
    return;
  }

  console.log(`✓ src/games/${options.id}/ creado y registrado de forma transaccional.

Próximos pasos:
  1. Reemplazá la mecánica de ejemplo y sus metadatos: mientras conserven
     "Esqueleto generado", el test de contrato falla a propósito.
  2. Dibujá el ícono propio con los tokens del sistema.
  3. Ampliá logic.test.ts con casos límite de la mecánica real.
  4. Probá toque, teclado, celular vertical y celular horizontal.
  5. npm run format && npm run check — lint, tipos, tests, build y E2E.
`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    runCli(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`✗ ${message}`);
    process.exitCode = 1;
  }
}
