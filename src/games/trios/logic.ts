import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { lerp, PROGRESSIVE_STAGES, progressiveT } from '../../core/modes';
import { createRng, randomInt, type Rng } from '../../core/random';

// Lógica pura de "Tríos" (estilo SET) — sin React ni DOM. De un tablero de
// cartas, encontrá tres cuya combinación de color, forma, cantidad y relleno
// sea siempre "todas iguales o todas distintas" en cada atributo — nunca dos
// iguales y una distinta. Nombre original (PRD 11.2): el juego de cartas
// "SET" es marca registrada de SET Enterprises.
//
// Cada atributo tiene 3 valores posibles (0/1/2), así que el mazo completo
// tiene 3⁴=81 cartas únicas. Propiedad clave del juego: dadas dos cartas
// cualesquiera, existe exactamente una tercera que completa un trío válido
// (si dos valores de un atributo coinciden, el tercero repite ese valor; si
// difieren, el tercero es el único valor restante). Se usa para garantizar
// por construcción que cada tablero tenga al menos un trío, sin necesitar
// generar al azar y verificar por fuerza bruta (mismo criterio que Apagá
// todo o el Rompecabezas deslizante: garantizar la propiedad al construir,
// no comprobarla después).
//
// Nota breve sobre RNF-05: de los 4 atributos, 3 nunca dependen del color
// (forma, cantidad, relleno alcanza con opacidad/trazo, no con matiz) — el
// color es apenas uno de cuatro, y se usan 3 colores del sistema con
// separación de matiz alta (amarillo/violeta/celeste), evitando el par
// rojo/verde, igual que en Nombra el color.

export type AttrValue = 0 | 1 | 2;

export interface Card {
  color: AttrValue;
  shape: AttrValue;
  count: 1 | 2 | 3;
  fill: AttrValue;
}

function cardId(card: Card): number {
  return ((card.color * 3 + card.shape) * 3 + (card.count - 1)) * 3 + card.fill;
}

const FULL_DECK: Card[] = [];
for (let color = 0; color < 3; color += 1) {
  for (let shape = 0; shape < 3; shape += 1) {
    for (let count = 1; count <= 3; count += 1) {
      for (let fill = 0; fill < 3; fill += 1) {
        FULL_DECK.push({ color: color as AttrValue, shape: shape as AttrValue, count: count as 1 | 2 | 3, fill: fill as AttrValue });
      }
    }
  }
}

function thirdValue(x: number, y: number): 0 | 1 | 2 {
  if (x === y) return x as 0 | 1 | 2;
  return (3 - x - y) as 0 | 1 | 2; // el único valor en {0,1,2} que no es x ni y
}

/** La única tercera carta que completa un trío válido con `a` y `b`. */
export function thirdCardFor(a: Card, b: Card): Card {
  return {
    color: thirdValue(a.color, b.color),
    shape: thirdValue(a.shape, b.shape),
    count: (thirdValue(a.count - 1, b.count - 1) + 1) as 1 | 2 | 3,
    fill: thirdValue(a.fill, b.fill),
  };
}

function attributeValid(x: number, y: number, z: number): boolean {
  return (x === y && y === z) || (x !== y && y !== z && x !== z);
}

/** ¿Las tres cartas forman un trío válido? (cada atributo, todas iguales o todas distintas). */
export function isValidTrio(a: Card, b: Card, c: Card): boolean {
  return (
    attributeValid(a.color, b.color, c.color) &&
    attributeValid(a.shape, b.shape, c.shape) &&
    attributeValid(a.count, b.count, c.count) &&
    attributeValid(a.fill, b.fill, c.fill)
  );
}

export interface ModeParams extends Record<string, number> {
  boardSize: number;
  seconds: number; // 0 = sin límite (Tranquilo)
  questionCount: number;
}

// easy/medium/hard equivalen a los niveles 1/3/5 del esquema anterior.
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen', ModeParams> = {
  easy: { boardSize: 9, seconds: 30, questionCount: 6 },
  medium: { boardSize: 12, seconds: 25, questionCount: 8 },
  hard: { boardSize: 15, seconds: 20, questionCount: 10 },
  // Tranquilo: tablero medio, sin reloj, sesión corta y relajada (ADR-007).
  zen: { boardSize: 12, seconds: 0, questionCount: 8 },
};

export const PROGRESSIVE_PARAMS: ModeParams = {
  // Metadatos del modo; los parámetros reales salen de stageParams por grado.
  boardSize: 9,
  seconds: 30,
  questionCount: 20,
};

const PROGRESSIVE_QUESTION_COUNT = 20;
const MIN_SECONDS = 10;

function roundToMultipleOf3(value: number): number {
  return Math.max(9, Math.round(value / 3) * 3);
}

