import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { lerp, progressiveT, PROGRESSIVE_STAGES } from '../../core/modes';
import { createRng, pick, type Rng } from '../../core/random';
import { WORDS_BY_LENGTH, type WordLength } from './words';

// Lógica pura de "Palabra del día" — sin React ni DOM. Adiviná la palabra
// objetivo en una cantidad limitada de intentos; cada intento marca, letra
// por letra, si está en el lugar correcto, si está en la palabra pero en
// otro lugar, o si no está (estilo Wordle). Modos según ADR-007: tres
// dificultades (largo de palabra), Tranquilo (varias palabras sin game over)
// y Progresivo (10 grados: una palabra por grado, más larga hasta topar en 6
// letras —el diccionario de este banco no tiene palabras más largas— y de
// ahí en más los grados 9-10 extrapolan acortando los intentos).

export interface ModeParams extends Record<string, number> {
  wordLength: WordLength;
  maxGuesses: number;
}

// easy/medium/hard equivalen a los niveles 1/3/5 del esquema anterior.
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen', ModeParams> = {
  easy: { wordLength: 4, maxGuesses: 6 },
  medium: { wordLength: 5, maxGuesses: 6 }, // el Wordle clásico: 5 letras, 6 intentos
  hard: { wordLength: 6, maxGuesses: 6 },
  // Tranquilo: palabra de largo medio, varias rondas, sin game over (ADR-007).
  zen: { wordLength: 5, maxGuesses: 6 },
};

// Progresivo: metadatos del modo (los parámetros reales salen de stageParams).
export const PROGRESSIVE_PARAMS: ModeParams = { wordLength: 4, maxGuesses: 6 };

export const ZEN_ROUND_COUNT = 5;
const MIN_PROGRESSIVE_GUESSES = 4;

/** Parámetros de un grado del progresivo: interpola Fácil→Difícil y extrapola en 9-10 acortando los intentos (ADR-007). */
export function stageParams(stage: number): ModeParams {
  const t = progressiveT(stage);
  const wordLength = Math.round(lerp(4, 6, Math.min(1, t))) as WordLength;
  // Los grados 1-8 usan siempre los 6 intentos clásicos; 9-10 los acortan,
  // ya que el largo de palabra ya tocó el techo del diccionario (6).
  const extraStages = Math.max(0, stage - 8) / 2; // 0 en 1-8, 0.5 en 9, 1 en 10
  const maxGuesses = Math.max(MIN_PROGRESSIVE_GUESSES, Math.round(lerp(6, 4, extraStages)));
  return { wordLength, maxGuesses };
}

export function getModeParams(mode: ModeId): ModeParams {
  if (mode === 'progressive') return PROGRESSIVE_PARAMS;
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

export function wordsOfLength(length: WordLength): readonly string[] {
  return WORDS_BY_LENGTH[length];
}

/** ¿`word` (normalizada a mayúsculas) es una palabra real del banco de ese largo? */
export function isValidWord(word: string, length: WordLength): boolean {
  return wordsOfLength(length).includes(word.toUpperCase());
}

export function generateWord(rng: Rng, length: WordLength): string {
  return pick(rng, wordsOfLength(length));
}

export type LetterState = 'correct' | 'present' | 'absent';

/**
 * Compara un intento contra el objetivo, letra por letra (algoritmo estándar
 * de Wordle: primero marca los exactos, después reparte "presente" respetando
 * cuántas copias de cada letra le quedan al objetivo, para no sobre-marcar
 * letras repetidas).
 */
export function evaluateGuess(target: string, guess: string): LetterState[] {
  const length = target.length;
  const result: LetterState[] = new Array(length).fill('absent');
  const remaining: Record<string, number> = {};

  for (let i = 0; i < length; i += 1) {
    if (guess[i] === target[i]) {
      result[i] = 'correct';
    } else {
      const letter = target[i]!;
      remaining[letter] = (remaining[letter] ?? 0) + 1;
    }
  }

  for (let i = 0; i < length; i += 1) {
    if (result[i] === 'correct') continue;
    const letter = guess[i]!;
    if ((remaining[letter] ?? 0) > 0) {
      result[i] = 'present';
      remaining[letter] = (remaining[letter] ?? 0) - 1;
    }
  }

  return result;
}

export interface RoundSpec {
  word: string;
  wordLength: WordLength;
  maxGuesses: number;
  stage: number; // grado del progresivo; 1 en el resto
}

/** Rondas de la sesión: 1 en modos fijos, ZEN_ROUND_COUNT en Tranquilo, 10 en Progresivo. */
export function buildRounds(mode: ModeId, seed: number): RoundSpec[] {
  const rng = createRng(seed);
  if (mode === 'progressive') {
    return Array.from({ length: PROGRESSIVE_STAGES }, (_, i) => {
      const stage = i + 1;
      const { wordLength, maxGuesses } = stageParams(stage);
      return { word: generateWord(rng, wordLength), wordLength, maxGuesses, stage };
    });
  }
  const roundCount = mode === 'zen' ? ZEN_ROUND_COUNT : 1;
  const { wordLength, maxGuesses } = getModeParams(mode);
  return Array.from({ length: roundCount }, () => ({
    word: generateWord(rng, wordLength),
    wordLength,
    maxGuesses,
    stage: 1,
  }));
}

export interface Attempt {
  guess: string;
  feedback: LetterState[];
}

const STATE_PRIORITY: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };

