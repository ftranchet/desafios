import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { lerp, PROGRESSIVE_STAGES, progressiveT } from '../../core/modes';
import { chance, createRng, randomInt, type Rng } from '../../core/random';

// Lógica pura de "¿Coincide?" (estilo N-back) — sin React ni DOM. Se muestra
// una secuencia de símbolos de a uno; para cada uno hay que decidir si es
// igual al símbolo de N pasos atrás. N (la distancia a recordar) es la
// palanca principal de dificultad. Se presenta como un desafío de reflejos y
// memoria momentánea, sin ninguna promesa de mejora cognitiva (PRD 1.1) — el
// puntaje es solo un resultado de esta partida, igual que en Simon o
// Memorama.
//
// Cada dificultad genera su propia secuencia continua e independiente (el
// "atrás" nunca cruza de una dificultad a otra); Progresivo genera una
// secuencia corta por grado, encadenadas una tras otra, cada una con su
// propio N — así que el punto de referencia de cada símbolo nunca mira más
// allá del comienzo de su propio grado.

export const SYMBOL_COUNT = 6; // símbolos disponibles para la secuencia (ver ui.tsx)
const MATCH_PROBABILITY = 0.35; // proporción aproximada de ensayos que son coincidencia real

export interface ModeParams extends Record<string, number> {
  n: number; // cuántos pasos atrás hay que recordar
  trialCount: number;
  seconds: number; // 0 = sin límite (Tranquilo)
}

// easy/medium/hard equivalen a 1-atrás / 2-atrás / 3-atrás.
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen', ModeParams> = {
  easy: { n: 1, trialCount: 15, seconds: 3.5 },
  medium: { n: 2, trialCount: 20, seconds: 3 },
  hard: { n: 3, trialCount: 25, seconds: 2.5 },
  // Tranquilo: 2-atrás, sin reloj, secuencia más corta y relajada (ADR-007).
  zen: { n: 2, trialCount: 18, seconds: 0 },
};

export const PROGRESSIVE_PARAMS: ModeParams = {
  // Metadatos del modo; los parámetros reales salen de stageParams por grado.
  n: 1,
  trialCount: 15,
  seconds: 3.5,
};

const MIN_SECONDS = 1.5;

/** Parámetros de un grado del progresivo: interpola y extrapola Fácil→Difícil sin techo (ADR-007). */
export function stageParams(stage: number): ModeParams {
  const t = progressiveT(stage);
  const { easy, hard } = MODE_PARAMS;
  return {
    n: Math.round(lerp(easy.n, hard.n, t)),
    trialCount: Math.round(lerp(easy.trialCount, hard.trialCount, t)),
    seconds: Math.max(MIN_SECONDS, lerp(easy.seconds, hard.seconds, t)),
  };
}

