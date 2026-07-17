import type { GameResult, ModeId } from './contract';
import { isModeId, levelToMode } from './modes';

// Servicio de persistencia (PRD sección 5.4). Solo lo usa el shell: los juegos
// nunca acceden a almacenamiento directamente (principio de arquitectura 4.2.2).
// Garantías de robustez (PRD 5.6): la escritura nunca tira excepción hacia el
// flujo de cierre de partida, el historial está acotado sin perder récords, y
// la lectura tolera datos legados o corruptos.
//
// Esquema v2 (ADR-007): los resultados se keyean por modo (`mode`) en vez del
// nivel numérico 1–5. Los datos v1 y el formato legado (array pelado) migran
// en lectura: nivel 1-2 → easy, 3 → medium, 4-5 → hard.

const RESULTS_KEY = 'dm:results';
const SCHEMA_VERSION = 2;

// Tope del historial persistido. Al rotar, se retiene además el mejor
// resultado completado por (juego, modo): los récords no caducan.
export const MAX_STORED_RESULTS = 500;

export interface StorageService {
  saveResult(result: GameResult): void;
  getResults(gameId?: string): GameResult[];
  getBest(gameId: string, mode: ModeId): GameResult | null;
  getStreak(): number; // Días consecutivos con al menos una partida completada
  exportAll(): string; // JSON completo
  clearAll(): void;
}

interface NormalizeResultOptions {
  // El shell conoce estos dos valores por la ruta y la selección activa. Al
  // proveerlos no confía en la identidad devuelta por un módulo de juego.
  identity?: Pick<GameResult, 'gameId' | 'mode'>;
  fallbackDurationMs?: number;
  fallbackTimestamp?: string;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function normalizeFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value));
}

function normalizeMetrics(value: unknown): Record<string, number> | null {
  if (!isPlainRecord(value)) return null;
  const metrics: Record<string, number> = {};
  for (const [key, metric] of Object.entries(value)) {
    if (typeof metric === 'number' && Number.isFinite(metric)) metrics[key] = metric;
  }
  return metrics;
}

/**
 * Valida y crea una copia segura de un resultado en la frontera del shell.
 * Sin identidad confiable (lectura/escritura de storage) exige la estructura
 * completa. Con identidad confiable degrada campos rotos a valores inocuos,
 * de modo que un juego defectuoso nunca rompa la pantalla de resultado.
 */
function normalizeGameResultUnsafe(
  value: unknown,
  options: NormalizeResultOptions = {},
): GameResult | null {
  const hasTrustedIdentity = options.identity !== undefined;
  if (!isPlainRecord(value) && !hasTrustedIdentity) return null;
  const result = isPlainRecord(value) ? value : {};

  const gameId = options.identity?.gameId ?? result.gameId;
  const mode = options.identity?.mode ?? result.mode;
  if (typeof gameId !== 'string' || gameId.trim().length === 0 || !isModeId(mode)) return null;

  if (!hasTrustedIdentity) {
    if (
      typeof result.score !== 'number' ||
      typeof result.completed !== 'boolean' ||
      typeof result.durationMs !== 'number' ||
      !isValidTimestamp(result.timestamp)
    ) {
      return null;
    }
  }

  const metrics = normalizeMetrics(result.metrics);
  if (!metrics && !hasTrustedIdentity) return null;

  const fallbackTimestamp = isValidTimestamp(options.fallbackTimestamp)
    ? options.fallbackTimestamp
    : new Date().toISOString();
  const timestamp = isValidTimestamp(result.timestamp) ? result.timestamp : fallbackTimestamp;
  const fallbackDurationMs = normalizeFiniteNumber(options.fallbackDurationMs, 0);

  return {
    gameId,
    mode,
    score: normalizeFiniteNumber(result.score, 0),
    completed: result.completed === true,
    durationMs: normalizeFiniteNumber(result.durationMs, fallbackDurationMs),
    metrics: metrics ?? {},
    timestamp,
  };
}