/** Parámetros de un grado del progresivo: interpola y extrapola Fácil→Difícil sin techo (ADR-007). */
export function stageParams(stage: number): ModeParams {
  const t = progressiveT(stage);
  const { easy, hard } = MODE_PARAMS;
  return {
    boardSize: roundToMultipleOf3(lerp(easy.boardSize, hard.boardSize, t)),
    seconds: Math.max(MIN_SECONDS, Math.round(lerp(easy.seconds, hard.seconds, t))),
    questionCount: PROGRESSIVE_QUESTION_COUNT,
  };
}

export function getModeParams(mode: ModeId): ModeParams {
  if (mode === 'progressive') return PROGRESSIVE_PARAMS;
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

/** Arma un tablero de `boardSize` cartas únicas que siempre contiene al menos un trío válido. */
export function dealBoard(rng: Rng, boardSize: number): Card[] {
  const aId = randomInt(rng, 0, FULL_DECK.length - 1);
  let bId = randomInt(rng, 0, FULL_DECK.length - 1);
  while (bId === aId) bId = randomInt(rng, 0, FULL_DECK.length - 1);
  const a = FULL_DECK[aId]!;
  const b = FULL_DECK[bId]!;
  const c = thirdCardFor(a, b);
  const cId = cardId(c);

  const usedIds = new Set([aId, bId, cId]);
  const restIds: number[] = [];
  for (let id = 0; id < FULL_DECK.length; id += 1) if (!usedIds.has(id)) restIds.push(id);

  // Fisher-Yates sobre los ids restantes.
  for (let i = restIds.length - 1; i > 0; i -= 1) {
    const j = randomInt(rng, 0, i);
    const tmp = restIds[i]!;
    restIds[i] = restIds[j]!;
    restIds[j] = tmp;
  }

  const boardIds = [aId, bId, cId, ...restIds.slice(0, Math.max(0, boardSize - 3))];
  // Mezcla el orden final para que el trío garantizado no quede siempre al frente.
  for (let i = boardIds.length - 1; i > 0; i -= 1) {
    const j = randomInt(rng, 0, i);
    const tmp = boardIds[i]!;
    boardIds[i] = boardIds[j]!;
    boardIds[j] = tmp;
  }
  return boardIds.map((id) => FULL_DECK[id]!);
}

export interface Question {
  board: Card[];
  boardSize: number;
  stage: number; // grado del progresivo; 1 en el resto
  seconds: number; // tiempo para resolver; 0 = sin límite (Tranquilo)
}

function generateQuestion(params: ModeParams, stage: number, rng: Rng): Question {
  return { board: dealBoard(rng, params.boardSize), boardSize: params.boardSize, stage, seconds: params.seconds };
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
  responseMs: number | null; // null = venció el tiempo sin encontrar un trío
  mistakes: number; // selecciones inválidas antes de resolver (o de agotar el tiempo)
}

const BASE_POINTS = 100;
const MAX_TIME_BONUS = 50;
const MISTAKE_PENALTY = 15;

export interface TriosMetrics extends Record<string, number> {
  correct: number;
  incorrect: number;
  totalMistakes: number;
  avgResponseMs: number;
  maxStage: number;
}

export function computeScore(
  mode: ModeId,
  answers: AnswerRecord[],
  questions: Question[],
): { score: number; metrics: TriosMetrics } {
  let score = 0;
  let maxStage = 0;
  const responseTimes: number[] = [];
  let totalMistakes = 0;

  answers.forEach((answer, i) => {
    totalMistakes += answer.mistakes;
    if (!answer.correct) return;
    const question = questions[i];
    if (!question) return;
    maxStage = Math.max(maxStage, question.stage);

    if (mode === 'zen') {
      // Tranquilo: sin reloj, sin bono ni penalidad — un punto fijo por acierto.
      score += BASE_POINTS;
      return;
    }

    const totalMs = question.seconds * 1000;
    const responseMs = answer.responseMs ?? totalMs;
    responseTimes.push(responseMs);
    const remainingFraction = totalMs > 0 ? Math.max(0, (totalMs - responseMs) / totalMs) : 0;
    const base =
      BASE_POINTS + Math.round(remainingFraction * MAX_TIME_BONUS) - answer.mistakes * MISTAKE_PENALTY;
    // Progresivo: el grado multiplica — llegar lejos vale más (ADR-007).
    const stageMultiplier = 1 + (question.stage - 1) / 9;
    score += Math.round(Math.max(0, base) * stageMultiplier);
  });

  const correct = answers.filter((a) => a.correct).length;
  const incorrect = answers.length - correct;
  const avgResponseMs =
    responseTimes.length === 0
      ? 0
      : Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);

  return { score, metrics: { correct, incorrect, totalMistakes, avgResponseMs, maxStage } };
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
    gameId: 'trios',
    mode: config.mode,
    score,
    completed,
    durationMs,
    metrics,
    timestamp: new Date().toISOString(),
  };
}
