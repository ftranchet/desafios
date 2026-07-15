import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

// Arrastre de un trazo por una grilla (ADR-005): el gesto estándar de
// Flow Free/Numberlink — apoyar el dedo en una celda y arrastrar por celdas
// adyacentes para dibujar un camino, con "deshacer" al arrastrar hacia atrás
// sobre la penúltima celda. Primitiva agnóstica del juego: el hit-test de
// celda (`cellAt`) es responsabilidad de quien la usa, igual que el resto del
// kit convierte coordenadas de puntero con `getBoundingClientRect` (PRD
// 10.7.6). Construida para "Un trazo", reutilizada sin cambios por "Enlaces"
// y "Sendero de palabras" (docs/game-plans/linkedin-elevate-clones.md).

export interface CellCoord {
  row: number;
  col: number;
}

function sameCell(a: CellCoord, b: CellCoord): boolean {
  return a.row === b.row && a.col === b.col;
}

function defaultIsAdjacent(a: CellCoord, b: CellCoord): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

/**
 * Próximo trazo al agregar `cell` a `path`, en orden de prioridad: repetir la
 * celda actual no cambia nada; volver a la penúltima celda lo acorta
 * (deshacer, el arrastre hacia atrás); cualquier otra celda ya visitada se
 * ignora (el trazo no puede cruzarse a sí mismo); una celda no adyacente a la
 * última también se ignora; el resto se agrega al final del trazo.
 */
export function extendPath(
  path: readonly CellCoord[],
  cell: CellCoord,
  isAdjacent: (a: CellCoord, b: CellCoord) => boolean = defaultIsAdjacent,
): CellCoord[] {
  const unchanged = path as CellCoord[];
  if (path.length === 0) return [cell];
  const last = path[path.length - 1]!;
  if (sameCell(last, cell)) return unchanged;
  if (path.length >= 2 && sameCell(path[path.length - 2]!, cell)) return path.slice(0, -1);
  if (path.some((visited) => sameCell(visited, cell))) return unchanged;
  if (!isAdjacent(last, cell)) return unchanged;
  return [...path, cell];
}

export interface UseGridPathDragOptions {
  /** Hit-test propio del juego: coordenadas de puntero → celda, o `null` fuera de la grilla. */
  cellAt(clientX: number, clientY: number): CellCoord | null;
  /** Criterio de adyacencia entre dos celdas. Default: ortogonal (arriba/abajo/izquierda/derecha). */
  isAdjacent?: (a: CellCoord, b: CellCoord) => boolean;
  /** Se llama al soltar el dedo, con el trazo final — el juego valida o confirma ahí. */
  onPathEnd?(path: readonly CellCoord[]): void;
}

export interface UseGridPathDragResult {
  path: CellCoord[];
  isDragging: boolean;
  onPointerDown(event: ReactPointerEvent): void;
  onPointerMove(event: ReactPointerEvent): void;
  onPointerUp(event: ReactPointerEvent): void;
  reset(): void;
}

export function useGridPathDrag(options: UseGridPathDragOptions): UseGridPathDragResult {
  const { cellAt, isAdjacent, onPathEnd } = options;
  const [path, setPath] = useState<CellCoord[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  // Espejo síncrono de `path`: dentro de un mismo gesto pueden llegar varios
  // pointermove antes de que React re-renderice, y cada uno necesita ver el
  // trazo que dejó el anterior, no el de useState de este render.
  const pathRef = useRef<CellCoord[]>([]);

  const commit = useCallback((next: CellCoord[]) => {
    pathRef.current = next;
    setPath(next);
  }, []);

  const reset = useCallback(() => {
    setIsDragging(false);
    commit([]);
  }, [commit]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent) => {
      const cell = cellAt(event.clientX, event.clientY);
      if (!cell) return;
      // El botón/tablero no roba el foco del contenedor del juego (mismo
      // criterio que PressButton), y el teclado físico sigue funcionando.
      event.preventDefault();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // jsdom y navegadores viejos no implementan la captura: solo se
        // pierde la robustez del gesto si el dedo se corre de la grilla.
      }
      setIsDragging(true);
      commit([cell]);
    },
    [cellAt, commit],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent) => {
      if (!isDragging) return;
      const cell = cellAt(event.clientX, event.clientY);
      if (!cell) return;
      const next = extendPath(pathRef.current, cell, isAdjacent);
      if (next !== pathRef.current) commit(next);
    },
    [isDragging, cellAt, isAdjacent, commit],
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    onPathEnd?.(pathRef.current);
  }, [isDragging, onPathEnd]);

  return {
    path,
    isDragging,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    reset,
  };
}
