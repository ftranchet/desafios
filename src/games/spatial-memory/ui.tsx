import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PressButton, useAutoFocus } from '../../core/ui';
import {
  buildResult,
  CELL_COUNT,
  createInitialState,
  getModeParams,
  playbackForRound,
  stageForRound,
  submitTap,
  type SpatialMemoryState,
} from './logic';

// Interfaz de "Memoria espacial" (tipo Corsi). La única pista es la
// posición: todas las celdas destellan con el mismo acento (RNF-05, la
// información no depende del color) y suenan con un tono propio, así la
// secuencia también se percibe de oído.

const CELL_TONE_HZ = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33];
const TAP_TONE_MS = 150;
const START_DELAY_MS = 500;

type Phase = 'playback' | 'input';

export function SpatialMemoryGame({ config, onFinish, audio }: GameProps) {
  const params = getModeParams(config.mode);

  // Foco al contenedor: los dígitos 1-9 responden desde la primera ronda,
  // sin exigir tabular hasta la grilla (RNF-11).
  const containerRef = useAutoFocus<HTMLDivElement>();
  const stateRef = useRef<SpatialMemoryState>(
    createInitialState(config.mode, config.seed ?? Date.now()),
  );
  const sessionStartRef = useRef(0);
  const timeoutsRef = useRef<number[]>([]);

  const [phase, setPhase] = useState<Phase>('playback');
  const [round, setRound] = useState(stateRef.current.round);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [pressedCell, setPressedCell] = useState<number | null>(null);

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
    // En el progresivo, cada ronda se reproduce a la velocidad de su grado.
    const { flashMs, gapMs } = playbackForRound(config.mode, target);
    const sequence = stateRef.current.sequence.slice(0, target);
    sequence.forEach((cell, index) => {
      const start = index * (flashMs + gapMs);
      schedule(() => {
        setActiveCell(cell);
        // El tono acompaña al destello: la secuencia también se oye.
        audio?.tone(CELL_TONE_HZ[cell] ?? 440, flashMs);
      }, start);
      schedule(() => setActiveCell(null), start + flashMs);
    });
    const totalMs = sequence.length * (flashMs + gapMs);
    schedule(() => setPhase('input'), totalMs);
  }

  function finishGame() {
    clearTimers();
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, stateRef.current, durationMs));
  }

  function handleCellTap(cellIndex: number) {
    if (phase !== 'input') return;

    setPressedCell(cellIndex);
    audio?.tone(CELL_TONE_HZ[cellIndex] ?? 440, TAP_TONE_MS);
    schedule(() => setPressedCell(null), 150);

    const previousRound = stateRef.current.round;
    const previousMistakes = stateRef.current.mistakes;
    const next = submitTap(stateRef.current, cellIndex);
    stateRef.current = next;

    if (next.gameOver) {
      setPhase('playback'); // deshabilita la grilla mientras se cierra la partida
      schedule(() => finishGame(), 300);
      return;
    }

    if (next.mistakes > previousMistakes) {
      // Tranquilo: el fallo repite la ronda — se vuelve a mostrar la secuencia.
      audio?.play('error');
      setPhase('playback');
      schedule(() => playSequence(), 600);
      return;
    }

    if (next.round !== previousRound) {
      setRound(next.round);
      // Cerrar la ventana de entrada de inmediato: si la grilla siguiera
      // habilitada durante los ms previos al replay, un toque se evaluaría
      // contra la ronda siguiente y podría terminar la partida injustamente.
      setPhase('playback');
      schedule(() => playSequence(), 400);
    }
  }

  // Atajo de teclado en escritorio: 1-9 tocan las celdas en orden de lectura.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const cellIndex = '123456789'.indexOf(event.key);
    if (cellIndex === -1) return;
    event.preventDefault();
    handleCellTap(cellIndex);
  }

  return (
    <div
      ref={containerRef}
      className="flex min-h-[70vh] flex-col items-center justify-center gap-8 p-6 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="text-center">
        <p className="text-sm text-text-secondary">Ronda</p>
        <p className="font-display text-lg font-bold text-text-primary">
          {round} / {params.maxRounds}
        </p>
        {config.mode === 'progressive' && (
          <p className="mt-1 text-xs text-text-secondary">Grado {stageForRound(round)}/10</p>
        )}
        <p className="mt-1 text-sm text-text-secondary">
          {phase === 'playback' ? 'Mirá la secuencia...' : 'Tu turno'}
        </p>
      </div>

      <div
        className="grid w-full max-w-xs grid-cols-3 gap-3"
        role="group"
        aria-label="Celdas de memoria espacial"
      >
        {Array.from({ length: CELL_COUNT }, (_, index) => {
          const isFlashing = activeCell === index;
          const isPressed = pressedCell === index;
          const stateClass = isFlashing
            ? 'bg-accent-primary scale-105 ring-4 ring-text-primary/70 shadow-[0_0_24px_rgba(63,208,201,0.5)] z-10'
            : isPressed
              ? 'bg-surface-alt scale-95'
              : 'bg-surface';
          return (
            <PressButton
              key={index}
              variant="bare"
              disabled={phase !== 'input'}
              onPress={() => handleCellTap(index)}
              ariaLabel={`Celda ${index + 1}`}
              className={`aspect-square rounded-xl border border-surface-alt transition-all duration-150 ${stateClass}`}
            >
              {''}
            </PressButton>
          );
        })}
      </div>
    </div>
  );
}
