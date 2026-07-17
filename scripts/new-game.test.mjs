import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  NewGameError,
  createGame,
  extractMetadataName,
  parseCliArgs,
  updateRegistrySource,
} from './new-game.mjs';

const roots = [];

function fixture(registrySource = null) {
  const root = mkdtempSync(join(tmpdir(), 'desafios-new-game-'));
  roots.push(root);
  mkdirSync(join(root, 'src', 'core'), { recursive: true });
  mkdirSync(join(root, 'src', 'games'), { recursive: true });
  writeFileSync(
    join(root, 'src', 'core', 'registry.ts'),
    registrySource ??
      `import type { GameDefinition } from './contract';
// new-game:metadata-imports

export const GAMES: GameDefinition[] = [
  // new-game:entries
];
`,
  );
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('new-game: validación de argumentos', () => {
  it('rechaza ids inseguros', () => {
    for (const id of [
      '123-game',
      'class',
      'await',
      'constructor',
      'metadata',
      'using',
      'UPPERCASE',
      'two--dashes',
      '../escape',
    ]) {
      expect(() => parseCliArgs([id])).toThrow(NewGameError);
    }
  });

  it('rechaza opciones desconocidas, nombres vacíos y caracteres de control', () => {
    expect(() => parseCliArgs(['safe-game', '--force'])).toThrow('Opción desconocida');
    expect(() => parseCliArgs(['safe-game', '-f'])).toThrow('Opción desconocida');
    expect(() => parseCliArgs(['safe-game', '   '])).toThrow('no puede estar vacío');
    expect(() => parseCliArgs(['safe-game', 'Nombre\npartido'])).toThrow('caracteres de control');
  });

  it('acepta --dry-run antes o después de los argumentos', () => {
    expect(parseCliArgs(['--dry-run', 'safe-game', 'Juego seguro'])).toMatchObject({
      id: 'safe-game',
      camel: 'safeGame',
      pascal: 'SafeGame',
      name: 'Juego seguro',
      dryRun: true,
    });
  });

  it('lee el nombre estático sin ejecutar metadata.ts', () => {
    expect(
      extractMetadataName("export const metadata = {\n  name: 'Ni\\u00f1o \\'ágil\\'',\n};"),
    ).toBe("Niño 'ágil'");
    expect(() => extractMetadataName('export const metadata = { name: buildName() };')).toThrow(
      'name estático',
    );
  });
});

describe('new-game: registro', () => {
  it('exige un único marcador de imports y de entradas', () => {
    const options = parseCliArgs(['safe-game']);
    expect(() => updateRegistrySource('export const GAMES = [];', options)).toThrow(
      'new-game:metadata-imports',
    );
    expect(() =>
      updateRegistrySource(
        '// new-game:metadata-imports\n// new-game:metadata-imports\n// new-game:entries',
        parseCliArgs(['safe-game']),
      ),
    ).toThrow('exactamente un marcador');
  });

  it('inserta metadata y loader diferido sin depender del número de juegos', () => {
    const source = readFileSync(join(fixture(), 'src', 'core', 'registry.ts'), 'utf8');
    const next = updateRegistrySource(source, parseCliArgs(['safe-game']));
    expect(next).toContain(
      "import { metadata as safeGameMetadata } from '../games/safe-game/metadata';",
    );
    expect(next).toContain(
      "defineGame(safeGameMetadata, () =>\n    import('../games/safe-game').then(({ default: game }) => game)",
    );
  });
});

describe('new-game: escritura transaccional', () => {
  it('crea los seis archivos y registra el loader', () => {
    const root = fixture();
    const suspiciousName = "O'Brien `" + '$' + '{noSeEjecuta}` */';
    const options = parseCliArgs(['safe-game', suspiciousName]);
    const result = createGame(options, root);

    expect(result.files).toEqual([
      'logic.ts',
      'ui.tsx',
      'metadata.ts',
      'index.ts',
      'logic.test.ts',
      'icon.svg',
    ]);
    const metadata = readFileSync(
      join(root, 'src', 'games', 'safe-game', 'metadata.ts'),
      'utf8',
    );
    expect(metadata).toContain(`name: ${JSON.stringify(suspiciousName)}`);
    const index = readFileSync(join(root, 'src', 'games', 'safe-game', 'index.ts'), 'utf8');
    expect(index).toContain('export default safeGame;');
    const ui = readFileSync(join(root, 'src', 'games', 'safe-game', 'ui.tsx'), 'utf8');
    expect(ui).toContain('if (finishedRef.current) return;');
    expect(ui).toContain('stateRef.current = next;');
    expect(ui).toContain('buildResult(config, stateRef.current, durationMs)');
    const registry = readFileSync(join(root, 'src', 'core', 'registry.ts'), 'utf8');
    expect(registry).toContain("import('../games/safe-game')");
    expect(existsSync(join(root, 'src', 'core', '.new-game.lock'))).toBe(false);
  });

  it('en dry-run valida todo pero no cambia archivos', () => {
    const root = fixture();
    const registryPath = join(root, 'src', 'core', 'registry.ts');
    const before = readFileSync(registryPath, 'utf8');
    const result = createGame(parseCliArgs(['dry-game', '--dry-run']), root);

    expect(result.dryRun).toBe(true);
    expect(existsSync(join(root, 'src', 'games', 'dry-game'))).toBe(false);
    expect(readFileSync(registryPath, 'utf8')).toBe(before);
  });

  it('rechaza un nombre visible ya usado, también en dry-run', () => {
    const root = fixture();
    const existingDir = join(root, 'src', 'games', 'existing-game');
    mkdirSync(existingDir);
    writeFileSync(
      join(existingDir, 'metadata.ts'),
      "export const metadata = {\n  name: 'Snake',\n};\n",
    );
    const registryPath = join(root, 'src', 'core', 'registry.ts');
    const before = readFileSync(registryPath, 'utf8');

    expect(() => createGame(parseCliArgs(['new-game', ' snake ', '--dry-run']), root)).toThrow(
      'ya pertenece',
    );
    expect(existsSync(join(root, 'src', 'games', 'new-game'))).toBe(false);
    expect(readFileSync(registryPath, 'utf8')).toBe(before);
  });

  it('un lock existente impide que dos generadores publiquen a la vez', () => {
    const root = fixture();
    const registryPath = join(root, 'src', 'core', 'registry.ts');
    const before = readFileSync(registryPath, 'utf8');
    const lockDir = join(root, 'src', 'core', '.new-game.lock');
    mkdirSync(lockDir);

    expect(() => createGame(parseCliArgs(['concurrent-game']), root)).toThrow(
      'otra alta de juego en curso',
    );
    expect(existsSync(lockDir)).toBe(true);
    expect(existsSync(join(root, 'src', 'games', 'concurrent-game'))).toBe(false);
    expect(readFileSync(registryPath, 'utf8')).toBe(before);
  });

  it('no deja una carpeta parcial si el registro es inválido', () => {
    const root = fixture('export const GAMES = [];\n');
    expect(() => createGame(parseCliArgs(['orphan-game']), root)).toThrow(NewGameError);
    expect(existsSync(join(root, 'src', 'games', 'orphan-game'))).toBe(false);
  });

  it('revierte la carpeta si falla la publicación atómica del registro', () => {
    const root = fixture();
    const registryPath = join(root, 'src', 'core', 'registry.ts');
    const before = readFileSync(registryPath, 'utf8');

    expect(() =>
      createGame(parseCliArgs(['rollback-game']), root, {
        publishRegistry() {
          throw new Error('falla simulada');
        },
      }),
    ).toThrow('no se conservaron cambios parciales');
    expect(existsSync(join(root, 'src', 'games', 'rollback-game'))).toBe(false);
    expect(readFileSync(registryPath, 'utf8')).toBe(before);
  });

  it('rechaza un id ya registrado aunque falte su carpeta', () => {
    const root = fixture(`// new-game:metadata-imports
import { metadata as safeGameMetadata } from '../games/safe-game/metadata';
export const GAMES = [
  // new-game:entries
];
`);

    expect(() => createGame(parseCliArgs(['safe-game']), root)).toThrow('ya está registrado');
    expect(existsSync(join(root, 'src', 'games', 'safe-game'))).toBe(false);
  });

  it('rechaza dos ids que generarían el mismo binding de metadata', () => {
    const root = fixture(`// new-game:metadata-imports
import { metadata as foo1Metadata } from '../games/foo1/metadata';
export const GAMES = [
  // new-game:entries
];
`);
    const registryPath = join(root, 'src', 'core', 'registry.ts');
    const before = readFileSync(registryPath, 'utf8');

    expect(() => createGame(parseCliArgs(['foo-1']), root)).toThrow('colisiona');
    expect(existsSync(join(root, 'src', 'games', 'foo-1'))).toBe(false);
    expect(readFileSync(registryPath, 'utf8')).toBe(before);
  });

  it('no sobrescribe una carpeta existente', () => {
    const root = fixture();
    const gameDir = join(root, 'src', 'games', 'safe-game');
    mkdirSync(gameDir);
    writeFileSync(join(gameDir, 'keep.txt'), 'usuario');

    expect(() => createGame(parseCliArgs(['safe-game']), root)).toThrow('Ya existe');
    expect(readFileSync(join(gameDir, 'keep.txt'), 'utf8')).toBe('usuario');
  });
});
