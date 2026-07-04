import type { GameResult } from './contract';

// Servicio de persistencia (PRD sección 5.4). Solo lo usa el shell: los juegos
// nunca acceden a almacenamiento directamente (principio de arquitectura 4.2.2).
// Garantías de robustez (PRD 5.6): la escritura nunca tira excepción hacia el
// flujo de cierre de partida, el historial está acotado sin perder récords, y
// la lectura tolera datos legados o corruptos.

const RESULTS_KEY = 'dm:results';
const SCHEMA_VERSION = 1;

// Tope del historial persistido. Al rotar, se retiene además el mejor
// resultado completado por (juego, nivel): los récords no caducan.
export const MAX_STORED_RESULTS = 500;

export interface StorageService {
  saveResult(result: GameResult): void;
  getResults(gameId?: string): GameResult[];
  getBest(gameId: string, level: number): GameResult | null;
  getStreak(): number; // Días consecutivos con al menos una partida completada
  exportAll(): string; // JSON completo
  clearAll(): void;
}

// Forma mínima de un GameResult (solo tipos): lo que se exige al guardar.
// Un número no finito NO invalida la forma — eso lo corrige sanitizeResult,
// porque descartar la partida entera por un bug de puntaje sería peor.
function hasResultShape(value: unknown): value is GameResult {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.gameId === 'string' &&
    r.gameId.length > 0 &&
    typeof r.score === 'number' &&
    typeof r.completed === 'boolean' &&
    typeof r.timestamp === 'string'
  );
}

// Filtro de lectura: si el almacenamiento se corrompió (edición manual,
// versión vieja con un bug), una entrada rota se descarta en vez de romper
// récords, historial y racha. Acá sí se exige puntaje finito: lo escrito por
// esta versión siempre lo es, así que un NaN persistido es dato corrupto.
function isPlausibleResult(value: unknown): value is GameResult {
  return hasResultShape(value) && Number.isFinite(value.score);
}

// Normaliza números fuera de rango (NaN/Infinity/negativos) sin descartar la
// partida: un juego con un bug de puntaje no corrompe las comparaciones de
// récord (NaN > x es siempre false y getBest quedaría mintiendo en silencio).
function sanitizeResult(result: GameResult): GameResult {
  const finite = (n: number) => (Number.isFinite(n) ? n : 0);
  const score = Math.max(0, finite(result.score));
  const durationMs = Math.max(0, finite(result.durationMs));
  if (score !== result.score || durationMs !== result.durationMs) {
    console.warn('GameResult con números fuera de rango; se normaliza:', result);
  }
  return { ...result, score, durationMs };
}

// Caché del JSON parseado: el catálogo y las estadísticas consultan resultados
// una vez por juego/nivel, y sin caché cada consulta re-parsea todo el
// almacenamiento. Se invalida en cada escritura de esta misma pestaña.
let cachedResults: GameResult[] | null = null;

function readResults(): GameResult[] {
  if (cachedResults) return cachedResults;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(RESULTS_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Formato legado (v0.x): el array pelado, sin envoltorio de versión.
      cachedResults = parsed.filter(isPlausibleResult);
    } else if (
      typeof parsed === 'object' &&
      parsed !== null &&
      Array.isArray((parsed as { results?: unknown }).results)
    ) {
      cachedResults = (parsed as { results: unknown[] }).results.filter(isPlausibleResult);
    } else {
      cachedResults = [];
    }
  } catch {
    cachedResults = [];
  }
  return cachedResults;
}

function writeResults(results: GameResult[]): void {
  cachedResults = results;
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, results }));
  } catch (error) {
    // Cuota llena o modo privado: el resultado queda en memoria esta sesión.
    // Fallar acá jamás debe romper la pantalla de resultado de una partida.
    console.warn('No se pudo persistir el resultado:', error);
  }
}

// Rota el historial cuando supera el tope, conservando el mejor resultado
// completado por (juego, nivel) aunque sea viejo: el historial es finito,
// los récords no.
export function trimResults(results: GameResult[]): GameResult[] {
  if (results.length <= MAX_STORED_RESULTS) return results;
  const recent = results.slice(-MAX_STORED_RESULTS);
  const recentSet = new Set<GameResult>(recent);

  const bestByCombo = new Map<string, GameResult>();
  for (const result of results) {
    if (!result.completed) continue;
    const key = `${result.gameId}:${result.level}`;
    const best = bestByCombo.get(key);
    if (!best || result.score > best.score) bestByCombo.set(key, result);
  }
  const oldBests = [...bestByCombo.values()].filter((r) => !recentSet.has(r));
  return [...oldBests, ...recent];
}

function toDateKey(timestamp: string): string {
  return timestamp.slice(0, 10); // "YYYY-MM-DD" de un ISO 8601
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dateKeyFromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Cuenta la racha de días consecutivos con al menos una partida, a partir de un
 * conjunto de claves de fecha ("YYYY-MM-DD", UTC) y el instante actual. Función
 * pura para testear sin `localStorage`. Si todavía no se jugó hoy, la racha
 * sigue viva desde ayer — solo se corta al saltear un día completo.
 */
export function streakFromDates(completedDates: Set<string>, nowMs: number): number {
  if (completedDates.size === 0) return 0;

  let cursorMs = nowMs;
  // Si hoy no hay partida, la racha no se rompe todavía: empezar a contar ayer.
  if (!completedDates.has(dateKeyFromMs(cursorMs))) {
    cursorMs -= DAY_MS;
  }

  let streak = 0;
  while (completedDates.has(dateKeyFromMs(cursorMs))) {
    streak += 1;
    cursorMs -= DAY_MS;
  }
  return streak;
}

export const storage: StorageService = {
  saveResult(result) {
    if (!hasResultShape(result)) {
      console.warn('GameResult inválido; no se persiste:', result);
      return;
    }
    writeResults(trimResults([...readResults(), sanitizeResult(result)]));
  },

  getResults(gameId) {
    const results = readResults();
    return gameId ? results.filter((r) => r.gameId === gameId) : results;
  },

  getBest(gameId, level) {
    // Solo partidas completadas: una abandonada (score 0) no cuenta como récord.
    const candidates = readResults().filter(
      (r) => r.gameId === gameId && r.level === level && r.completed,
    );
    if (candidates.length === 0) return null;
    return candidates.reduce((best, r) => (r.score > best.score ? r : best));
  },

  getStreak() {
    // Se trabaja en UTC de punta a punta para que coincida con el timestamp
    // ISO 8601 de GameResult y evitar corrimientos de día por huso horario.
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
    cachedResults = null;
    try {
      localStorage.removeItem(RESULTS_KEY);
    } catch {
      // Sin acceso al almacenamiento no hay nada que borrar.
    }
  },
};
