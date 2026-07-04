import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PROGRESSIVE_STAGES } from '../../core/modes';
import { CountdownBar, PressButton, useAutoFocus, useSecondsLeft } from '../../core/ui';
import {
  buildResult,
  generateSession,
  type AnswerRecord,
  type Operation,
  type Question,
} from './logic';

const FEEDBACK_DURATION_MS = 700;
const MAX_INPUT_LENGTH = 6;

const OP_SYMBOL: Record<Operation, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

type Phase = 'question' | 'feedback';

const DIGIT_ROWS = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];

export function QuickMathGame({ config, onFinish, audio }: GameProps) {
  // Foco al contenedor: en escritorio se puede tipear la respuesta con el
  // teclado físico desde la primera pregunta, sin clic previo (RNF-11).
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
  const [inputValue, setInputValue] = useState('');
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
    setInputValue('');

    if (q.seconds > 0) {
      timeoutRef.current = window.setTimeout(() => {
        resolveAnswer(index, null, questions);
      }, q.seconds * 1000);
    }
  }

  function resolveAnswer(index: number, submitted: number | null, questions: Question[]) {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;

    const q = questions[index];
    if (!q) return;

    const correct = submitted !== null && submitted === q.answer;
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

  function appendDigit(digit: string) {
    if (phase !== 'question') return;
    setInputValue((v) => (v.length >= MAX_INPUT_LENGTH ? v : v + digit));
  }

  function deleteDigit() {
    if (phase !== 'question') return;
    setInputValue((v) => v.slice(0, -1));
  }

  function submit() {
    if (phase !== 'question' || inputValue === '') return;
    resolveAnswer(questionIndex, Number(inputValue), session);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      appendDigit(event.key);
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      deleteDigit();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      submit();
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

      {/* La pregunta, el resultado y el keypad ocupan siempre el mismo lugar:
          entre pregunta y feedback no salta el layout ni aparece y desaparece
          el teclado del sistema (no se usa ningún <input>). */}
      {question && (
        <>
          <p className="font-display text-xl font-extrabold text-text-primary">
            {question.a} {OP_SYMBOL[question.op]} {question.b}
            {!isQuestion && ` = ${question.answer}`}
          </p>

          <p
            aria-live="polite"
            className={`min-h-[1.25rem] font-display text-sm font-semibold ${
              lastCorrect ? 'text-accent-success' : 'text-accent-error'
            }`}
          >
            {!isQuestion && (lastCorrect ? '¡Correcto!' : 'Incorrecto')}
          </p>

          <div
            aria-label="Tu respuesta"
            className={`flex min-h-touch w-full max-w-xs items-center justify-center rounded-lg border bg-surface px-4 font-display text-xl font-bold text-text-primary ${
              isQuestion ? 'border-accent-primary/60' : 'border-surface-alt'
            }`}
          >
            {inputValue}
          </div>

          <div className="grid w-full max-w-xs grid-cols-3 gap-2">
            {DIGIT_ROWS.map((digit) => (
              <PressButton
                key={digit}
                variant="key"
                disabled={!isQuestion}
                onPress={() => appendDigit(digit)}
              >
                {digit}
              </PressButton>
            ))}
            <PressButton
              variant="key"
              ariaLabel="Borrar último dígito"
              disabled={!isQuestion}
              onPress={deleteDigit}
            >
              ⌫
            </PressButton>
            <PressButton variant="key" disabled={!isQuestion} onPress={() => appendDigit('0')}>
              0
            </PressButton>
            <PressButton
              variant="primary"
              ariaLabel="Responder"
              disabled={!isQuestion || inputValue === ''}
              onPress={submit}
            >
              ✓
            </PressButton>
          </div>
        </>
      )}
    </div>
  );
}
