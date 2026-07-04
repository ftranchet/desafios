import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PROGRESSIVE_STAGES } from '../../core/modes';
import { CountdownBar, PressButton, useAutoFocus, useSecondsLeft } from '../../core/ui';
import {
  buildResult,
  generateSession,
  isCorrectChoice,
  type AnswerRecord,
  type Round,
} from './logic';

const FEEDBACK_DURATION_MS = 500;

type Phase = 'question' | 'feedback';
type Choice = 'left' | 'right';

export function QuickEstimateGame({ config, onFinish, audio }: GameProps) {
  // Foco al contenedor: las flechas ← → eligen desde la primera ronda sin
  // exigir un clic previo (RNF-11).
  const containerRef = useAutoFocus<HTMLDivElement>();
  const answersRef = useRef<AnswerRecord[]>([]);
  const sessionStartRef = useRef(0);
  const roundStartRef = useRef(0);
  const resolvedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const [session, setSession] = useState<Round[]>([]);
  const [phase, setPhase] = useState<Phase>('question');
  const [roundIndex, setRoundIndex] = useState(0);
  const [lastChoice, setLastChoice] = useState<Choice | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  const isQuestion = phase === 'question';
  const round = session[roundIndex];
  // Tranquilo: seconds = 0 → sin reloj, sin barra, sin cuenta regresiva.
  const timed = (round?.seconds ?? 0) > 0;
  const secondsLeft = useSecondsLeft(round?.seconds ?? 0, isQuestion && timed, roundIndex);

  function clearTimers() {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
    timeoutRef.current = null;
    feedbackTimeoutRef.current = null;
  }

  useEffect(() => clearTimers, []);

  useEffect(() => {
    const rounds = generateSession(config.mode, config.seed ?? Date.now());
    answersRef.current = [];
    sessionStartRef.current = performance.now();
    setSession(rounds);
    startRound(0, rounds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finishGame(rounds: Round[], completed: boolean) {
    clearTimers();
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, answersRef.current, rounds, durationMs, completed));
  }

  function startRound(index: number, rounds: Round[]) {
    const r = rounds[index];
    if (!r) return;
    resolvedRef.current = false;
    roundStartRef.current = performance.now();
    setLastChoice(null);

    if (r.seconds > 0) {
      timeoutRef.current = window.setTimeout(() => {
        resolveChoice(index, null, rounds);
      }, r.seconds * 1000);
    }
  }

  function resolveChoice(index: number, choice: Choice | null, rounds: Round[]) {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;

    const r = rounds[index];
    if (!r) return;

    const correct = choice !== null && isCorrectChoice(r, choice);
    const responseMs =
      choice !== null ? Math.round(performance.now() - roundStartRef.current) : null;
    answersRef.current[index] = { correct, responseMs };
    audio?.play(correct ? 'success' : 'error');
    setLastChoice(choice);
    setLastCorrect(correct);
    setPhase('feedback');

    feedbackTimeoutRef.current = window.setTimeout(() => {
      const nextIndex = index + 1;
      if (nextIndex >= rounds.length) {
        finishGame(rounds, true);
      } else {
        setRoundIndex(nextIndex);
        setPhase('question');
        startRound(nextIndex, rounds);
      }
    }, FEEDBACK_DURATION_MS);
  }

  function handleChoice(choice: Choice) {
    if (phase !== 'question') return;
    resolveChoice(roundIndex, choice, session);
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
            Ronda {roundIndex + 1} / {session.length}
            {config.mode === 'progressive' &&
              round &&
              ` · Grado ${round.stage}/${PROGRESSIVE_STAGES}`}
          </span>
          {timed && (
            <span aria-label={`${secondsLeft} segundos restantes`}>
              {isQuestion ? `${secondsLeft} s` : ''}
            </span>
          )}
        </div>
        {timed && (
          <CountdownBar
            durationMs={(round?.seconds ?? 0) * 1000}
            running={isQuestion}
            resetKey={roundIndex}
          />
        )}
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
