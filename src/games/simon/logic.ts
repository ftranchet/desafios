import type { GameConfig, GameResult } from '../../core/contract';
import { createRng, randomInt } from '../../core/random';

// Lógica pura de Simon — sin React ni DOM. Repetir una secuencia de colores
// que crece una posición por ronda; a diferencia de los otros juegos de la
// fase, la presión de tiempo está solo en la reproducción automática de la
// secuencia, no en el toque del jugador (fiel al juego original).

export const PAD_COUNT = 4;

export interface LevelParams extends Record<string, number> {
  flashMs: number; // duración de cada destello al reproducir la secuencia
  gapMs: number; // pausa entre destellos
  maxRounds: number; // tope de longitud de secuencia (acota la duración de la partida)
}

export const LEVEL_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Fácil',
  2: 'Medio',
  3: 'Difícil',
  4: 'Avanzado',
  5: 'Experto',
};

export const LEVEL_PARAMS: Record<1 | 2 | 3 | 4 | 5, LevelParams> = {
  1: { flashMs: 600, gapMs: 300, maxRounds: 15 },
  2: { flashMs: 500, gapMs: 250, maxRounds: 18 },
  3: { flashMs: 450, gapMs: 200, maxRounds: 20 },
  4: { flashMs: 400, gapMs: 180, maxRounds: 22 },
  5: { flashMs: 320, gapMs: 150, maxRounds: 25 },
};

export function getLevelParams(level: number): LevelParams {
  const params = LEVEL_PARAMS[level as 1 | 2 | 3 | 4 | 5];
  if (!params) throw new Error(`Nivel inválido: ${level}`);
  return params;
}

export interface SimonState {
  sequence: number[]; // secuencia completa hasta el máximo del nivel, pregenerada
  round: number; // longitud objetivo de la repetición actual
  playerIndex: number; // toques correctos que lleva el jugador en esta ronda
  gameOver: boolean;
  failed: boolean; // true si terminó por un toque incorrecto
  score: number;
}

export function createInitialState(level: number, seed: number): SimonState {
  const params = getLevelParams(level);
  const rng = createRng(seed);
  const sequence = Array.from({ length: params.maxRounds }, () => randomInt(rng, 0, PAD_COUNT - 1));
  return { sequence, round: 1, playerIndex: 0, gameOver: false, failed: false, score: 0 };
}

const POINTS_PER_ROUND = 10;

export function submitTap(state: SimonState, padIndex: number): SimonState {
  if (state.gameOver) return state;

  const expected = state.sequence[state.playerIndex];
  if (expected === undefined || expected !== padIndex) {
    return { ...state, gameOver: true, failed: true };
  }

  const nextPlayerIndex = state.playerIndex + 1;
  if (nextPlayerIndex < state.round) {
    return { ...state, playerIndex: nextPlayerIndex };
  }

  // Completó la repetición de esta ronda.
  const score = state.round * POINTS_PER_ROUND;
  const nextRound = state.round + 1;
  if (nextRound > state.sequence.length) {
    return { ...state, playerIndex: 0, score, gameOver: true, failed: false };
  }
  return { ...state, playerIndex: 0, round: nextRound, score };
}

export function buildResult(config: GameConfig, state: SimonState, durationMs: number): GameResult {
  const roundsCompleted = state.failed ? Math.max(0, state.round - 1) : state.round;
  return {
    gameId: 'simon',
    level: config.level,
    score: state.score,
    completed: true, // fallar o llegar al tope es un final natural, no un abandono
    durationMs,
    metrics: { roundsCompleted, failed: state.failed ? 1 : 0 },
    timestamp: new Date().toISOString(),
  };
}
