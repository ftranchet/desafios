import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PROGRESSIVE_STAGES } from '../../core/modes';
import { PressButton, useAutoFocus } from '../../core/ui';
import {
  buildResult,
  buildRounds,
  createRoundProgress,
  submitNumber,
  type RoundProgress,
  type RoundRecord,
  type RoundSpec,
} from './logic';

// Interfaz de "Tabla de Schulte". El cronómetro se ve solo fuera de
// Tranquilo (RF-05/ADR-007: Tranquilo no compite ni corre contra reloj). El
// teclado físico no puede tener un atajo por celda (hasta 36 en Difícil), así
// que en escritorio se tipea el número y Enter lo confirma (RNF-11).

const KEY_BUFFER_MAX_LENGTH = 2; // gridSize máximo 6 → hasta 36 celdas, 2 dígitos alcanzan

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function SchulteTableGame({ config, onFinish, audio }: GameProps) {
  const containerRef = useAutoFocus<HTMLDivElement>();
  const [rounds] = useState<RoundSpec[]>(() => buildRounds(config.mode, config.seed ?? Date.now()));
  const [roundIndex, setRoundIndex] = useState(0);
  const [progress, setProgress] = useState<RoundProgress>(createRoundProgress);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [roundOver, setRoundOver] = useState(false);
  const [shakeAt, setShakeAt] = useState<number | null>(null);
  const [keyBuffer, setKeyBuffer] = useState('');

  const recordsRef = useRef<RoundRecord[]>([]);
  const roundStartRef = useRef(0);
  const sessionStartRef = useRef(0);
  const intervalRef = useRef<number | null>(null);
  const shakeTimeoutRef = useRef<number | null>(null);

  const round = rounds[roundIndex];
  const showRoundCount = rounds.length > 1 && config.mode !== 'progressive';
  const showTimer = config.mode !== 'zen'; // Tranquilo: sin cronómetro (ADR-007)
  const isLastRound = roundIndex === rounds.length - 1;
  const lastRecord = recordsRef.current[recordsRef.current.length - 1];

  function stopTimer() {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  function startRound() {
    roundStartRef.current = performance.now();
    setProgress(createRoundProgress());
    setElapsedMs(0);
    setKeyBuffer('');
    stopTimer();
    if (showTimer) {
      intervalRef.current = window.setInterval(() => {
        setElapsedMs(Math.round(performance.now() - roundStartRef.current));
      }, 100);
    }
  }

  useEffect(() => {
    sessionStartRef.current = performance.now();
    startRound();
    return () => {
      stopTimer();
      if (shakeTimeoutRef.current !== null) window.clearTimeout(shakeTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finishGame() {
    stopTimer();
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, rounds, recordsRef.current, durationMs));
  }

  function handleTap(tapped: number) {
    if (!round || roundOver) return;
    const next = submitNumber(round, progress, tapped);

    if (next.mistakes > progress.mistakes) {
      setProgress(next);
      audio?.play('error');
      setShakeAt(tapped);
      if (shakeTimeoutRef.current !== null) window.clearTimeout(shakeTimeoutRef.current);
      shakeTimeoutRef.current = window.setTimeout(() => setShakeAt(null), 220);
      return;
    }

    // Tono ascendente por acierto: la secuencia también se percibe de oído.
    audio?.tone(220 + tapped * 8, 60);

    if (next.done) {
      stopTimer();
      const elapsedFinal = Math.round(performance.now() - roundStartRef.current);
      recordsRef.current = [
        ...recordsRef.current,
        { elapsedMs: elapsedFinal, mistakes: next.mistakes },
      ];
      setElapsedMs(elapsedFinal);
      setProgress(next);
      audio?.play('success');
      setRoundOver(true);
      return;
    }

    setProgress(next);
  }

  function continueSession() {
    if (isLastRound) {
      finishGame();
      return;
    }
    setRoundIndex((i) => i + 1);
    setRoundOver(false);
    startRound();
  }

  function submitBuffer() {
    if (keyBuffer === '') return;
    handleTap(Number(keyBuffer));
    setKeyBuffer('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (roundOver) {
      if (event.key === 'Enter') {
        event.preventDefault();
        continueSession();
      }
      return;
    }
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      setKeyBuffer((b) => (b.length >= KEY_BUFFER_MAX_LENGTH ? b : b + event.key));
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      setKeyBuffer((b) => b.slice(0, -1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      submitBuffer();
    }
  }

  if (!round) return null;

  return (
    <div
      ref={containerRef}
      className="flex min-h-[70dvh] flex-col items-center gap-4 p-6 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-xs text-center text-sm text-text-secondary">
        {showRoundCount && `Grilla ${roundIndex + 1}/${rounds.length} · `}
        {config.mode === 'progressive' && `Grado ${round.stage}/${PROGRESSIVE_STAGES} · `}
        {showTimer ? formatSeconds(elapsedMs) : 'Sin cronómetro'}
      </div>

      {!roundOver && (
        <p className="text-center text-sm text-text-secondary">
          Tocá el {progress.expected} para seguir. Con teclado: tipeá el número y Enter
          {keyBuffer && <span className="text-text-primary"> ({keyBuffer})</span>}.
        </p>
      )}

      {roundOver ? (
        <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-lg border border-surface-alt bg-surface p-4 text-center">
          <p className="font-display text-lg font-extrabold text-accent-success">
            ¡Grilla completa!
          </p>
          {showTimer && lastRecord && (
            <p className="text-sm text-text-secondary">
              Tiempo: {formatSeconds(lastRecord.elapsedMs)} · Errores: {lastRecord.mistakes}
            </p>
          )}
          <PressButton variant="primary" onPress={continueSession} className="px-8">
            {isLastRound ? 'Ver resultado' : 'Siguiente grilla'}
          </PressButton>
        </div>
      ) : (
        <div
          className="grid w-full max-w-xs gap-1.5"
          style={{ gridTemplateColumns: `repeat(${round.gridSize}, minmax(0, 1fr))` }}
          role="group"
          aria-label="Grilla de números"
        >
          {round.grid.map((number, cellIndex) => {
            const isFound = number < progress.expected;
            const isShaking = shakeAt === number;
            const stateClass = isFound
              ? 'border-surface-alt bg-surface text-text-secondary opacity-40'
              : isShaking
                ? 'border-accent-error bg-accent-error/20 text-text-primary'
                : 'border-surface-alt bg-surface text-text-primary active:bg-surface-alt';
            return (
              <PressButton
                key={cellIndex}
                variant="bare"
                disabled={isFound}
                onPress={() => handleTap(number)}
                ariaLabel={`Número ${number}`}
                className={`flex aspect-square items-center justify-center rounded-md border font-display text-sm font-bold transition-colors duration-150 ${stateClass}`}
              >
                {number}
              </PressButton>
            );
          })}
        </div>
      )}
    </div>
  );
}
