import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../core/contract';
import { buildResult, createInitialState, getLevelParams, submitTap, type SimonState } from './logic';

// Cada pad tiene color y un glifo propio: la información no depende solo del
// color (RNF-05) y ayuda a distinguir cuál se enciende.
const PADS = [
  { color: 'bg-game-1', glyph: '●' },
  { color: 'bg-game-2', glyph: '■' },
  { color: 'bg-game-3', glyph: '▲' },
  { color: 'bg-game-4', glyph: '◆' },
];

const START_DELAY_MS = 500;

type Phase = 'playback' | 'input';

export function SimonGame({ config, onFinish }: GameProps) {
  const params = getLevelParams(config.level);

  const stateRef = useRef<SimonState>(createInitialState(config.level, config.seed ?? Date.now()));
  const sessionStartRef = useRef(0);
  const timeoutsRef = useRef<number[]>([]);

  const [phase, setPhase] = useState<Phase>('playback');
  const [round, setRound] = useState(stateRef.current.round);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [pressedPad, setPressedPad] = useState<number | null>(null);

  function clearTimers() {
    for (const id of timeoutsRef.current) window.clearTimeout(id);
    timeoutsRef.current = [];
  }

  function schedule(fn: () => void, delayMs: number) {
    const id = window.setTimeout(fn, delayMs);
    timeoutsRef.current.push(id);
  }

  useEffect(() => clearTimers, []);

  useEffect(() => {
    sessionStartRef.current = performance.now();
    schedule(() => playSequence(), START_DELAY_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function playSequence() {
    setPhase('playback');
    const target = stateRef.current.round;
    const sequence = stateRef.current.sequence.slice(0, target);
    sequence.forEach((pad, index) => {
      const start = index * (params.flashMs + params.gapMs);
      schedule(() => setActivePad(pad), start);
      schedule(() => setActivePad(null), start + params.flashMs);
    });
    const totalMs = sequence.length * (params.flashMs + params.gapMs);
    schedule(() => setPhase('input'), totalMs);
  }

  function finishGame() {
    clearTimers();
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, stateRef.current, durationMs));
  }

  function handlePadTap(padIndex: number) {
    if (phase !== 'input') return;

    setPressedPad(padIndex);
    schedule(() => setPressedPad(null), 150);

    const previousRound = stateRef.current.round;
    const next = submitTap(stateRef.current, padIndex);
    stateRef.current = next;

    if (next.gameOver) {
      setPhase('playback'); // deshabilita los pads mientras se cierra la partida
      schedule(() => finishGame(), 300);
      return;
    }

    if (next.round !== previousRound) {
      setRound(next.round);
      // Cerrar la ventana de entrada de inmediato: si los pads siguieran
      // habilitados durante los 400 ms previos al replay, un tap se evaluaría
      // contra la ronda siguiente y podría terminar la partida injustamente.
      setPhase('playback');
      schedule(() => playSequence(), 400);
    }
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <p className="text-sm text-text-secondary">Ronda</p>
        <p className="font-display text-lg font-bold text-text-primary">
          {round} / {params.maxRounds}
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          {phase === 'playback' ? 'Mirá la secuencia...' : 'Tu turno'}
        </p>
      </div>

      <div className="grid w-full max-w-xs grid-cols-2 gap-3" role="group" aria-label="Paneles de Simon">
        {PADS.map((pad, index) => {
          const isFlashing = activePad === index;
          const isPressed = pressedPad === index;
          // Reposo bien atenuado; el flash de reproducción da un salto grande de
          // brillo + agranda + resplandor, inconfundible frente al resto apagado.
          const stateClass = isFlashing
            ? 'brightness-110 scale-105 ring-4 ring-text-primary/70 shadow-[0_0_24px_rgba(244,244,242,0.4)] z-10'
            : isPressed
              ? 'brightness-110 scale-95'
              : 'brightness-[.5] saturate-[.85]';
          return (
            <button
              key={index}
              type="button"
              disabled={phase !== 'input'}
              onClick={() => handlePadTap(index)}
              aria-label={`Panel ${index + 1}`}
              className={`relative flex aspect-square items-center justify-center rounded-xl border border-surface-alt transition-all duration-150 ${pad.color} ${stateClass}`}
            >
              <span
                className={`font-display text-[1.75rem] font-bold text-bg transition-opacity ${
                  isFlashing ? 'opacity-90' : 'opacity-40'
                }`}
              >
                {pad.glyph}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
