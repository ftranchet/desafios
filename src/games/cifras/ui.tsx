import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { CountdownBar, PressButton, useAutoFocus, useSecondsLeft } from '../../core/ui';
import {
  buildResult,
  closestToTarget,
  combine,
  generatePuzzle,
  getModeParams,
  type Op,
  type Puzzle,
} from './logic';

interface Tile {
  id: number;
  value: number;
}

const OPERATORS: { op: Op; symbol: string }[] = [
  { op: '+', symbol: '+' },
  { op: '-', symbol: '−' },
  { op: '*', symbol: '×' },
  { op: '/', symbol: '÷' },
];

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function CifrasGame({ config, onFinish, audio }: GameProps) {
  const params = getModeParams(config.mode);

  // Foco al contenedor: los dígitos 1-9 eligen fichas, +−×÷ combinan y Enter
  // envía desde la primera jugada, sin exigir tabular hasta los botones (RNF-11).
  const containerRef = useAutoFocus<HTMLDivElement>();
  const puzzleRef = useRef<Puzzle>({ numbers: [], target: 0 });
  const originalTilesRef = useRef<Tile[]>([]);
  const tilesRef = useRef<Tile[]>([]);
  const nextIdRef = useRef(0);
  const sessionStartRef = useRef(0);
  const resolvedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  // Pila de estados previos a cada combinación: permite deshacer de a un paso
  // en vez de obligar a reiniciar toda la partida por un error.
  const [history, setHistory] = useState<Tile[][]>([]);
  const [target, setTarget] = useState(0);
  const [finished, setFinished] = useState(false);

  const timed = params.timeLimitMs > 0; // Tranquilo: sin límite de tiempo (ADR-007)
  const secondsLeft = useSecondsLeft(params.timeLimitMs / 1000, timed && !finished, 0);

  useEffect(() => {
    tilesRef.current = tiles;
  }, [tiles]);

  useEffect(() => {
    const puzzle = generatePuzzle(config.mode, config.seed ?? Date.now());
    puzzleRef.current = puzzle;
    setTarget(puzzle.target);
    const initialTiles = puzzle.numbers.map((value) => ({ id: nextIdRef.current++, value }));
    originalTilesRef.current = initialTiles;
    setTiles(initialTiles);
    sessionStartRef.current = performance.now();

    // Tranquilo: sin límite de tiempo — no se programa reloj alguno (ADR-007).
    if (timed) {
      timeoutRef.current = window.setTimeout(() => submitAnswer(), params.timeLimitMs);
    }

    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submitAnswer() {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    setFinished(true);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);

    const currentTiles = tilesRef.current;
    const achieved = closestToTarget(
      currentTiles.map((t) => t.value),
      puzzleRef.current.target,
    );
    audio?.play(achieved === puzzleRef.current.target ? 'success' : 'error');
    const now = performance.now();
    const durationMs = Math.round(now - sessionStartRef.current);
    const timeRemainingMs = Math.max(0, params.timeLimitMs - durationMs);
    onFinish(
      buildResult(config, puzzleRef.current.target, achieved, timeRemainingMs, durationMs, true),
    );
  }

  function toggleTile(id: number) {
    audio?.tone(260, 40);
    if (selected.includes(id)) {
      setSelected(selected.filter((s) => s !== id));
    } else if (selected.length < 2) {
      setSelected([...selected, id]);
    } else {
      setSelected([id]);
    }
  }

  function isOpValid(op: Op): boolean {
    if (selected.length !== 2) return false;
    const [idA, idB] = selected;
    const a = tiles.find((t) => t.id === idA);
    const b = tiles.find((t) => t.id === idB);
    if (!a || !b) return false;
    return combine(a.value, b.value, op) !== null;
  }

  function handleCombine(op: Op) {
    if (selected.length !== 2) return;
    const [idA, idB] = selected;
    const a = tiles.find((t) => t.id === idA);
    const b = tiles.find((t) => t.id === idB);
    if (!a || !b) return;
    const result = combine(a.value, b.value, op);
    if (result === null) return;
    audio?.tone(340, 60);
    const newTile: Tile = { id: nextIdRef.current++, value: result };
    setHistory([...history, tiles]);
    setTiles(tiles.filter((t) => t.id !== idA && t.id !== idB).concat(newTile));
    setSelected([]);
  }

  function handleUndo() {
    const previous = history[history.length - 1];
    if (!previous) return;
    audio?.tone(200, 50);
    setTiles(previous);
    setHistory(history.slice(0, -1));
    setSelected([]);
  }

  function handleReset() {
    if (history.length === 0) return;
    audio?.tone(180, 80);
    setTiles(originalTilesRef.current.map((t) => ({ ...t })));
    setHistory([]);
    setSelected([]);
  }

  // Atajos de escritorio: 1-9 elige la ficha en esa posición, +−×÷ combina la
  // selección, Enter envía la respuesta y Backspace deshace el último paso.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const digitIndex = '123456789'.indexOf(event.key);
    if (digitIndex !== -1 && tiles[digitIndex]) {
      event.preventDefault();
      toggleTile(tiles[digitIndex]!.id);
      return;
    }
    const operator = OPERATORS.find((o) => o.op === event.key);
    if (operator && isOpValid(operator.op)) {
      event.preventDefault();
      handleCombine(operator.op);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      submitAnswer();
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      handleUndo();
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex min-h-[70dvh] flex-col items-center gap-6 p-6 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-sm">
        <div className="mb-2 flex justify-between text-sm text-text-secondary">
          <span>Objetivo</span>
          {timed && <span>{formatSeconds(secondsLeft)}</span>}
        </div>
        {timed && (
          <CountdownBar durationMs={params.timeLimitMs} running={!finished} resetKey={0} />
        )}
      </div>

      <p className="font-display text-xl font-extrabold text-accent-primary">{target}</p>

      <div className="grid w-full max-w-sm grid-cols-3 gap-2">
        {tiles.map((tile) => (
          <PressButton
            key={tile.id}
            variant="bare"
            onPress={() => toggleTile(tile.id)}
            className={`min-h-touch rounded-lg border font-display text-lg font-bold transition-colors ${
              selected.includes(tile.id)
                ? 'border-accent-primary bg-accent-primary text-bg'
                : 'border-surface-alt bg-surface text-text-primary'
            }`}
          >
            {tile.value}
          </PressButton>
        ))}
      </div>

      <div className="flex gap-2">
        {OPERATORS.map(({ op, symbol }) => (
          <PressButton
            key={op}
            variant="control"
            disabled={!isOpValid(op)}
            onPress={() => handleCombine(op)}
          >
            {symbol}
          </PressButton>
        ))}
      </div>

      <div className="mt-auto flex w-full max-w-sm flex-col gap-2">
        <PressButton variant="primary" onPress={submitAnswer}>
          Enviar respuesta
        </PressButton>
        <div className="grid grid-cols-2 gap-2">
          <PressButton variant="key" disabled={history.length === 0} onPress={handleUndo}>
            Deshacer
          </PressButton>
          <PressButton variant="key" disabled={history.length === 0} onPress={handleReset}>
            Reiniciar
          </PressButton>
        </div>
      </div>
    </div>
  );
}
