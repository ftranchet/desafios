import type { GameMode, ModeId } from './contract';

// Vocabulario y estructura de los modos de juego (ADR-007). Este módulo es la
// única fuente de los labels y del orden de los modos: los juegos declaran qué
// modos especiales soportan con buildModes() y no pueden desviarse de la
// convención. Los parámetros de gameplay permanecen privados a cada módulo.

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

export interface SpecialModesInput {
  zen?: boolean;
  progressive?: boolean;
}

/**
 * Construye la lista de modos con labels, descripciones y orden canónicos.
 * Las tres dificultades siempre están presentes; los modos especiales se
 * declaran solo si el juego los implementa (ADR-007).
 */
export function buildModes(specialModes: SpecialModesInput = {}): GameMode[] {
  const modes: GameMode[] = DIFFICULTY_MODE_IDS.map((id) => ({
    id,
    label: MODE_LABELS[id],
  }));
  for (const id of SPECIAL_MODE_IDS) {
    if (specialModes[id]) {
      modes.push({
        id,
        label: MODE_LABELS[id],
        description: MODE_DESCRIPTIONS[id],
      });
    }
  }
  return modes;
}

export function isModeId(value: unknown): value is ModeId {
  // `in` también recorre el prototipo (`toString`, `constructor`,
  // `__proto__`…), algo especialmente peligroso porque esta función valida
  // datos que vienen de localStorage. Solo las claves propias del vocabulario
  // cerrado son modos válidos.
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(MODE_LABELS, value);
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
