import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { lerp, PROGRESSIVE_STAGES, progressiveT } from '../../core/modes';
import { createRng, pick, randomInt, type Rng } from '../../core/random';

// Lógica pura del juego "Aritmética contra reloj" — sin React ni DOM.
// Implementación de referencia de ADR-007 para juegos de preguntas: tres
// dificultades, Tranquilo (sin reloj) y Progresivo (rampa de 10 grados).

export type Operation = '+' | '-' | '*' | '/';

export interface DifficultyParams extends Record<string, number | string | boolean> {
  operations: string; // "+-*/" — las operaciones habilitadas, como string plano
  addSubMin: number;
  addSubMax: number;
  mulDivMax: number; // factores de multiplicación/división van de 2 a este valor
  secondsPerQuestion: number; // 0 = sin límite de tiempo (Tranquilo)
  questionCount: number;
}

// easy/medium/hard equivalen a los niveles 1/3/5 del esquema anterior.
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen', DifficultyParams> = {
  easy: {
    operations: '+',
    addSubMin: 1,
    addSubMax: 20,
    mulDivMax: 6,
    secondsPerQuestion: 10,
    questionCount: 10,
  },
  medium: {
    operations: '+-*',
    addSubMin: 1,
    addSubMax: 50,
    mulDivMax: 12,
    secondsPerQuestion: 8,
    questionCount: 12,
  },
  hard: {
    operations: '+-*/',
    addSubMin: 10,
    addSubMax: 99,
    mulDivMax: 12,
    secondsPerQuestion: 6,
    questionCount: 15,
  },
  // Tranquilo: contenido medio, sin reloj, sesión corta y relajada (ADR-007).
  zen: {
    operations: '+-*',
    addSubMin: 1,
    addSubMax: 50,
    mulDivMax: 12,
    secondsPerQuestion: 0,
    questionCount: 15,
  },
};

export const PROGRESSIVE_PARAMS: DifficultyParams = {
  // Metadatos del modo; los parámetros reales salen de stageParams por grado.
  operations: '+-*/',
  addSubMin: 1,
  addSubMax: 99,
  mulDivMax: 12,
  secondsPerQuestion: 10,
  questionCount: 20,
};

const PROGRESSIVE_QUESTION_COUNT = 20;
const MIN_SECONDS_PER_QUESTION = 3;

/**
 * Parámetros de un grado del modo progresivo: interpola Fácil→Difícil en los
 * grados 1–8 y extrapola más allá en 9–10 (ADR-007); las operaciones se
 * desbloquean por grado (suma → resta → multiplicación → división).
 */
export function stageParams(stage: number): DifficultyParams {
  const t = progressiveT(stage);
  const easy = MODE_PARAMS.easy;
  const hard = MODE_PARAMS.hard;
  const operations = stage <= 3 ? '+' : stage <= 5 ? '+-' : stage <= 7 ? '+-*' : '+-*/';
  return {
    operations,
    addSubMin: Math.max(1, Math.round(lerp(easy.addSubMin, hard.addSubMin, t))),
    addSubMax: Math.round(lerp(easy.addSubMax, hard.addSubMax, t)),
    mulDivMax: Math.round(lerp(easy.mulDivMax, hard.mulDivMax, t)),
    secondsPerQuestion: Math.max(
      MIN_SECONDS_PER_QUESTION,
      lerp(easy.secondsPerQuestion, hard.secondsPerQuestion, t),
    ),
    questionCount: PROGRESSIVE_QUESTION_COUNT,
  };
}

