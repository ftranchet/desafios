import type { GameMode, ModeId } from './contract';

// Vocabulario y estructura de los modos de juego (ADR-007). Este módulo es la
// única fuente de los labels y del orden de los modos: los juegos declaran sus
// parámetros con buildModes() y no pueden desviarse de la convención — la capa
// de robustez que garantiza que un juego nuevo entienda la estructura.

export const MODE_LABELS: Record<ModeId, string> = {
  easy: 'Fácil',
  medium: 'Medio',
  hard: 'Difícil',
  zen: 'Tranquilo',
  progressive: 'Progresivo',
};

export const MODE_DESCRIPTIONS: Partial<Record<ModeId, string>> = {
  zen: 'Sin relojes ni game over. Jugás a tu ritmo.',
  progressive: 'De fácil a experto en 10 grados. ¿Hasta dónde llegás?',
};

export const DIFFICULTY_MODE_IDS = ['easy', 'medium', 'hard'] as const;
export const SPECIAL_MODE_IDS = ['zen', 'progressive'] as const;

type Params = Record<string, number | string | boolean>;

export interface ModeParamsInput {
  easy: Params;
  medium: Params;
  hard: Params;
  zen?: Params;
  progressive?: Params;
}

/**
 * Construye la lista de modos de un juego con labels, descripciones y orden
 * canónicos. Las tres dificultades son obligatorias por tipo; los modos
 * especiales se declaran solo si el juego los implementa (ADR-007).
 */
export function buildModes(params: ModeParamsInput): GameMode[] {
  const modes: GameMode[] = DIFFICULTY_MODE_IDS.map((id) => ({
    id,
    label: MODE_LABELS[id],
    params: params[id],
  }));
  for (const id of SPECIAL_MODE_IDS) {
    const modeParams = params[id];
    if (modeParams) {
      modes.push({
        id,
        label: MODE_LABELS[id],
        description: MODE_DESCRIPTIONS[id],
        params: modeParams,
      });
    }
  }
  return modes;
}

export function isModeId(value: unknown): value is ModeId {
  return typeof value === 'string' && value in MODE_LABELS;
}

// --- Modo progresivo: curva común a todos los juegos (ADR-007) -------------

export const PROGRESSIVE_STAGES = 10;

/**
 * Posición 0..1+ de un grado sobre el espacio Fácil→Difícil: los grados 1–8
 * lo recorren (t: 0..1) y los grados 9 y 10 extrapolan más allá del Difícil
 * actual (t > 1), para que el modo tenga techo hasta para quien domina el
 * juego. Cada juego clampa sus propios pisos/techos de dominio.
 */
export function progressiveT(stage: number): number {
  const clamped = Math.min(Math.max(1, stage), PROGRESSIVE_STAGES);
  return (clamped - 1) / 7;
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

// --- Migración desde el esquema de 5 niveles (pre ADR-007) ------------------

/** Mapea un nivel numérico 1–5 del esquema viejo al modo equivalente. */
export function levelToMode(level: number): ModeId {
  if (level <= 2) return 'easy';
  if (level === 3) return 'medium';
  return 'hard';
}