export function normalizeGameResult(
  value: unknown,
  options: NormalizeResultOptions = {},
): GameResult | null {
  try {
    return normalizeGameResultUnsafe(value, options);
  } catch {
    // También tolera proxies/objetos con getters hostiles. Cuando el shell
    // aporta identidad se devuelve una partida incompleta segura; al leer
    // storage se descarta la entrada.
    const identity = options.identity;
    if (
      !identity ||
      typeof identity.gameId !== 'string' ||
      identity.gameId.trim().length === 0 ||
      !isModeId(identity.mode)
    ) {
      return null;
    }
    return {
      ...identity,
      score: 0,
      completed: false,
      durationMs: normalizeFiniteNumber(options.fallbackDurationMs, 0),
      metrics: {},
      timestamp: isValidTimestamp(options.fallbackTimestamp)
        ? options.fallbackTimestamp
        : new Date().toISOString(),
    };
  }
}

// Migra/valida una entrada leída del almacenamiento. Devuelve el resultado en
// esquema v2, o null si la entrada está corrupta (se descarta sin romper).
function migrateStoredEntry(value: unknown): GameResult | null {
  if (!isPlainRecord(value)) return null;
  const r = value;

  if (isModeId(r.mode)) return normalizeGameResult(r);

  // Esquema v1 / legado: nivel numérico 1–5 → modo equivalente (ADR-007).
  if (
    typeof r.level === 'number' &&
    Number.isInteger(r.level) &&
    r.level >= 1 &&
    r.level <= 5
  ) {
    const migrated: Record<string, unknown> = { ...r, mode: levelToMode(r.level) };
    delete migrated.level;
    return normalizeGameResult(migrated);
  }
  return null;
}

// Caché del JSON parseado: el catálogo y las estadísticas consultan resultados
// una vez por juego/modo, y sin caché cada consulta re-parsea todo el
// almacenamiento. Se invalida en cada escritura de esta misma pestaña.
let cachedResults: GameResult[] | null = null;
let futureSchemaDetected = false;
let storageListenerInstalled = false;

function cloneResult(result: GameResult): GameResult {
  return { ...result, metrics: { ...result.metrics } };
}

// Otra pestaña puede cambiar o borrar los resultados. Invalidar la caché evita
// que una escritura posterior parta de una fotografía obsoleta y los pise.
function ensureStorageListener(): void {
  if (storageListenerInstalled || typeof window === 'undefined') return;
  window.addEventListener('storage', (event) => {
    if (event.key === RESULTS_KEY || event.key === null) {
      cachedResults = null;
      futureSchemaDetected = false;
    }
  });
  storageListenerInstalled = true;
}

function readResults(): GameResult[] {
  ensureStorageListener();
  if (cachedResults) return cachedResults;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(RESULTS_KEY);
  } catch {
    return [];
  }
  if (!raw) {
    futureSchemaDetected = false;
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    let entries: unknown[] = [];
    if (Array.isArray(parsed)) {
      // Formato legado (v0.x): el array pelado, sin envoltorio de versión.
      futureSchemaDetected = false;
      entries = parsed;
    } else if (isPlainRecord(parsed)) {
      const schemaVersion = parsed.schemaVersion;
      // No intentamos interpretar datos escritos por una versión futura: una
      // lectura conservadora evita reescribirlos con un esquema más viejo,
      // aunque el formato futuro ya no use una propiedad `results`.
      if (typeof schemaVersion === 'number' && schemaVersion > SCHEMA_VERSION) {
        futureSchemaDetected = true;
        cachedResults = [];
        return cachedResults;
      }
      futureSchemaDetected = false;
      if (Array.isArray(parsed.results)) entries = parsed.results;
    }
    cachedResults = entries.map(migrateStoredEntry).filter((r): r is GameResult => r !== null);
  } catch {
    cachedResults = [];
  }
  return cachedResults;
}

