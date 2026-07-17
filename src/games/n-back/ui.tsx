import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PROGRESSIVE_STAGES } from '../../core/modes';
import { CountdownBar, PressButton, useAutoFocus, useSecondsLeft } from '../../core/ui';
import { buildResult, generateSession, type AnswerRecord, type Trial } from './logic';

const SYMBOLS = ['●', '■', '▲', '◆', '★', '✚'];
const SYMBOL_NAMES = ['círculo', 'cuadrado', 'triángulo', 'rombo', 'estrella', 'cruz'];
const FEEDBACK_DURATION_MS = 500;
const WARMUP_DURATION_MS = 1200;

type Phase = 'question' | 'feedback';

export function NBackGame({ config, onFinish, audio }: GameProps) {
  // Foco al contenedor: en escritorio se puede responder con F/J desde el
  // primer símbolo, sin clic previo (RNF-11).
  const containerRef = useAutoFocus<HTMLDivElement>();
  const answersRef = useRef<AnswerRecord[]>([]);
  const sessionStartRef = useRef(0);
  const trialStartRef = useRef(0);
  const resolvedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const [session, setSession] = useState<Trial[]>([]);
  const [phase, setPhase] = useState<Phase>('question');
  const [trialIndex, setTrialIndex] = useState(0);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  const trial = session[trialIndex];
  const isWarmup = trial?.requiresResponse === false;
  const isQuestion = phase === 'question' && !isWarmup;
  // Tranquilo: seconds = 0 → sin reloj, sin barra, sin cuenta regresiva.
  const timed = trial?.requiresResponse === true && trial.seconds > 0;
  const secondsLeft = useSecondsLeft(trial?.seconds ?? 0, isQuestion && timed, trialIndex);

  function clearTimers() {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
    timeoutRef.current = null;
    feedbackTimeoutRef.current = null;
  }

  useEffect(() => clearTimers, []);

  useEffect(() => {
    const trials = generateSession(config.mode, config.seed ?? Date.now());
    answersRef.current = [];
    sessionStartRef.current = performance.now();
    setSession(trials);
    startTrial(0, trials);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finishGame(trials: Trial[], completed: boolean) {
    clearTimers();
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, answersRef.current, trials, durationMs, completed));
  }

  function startTrial(index: number, trials: Trial[]) {
    const t = trials[index];
    if (!t) return;
    resolvedRef.current = false;
    trialStartRef.current = performance.now();
    setLastCorrect(null);

    if (!t.requiresResponse) {
      // Las primeras N muestras construyen el contexto: todavía no existe un
      // símbolo N lugares atrás y pedir “No coincide” sería una respuesta
      // trivial. Se muestran y avanzan solas, también en Tranquilo.
      answersRef.current[index] = { correct: true, responseMs: null };
      timeoutRef.current = window.setTimeout(() => advanceTrial(index, trials), WARMUP_DURATION_MS);
    } else if (t.seconds > 0) {
      timeoutRef.current = window.setTimeout(() => {
        resolveAnswer(index, null, trials);
      }, t.seconds * 1000);
    }
  }

  function advanceTrial(index: number, trials: Trial[]) {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    const nextIndex = index + 1;
    if (nextIndex >= trials.length) {
      finishGame(trials, true);
      return;
    }
    setTrialIndex(nextIndex);
    setPhase('question');
    startTrial(nextIndex, trials);
  }

  function resolveAnswer(index: number, submitted: boolean | null, trials: Trial[]) {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;

    const t = trials[index];
    if (!t) return;

    const correct = submitted !== null && submitted === t.isMatch;
    const responseMs = submitted !== null ? Math.round(performance.now() - trialStartRef.current) : null;
    answersRef.current[index] = { correct, responseMs };
    audio?.play(correct ? 'success' : 'error');
    setLastCorrect(correct);
    setPhase('feedback');

    feedbackTimeoutRef.current = window.setTimeout(() => {
      advanceTrial(index, trials);
    }, FEEDBACK_DURATION_MS);
  }

  function answer(isMatch: boolean) {
    if (phase !== 'question' || !trial?.requiresResponse) return;
    resolveAnswer(trialIndex, isMatch, session);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      answer(true);
    } else if (event.key === 'j' || event.key === 'J') {
      event.preventDefault();
      answer(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex min-h-[70dvh] flex-col items-center gap-5 p-6 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-xs">
        <div className="mb-2 flex justify-between text-sm text-text-secondary">
          <span>
            Símbolo {trialIndex + 1} / {session.length}
            {config.mode === 'progressive' &&
              trial &&
              ` · Grado ${trial.stage}/${PROGRESSIVE_STAGES}`}
          </span>
          {timed && (
            <span aria-label={`${secondsLeft} segundos restantes`}>
              {isQuestion ? `${secondsLeft} s` : ''}
            </span>
          )}
        </div>
        {timed && (
          <CountdownBar
            durationMs={(trial?.seconds ?? 0) * 1000}
            running={isQuestion}
            resetKey={trialIndex}
          />
        )}
      </div>

      {trial && (
        <>
          {isWarmup ? (
            <p className="text-center text-sm font-semibold text-accent-primary">
              Memorizá este símbolo. La comparación empieza después de {trial.n}{' '}
              {trial.n === 1 ? 'muestra' : 'muestras'}.
            </p>
          ) : (
            <p className="text-center text-sm text-text-secondary">
              ¿Coincide con el símbolo de hace {trial.n} {trial.n === 1 ? 'lugar' : 'lugares'}?
            </p>
          )}

          <div
            className="flex h-24 w-24 items-center justify-center rounded-lg border border-surface-alt bg-surface"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="sr-only">
              Muestra {trialIndex + 1}. {isWarmup ? 'Memorizá. ' : ''}Símbolo actual:{' '}
              {SYMBOL_NAMES[trial.symbol]}.{' '}
              {!isWarmup &&
                `Indicá si coincide con el símbolo de hace ${trial.n} ${
                  trial.n === 1 ? 'lugar' : 'lugares'
                }.`}
            </span>
            <span aria-hidden="true" className="font-display text-5xl text-text-primary">
              {SYMBOLS[trial.symbol]}
            </span>
          </div>

          <p
            aria-live="polite"
            className={`min-h-[1.25rem] font-display text-sm font-semibold ${
              lastCorrect ? 'text-accent-success' : 'text-accent-error'
            }`}
          >
            {phase === 'feedback' &&
              lastCorrect !== null &&
              (lastCorrect ? '¡Correcto!' : 'Incorrecto')}
          </p>

          {!isWarmup && (
            <div className="grid w-full max-w-xs grid-cols-2 gap-3">
              <PressButton
                variant="control"
                disabled={!isQuestion}
                onPress={() => answer(true)}
                ariaLabel="Coincide con el símbolo de antes"
              >
                Coincide
              </PressButton>
              <PressButton
                variant="control"
                disabled={!isQuestion}
                onPress={() => answer(false)}
                ariaLabel="No coincide"
              >
                No coincide
              </PressButton>
            </div>
          )}
        </>
      )}
    </div>
  );
}
