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

function readResults(): GameResult[] {
  const raw = localStorage.getItem(RESULTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeResults(results: GameResult[]): void {
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
}

function toDateKey(timestamp: string): string {
  return timestamp.slice(0, 10); // "YYYY-MM-DD" de un ISO 8601
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
    const candidates = readResults().filter((r) => r.gameId === gameId && r.level === level);
    if (candidates.length === 0) return null;
    return candidates.reduce((best, r) => (r.score > best.score ? r : best));
  },

  getStreak() {
    const completedDates = new Set(
      readResults()
        .filter((r) => r.completed)
        .map((r) => toDateKey(r.timestamp)),
    );
    if (completedDates.size === 0) return 0;

    // Se trabaja en UTC de punta a punta para que coincida con el timestamp
    // ISO 8601 de GameResult y evitar corrimientos de día por huso horario.
    let streak = 0;
    let cursorMs = Date.now();

    while (completedDates.has(new Date(cursorMs).toISOString().slice(0, 10))) {
      streak += 1;
      cursorMs -= 24 * 60 * 60 * 1000;
    }
    return streak;
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
    localStorage.removeItem(RESULTS_KEY);
  },
};
