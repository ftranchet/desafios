import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { lerp, PROGRESSIVE_STAGES, progressiveT } from '../../core/modes';
import { createRng, pick, randomInt, type Rng } from '../../core/random';

// Lógica pura de "Secuencias numéricas" — sin React ni DOM. Detectar el
// patrón (aritmético → geométrico → combinado) e indicar el siguiente
// término. Modos según ADR-007: tres dificultades, Tranquilo (sin reloj)
// y Progresivo (rampa de 10 grados que desbloquea patrones).

export type PatternType = 'arithmetic' | 'geometric' | 'combined';

export interface ModeParams {
  patternTypes: PatternType[];
  termCount: number;
  secondsPerQuestion: number; // 0 = sin límite de tiempo (Tranquilo)
  questionCount: number;
}

// easy/medium/hard equivalen a los niveles 1/3/5 del esquema anterior.
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen', ModeParams> = {
  easy: { patternTypes: ['arithmetic'], termCount: 4, secondsPerQuestion: 12, questionCount: 8 },
  medium: {
    patternTypes: ['arithmetic', 'geometric'],
    termCount: 5,
    secondsPerQuestion: 10,
    questionCount: 10,
  },
  hard: {
    patternTypes: ['arithmetic', 'geometric', 'combined'],
    termCount: 6,
    secondsPerQuestion: 8,
    questionCount: 12,
  },
  // Tranquilo: contenido medio, sin reloj (ADR-007).
  zen: {
    patternTypes: ['arithmetic', 'geometric'],
    termCount: 5,
    secondsPerQuestion: 0,
    questionCount: 12,
  },
};

export const PROGRESSIVE_PARAMS: ModeParams = {
  // Metadatos del modo; los parámetros reales salen de stageParams por grado.
  patternTypes: ['arithmetic', 'geometric', 'combined'],
  termCount: 6,
  secondsPerQuestion: 12,
  questionCount: 20,
};

const PROGRESSIVE_QUESTION_COUNT = 20;
const MIN_SECONDS_PER_QUESTION = 4;

/**
 * Parámetros de un grado del progresivo: interpola Fácil→Difícil en 1–8 y
 * extrapola en 9–10 (ADR-007); los patrones se desbloquean por grado.
 */
export function stageParams(stage: number): ModeParams {
  const t = progressiveT(stage);
  const easy = MODE_PARAMS.easy;
  const hard = MODE_PARAMS.hard;
  const patternTypes: PatternType[] =
    stage <= 3
      ? ['arithmetic']
      : stage <= 6
        ? ['arithmetic', 'geometric']
        : ['arithmetic', 'geometric', 'combined'];
  return {
    patternTypes,
    termCount: Math.min(7, Math.round(lerp(easy.termCount, hard.termCount, t))),
    secondsPerQuestion: Math.max(
      MIN_SECONDS_PER_QUESTION,
      lerp(easy.secondsPerQuestion, hard.secondsPerQuestion, t),
    ),
    questionCount: PROGRESSIVE_QUESTION_COUNT,
  };
}

export function getModeParams(mode: ModeId): ModeParams {
  if (mode === 'progressive') return PROGRESSIVE_PARAMS;
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

export interface SequenceQuestion {
  terms: number[];
  answer: number;
  patternType: PatternType;
  stage: number; // Grado del modo progresivo; 1 en el resto
  seconds: number; // Tiempo para responder; 0 = sin límite (Tranquilo)
}

function generateArithmetic(
  termCount: number,
  rng: Rng,
): Omit<SequenceQuestion, 'stage' | 'seconds'> {
  const start = randomInt(rng, -10, 10);
  let step = randomInt(rng, -8, 8);
  if (step === 0) step = 1;
  const terms = Array.from({ length: termCount }, (_, i) => start + i * step);
  return { terms, answer: start + termCount * step, patternType: 'arithmetic' };
}

function generateGeometric(
  termCount: number,
  rng: Rng,
): Omit<SequenceQuestion, 'stage' | 'seconds'> {
  const start = randomInt(rng, 2, 6);
  const ratio = randomInt(rng, 2, 3);
  const terms: number[] = [];
  let value = start;
  for (let i = 0; i < termCount; i += 1) {
    terms.push(value);
    value *= ratio;
  }
  return { terms, answer: value, patternType: 'geometric' };
}

function generateCombined(
  termCount: number,
  rng: Rng,
): Omit<SequenceQuestion, 'stage' | 'seconds'> {
  const stepA = randomInt(rng, 1, 6);
  const stepB = -randomInt(rng, 1, 6);
  const start = randomInt(rng, -5, 15);
  const terms: number[] = [start];
  let value = start;
  for (let i = 1; i < termCount; i += 1) {
    value += i % 2 === 1 ? stepA : stepB;
    terms.push(value);
  }
  const nextStep = termCount % 2 === 1 ? stepA : stepB;
  return { terms, answer: value + nextStep, patternType: 'combined' };
}

function generateQuestion(params: ModeParams, stage: number, rng: Rng): SequenceQuestion {
  const patternType = pick(rng, params.patternTypes);
  const base =
    patternType === 'arithmetic'
      ? generateArithmetic(params.termCount, rng)
      : patternType === 'geometric'
        ? generateGeometric(params.termCount, rng)
        : generateCombined(params.termCount, rng);
  return { ...base, stage, seconds: params.secondsPerQuestion };
}

/** Grado de la pregunta i del modo progresivo: sube uno cada dos preguntas. */
export function stageForIndex(index: number): number {
  return Math.min(PROGRESSIVE_STAGES, Math.floor(index / 2) + 1);
}

export function generateSession(mode: ModeId, seed: number): SequenceQuestion[] {
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

export interface SequenceMetrics extends Record<string, number> {
  correct: number;
  incorrect: number;
  avgResponseMs: number;
  maxStage: number;
}

export function computeScore(
  mode: ModeId,
  answers: AnswerRecord[],
  questions: SequenceQuestion[],
): { score: number; metrics: SequenceMetrics } {
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
  questions: SequenceQuestion[],
  durationMs: number,
  completed: boolean,
): GameResult {
  const { score, metrics } = computeScore(config.mode, answers, questions);
  return {
    gameId: 'number-sequences',
    mode: config.mode,
    score,
    completed,
    durationMs,
    metrics,
    timestamp: new Date().toISOString(),
  };
}
