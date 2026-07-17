import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { GameProps } from '../../core/contract';
import {
  REACTION_WINDOW_MS,
  buildResult,
  createRoundPlans,
  getModeParams,
  resolveRoundTap,
  type RoundOutcome,
  type RoundPlan,
} from './logic';

const FEEDBACK_DURATION_MS = 650;

type Phase = 'intro' | 'waiting' | 'target' | 'decoy' | 'feedback';

const PHASE_BG: Record<Exclude<Phase, 'feedback'>, string> = {
  intro: 'bg-surface',
  waiting: 'bg-surface-alt',
  target: 'bg-accent-primary',
  decoy: 'bg-accent-error',
};

export function ReactionTimeGame({ config, onFinish, audio }: GameProps) {
  const params = getModeParams(config.mode);

  const containerRef = useRef<HTMLDivElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const startedRef = useRef(false);
  const plansRef = useRef<RoundPlan[]>([]);
  const outcomesRef = useRef<RoundOutcome[]>([]);
  const roundStartRef = useRef(0);
  const sessionStartRef = useRef(0);
  const resolvedRef = useRef(false);
  // Timers de la ronda activa (cambio de color y timeout). Se cancelan al
  // resolver la ronda: si no, el timeout de "se acabó el tiempo" de una
  // ronda ya resuelta por toque queda pendiente y, al disparar más tarde,
  // resuelve de nuevo con el índice viejo y pisa el estado de la ronda
  // siguiente (cuyo resolvedRef ya fue reseteado a false por startRound).
  const roundTimersRef = useRef<{ change: number | null; end: number | null }>({
    change: null,
    end: null,
  });
  const feedbackTimerRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>('intro');
  const [roundIndex, setRoundIndex] = useState(0);
  const [lastOutcome, setLastOutcome] = useState<RoundOutcome | null>(null);

  // En la introducción el único control enfocable es el botón real. Al
  // comenzar (y al iniciar cada ronda), el foco vuelve al área de reacción.
  useEffect(() => {
    if (phase === 'intro') startButtonRef.current?.focus();
    else if (phase === 'waiting') containerRef.current?.focus();
  }, [phase]);

  function clearRoundTimers() {
    if (roundTimersRef.current.change !== null) window.clearTimeout(roundTimersRef.current.change);
    if (roundTimersRef.current.end !== null) window.clearTimeout(roundTimersRef.current.end);
    roundTimersRef.current = { change: null, end: null };
  }

  function clearAllTimers() {
    clearRoundTimers();
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = null;
  }

  useEffect(() => {
    return () => {
      if (roundTimersRef.current.change !== null)
        window.clearTimeout(roundTimersRef.current.change);
      if (roundTimersRef.current.end !== null) window.clearTimeout(roundTimersRef.current.end);
      if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  function finishGame(completed: boolean) {
    clearAllTimers();
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, outcomesRef.current, durationMs, completed));
  }

  function resolveTap(index: number, tapAtMs: number | null) {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    clearRoundTimers();

    const plan = plansRef.current[index];
    if (!plan) return;

    const outcome = resolveRoundTap(plan, tapAtMs);
    outcomesRef.current[index] = outcome;
    audio?.play(outcome.correct ? 'success' : 'error');
    setLastOutcome(outcome);
    setPhase('feedback');

    feedbackTimerRef.current = window.setTimeout(() => {
      const nextIndex = index + 1;
      if (nextIndex >= plansRef.current.length) {
        finishGame(true);
      } else {
        setRoundIndex(nextIndex);
        startRound(nextIndex);
      }
    }, FEEDBACK_DURATION_MS);
  }

  function startRound(index: number) {
    const plan = plansRef.current[index];
    if (!plan) return;
    resolvedRef.current = false;
    roundStartRef.current = performance.now();
    setPhase('waiting');

    roundTimersRef.current = {
      change: window.setTimeout(() => {
        setPhase(plan.isDecoy ? 'decoy' : 'target');
      }, plan.delayMs),
      end: window.setTimeout(() => {
        resolveTap(index, null);
      }, plan.delayMs + REACTION_WINDOW_MS),
    };
  }

  function beginGame() {
    if (startedRef.current) return;
    startedRef.current = true;
    plansRef.current = createRoundPlans(config.mode, config.seed ?? Date.now());
    outcomesRef.current = [];
    sessionStartRef.current = performance.now();
    setRoundIndex(0);
    startRound(0);
  }

  function handleTap() {
    if (phase === 'intro' || phase === 'feedback') return;
    const tapAtMs = performance.now() - roundStartRef.current;
    resolveTap(roundIndex, tapAtMs);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Un Enter/Espacio sobre el botón nativo de inicio genera su propio click.
    // Ignorar eventos que burbujean evita empezar dos veces desde el root.
    if (event.target !== event.currentTarget || event.repeat || phase === 'intro') return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handleTap();
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.isPrimary === false) return;
    handleTap();
  }

  const background = phase === 'feedback' ? feedbackBackground(lastOutcome) : PHASE_BG[phase];
  const usesSolidBackground = phase === 'target' || phase === 'decoy' || phase === 'feedback';
  const foreground = usesSolidBackground ? 'text-bg' : 'text-text-primary';
  const isReactionPhase = phase === 'waiting' || phase === 'target' || phase === 'decoy';
  const signal = isReactionPhase ? SIGNALS[phase] : null;
  const announcement =
    signal?.ariaLabel ??
    (phase === 'feedback' && lastOutcome ? feedbackText(lastOutcome) : null);

  return (
    <div
      className={`relative flex h-full min-h-[70dvh] flex-col ${background}`}
      data-phase={phase}
      data-round={roundIndex}
    >
      <div
        ref={containerRef}
        className={`flex min-h-[70dvh] flex-1 flex-col items-center justify-center gap-6 p-6 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-inset ${
          usesSolidBackground ? 'focus-visible:ring-bg' : 'focus-visible:ring-accent-primary'
        }`}
        role={isReactionPhase ? 'button' : undefined}
        tabIndex={phase === 'intro' ? -1 : 0}
        aria-label={isReactionPhase ? signal?.ariaLabel : undefined}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
      >
        {phase === 'intro' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="max-w-xs text-base text-text-primary">
              Tocá cuando aparezca <strong>¡Ahora!</strong> con un círculo. Si aparece una cruz con
              <strong> No toques</strong>, esperá la ronda siguiente.
            </p>
            <button
              ref={startButtonRef}
              type="button"
              className="min-h-touch min-w-touch rounded-lg bg-accent-primary px-6 py-3 font-display text-base font-bold text-bg transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              onClick={beginGame}
            >
              Empezar
            </button>
          </div>
        )}

        {phase !== 'intro' && (
          <p className={`font-display text-sm font-semibold ${foreground}`}>
            Ronda {roundIndex + 1} / {params.rounds}
          </p>
        )}

        {signal && (
          <div className={foreground}>
            <span aria-hidden="true" className="block font-display text-5xl font-extrabold">
              {signal.icon}
            </span>
            <p className="mt-2 font-display text-xl font-extrabold">{signal.title}</p>
            <p className="mt-1 text-sm font-semibold">{signal.hint}</p>
          </div>
        )}

        {phase === 'feedback' && lastOutcome && (
          <p className="font-display text-xl font-extrabold text-bg">
            {feedbackText(lastOutcome)}
          </p>
        )}
      </div>

      {announcement && (
        <p
          role="status"
          aria-live={signal ? 'assertive' : 'polite'}
          aria-atomic="true"
          className="sr-only"
        >
          {announcement}
        </p>
      )}
    </div>
  );
}

const SIGNALS = {
  waiting: {
    icon: '…',
    title: 'Esperá',
    hint: 'No toques todavía',
    ariaLabel: 'Esperá. No toques todavía.',
  },
  target: {
    icon: '●',
    title: '¡Ahora!',
    hint: 'Tocá la pantalla',
    ariaLabel: '¡Ahora! Tocá la pantalla.',
  },
  decoy: {
    icon: '×',
    title: 'No toques',
    hint: 'Es un señuelo',
    ariaLabel: 'No toques. Es un señuelo.',
  },
} as const;

function feedbackBackground(outcome: RoundOutcome | null): string {
  if (!outcome) return 'bg-surface';
  return outcome.correct ? 'bg-accent-success' : 'bg-accent-error';
}

function feedbackText(outcome: RoundOutcome): string {
  if (outcome.timing === 'early') return 'Muy pronto';
  if (outcome.isDecoy) {
    return outcome.correct ? '¡Bien esquivado!' : 'Era señuelo';
  }
  if (!outcome.correct) {
    return 'Muy lento';
  }
  return `${outcome.reactionMs} ms`;
}
