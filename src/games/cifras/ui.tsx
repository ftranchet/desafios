import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../core/contract';
import {
  buildResult,
  closestToTarget,
  combine,
  generatePuzzle,
  getLevelParams,
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

function formatSeconds(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function CifrasGame({ config, onFinish }: GameProps) {
  const params = getLevelParams(config.level);

  const puzzleRef = useRef<Puzzle>({ numbers: [], target: 0 });
  const originalTilesRef = useRef<Tile[]>([]);
  const tilesRef = useRef<Tile[]>([]);
  const nextIdRef = useRef(0);
  const sessionStartRef = useRef(0);
  const resolvedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [remainingMs, setRemainingMs] = useState(params.timeLimitMs);
  const [target, setTarget] = useState(0);

  useEffect(() => {
    tilesRef.current = tiles;
  }, [tiles]);

  useEffect(() => {
    const puzzle = generatePuzzle(config.level, config.seed ?? Date.now());
    puzzleRef.current = puzzle;
    setTarget(puzzle.target);
    const initialTiles = puzzle.numbers.map((value) => ({ id: nextIdRef.current++, value }));
    originalTilesRef.current = initialTiles;
    setTiles(initialTiles);
    sessionStartRef.current = performance.now();

    timeoutRef.current = window.setTimeout(() => submitAnswer(), params.timeLimitMs);
    tickRef.current = window.setInterval(() => {
      const elapsed = performance.now() - sessionStartRef.current;
      setRemainingMs(Math.max(0, params.timeLimitMs - elapsed));
    }, 250);

    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      if (tickRef.current !== null) window.clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submitAnswer() {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    if (tickRef.current !== null) window.clearInterval(tickRef.current);

    const currentTiles = tilesRef.current;
    const achieved = closestToTarget(
      currentTiles.map((t) => t.value),
      puzzleRef.current.target,
    );
    const now = performance.now();
    const durationMs = Math.round(now - sessionStartRef.current);
    const timeRemainingMs = Math.max(0, params.timeLimitMs - durationMs);
    onFinish(
      buildResult(config, puzzleRef.current.target, achieved, timeRemainingMs, durationMs, true),
    );
  }

  function toggleTile(id: number) {
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
    const newTile: Tile = { id: nextIdRef.current++, value: result };
    setTiles(tiles.filter((t) => t.id !== idA && t.id !== idB).concat(newTile));
    setSelected([]);
  }

  function handleReset() {
    setTiles(originalTilesRef.current.map((t) => ({ ...t })));
    setSelected([]);
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center gap-6 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-2 flex justify-between text-sm text-text-secondary">
          <span>Objetivo</span>
          <span>{formatSeconds(remainingMs)}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
          <div
            className="h-full rounded-full bg-accent-primary"
            style={{ animation: `shrink-width ${params.timeLimitMs}ms linear forwards` }}
          />
        </div>
      </div>

      <p className="font-display text-xl font-extrabold text-accent-primary">{target}</p>

      <div className="grid w-full max-w-sm grid-cols-3 gap-2">
        {tiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            onClick={() => toggleTile(tile.id)}
            className={`min-h-touch rounded-lg border font-display text-lg font-bold transition-colors ${
              selected.includes(tile.id)
                ? 'border-accent-primary bg-accent-primary text-bg'
                : 'border-surface-alt bg-surface text-text-primary'
            }`}
          >
            {tile.value}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {OPERATORS.map(({ op, symbol }) => (
          <button
            key={op}
            type="button"
            disabled={!isOpValid(op)}
            onClick={() => handleCombine(op)}
            className="min-h-touch min-w-touch rounded-lg border border-surface-alt bg-surface font-display text-lg font-bold text-text-primary disabled:opacity-30"
          >
            {symbol}
          </button>
        ))}
      </div>

      <div className="mt-auto flex w-full max-w-sm flex-col gap-2">
        <button
          type="button"
          onClick={submitAnswer}
          className="min-h-touch rounded-lg bg-accent-primary px-4 font-display text-base font-bold text-bg"
        >
          Enviar respuesta
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="min-h-touch rounded-lg bg-surface-alt px-4 font-body text-base text-text-primary"
        >
          Reiniciar
        </button>
      </div>
    </div>
  );
}
