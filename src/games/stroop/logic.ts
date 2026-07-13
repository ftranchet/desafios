import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { lerp, PROGRESSIVE_STAGES, progressiveT } from '../../core/modes';
import { chance, createRng, pick, type Rng } from '../../core/random';

// Lógica pura de "Nombra el color" (efecto Stroop) — sin React ni DOM. Se
// muestra una palabra que nombra un color, pintada con la tinta de otro color
// (a veces coincide, a veces no) — hay que tocar el botón de la tinta real,
// ignorando lo que dice la palabra. Modos según ADR-007: tres dificultades
// (proporción de conflicto y tiempo por pregunta), Tranquilo (sin reloj) y
// Progresivo (rampa de 10 grados).
//
// Nota sobre RNF-05: acá el color ES la información a evaluar — es la esencia
// del efecto Stroop (un paradigma científico, no una elección de diseño
// evitable). Se usan los 4 colores del sistema con mayor separación de matiz
// entre sí (amarillo/violeta/naranja/celeste), evitando a propósito el par
// rojo/verde — el más común entre daltonismos — para no sumarle una
// dificultad ajena al juego. Además, cada botón de respuesta lleva el nombre
// del color en texto: identificar las OPCIONES nunca depende solo del color,
// aunque identificar el estímulo sí lo requiere por naturaleza del juego.

export type ColorName = 'amarillo' | 'violeta' | 'naranja' | 'celeste';
export const COLOR_NAMES: readonly ColorName[] = ['amarillo', 'violeta', 'naranja', 'celeste'];

export interface DifficultyParams extends Record<string, number> {
  incongruentChance: number; // 0..1 — probabilidad de que tinta y palabra no coincidan
  seconds: number; // 0 = sin límite (Tranquilo)
  questionCount: number;
}

// easy/medium/hard equivalen a los niveles 1/3/5 del esquema anterior.
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen', DifficultyParams> = {
  easy: { incongruentChance: 0.2, seconds: 5, questionCount: 10 },
  medium: { incongruentChance: 0.5, seconds: 4, questionCount: 12 },
  hard: { incongruentChance: 0.85, seconds: 3, questionCount: 15 },
  // Tranquilo: conflicto medio, sin reloj, sesión corta y relajada (ADR-007).
  zen: { incongruentChance: 0.5, seconds: 0, questionCount: 12 },
};

export const PROGRESSIVE_PARAMS: DifficultyParams = {
  // Metadatos del modo; los parámetros reales salen de stageParams por grado.
  incongruentChance: 0.2,
  seconds: 5,
  questionCount: 20,
};

const PROGRESSIVE_QUESTION_COUNT = 20;
const MIN_SECONDS = 2;

/** Parámetros de un grado del progresivo: interpola Fácil→Difícil y extrapola en 9-10 (ADR-007). */
export function stageParams(stage: number): DifficultyParams {
  const t = progressiveT(stage);
  const { easy, hard } = MODE_PARAMS;
  return {
    incongruentChance: Math.min(1, lerp(easy.incongruentChance, hard.incongruentChance, t)),
    seconds: Math.max(MIN_SECONDS, Math.round(lerp(easy.seconds, hard.seconds, t))),
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
  word: ColorName; // lo que dice la palabra
  ink: ColorName; // el color real de la tinta — la respuesta correcta
  congruent: boolean;
  stage: number; // grado del modo progresivo; 1 en el resto
  seconds: number; // tiempo para responder; 0 = sin límite (Tranquilo)
}

function generateQuestion(params: DifficultyParams, stage: number, rng: Rng): Question {
  const ink = pick(rng, COLOR_NAMES);
  const congruent = !chance(rng, params.incongruentChance);
  const word = congruent ? ink : pick(rng, COLOR_NAMES.filter((c) => c !== ink));
  return { word, ink, congruent, stage, seconds: params.seconds };
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

export interface StroopMetrics extends Record<string, number> {
  correct: number;
  incorrect: number;
  avgResponseMs: number;
  maxStage: number;
}

export function computeScore(
  mode: ModeId,
  answers: AnswerRecord[],
  questions: Question[],
): { score: number; metrics: StroopMetrics } {
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
    gameId: 'stroop',
    mode: config.mode,
    score,
    completed,
    durationMs,
    metrics,
    timestamp: new Date().toISOString(),
  };
}
