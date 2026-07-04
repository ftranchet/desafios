import type { GameResult } from './contract';

// Servicio de persistencia (PRD sección 5.4). Solo lo usa el shell: los juegos
// nunca acceden a almacenamiento directamente (principio de arquitectura 4.2.2).

const RESULTS_KEY = 'dm:results';
const SCHEMA_VERSION = 1;

export interface StorageService {
  saveResult(result: GameResult): void;
  getResults(gameId?: string): GameResult[];
  getBest(gameId: string, level: number): GameResult | null;
  getStreak(): number; // Días consecutivos con al menos una partida completada
  exportAll(): string; // JSON completo
  clearAll(): void;
}

// Caché del JSON parseado: el catálogo y las estadísticas consultan resultados
// una vez por juego/nivel, y sin caché cada consulta re-parsea todo el
// almacenamiento. Se invalida en cada escritura de esta misma pestaña.
let cachedResults: GameResult[] | null = null;

function readResults(): GameResult[] {
  if (cachedResults) return cachedResults;
  const raw = localStorage.getItem(RESULTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    cachedResults = Array.isArray(parsed) ? parsed : [];
  } catch {
    cachedResults = [];
  }
  return cachedResults;
}

function writeResults(results: GameResult[]): void {
  cachedResults = results;
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
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
    const results = readResults();
    results.push(result);
    writeResults(results);
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
    localStorage.removeItem(RESULTS_KEY);
  },
};
