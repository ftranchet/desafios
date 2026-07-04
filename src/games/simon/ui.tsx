import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PressButton, useAutoFocus } from '../../core/ui';
import {
  buildResult,
  createInitialState,
  getModeParams,
  playbackForRound,
  stageForRound,
  submitTap,
  type SimonState,
} from './logic';

// Cada pad tiene color, un glifo propio y un tono propio (ADR-006): la
// información no depende solo del color (RNF-05) — se ve por forma y se oye
// por altura, fiel al juego original. Frecuencias consonantes (C-E-G-C).
const PADS = [
  { color: 'bg-game-1', glyph: '●', toneHz: 261.63 },
  { color: 'bg-game-2', glyph: '■', toneHz: 329.63 },
  { color: 'bg-game-3', glyph: '▲', toneHz: 392.0 },
  { color: 'bg-game-4', glyph: '◆', toneHz: 523.25 },
];

const TAP_TONE_MS = 150;

const START_DELAY_MS = 500;

type Phase = 'playback' | 'input';

export function SimonGame({ config, onFinish, audio }: GameProps) {
  const params = getModeParams(config.mode);

  // Foco al contenedor: las teclas 1-4 responden desde la primera ronda,
  // sin exigir tabular hasta los pads (RNF-11).
  const containerRef = useAutoFocus<HTMLDivElement>();
  const stateRef = useRef<SimonState>(createInitialState(config.mode, config.seed ?? Date.now()));
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
    // En el progresivo, cada ronda se reproduce a la velocidad de su grado.
    const { flashMs, gapMs } = playbackForRound(config.mode, target);
    const sequence = stateRef.current.sequence.slice(0, target);
    sequence.forEach((pad, index) => {
      const start = index * (flashMs + gapMs);
      schedule(() => {
        setActivePad(pad);
        // El tono acompaña al destello: la secuencia se percibe también de oído.
        audio?.tone(PADS[pad]?.toneHz ?? 440, flashMs);
      }, start);
      schedule(() => setActivePad(null), start + flashMs);
    });
    const totalMs = sequence.length * (flashMs + gapMs);
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
    audio?.tone(PADS[padIndex]?.toneHz ?? 440, TAP_TONE_MS);
    schedule(() => setPressedPad(null), 150);

    const previousRound = stateRef.current.round;
    const previousMistakes = stateRef.current.mistakes;
    const next = submitTap(stateRef.current, padIndex);
    stateRef.current = next;

    if (next.gameOver) {
      setPhase('playback'); // deshabilita los pads mientras se cierra la partida
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
      // Cerrar la ventana de entrada de inmediato: si los pads siguieran
      // habilitados durante los 400 ms previos al replay, un tap se evaluaría
      // contra la ronda siguiente y podría terminar la partida injustamente.
      setPhase('playback');
      schedule(() => playSequence(), 400);
    }
  }

  // Atajo de teclado en escritorio: 1-4 tocan los pads en orden de lectura.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const padIndex = ['1', '2', '3', '4'].indexOf(event.key);
    if (padIndex === -1) return;
    event.preventDefault();
    handlePadTap(padIndex);
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
        className="grid w-full max-w-xs grid-cols-2 gap-3"
        role="group"
        aria-label="Paneles de Simon"
      >
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
            <PressButton
              key={index}
              variant="bare"
              disabled={phase !== 'input'}
              onPress={() => handlePadTap(index)}
              ariaLabel={`Panel ${index + 1}`}
              className={`relative flex aspect-square items-center justify-center rounded-xl border border-surface-alt transition-all duration-150 ${pad.color} ${stateClass}`}
            >
              <span
                className={`font-display text-[1.75rem] font-bold text-bg transition-opacity ${
                  isFlashing ? 'opacity-90' : 'opacity-40'
                }`}
              >
                {pad.glyph}
              </span>
            </PressButton>
          );
        })}
      </div>
    </div>
  );
}
