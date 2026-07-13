import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { lerp, progressiveT, PROGRESSIVE_STAGES } from '../../core/modes';
import { createRng, pick, randomInt, type Rng } from '../../core/random';
import { WORDS_BY_LENGTH, type WordLength } from './words';

// Lógica pura de "Anagramas" — sin React ni DOM. Reordená las fichas de
// letras hasta formar la palabra objetivo; no hay límite de intentos, el
// puntaje premia la eficiencia (menos movimientos, más cerca del mínimo
// teórico de una colocación por letra). Modos según ADR-007: tres
// dificultades (largo de palabra), Tranquilo (más rondas sin puntaje por
// eficiencia) y Progresivo (10 grados). El largo de palabra topa en 6 letras
// —el diccionario de este banco no tiene palabras más largas, igual que
// Palabra del día— así que los grados 9-10 extrapolan agregando fichas señuelo
// (letras de más, ajenas a la palabra) en vez de alargarla.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export interface ModeParams extends Record<string, number> {
  wordLength: WordLength;
  distractorCount: number;
}

// easy/medium/hard equivalen a los largos 4/5/6 del diccionario.
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen', ModeParams> = {
  easy: { wordLength: 4, distractorCount: 0 },
  medium: { wordLength: 5, distractorCount: 0 },
  hard: { wordLength: 6, distractorCount: 0 },
  // Tranquilo: largo medio, más rondas, sin game over (ADR-007).
  zen: { wordLength: 5, distractorCount: 0 },
};

// Progresivo: metadatos del modo (los parámetros reales salen de stageParams).
export const PROGRESSIVE_PARAMS: ModeParams = { wordLength: 4, distractorCount: 0 };

export const ZEN_ROUND_COUNT = 8;
export const ROUND_COUNT = 5; // palabras por sesión en los modos de dificultad fija

/** Parámetros de un grado del progresivo: interpola Fácil→Difícil y extrapola en 9-10 con fichas señuelo (ADR-007). */
export function stageParams(stage: number): ModeParams {
  const t = progressiveT(stage);
  const wordLength = Math.round(lerp(4, 6, Math.min(1, t))) as WordLength;
  // Los grados 1-8 no tienen señuelos; 9 agrega una ficha señuelo y 10, dos.
  const distractorCount = Math.max(0, stage - 8);
  return { wordLength, distractorCount };
}

export function getModeParams(mode: ModeId): ModeParams {
  if (mode === 'progressive') return PROGRESSIVE_PARAMS;
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

function shuffle<T>(rng: Rng, items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(rng, 0, i);
    const tmp = result[i]!;
    result[i] = result[j]!;
    result[j] = tmp;
  }
  return result;
}

export interface RoundSpec {
  word: string;
  tiles: string[]; // letras de la palabra + señuelos, ya mezcladas
  wordLength: WordLength;
  stage: number; // grado del progresivo; 1 en el resto
}

function buildRound(
  rng: Rng,
  wordLength: WordLength,
  distractorCount: number,
  stage: number,
): RoundSpec {
  const word = pick(rng, WORDS_BY_LENGTH[wordLength]);
  const letters = word.split('');
  for (let i = 0; i < distractorCount; i += 1) {
    letters.push(pick(rng, ALPHABET));
  }
  return { word, tiles: shuffle(rng, letters), wordLength, stage };
}

/** Rondas de la sesión: ROUND_COUNT en modos fijos, ZEN_ROUND_COUNT en Tranquilo, 10 en Progresivo. */
export function buildRounds(mode: ModeId, seed: number): RoundSpec[] {
  const rng = createRng(seed);
  if (mode === 'progressive') {
    return Array.from({ length: PROGRESSIVE_STAGES }, (_, i) => {
      const stage = i + 1;
      const { wordLength, distractorCount } = stageParams(stage);
      return buildRound(rng, wordLength, distractorCount, stage);
    });
  }
  const roundCount = mode === 'zen' ? ZEN_ROUND_COUNT : ROUND_COUNT;
  const { wordLength, distractorCount } = getModeParams(mode);
  return Array.from({ length: roundCount }, () => buildRound(rng, wordLength, distractorCount, 1));
}

