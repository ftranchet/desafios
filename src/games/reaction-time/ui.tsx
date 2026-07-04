import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import {
  buildResult,
  createRoundPlans,
  getLevelParams,
  resolveRoundTap,
  type RoundOutcome,
  type RoundPlan,
} from './logic';

const REACTION_WINDOW_MS = 1200;
const FEEDBACK_DURATION_MS = 350;

type Phase = 'intro' | 'waiting' | 'target' | 'decoy' | 'feedback';

const PHASE_BG: Record<Exclude<Phase, 'feedback'>, string> = {
  intro: 'bg-surface',
  waiting: 'bg-surface-alt',
  target: 'bg-accent-primary',
  decoy: 'bg-accent-error',
};

export function ReactionTimeGame({ config, onFinish }: GameProps) {
  const params = getLevelParams(config.level);

  const containerRef = useRef<HTMLDivElement>(null);
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
    // Foco al área de juego: Espacio/Enter empiezan y responden desde el
    // arranque, sin exigir un clic previo (RNF-11).
    containerRef.current?.focus({ preventScroll: true });
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
    plansRef.current = createRoundPlans(config.level, config.seed ?? Date.now());
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
    if (event.repeat) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (phase === 'intro') beginGame();
      else handleTap();
    }
  }

  const background = phase === 'feedback' ? feedbackBackground(lastOutcome) : PHASE_BG[phase];

  return (
    <div
      ref={containerRef}
      className={`flex h-full min-h-[70vh] flex-col items-center justify-center gap-6 p-6 ${background}`}
      role="button"
      tabIndex={0}
      aria-label="Área de juego: tocá cuando cambie a turquesa"
      data-phase={phase}
      data-round={roundIndex}
      onPointerDown={handleTap}
      onKeyDown={handleKeyDown}
    >
      {phase === 'intro' && (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="max-w-xs text-base text-text-primary">
            Tocá la pantalla apenas se ponga <span className="text-accent-primary">turquesa</span>.
            Si se pone <span className="text-accent-error">roja</span>, no toques.
          </p>
          <button
            type="button"
            className="min-h-touch min-w-touch rounded-lg bg-accent-primary px-6 py-3 font-display text-base font-bold text-bg"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={beginGame}
          >
            Empezar
          </button>
        </div>
      )}

      {phase !== 'intro' && (
        <p className="font-display text-sm font-semibold text-text-secondary">
          Ronda {roundIndex + 1} / {params.rounds}
        </p>
      )}

      {phase === 'feedback' && lastOutcome && (
        <p className="font-display text-xl font-extrabold text-text-primary">
          {feedbackText(lastOutcome)}
        </p>
      )}
    </div>
  );
}

function feedbackBackground(outcome: RoundOutcome | null): string {
  if (!outcome) return 'bg-surface';
  return outcome.correct ? 'bg-accent-success' : 'bg-accent-error';
}

function feedbackText(outcome: RoundOutcome): string {
  if (outcome.isDecoy) {
    return outcome.correct ? '¡Bien esquivado!' : 'Era señuelo';
  }
  if (!outcome.correct) {
    return outcome.reactionMs === null ? 'Muy lento' : 'Muy pronto';
  }
  return `${outcome.reactionMs} ms`;
}
