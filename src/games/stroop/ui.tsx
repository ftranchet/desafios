import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PROGRESSIVE_STAGES } from '../../core/modes';
import { CountdownBar, PressButton, useAutoFocus, useSecondsLeft } from '../../core/ui';
import {
  buildResult,
  COLOR_NAMES,
  generateSession,
  type AnswerRecord,
  type ColorName,
  type Question,
} from './logic';

// Interfaz de "Nombra el color". Tocá el botón de la tinta real en la que
// está pintada la palabra, no lo que dice. Nota RNF-05 (ver logic.ts): el
// color es el contenido a evaluar por naturaleza del juego, pero cada botón
// de respuesta siempre muestra además el nombre del color en texto.

const FEEDBACK_DURATION_MS = 700;

const COLOR_META: Record<ColorName, { label: string; textClass: string; swatchClass: string }> = {
  amarillo: { label: 'Amarillo', textClass: 'text-game-1', swatchClass: 'border-game-1 bg-game-1/20' },
  violeta: { label: 'Violeta', textClass: 'text-game-2', swatchClass: 'border-game-2 bg-game-2/20' },
  naranja: { label: 'Naranja', textClass: 'text-game-3', swatchClass: 'border-game-3 bg-game-3/20' },
  celeste: { label: 'Celeste', textClass: 'text-game-4', swatchClass: 'border-game-4 bg-game-4/20' },
};

const KEY_TO_COLOR: Record<string, ColorName> = {
  '1': 'amarillo',
  '2': 'violeta',
  '3': 'naranja',
  '4': 'celeste',
};

type Phase = 'question' | 'feedback';

export function StroopGame({ config, onFinish, audio }: GameProps) {
  // Foco al contenedor: en escritorio se puede responder con 1-4 desde la
  // primera pregunta, sin clic previo (RNF-11).
  const containerRef = useAutoFocus<HTMLDivElement>();
  const answersRef = useRef<AnswerRecord[]>([]);
  const sessionStartRef = useRef(0);
  const questionStartRef = useRef(0);
  const resolvedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const [session, setSession] = useState<Question[]>([]);
  const [phase, setPhase] = useState<Phase>('question');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  const isQuestion = phase === 'question';
  const question = session[questionIndex];
  // Tranquilo: seconds = 0 → sin reloj, sin barra, sin cuenta regresiva.
  const timed = (question?.seconds ?? 0) > 0;
  const secondsLeft = useSecondsLeft(question?.seconds ?? 0, isQuestion && timed, questionIndex);

  function clearTimers() {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
    timeoutRef.current = null;
    feedbackTimeoutRef.current = null;
  }

  useEffect(() => clearTimers, []);

  useEffect(() => {
    const questions = generateSession(config.mode, config.seed ?? Date.now());
    answersRef.current = [];
    sessionStartRef.current = performance.now();
    setSession(questions);
    startQuestion(0, questions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finishGame(questions: Question[], completed: boolean) {
    clearTimers();
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, answersRef.current, questions, durationMs, completed));
  }

  function startQuestion(index: number, questions: Question[]) {
    const q = questions[index];
    if (!q) return;
    resolvedRef.current = false;
    questionStartRef.current = performance.now();

    if (q.seconds > 0) {
      timeoutRef.current = window.setTimeout(() => {
        resolveAnswer(index, null, questions);
      }, q.seconds * 1000);
    }
  }

  function resolveAnswer(index: number, submitted: ColorName | null, questions: Question[]) {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;

    const q = questions[index];
    if (!q) return;

    const correct = submitted !== null && submitted === q.ink;
    const responseMs =
      submitted !== null ? Math.round(performance.now() - questionStartRef.current) : null;
    answersRef.current[index] = { correct, responseMs };
    audio?.play(correct ? 'success' : 'error');
    setLastCorrect(correct);
    setPhase('feedback');

    feedbackTimeoutRef.current = window.setTimeout(() => {
      const nextIndex = index + 1;
      if (nextIndex >= questions.length) {
        finishGame(questions, true);
      } else {
        setQuestionIndex(nextIndex);
        setPhase('question');
        startQuestion(nextIndex, questions);
      }
    }, FEEDBACK_DURATION_MS);
  }

  function answer(color: ColorName) {
    if (phase !== 'question') return;
    resolveAnswer(questionIndex, color, session);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const color = KEY_TO_COLOR[event.key];
    if (color) {
      event.preventDefault();
      answer(color);
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex min-h-[70vh] flex-col items-center gap-5 p-6 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-xs">
        <div className="mb-2 flex justify-between text-sm text-text-secondary">
          <span>
            Pregunta {questionIndex + 1} / {session.length}
            {config.mode === 'progressive' &&
              question &&
              ` · Grado ${question.stage}/${PROGRESSIVE_STAGES}`}
          </span>
          {timed && (
            <span aria-label={`${secondsLeft} segundos restantes`}>
              {isQuestion ? `${secondsLeft} s` : ''}
            </span>
          )}
        </div>
        {timed && (
          <CountdownBar
            durationMs={(question?.seconds ?? 0) * 1000}
            running={isQuestion}
            resetKey={questionIndex}
          />
        )}
      </div>

      {question && (
        <>
          <div className="flex min-h-[4rem] w-full max-w-xs items-center justify-center rounded-lg border border-surface-alt bg-surface">
            <p className={`font-display text-3xl font-extrabold ${COLOR_META[question.ink].textClass}`}>
              {COLOR_META[question.word].label.toUpperCase()}
            </p>
          </div>

          <p
            aria-live="polite"
            className={`min-h-[1.25rem] font-display text-sm font-semibold ${
              lastCorrect ? 'text-accent-success' : 'text-accent-error'
            }`}
          >
            {!isQuestion &&
              (lastCorrect ? '¡Correcto!' : `Incorrecto (era ${COLOR_META[question.ink].label})`)}
          </p>

          <div className="grid w-full max-w-xs grid-cols-2 gap-2" role="group" aria-label="Colores">
            {COLOR_NAMES.map((color) => (
              <PressButton
                key={color}
                variant="bare"
                disabled={!isQuestion}
                onPress={() => answer(color)}
                ariaLabel={`Tinta ${COLOR_META[color].label}`}
                className={`min-h-touch rounded-lg border-2 font-display text-base font-bold text-text-primary transition-colors disabled:opacity-40 ${COLOR_META[color].swatchClass}`}
              >
                {COLOR_META[color].label}
              </PressButton>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
