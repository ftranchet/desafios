import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import {
  buildResult,
  generateSession,
  getLevelParams,
  isCorrectChoice,
  type AnswerRecord,
  type Round,
} from './logic';

const FEEDBACK_DURATION_MS = 500;

type Phase = 'question' | 'feedback';
type Choice = 'left' | 'right';

export function QuickEstimateGame({ config, onFinish }: GameProps) {
  const params = getLevelParams(config.level);

  const roundsRef = useRef<Round[]>([]);
  const answersRef = useRef<AnswerRecord[]>([]);
  const sessionStartRef = useRef(0);
  const roundStartRef = useRef(0);
  const resolvedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>('question');
  const [roundIndex, setRoundIndex] = useState(0);
  const [lastChoice, setLastChoice] = useState<Choice | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [barKey, setBarKey] = useState(0);

  function clearTimers() {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
    timeoutRef.current = null;
    feedbackTimeoutRef.current = null;
  }

  useEffect(() => clearTimers, []);

  useEffect(() => {
    roundsRef.current = generateSession(config.level, config.seed ?? Date.now());
    answersRef.current = [];
    sessionStartRef.current = performance.now();
    startRound(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finishGame(completed: boolean) {
    clearTimers();
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, answersRef.current, durationMs, completed));
  }

  function startRound(index: number) {
    if (!roundsRef.current[index]) return;
    resolvedRef.current = false;
    roundStartRef.current = performance.now();
    setLastChoice(null);
    setBarKey((k) => k + 1);

    timeoutRef.current = window.setTimeout(() => {
      resolveChoice(index, null);
    }, params.secondsPerRound * 1000);
  }

  function resolveChoice(index: number, choice: Choice | null) {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;

    const round = roundsRef.current[index];
    if (!round) return;

    const correct = choice !== null && isCorrectChoice(round, choice);
    const responseMs =
      choice !== null ? Math.round(performance.now() - roundStartRef.current) : null;
    answersRef.current[index] = { correct, responseMs };
    setLastChoice(choice);
    setLastCorrect(correct);
    setPhase('feedback');

    feedbackTimeoutRef.current = window.setTimeout(() => {
      const nextIndex = index + 1;
      if (nextIndex >= roundsRef.current.length) {
        finishGame(true);
      } else {
        setRoundIndex(nextIndex);
        setPhase('question');
        startRound(nextIndex);
      }
    }, FEEDBACK_DURATION_MS);
  }

  function handleChoice(choice: Choice) {
    if (phase !== 'question') return;
    resolveChoice(roundIndex, choice);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      handleChoice('left');
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      handleChoice('right');
    }
  }

  const round = roundsRef.current[roundIndex];

  return (
    <div
      className="flex min-h-[70vh] flex-col items-center gap-8 p-6 focus:outline-none"
      role="group"
      aria-label="Elegí la expresión de mayor valor"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-sm">
        <div className="mb-2 flex justify-between text-sm text-text-secondary">
          <span>
            Ronda {roundIndex + 1} / {params.roundCount}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
          {phase === 'question' && (
            <div
              key={barKey}
              className="h-full rounded-full bg-accent-primary"
              style={{ animation: `shrink-width ${params.secondsPerRound}s linear forwards` }}
            />
          )}
        </div>
      </div>

      {round && (
        <div className="grid w-full max-w-sm grid-cols-2 gap-3">
          {(['left', 'right'] as const).map((side) => {
            const expr = round[side];
            const isChosen = phase === 'feedback' && lastChoice === side;
            const stateClass =
              phase === 'feedback' && isChosen
                ? lastCorrect
                  ? 'border-accent-success bg-accent-success/20'
                  : 'border-accent-error bg-accent-error/20'
                : 'border-surface-alt bg-surface';
            return (
              <button
                key={side}
                type="button"
                disabled={phase !== 'question'}
                onClick={() => handleChoice(side)}
                className={`flex min-h-[7rem] items-center justify-center rounded-lg border px-2 text-center font-display text-lg font-bold text-text-primary transition-colors ${stateClass}`}
              >
                {expr.label}
              </button>
            );
          })}
        </div>
      )}

      {phase === 'feedback' && (
        <p
          className={`font-display text-sm font-semibold ${
            lastCorrect ? 'text-accent-success' : 'text-accent-error'
          }`}
        >
          {lastCorrect ? '¡Correcto!' : 'Incorrecto'}
        </p>
      )}
    </div>
  );
}