export function getModeParams(mode: ModeId): DifficultyParams {
  if (mode === 'progressive') return PROGRESSIVE_PARAMS;
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

export interface Question {
  a: number;
  b: number;
  op: Operation;
  answer: number;
  stage: number; // Grado del modo progresivo; 1 en el resto
  seconds: number; // Tiempo para responder; 0 = sin límite (Tranquilo)
}

function generateQuestion(params: DifficultyParams, stage: number, rng: Rng): Question {
  const op = pick(rng, params.operations.split('') as Operation[]);
  const seconds = params.secondsPerQuestion;

  switch (op) {
    case '+': {
      const a = randomInt(rng, params.addSubMin, params.addSubMax);
      const b = randomInt(rng, params.addSubMin, params.addSubMax);
      return { a, b, op, answer: a + b, stage, seconds };
    }
    case '-': {
      const x = randomInt(rng, params.addSubMin, params.addSubMax);
      const y = randomInt(rng, params.addSubMin, params.addSubMax);
      const a = Math.max(x, y);
      const b = Math.min(x, y);
      return { a, b, op, answer: a - b, stage, seconds };
    }
    case '*': {
      const a = randomInt(rng, 2, params.mulDivMax);
      const b = randomInt(rng, 2, params.mulDivMax);
      return { a, b, op, answer: a * b, stage, seconds };
    }
    case '/': {
      const b = randomInt(rng, 2, params.mulDivMax);
      const answer = randomInt(rng, 2, params.mulDivMax);
      return { a: b * answer, b, op, answer, stage, seconds };
    }
  }
}

/** Grado de la pregunta i del modo progresivo: sube uno cada dos preguntas. */
export function stageForIndex(index: number): number {
  return Math.min(PROGRESSIVE_STAGES, Math.floor(index / 2) + 1);
}

export function generateSession(mode: ModeId, seed: number): Question[] {
  const rng = createRng(seed);
  if (mode === 'progressive') {
    return Array.from({ length: PROGRESSIVE_QUESTION_COUNT }, (_, i) => {
      const stage = stageForIndex(i);
      return generateQuestion(stageParams(stage), stage, rng);
    });
  }
  const params = getModeParams(mode);
  return Array.from({ length: params.questionCount }, () => generateQuestion(params, 1, rng));
}

export interface AnswerRecord {
  correct: boolean;
  responseMs: number | null; // null = venció el tiempo sin responder
}

const BASE_POINTS = 100;
const MAX_TIME_BONUS = 50;

export interface QuickMathMetrics extends Record<string, number> {
  correct: number;
  incorrect: number;
  avgResponseMs: number;
  maxStage: number;
}

export function computeScore(
  mode: ModeId,
  answers: AnswerRecord[],
  questions: Question[],
): { score: number; metrics: QuickMathMetrics } {
  let score = 0;
  let maxStage = 0;
  const responseTimes: number[] = [];

  answers.forEach((answer, i) => {
    if (!answer.correct) return;
    const question = questions[i];
    if (!question) return;
    maxStage = Math.max(maxStage, question.stage);

    if (mode === 'zen') {
      // Tranquilo: sin reloj, sin bono de tiempo — un punto fijo por acierto.
      score += BASE_POINTS;
      return;
    }

    const totalMs = question.seconds * 1000;
    const responseMs = answer.responseMs ?? totalMs;
    responseTimes.push(responseMs);
    const remainingFraction = totalMs > 0 ? Math.max(0, (totalMs - responseMs) / totalMs) : 0;
    const base = BASE_POINTS + Math.round(remainingFraction * MAX_TIME_BONUS);
    // Progresivo: el grado multiplica — llegar lejos vale más (ADR-007).
    const stageMultiplier = 1 + (question.stage - 1) / 9;
    score += Math.round(base * stageMultiplier);
  });

  const correct = answers.filter((a) => a.correct).length;
  const incorrect = answers.length - correct;
  const avgResponseMs =
    responseTimes.length === 0
      ? 0
      : Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);

  return { score, metrics: { correct, incorrect, avgResponseMs, maxStage } };
}

export function buildResult(
  config: GameConfig,
  answers: AnswerRecord[],
  questions: Question[],
  durationMs: number,
  completed: boolean,
): GameResult {
  const { score, metrics } = computeScore(config.mode, answers, questions);
  return {
    gameId: 'quick-math',
    mode: config.mode,
    score,
    completed,
    durationMs,
    metrics,
    timestamp: new Date().toISOString(),
  };
}
