import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { lerp, PROGRESSIVE_STAGES, progressiveT } from '../../core/modes';
import { createRng, randomInt } from '../../core/random';

// Lógica pura de "Memoria espacial" (tipo Corsi) — sin React ni DOM. El
// juego enciende celdas de una grilla neutra en una secuencia creciente; el
// desafío es reproducirla tocando en el mismo orden — la posición es la
// única pista, sin depender del color (RNF-05). Misma estructura que Simon
// (referencia de ADR-007 para juegos de secuencia): tres dificultades,
// Tranquilo (fallar repite la ronda) y Progresivo (el grado acelera la
// reproducción).

export const CELL_COUNT = 9;

export interface LevelParams extends Record<string, number> {
  flashMs: number; // duración de cada destello al reproducir la secuencia
  gapMs: number; // pausa entre destellos
  maxRounds: number; // tope de longitud de secuencia (acota la duración de la partida)
}

// easy/medium/hard equivalen a los niveles 1/3/5 del esquema anterior (ADR-007).
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen' | 'progressive', LevelParams> =
  {
    easy: { flashMs: 700, gapMs: 350, maxRounds: 12 },
    medium: { flashMs: 550, gapMs: 280, maxRounds: 16 },
    hard: { flashMs: 420, gapMs: 220, maxRounds: 20 },
    // Tranquilo: reproducción lenta y fallar repite la ronda (ADR-007).
    zen: { flashMs: 700, gapMs: 350, maxRounds: 12 },
    // Progresivo: la velocidad de reproducción la pone el grado (stage).
    progressive: { flashMs: 700, gapMs: 350, maxRounds: 16 },
  };

// --- Modo progresivo ---------------------------------------------------------

const ROUNDS_PER_STAGE = 2;

/** Grado según la ronda: sube uno cada 2 rondas, tope 10. */
export function stageForRound(round: number): number {
  return Math.min(PROGRESSIVE_STAGES, Math.floor((round - 1) / ROUNDS_PER_STAGE) + 1);
}

/**
 * Velocidad de reproducción de una ronda: fija en los modos comunes; en el
 * progresivo interpola fácil→difícil por grado y extrapola en 9-10 (ADR-007).
 */
export function playbackForRound(mode: ModeId, round: number): { flashMs: number; gapMs: number } {
  if (mode !== 'progressive') {
    const params = getModeParams(mode);
    return { flashMs: params.flashMs, gapMs: params.gapMs };
  }
  const t = progressiveT(stageForRound(round));
  return {
    flashMs: Math.max(220, Math.round(lerp(MODE_PARAMS.easy.flashMs, MODE_PARAMS.hard.flashMs, t))),
    gapMs: Math.max(90, Math.round(lerp(MODE_PARAMS.easy.gapMs, MODE_PARAMS.hard.gapMs, t))),
  };
}

export function getModeParams(mode: ModeId): LevelParams {
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

export interface SpatialMemoryState {
  mode: ModeId;
  sequence: number[]; // índices de celda (0..CELL_COUNT-1) hasta el máximo del modo, pregenerada
  round: number; // longitud objetivo de la repetición actual
  playerIndex: number; // toques correctos que lleva el jugador en esta ronda
  gameOver: boolean;
  failed: boolean; // true si terminó por un toque incorrecto
  mistakes: number; // fallos en Tranquilo (repiten la ronda, no terminan)
  score: number;
}

export function createInitialState(mode: ModeId, seed: number): SpatialMemoryState {
  const params = getModeParams(mode);
  const rng = createRng(seed);
  const sequence = Array.from({ length: params.maxRounds }, () =>
    randomInt(rng, 0, CELL_COUNT - 1),
  );
  return {
    mode,
    sequence,
    round: 1,
    playerIndex: 0,
    gameOver: false,
    failed: false,
    mistakes: 0,
    score: 0,
  };
}

const POINTS_PER_ROUND = 10;

export function submitTap(state: SpatialMemoryState, cellIndex: number): SpatialMemoryState {
  if (state.gameOver) return state;

  const expected = state.sequence[state.playerIndex];
  if (expected === undefined || expected !== cellIndex) {
    if (state.mode === 'zen') {
      // Tranquilo: fallar repite la ronda en vez de terminar (ADR-007).
      return { ...state, playerIndex: 0, mistakes: state.mistakes + 1 };
    }
    return { ...state, gameOver: true, failed: true };
  }

  const nextPlayerIndex = state.playerIndex + 1;
  if (nextPlayerIndex < state.round) {
    return { ...state, playerIndex: nextPlayerIndex };
  }

  // Completó la repetición de esta ronda. En el progresivo el puntaje es
  // acumulativo y el grado multiplica; en el resto, ronda × puntos (como
  // siempre, para no invalidar récords previos).
  const score =
    state.mode === 'progressive'
      ? state.score + stageForRound(state.round) * POINTS_PER_ROUND
      : state.round * POINTS_PER_ROUND;
  const nextRound = state.round + 1;
  if (nextRound > state.sequence.length) {
    return { ...state, playerIndex: 0, score, gameOver: true, failed: false };
  }
  return { ...state, playerIndex: 0, round: nextRound, score };
}

export function buildResult(
  config: GameConfig,
  state: SpatialMemoryState,
  durationMs: number,
): GameResult {
  const roundsCompleted = state.failed ? Math.max(0, state.round - 1) : state.round;
  return {
    gameId: 'spatial-memory',
    mode: config.mode,
    score: state.score,
    completed: true, // fallar o llegar al tope es un final natural, no un abandono
    durationMs,
    metrics: {
      roundsCompleted,
      failed: state.failed ? 1 : 0,
      mistakes: state.mistakes,
      maxStage: roundsCompleted > 0 ? stageForRound(roundsCompleted) : 0,
    },
    timestamp: new Date().toISOString(),
  };
}
