import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { CountdownBar, PressButton, useAutoFocus, useSecondsLeft } from '../../core/ui';
import {
  buildResult,
  generateSession,
  getModeParams,
  isCorrectChoice,
  type AnswerRecord,
  type Round,
} from './logic';

const FEEDBACK_DURATION_MS = 500;

type Phase = 'question' | 'feedback';
type Choice = 'left' | 'right';

export function QuickEstimateGame({ config, onFinish, audio }: GameProps) {
  const params = getModeParams(config.mode);

  // Foco al contenedor: las flechas ← → eligen desde la primera ronda sin
  // exigir un clic previo (RNF-11).
  const containerRef = useAutoFocus<HTMLDivElement>();
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

  const isQuestion = phase === 'question';
  const secondsLeft = useSecondsLeft(params.secondsPerRound, isQuestion, roundIndex);

  function clearTimers() {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
    timeoutRef.current = null;
    feedbackTimeoutRef.current = null;
  }

  useEffect(() => clearTimers, []);

  useEffect(() => {
    roundsRef.current = generateSession(config.mode, config.seed ?? Date.now());
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
    audio?.play(correct ? 'success' : 'error');
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
      ref={containerRef}
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
          <span aria-label={`${secondsLeft} segundos restantes`}>
            {isQuestion ? `${secondsLeft} s` : ''}
          </span>
        </div>
        <CountdownBar
          durationMs={params.secondsPerRound * 1000}
          running={isQuestion}
          resetKey={roundIndex}
        />
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
              <PressButton
                key={side}
                variant="bare"
                disabled={phase !== 'question'}
                onPress={() => handleChoice(side)}
                className={`flex min-h-[7rem] items-center justify-center rounded-lg border px-2 text-center font-display text-lg font-bold text-text-primary transition-colors ${stateClass}`}
              >
                {expr.label}
              </PressButton>
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
