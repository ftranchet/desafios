import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { lerp, PROGRESSIVE_STAGES, progressiveT } from '../../core/modes';
import { createRng, randomInt, type Rng } from '../../core/random';

// Lógica pura de "Código secreto" — sin React ni DOM. Deducir un código de
// dígitos distintos a partir de pistas (exactos: dígito y posición correctos;
// parciales: dígito correcto en otra posición), estilo Toro y vacas. Modos
// según ADR-007: tres dificultades (largo del código y cantidad de intentos),
// Tranquilo (varias rondas sin game over aunque se agoten los intentos) y
// Progresivo (10 grados: un código por grado, más largo y con menos intentos
// a medida que se sube — fallar un grado termina la partida, como en Snake).

export interface ModeParams extends Record<string, number> {
  codeLength: number;
  maxGuesses: number;
}

// easy/medium/hard equivalen a los niveles 1/3/5 del esquema anterior.
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen', ModeParams> = {
  easy: { codeLength: 3, maxGuesses: 10 },
  medium: { codeLength: 4, maxGuesses: 8 },
  hard: { codeLength: 5, maxGuesses: 7 },
  // Tranquilo: código de dificultad media, con un tope de intentos generoso
  // que en la práctica no se agota — y si se agota, no termina la partida
  // (ADR-007): se revela el código y se pasa a la próxima ronda.
  zen: { codeLength: 4, maxGuesses: 20 },
};

// Progresivo: metadatos del modo (los parámetros reales salen de stageParams).
export const PROGRESSIVE_PARAMS: ModeParams = { codeLength: 3, maxGuesses: 10 };

export const ZEN_ROUND_COUNT = 5;
const MIN_PROGRESSIVE_GUESSES = 5;
const MAX_PROGRESSIVE_CODE_LENGTH = 7;

/** Parámetros de un grado del progresivo: interpola Fácil→Difícil y extrapola en 9-10 (ADR-007). */
export function stageParams(stage: number): ModeParams {
  const t = progressiveT(stage);
  const { easy, hard } = MODE_PARAMS;
  return {
    codeLength: Math.min(
      MAX_PROGRESSIVE_CODE_LENGTH,
      Math.round(lerp(easy.codeLength, hard.codeLength, t)),
    ),
    maxGuesses: Math.max(
      MIN_PROGRESSIVE_GUESSES,
      Math.round(lerp(easy.maxGuesses, hard.maxGuesses, t)),
    ),
  };
}

export function getModeParams(mode: ModeId): ModeParams {
  if (mode === 'progressive') return PROGRESSIVE_PARAMS;
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

/** Un código de dígitos distintos (0-9), largo `length`, tomado de una baraja mezclada. */
export function generateCode(rng: Rng, length: number): number[] {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = digits.length - 1; i > 0; i -= 1) {
    const j = randomInt(rng, 0, i);
    const tmp = digits[i]!;
    digits[i] = digits[j]!;
    digits[j] = tmp;
  }
  return digits.slice(0, length);
}

export interface GuessFeedback {
  exact: number; // dígito y posición correctos
  partial: number; // dígito correcto, posición incorrecta
}

/** Compara un intento contra el código. Asume dígitos distintos en ambos. */
export function evaluateGuess(code: number[], guess: number[]): GuessFeedback {
  let exact = 0;
  for (let i = 0; i < code.length; i += 1) {
    if (guess[i] === code[i]) exact += 1;
  }
  const codeSet = new Set(code);
  const common = guess.filter((digit) => codeSet.has(digit)).length;
  return { exact, partial: common - exact };
}

export interface RoundSpec {
  code: number[];
  maxGuesses: number;
  stage: number; // grado del progresivo; 1 en el resto
}

/** Rondas de la sesión, pregeneradas con la semilla: 1 en modos fijos, ZEN_ROUND_COUNT en Tranquilo, 10 en Progresivo. */
export function buildRounds(mode: ModeId, seed: number): RoundSpec[] {
  const rng = createRng(seed);
  if (mode === 'progressive') {
    return Array.from({ length: PROGRESSIVE_STAGES }, (_, i) => {
      const stage = i + 1;
      const params = stageParams(stage);
      return { code: generateCode(rng, params.codeLength), maxGuesses: params.maxGuesses, stage };
    });
  }
  const roundCount = mode === 'zen' ? ZEN_ROUND_COUNT : 1;
  const params = getModeParams(mode);
  return Array.from({ length: roundCount }, () => ({
    code: generateCode(rng, params.codeLength),
    maxGuesses: params.maxGuesses,
    stage: 1,
  }));
}

export interface Attempt extends GuessFeedback {
  digits: number[];
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
  const lengthBonus = round.code.length / 3;
  const stageMultiplier = 1 + (round.stage - 1) / 9; // Progresivo: el grado multiplica
  return Math.round(BASE_POINTS * lengthBonus * efficiency * stageMultiplier);
}

/** Procesa un intento contra el código de la ronda actual. */
export function submitGuess(state: GameState, digits: number[]): GameState {
  if (state.gameOver || state.roundOver) return state;
  const round = currentRound(state);
  if (!round) return state;

  const feedback = evaluateGuess(round.code, digits);
  const attempts = [...state.attempts, { digits, ...feedback }];
  const won = feedback.exact === round.code.length;
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

  // Se agotaron los intentos sin resolver.
  if (state.mode === 'zen') {
    // Tranquilo: no hay game over — se revela el código y se sigue.
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

export interface SecretCodeMetrics extends Record<string, number> {
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
    gameId: 'secret-code',
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