/**
 * Mejor estado visto de cada letra a lo largo de los intentos de la ronda
 * actual (correct > present > absent) — para colorear el teclado en pantalla,
 * como en el juego original.
 */
export function keyboardLetterStates(attempts: Attempt[]): Record<string, LetterState> {
  const states: Record<string, LetterState> = {};
  for (const attempt of attempts) {
    for (let i = 0; i < attempt.guess.length; i += 1) {
      const letter = attempt.guess[i]!;
      const state = attempt.feedback[i];
      if (!state) continue;
      const current = states[letter];
      if (!current || STATE_PRIORITY[state] > STATE_PRIORITY[current]) {
        states[letter] = state;
      }
    }
  }
  return states;
}

export interface GameState {
  mode: ModeId;
  rounds: RoundSpec[];
  roundIndex: number;
  attempts: Attempt[]; // intentos de la ronda actual
  solvedRounds: number;
  score: number;
  roundOver: boolean; // la ronda actual terminó (resuelta, o agotada en Tranquilo)
  roundWon: boolean;
  gameOver: boolean; // la sesión terminó
  failed: boolean; // terminó por agotar intentos (modos fijos y Progresivo)
}

export function createInitialState(mode: ModeId, seed: number): GameState {
  return {
    mode,
    rounds: buildRounds(mode, seed),
    roundIndex: 0,
    attempts: [],
    solvedRounds: 0,
    score: 0,
    roundOver: false,
    roundWon: false,
    gameOver: false,
    failed: false,
  };
}

export function currentRound(state: GameState): RoundSpec | undefined {
  return state.rounds[state.roundIndex];
}

const BASE_POINTS = 100;

function roundPoints(mode: ModeId, round: RoundSpec, attemptsUsed: number): number {
  if (mode === 'zen') return BASE_POINTS; // Tranquilo: sin bono, no compite (ADR-007)
  const efficiency = Math.max(0.2, (round.maxGuesses - attemptsUsed + 1) / round.maxGuesses);
  const lengthBonus = round.wordLength / 4;
  const stageMultiplier = 1 + (round.stage - 1) / 9; // Progresivo: el grado multiplica
  return Math.round(BASE_POINTS * lengthBonus * efficiency * stageMultiplier);
}

/** Procesa un intento contra la palabra de la ronda actual. */
export function submitGuess(state: GameState, guess: string): GameState {
  if (state.gameOver || state.roundOver) return state;
  const round = currentRound(state);
  if (!round) return state;

  const normalized = guess.toUpperCase();
  const feedback = evaluateGuess(round.word, normalized);
  const attempts = [...state.attempts, { guess: normalized, feedback }];
  const won = normalized === round.word;
  const isLastRound = state.roundIndex === state.rounds.length - 1;

  if (won) {
    const score = state.score + roundPoints(state.mode, round, attempts.length);
    return {
      ...state,
      attempts,
      score,
      solvedRounds: state.solvedRounds + 1,
      roundOver: true,
      roundWon: true,
      gameOver: isLastRound,
    };
  }

  if (attempts.length < round.maxGuesses) {
    return { ...state, attempts };
  }

  // Se agotaron los intentos sin adivinar.
  if (state.mode === 'zen') {
    // Tranquilo: no hay game over — se revela la palabra y se sigue.
    return { ...state, attempts, roundOver: true, roundWon: false, gameOver: isLastRound };
  }
  return { ...state, attempts, roundOver: true, roundWon: false, gameOver: true, failed: true };
}

/** Avanza a la próxima ronda una vez que la actual terminó (y la sesión sigue). */
export function advanceRound(state: GameState): GameState {
  if (state.gameOver || !state.roundOver) return state;
  return {
    ...state,
    roundIndex: state.roundIndex + 1,
    attempts: [],
    roundOver: false,
    roundWon: false,
  };
}

export interface WordOfTheDayMetrics extends Record<string, number> {
  solvedRounds: number;
  totalRounds: number;
  attemptsUsed: number;
  maxStage: number;
}

export function buildResult(
  config: GameConfig,
  state: GameState,
  durationMs: number,
  completed = true,
): GameResult {
  const round = currentRound(state) ?? state.rounds[state.rounds.length - 1];
  return {
    gameId: 'word-of-the-day',
    mode: config.mode,
    score: state.score,
    completed,
    durationMs,
    metrics: {
      solvedRounds: state.solvedRounds,
      totalRounds: state.rounds.length,
      attemptsUsed: state.attempts.length,
      maxStage: round?.stage ?? 1,
    },
    timestamp: new Date().toISOString(),
  };
}
