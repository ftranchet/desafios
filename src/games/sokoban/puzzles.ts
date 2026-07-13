// Banco de niveles de Empuja cajas (Sokoban) precargados y verificados (mismo
// criterio que Sudoku y Nonograma, PRD sección 16): generar un nivel al azar
// y garantizar que sea resoluble es difícil (Sokoban es PSPACE-completo en
// general), así que v1 usa un banco curado. Cada nivel se verificó con un
// solver de BFS sobre (posición del jugador, posiciones de las cajas) que
// confirmó que es resoluble y calculó el largo de una solución óptima —
// `parMoves` es ese mínimo exacto, no una referencia aproximada.
//
// Notación clásica de Sokoban (formato XSB): '#' pared, ' ' piso, '.' objetivo,
// '$' caja, '@' jugador, '*' caja ya sobre un objetivo, '+' jugador sobre un objetivo.

export interface SokobanLevel {
  map: readonly string[];
  parMoves: number;
}

export const LEVELS_BY_TIER: Record<'easy' | 'medium' | 'hard' | 'zen', SokobanLevel[]> = {
  easy: [
    {
      map: ['#######', '#     #', '#  $  #', '#  .  #', '#  @  #', '#######'],
      parMoves: 6,
    },
    {
      map: ['#######', '#  .  #', '#  $  #', '# @   #', '#     #', '#######'],
      parMoves: 2,
    },
  ],
  medium: [
    {
      map: ['########', '#      #', '# $  . #', '#  ##  #', '# .  $ #', '#   @  #', '########'],
      parMoves: 12,
    },
    {
      map: [
        '#########',
        '#   #   #',
        '# $   $ #',
        '#  ###  #',
        '# .   . #',
        '#   @   #',
        '#########',
      ],
      parMoves: 18,
    },
  ],
  hard: [
    {
      map: [
        '#########',
        '#   #   #',
        '# $   $ #',
        '#  # #  #',
        '# .   . #',
        '#   $   #',
        '#   .   #',
        '#   @   #',
        '#########',
      ],
      parMoves: 22,
    },
    {
      map: [
        '##########',
        '#    #   #',
        '# $  $   #',
        '#  #  #  #',
        '# .   .  #',
        '#   $    #',
        '#   .  @ #',
        '##########',
      ],
      parMoves: 26,
    },
  ],
  zen: [
    {
      map: ['########', '#      #', '# $  . #', '#      #', '# .  $ #', '#  @   #', '########'],
      parMoves: 11,
    },
    {
      map: ['#######', '#  .  #', '#  $  #', '#     #', '#  $  #', '#  .  #', '#  @  #', '#######'],
      parMoves: 8,
    },
  ],
};