function writeResults(results: GameResult[]): void {
  cachedResults = results;
  if (futureSchemaDetected) {
    console.warn('No se sobrescriben resultados creados por una versión futura de la app.');
    return;
  }
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, results }));
  } catch (error) {
    // Cuota llena o modo privado: el resultado queda en memoria esta sesión.
    // Fallar acá jamás debe romper la pantalla de resultado de una partida.
    console.warn('No se pudo persistir el resultado:', error);
  }
}

// Rota el historial cuando supera el tope, conservando el mejor resultado
// completado por (juego, modo) aunque sea viejo: el historial es finito,
// los récords no.
export function trimResults(results: GameResult[]): GameResult[] {
  if (results.length <= MAX_STORED_RESULTS) return results;
  const recent = results.slice(-MAX_STORED_RESULTS);
  const recentSet = new Set<GameResult>(recent);

  const bestByCombo = new Map<string, GameResult>();
  for (const result of results) {
    if (!result.completed) continue;
    const key = `${result.gameId}:${result.mode}`;
    const best = bestByCombo.get(key);
    if (!best || result.score > best.score) bestByCombo.set(key, result);
  }
  const oldBests = [...bestByCombo.values()].filter((r) => !recentSet.has(r));
  return [...oldBests, ...recent];
}

function dateKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDateKey(timestamp: string): string {
  return dateKeyFromDate(new Date(timestamp));
}

/**
 * Cuenta la racha de días consecutivos con al menos una partida, a partir de un
 * conjunto de claves de fecha local ("YYYY-MM-DD") y el instante actual. Función
 * pura para testear sin `localStorage`. Si todavía no se jugó hoy, la racha
 * sigue viva desde ayer — solo se corta al saltear un día completo.
 */
export function streakFromDates(completedDates: Set<string>, nowMs: number): number {
  if (completedDates.size === 0 || !Number.isFinite(nowMs)) return 0;

  const cursor = new Date(nowMs);
  // Si hoy no hay partida, la racha no se rompe todavía: empezar a contar ayer.
  if (!completedDates.has(dateKeyFromDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (completedDates.has(dateKeyFromDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export const storage: StorageService = {
  saveResult(result) {
    const normalized = normalizeGameResult(result);
    if (!normalized) {
      console.warn('GameResult inválido; no se persiste:', result);
      return;
    }
    if (normalized.score !== result.score || normalized.durationMs !== result.durationMs) {
      console.warn('GameResult con números fuera de rango; se normaliza:', result);
    }
    writeResults(trimResults([...readResults(), normalized]));
  },

  getResults(gameId) {
    const results = readResults();
    return (gameId ? results.filter((r) => r.gameId === gameId) : results).map(cloneResult);
  },

  getBest(gameId, mode) {
    // Solo partidas completadas: una abandonada (score 0) no cuenta como récord.
    // El modo Tranquilo no compite (ADR-007): nunca tiene récord.
    if (mode === 'zen') return null;
    const candidates = readResults().filter(
      (r) => r.gameId === gameId && r.mode === mode && r.completed,
    );
    if (candidates.length === 0) return null;
    return cloneResult(candidates.reduce((best, r) => (r.score > best.score ? r : best)));
  },

  getStreak() {
    // La racha representa días del calendario del usuario, no días UTC. Esto
    // evita que una partida nocturna cuente para mañana en zonas como UTC-3.
    const completedDates = new Set(
      readResults()
        .filter((r) => r.completed)
        .map((r) => toDateKey(r.timestamp)),
    );
    return streakFromDates(completedDates, Date.now());
  },

  exportAll() {
    return JSON.stringify(
      {
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        results: readResults(),
      },
      null,
      2,
    );
  },

  clearAll() {
    futureSchemaDetected = false;
    try {
      localStorage.removeItem(RESULTS_KEY);
      cachedResults = null;
    } catch (error) {
      // Aunque el navegador deniegue removeItem, la sesión actual debe quedar
      // limpia y no volver a mostrar el valor que no pudo borrarse.
      cachedResults = [];
      console.warn('No se pudo borrar el historial persistido:', error);
    }
  },
};