export interface RoundProgress {
  poolIndices: number[]; // índices en round.tiles todavía en la bandeja, en orden de aparición
  answerIndices: number[]; // índices ya colocados, en el orden colocado
  moves: number;
  done: boolean;
}

export function createRoundProgress(round: RoundSpec): RoundProgress {
  return {
    poolIndices: round.tiles.map((_, i) => i),
    answerIndices: [],
    moves: 0,
    done: false,
  };
}

/** Coloca la ficha de la bandeja en la posición `poolPosition` en el próximo casillero libre. */
export function placeTile(
  round: RoundSpec,
  progress: RoundProgress,
  poolPosition: number,
): RoundProgress {
  if (progress.done) return progress;
  if (progress.answerIndices.length >= round.word.length) return progress;
  const tileIndex = progress.poolIndices[poolPosition];
  if (tileIndex === undefined) return progress;

  const poolIndices = progress.poolIndices.filter((_, i) => i !== poolPosition);
  const answerIndices = [...progress.answerIndices, tileIndex];
  const moves = progress.moves + 1;
  const done =
    answerIndices.length === round.word.length &&
    answerIndices.map((i) => round.tiles[i]).join('') === round.word;
  return { poolIndices, answerIndices, moves, done };
}

/** Devuelve a la bandeja la ficha colocada en la posición `answerPosition`. */
export function removeTile(progress: RoundProgress, answerPosition: number): RoundProgress {
  if (progress.done) return progress;
  const tileIndex = progress.answerIndices[answerPosition];
  if (tileIndex === undefined) return progress;

  const answerIndices = progress.answerIndices.filter((_, i) => i !== answerPosition);
  const poolIndices = [...progress.poolIndices, tileIndex];
  const moves = progress.moves + 1;
  return { poolIndices, answerIndices, moves, done: false };
}

const BASE_POINTS = 100;
const MIN_EFFICIENCY = 0.3;
const MAX_EFFICIENCY = 1.3;
const EASY_WORD_LENGTH = MODE_PARAMS.easy.wordLength;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundPoints(mode: ModeId, round: RoundSpec, moves: number): number {
  if (mode === 'zen') return BASE_POINTS; // Tranquilo: sin bono, no compite (ADR-007)
  const par = round.word.length; // mínimo teórico: una colocación por letra, sin remociones
  const efficiency = clamp(par / Math.max(moves, par), MIN_EFFICIENCY, MAX_EFFICIENCY);
  const lengthBonus = round.wordLength / EASY_WORD_LENGTH;
  const stageMultiplier = 1 + (round.stage - 1) / 9; // Progresivo: el grado multiplica
  return Math.round(BASE_POINTS * lengthBonus * efficiency * stageMultiplier);
}

export interface AnagramsMetrics extends Record<string, number> {
  completedRounds: number;
  totalRounds: number;
  totalMoves: number;
  maxStage: number;
}

export function buildResult(
  config: GameConfig,
  rounds: RoundSpec[],
  moveCounts: number[], // movimientos usados por ronda completada
  durationMs: number,
  completed = true,
): GameResult {
  let score = 0;
  let maxStage = 0;
  let totalMoves = 0;

  moveCounts.forEach((moves, i) => {
    const round = rounds[i];
    if (!round) return;
    score += roundPoints(config.mode, round, moves);
    totalMoves += moves;
    maxStage = Math.max(maxStage, round.stage);
  });

  return {
    gameId: 'anagrams',
    mode: config.mode,
    score,
    completed,
    durationMs,
    metrics: {
      completedRounds: moveCounts.length,
      totalRounds: rounds.length,
      totalMoves,
      maxStage,
    },
    timestamp: new Date().toISOString(),
  };
}
