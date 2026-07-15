// @vitest-environment jsdom
import { extendPath, type CellCoord } from './useGridPathDrag';
import { describe, expect, it } from 'vitest';

// La lógica pura de la primitiva de arrastre de trazo (ADR-005, propuesta en
// docs/game-plans/linkedin-elevate-clones.md): apoyar el dedo en una celda y
// arrastrar por celdas adyacentes dibuja un camino; arrastrar hacia atrás
// sobre la penúltima celda lo acorta (deshacer), el gesto estándar de
// Flow Free/Numberlink. El cableado de eventos de puntero del hook en sí
// (`useGridPathDrag`) se cubre en `useGridPathDrag.render.test.tsx`.

const A: CellCoord = { row: 0, col: 0 };
const B: CellCoord = { row: 0, col: 1 };
const C: CellCoord = { row: 0, col: 2 };
const FAR: CellCoord = { row: 5, col: 5 };

describe('extendPath', () => {
  it('arranca el trazo en la primera celda', () => {
    expect(extendPath([], A)).toEqual([A]);
  });

  it('agrega una celda adyacente y no visitada', () => {
    expect(extendPath([A], B)).toEqual([A, B]);
  });

  it('ignora una celda no adyacente a la última', () => {
    expect(extendPath([A], FAR)).toEqual([A]);
  });

  it('repetir la celda actual no cambia el trazo (misma referencia)', () => {
    const path = [A, B];
    expect(extendPath(path, B)).toBe(path);
  });

  it('arrastrar de vuelta a la penúltima celda acorta el trazo (deshacer)', () => {
    expect(extendPath([A, B, C], B)).toEqual([A, B]);
  });

  it('ignora una celda ya visitada que no sea la penúltima (no se cruza a sí mismo)', () => {
    const zigzag: CellCoord = { row: 1, col: 0 };
    // A -> B -> zigzag -> intentar volver a A (visitada, pero no es la penúltima)
    expect(extendPath([A, B, zigzag], A)).toEqual([A, B, zigzag]);
  });

  it('acepta un criterio de adyacencia propio', () => {
    const diagonal: CellCoord = { row: 1, col: 1 };
    const allowDiagonal = (a: CellCoord, b: CellCoord) =>
      Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1;
    expect(extendPath([A], diagonal, allowDiagonal)).toEqual([A, diagonal]);
  });
});
