import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { GameProps } from '../../core/contract';
import {
  buildResult,
  generateSession,
  getLevelParams,
  type AnswerRecord,
  type Operation,
  type Question,
} from './logic';

const FEEDBACK_DURATION_MS = 700;
const MAX_INPUT_LENGTH = 6;
const COUNTDOWN_TICK_MS = 200;

const OP_SYMBOL: Record<Operation, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

type Phase = 'question' | 'feedback';

const DIGIT_ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
];

interface KeyButtonProps {
  label: string;
  ariaLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}

// Tecla del keypad en pantalla: actúa al apoyar el dedo (pointerdown) para
// respuesta inmediata (RNF-03); preventDefault evita robarle el foco al
// contenedor, así el teclado físico sigue funcionando en escritorio.
function KeyButton({
  label,
  ariaLabel,
  onPress,
  disabled = false,
  primary = false,
}: KeyButtonProps) {
  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    onPress();
  }
  const variant = primary
    ? 'bg-accent-primary text-bg'
    : 'border border-surface-alt bg-surface text-text-primary active:bg-surface-alt';
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      onPointerDown={handlePointerDown}
      onClick={(event) => {
        // Solo activación por teclado (Enter/Espacio → click con detail 0).
        if (event.detail === 0) onPress();
      }}
      className={`min-h-touch rounded-lg font-display text-lg font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary disabled:opacity-40 ${variant}`}
    >
      {label}
    </button>
  );
}

export function QuickMathGame({ config, onFinish }: GameProps) {
  const params = getLevelParams(config.level);

  const containerRef = useRef<HTMLDivElement>(null);
  const questionsRef = useRef<Question[]>([]);
  const answersRef = useRef<AnswerRecord[]>([]);
  const sessionStartRef = useRef(0);
  const questionStartRef = useRef(0);
  const resolvedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>('question');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(params.secondsPerQuestion);
  const [barKey, setBarKey] = useState(0);

  function clearTimers() {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
    if (countdownRef.current !== null) window.clearInterval(countdownRef.current);
    timeoutRef.current = null;
    feedbackTimeoutRef.current = null;
    countdownRef.current = null;
  }

  useEffect(() => clearTimers, []);

  useEffect(() => {
    questionsRef.current = generateSession(config.level, config.seed ?? Date.now());
    answersRef.current = [];
    sessionStartRef.current = performance.now();
    // Foco al contenedor: en escritorio se puede tipear la respuesta con el
    // teclado físico desde la primera pregunta, sin clic previo (RNF-11).
    containerRef.current?.focus({ preventScroll: true });
    startQuestion(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finishGame(completed: boolean) {
    clearTimers();
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, answersRef.current, durationMs, completed));
  }

  function startQuestion(index: number) {
    if (!questionsRef.current[index]) return;
    resolvedRef.current = false;
    questionStartRef.current = performance.now();
    setInputValue('');
    setSecondsLeft(params.secondsPerQuestion);
    setBarKey((k) => k + 1);

    timeoutRef.current = window.setTimeout(() => {
      resolveAnswer(index, null);
    }, params.secondsPerQuestion * 1000);
    // Cuenta regresiva numérica: mantiene visible el tiempo restante aun con
    // "reducir animaciones" activo, cuando la barra deja de animarse (RNF-06).
    countdownRef.current = window.setInterval(() => {
      const elapsed = performance.now() - questionStartRef.current;
      setSecondsLeft(Math.max(0, Math.ceil(params.secondsPerQuestion - elapsed / 1000)));
    }, COUNTDOWN_TICK_MS);
  }

  function resolveAnswer(index: number, submitted: number | null) {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    if (countdownRef.current !== null) window.clearInterval(countdownRef.current);
    timeoutRef.current = null;
    countdownRef.current = null;

    const question = questionsRef.current[index];
    if (!question) return;

    const correct = submitted !== null && submitted === question.answer;
    const responseMs =
      submitted !== null ? Math.round(performance.now() - questionStartRef.current) : null;
    answersRef.current[index] = { correct, responseMs };
    setLastCorrect(correct);
    setPhase('feedback');

    feedbackTimeoutRef.current = window.setTimeout(() => {
      const nextIndex = index + 1;
      if (nextIndex >= questionsRef.current.length) {
        finishGame(true);
      } else {
        setQuestionIndex(nextIndex);
        setPhase('question');
        startQuestion(nextIndex);
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
    resolveAnswer(questionIndex, Number(inputValue));
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

  const question = questionsRef.current[questionIndex];
  const isQuestion = phase === 'question';

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
            Pregunta {questionIndex + 1} / {params.questionCount}
          </span>
          <span aria-label={`${secondsLeft} segundos restantes`}>
            {isQuestion ? `${secondsLeft} s` : ''}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
          {isQuestion && (
            <div
              key={barKey}
              className="h-full rounded-full bg-accent-primary"
              style={{
                animation: `shrink-width ${params.secondsPerQuestion}s linear forwards`,
              }}
            />
          )}
        </div>
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
            {DIGIT_ROWS.flat().map((digit) => (
              <KeyButton
                key={digit}
                label={digit}
                disabled={!isQuestion}
                onPress={() => appendDigit(digit)}
              />
            ))}
            <KeyButton
              label="⌫"
              ariaLabel="Borrar último dígito"
              disabled={!isQuestion}
              onPress={deleteDigit}
            />
            <KeyButton label="0" disabled={!isQuestion} onPress={() => appendDigit('0')} />
            <KeyButton
              label="✓"
              ariaLabel="Responder"
              disabled={!isQuestion || inputValue === ''}
              onPress={submit}
              primary
            />
          </div>
        </>
      )}
    </div>
  );
}
