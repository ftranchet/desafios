// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGridPathDrag, type CellCoord } from './useGridPathDrag';

// Cableado de eventos de puntero del hook (ADR-005): un único contenedor
// recibe los tres handlers y `cellAt` hace el hit-test por coordenadas — el
// mismo patrón que ya usa el resto del kit para convertir clientX/clientY
// (PRD 10.7.6), así que el test simula un contenedor de 1×3 sin depender de
// layout real de jsdom.

afterEach(cleanup);

function cellAtColumn(clientX: number): CellCoord | null {
  return clientX >= 0 && clientX < 3 ? { row: 0, col: clientX } : null;
}

function Grid({ onPathEnd }: { onPathEnd?(path: readonly CellCoord[]): void }) {
  const drag = useGridPathDrag({ cellAt: cellAtColumn, onPathEnd });
  return (
    <div
      data-testid="grid"
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
    >
      <span data-testid="path">{JSON.stringify(drag.path)}</span>
      <span data-testid="dragging">{String(drag.isDragging)}</span>
    </div>
  );
}

function pathOf(): CellCoord[] {
  return JSON.parse(screen.getByTestId('path').textContent!) as CellCoord[];
}

function isDragging(): boolean {
  return screen.getByTestId('dragging').textContent === 'true';
}

describe('useGridPathDrag', () => {
  it('construye el trazo completo entre pointerdown, pointermove y pointerup', () => {
    const onPathEnd = vi.fn();
    render(<Grid onPathEnd={onPathEnd} />);
    const grid = screen.getByTestId('grid');

    fireEvent.pointerDown(grid, { pointerId: 1, clientX: 0, clientY: 0 });
    expect(pathOf()).toEqual([{ row: 0, col: 0 }]);
    expect(isDragging()).toBe(true);

    fireEvent.pointerMove(grid, { pointerId: 1, clientX: 1, clientY: 0 });
    fireEvent.pointerMove(grid, { pointerId: 1, clientX: 2, clientY: 0 });
    expect(pathOf()).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);

    fireEvent.pointerUp(grid, { pointerId: 1 });
    expect(isDragging()).toBe(false);
    expect(onPathEnd).toHaveBeenCalledTimes(1);
    expect(onPathEnd).toHaveBeenCalledWith([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);
  });

  it('arrastrar hacia atrás deshace el último paso antes de soltar', () => {
    render(<Grid />);
    const grid = screen.getByTestId('grid');

    fireEvent.pointerDown(grid, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(grid, { pointerId: 1, clientX: 1, clientY: 0 });
    expect(pathOf()).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);

    fireEvent.pointerMove(grid, { pointerId: 1, clientX: 0, clientY: 0 });
    expect(pathOf()).toEqual([{ row: 0, col: 0 }]);
  });

  it('un pointermove fuera de la grilla no rompe el trazo en curso', () => {
    render(<Grid />);
    const grid = screen.getByTestId('grid');

    fireEvent.pointerDown(grid, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(grid, { pointerId: 1, clientX: 99, clientY: 0 });
    expect(pathOf()).toEqual([{ row: 0, col: 0 }]);

    fireEvent.pointerMove(grid, { pointerId: 1, clientX: 1, clientY: 0 });
    expect(pathOf()).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
  });

  it('pointerdown fuera de la grilla no arranca ningún trazo', () => {
    render(<Grid />);
    const grid = screen.getByTestId('grid');

    fireEvent.pointerDown(grid, { pointerId: 1, clientX: 99, clientY: 0 });
    expect(pathOf()).toEqual([]);
    expect(isDragging()).toBe(false);
  });

  it('un pointermove antes de cualquier pointerdown no hace nada', () => {
    render(<Grid />);
    const grid = screen.getByTestId('grid');

    fireEvent.pointerMove(grid, { pointerId: 1, clientX: 1, clientY: 0 });
    expect(pathOf()).toEqual([]);
    expect(isDragging()).toBe(false);
  });
});