export function getModeParams(mode: ModeId): ModeParams {
  if (mode === 'progressive') return PROGRESSIVE_PARAMS;
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

/**
 * Secuencia de símbolos (0..SYMBOL_COUNT-1): a partir de la posición `n`, cada
 * símbolo es —a propósito, con `MATCH_PROBABILITY`— igual al de `n` posiciones
 * atrás (una coincidencia real) o distinto (para no dejar la tarea librada al
 * azar puro, donde "no coincide" sería casi siempre la respuesta trivial).
 */
export function generateSequence(rng: Rng, trialCount: number, n: number): number[] {
  const sequence: number[] = [];
  for (let i = 0; i < trialCount; i += 1) {
    if (i < n) {
      sequence.push(randomInt(rng, 0, SYMBOL_COUNT - 1));
      continue;
    }
    const target = sequence[i - n]!;
    if (chance(rng, MATCH_PROBABILITY)) {
      sequence.push(target);
    } else {
      let symbol = randomInt(rng, 0, SYMBOL_COUNT - 1);
      while (symbol === target) symbol = randomInt(rng, 0, SYMBOL_COUNT - 1);
      sequence.push(symbol);
    }
  }
  return sequence;
}

export interface Trial {
  symbol: number;
  isMatch: boolean; // verdad de fondo: ¿coincide con la posición N atrás?
  requiresResponse: boolean; // false durante las N muestras iniciales de preparación
  n: number; // cuántos pasos atrás hay que comparar en este ensayo
  stage: number; // grado del progresivo; 1 en el resto
  seconds: number; // tiempo para responder; 0 = sin límite (Tranquilo)
}

function buildTrials(sequence: number[], n: number, stage: number, seconds: number): Trial[] {
  return sequence.map((symbol, i) => ({
    symbol,
    isMatch: i >= n && symbol === sequence[i - n],
    requiresResponse: i >= n,
    n,
    stage,
    seconds,
  }));
}

function buildStageTrials(rng: Rng, params: ModeParams, stage: number): Trial[] {
  const sequence = generateSequence(rng, params.trialCount, params.n);
  return buildTrials(sequence, params.n, stage, params.seconds);
}

/**
 * Secuencia completa de la sesión: en los modos fijos y Tranquilo, una única
 * secuencia continua; en Progresivo, 10 secuencias independientes (una por
 * grado, cada una con su propio N) encadenadas una tras otra.
 */
export function generateSession(mode: ModeId, seed: number): Trial[] {
  const rng = createRng(seed);
  if (mode === 'progressive') {
    return Array.from({ length: PROGRESSIVE_STAGES }, (_, i) => {
      const stage = i + 1;
      return buildStageTrials(rng, stageParams(stage), stage);
    }).flat();
  }
  return buildStageTrials(rng, getModeParams(mode), 1);
}

export interface AnswerRecord {
  correct: boolean;
  responseMs: number | null; // null = sin tiempo medido (timeout o muestra de preparación)
}

const BASE_POINTS = 100;
const MAX_TIME_BONUS = 50;

export interface NBackMetrics extends Record<string, number> {
  correct: number;
  incorrect: number;
  avgResponseMs: number;
  maxStage: number;
}

export function computeScore(
  mode: ModeId,
  answers: AnswerRecord[],
  trials: Trial[],
): { score: number; metrics: NBackMetrics } {
  let score = 0;
  let maxStage = 0;
  const responseTimes: number[] = [];

  answers.forEach((answer, i) => {
    const trial = trials[i];
    if (!trial?.requiresResponse || !answer.correct) return;
    maxStage = Math.max(maxStage, trial.stage);

    if (mode === 'zen') {
      // Tranquilo: sin reloj, sin bono de tiempo — un punto fijo por acierto.
      score += BASE_POINTS;
      return;
    }

    const totalMs = trial.seconds * 1000;
    const responseMs = answer.responseMs ?? totalMs;
    responseTimes.push(responseMs);
    const remainingFraction = totalMs > 0 ? Math.max(0, (totalMs - responseMs) / totalMs) : 0;
    const base = BASE_POINTS + Math.round(remainingFraction * MAX_TIME_BONUS);
    // Progresivo: el grado multiplica — llegar lejos vale más (ADR-007).
    const stageMultiplier = 1 + (trial.stage - 1) / 9;
    score += Math.round(base * stageMultiplier);
  });

  const scoredAnswers = answers.filter((_, index) => trials[index]?.requiresResponse);
  const correct = scoredAnswers.filter((answer) => answer.correct).length;
  const incorrect = scoredAnswers.length - correct;
  const avgResponseMs =
    responseTimes.length === 0
      ? 0
      : Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);

  return { score, metrics: { correct, incorrect, avgResponseMs, maxStage } };
}

export function buildResult(
  config: GameConfig,
  answers: AnswerRecord[],
  trials: Trial[],
  durationMs: number,
  completed: boolean,
): GameResult {
  const { score, metrics } = computeScore(config.mode, answers, trials);
  return {
    gameId: 'n-back',
    mode: config.mode,
    score,
    completed,
    durationMs,
    metrics,
    timestamp: new Date().toISOString(),
  };
}
