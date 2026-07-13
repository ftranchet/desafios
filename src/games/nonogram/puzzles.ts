// Banco de imágenes de Nonograma precargadas y verificadas (mismo criterio
// que Sudoku, PRD sección 16: garantizar solución única en vivo es difícil,
// así que v1 usa un banco curado). Cada imagen se verificó con un solver de
// propagación + backtracking que confirmó exactamente una solución antes de
// entrar acá — las pistas de fila/columna se derivan en tiempo de ejecución
// a partir de la imagen (no hace falta guardarlas, solo la imagen en sí).

export interface NonogramImage {
  image: readonly number[]; // rows*cols, 0/1 — la única solución
  rows: number;
  cols: number;
}

export const IMAGES_BY_TIER: Record<'easy' | 'medium' | 'hard' | 'zen', NonogramImage[]> = {
  // Corazón 5x5.
  easy: [
    {
      rows: 5,
      cols: 5,
      image: [0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0],
    },
  ],
  // Diamante 8x8.
  medium: [
    {
      rows: 8,
      cols: 8,
      image: [
        0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1,
        1, 0, 0, 0,
      ],
    },
  ],
  // Flecha hacia arriba 10x10.
  hard: [
    {
      rows: 10,
      cols: 10,
      image: [
        0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0,
        0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0,
        0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0,
        0, 0, 0, 1, 1, 1, 1, 0, 0, 0,
      ],
    },
  ],
  // Cruz 6x6 — dificultad suave para Tranquilo.
  zen: [
    {
      rows: 6,
      cols: 6,
      image: [
        0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0,
        0, 0, 1, 1, 0, 0,
      ],
    },
  ],
};
