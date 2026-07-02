import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { GameProps } from '../../core/contract';
import {
  buildResult,
  generateSession,
  getLevelParams,
  type AnswerRecord,
  type SequenceQuestion,
} from './logic';

const FEEDBACK_DURATION_MS = 700;

type Phase = 'question' | 'feedback';

export function NumberSequencesGame({ config, onFinish }: GameProps) {
  const params = getLevelParams(config.level);

  const questionsRef = useRef<SequenceQuestion[]>([]);
  const answersRef = useRef<AnswerRecord[]>([]);
  const sessionStartRef = useRef(0);
  const questionStartRef = useRef(0);
  const resolvedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>('question');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
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
    questionsRef.current = generateSession(config.level, config.seed ?? Date.now());
    answersRef.current = [];
    sessionStartRef.current = performance.now();
    startQuestion(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === 'question') inputRef.current?.focus();
  }, [phase, questionIndex]);

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
    setBarKey((k) => k + 1);

    timeoutRef.current = window.setTimeout(() => {
      resolveAnswer(index, null);
    }, params.secondsPerQuestion * 1000);
  }

  function resolveAnswer(index: number, submitted: number | null) {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;

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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (phase !== 'question' || inputValue === '') return;
    resolveAnswer(questionIndex, Number(inputValue));
  }

  const question = questionsRef.current[questionIndex];

  return (
    <div className="flex min-h-[70vh] flex-col items-center gap-8 p-6">
      <div className="w-full max-w-xs">
        <div className="mb-2 flex justify-between text-sm text-text-secondary">
          <span>
            Pregunta {questionIndex + 1} / {params.questionCount}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
          {phase === 'question' && (
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

      {question && phase === 'question' && (
        <>
          <p className="max-w-xs text-center font-display text-lg font-extrabold text-text-primary">
            {question.terms.join(', ')}, ?
          </p>
          <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="-?[0-9]*"
              autoComplete="off"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.replace(/(?!^-)[^0-9]/g, ''))}
              className="min-h-touch rounded-lg border border-surface-alt bg-surface px-4 text-center font-display text-xl font-bold text-text-primary focus:border-accent-primary focus:outline-none"
              aria-label="Tu respuesta"
            />
            <button
              type="submit"
              disabled={inputValue === '' || inputValue === '-'}
              className="min-h-touch rounded-lg bg-accent-primary px-4 font-display text-base font-bold text-bg disabled:opacity-40"
            >
              Responder
            </button>
          </form>
        </>
      )}

      {question && phase === 'feedback' && (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="max-w-xs font-display text-lg font-extrabold text-text-primary">
            {question.terms.join(', ')}, {question.answer}
          </p>
          <p
            className={`font-display text-sm font-semibold ${
              lastCorrect ? 'text-accent-success' : 'text-accent-error'
            }`}
          >
            {lastCorrect ? '¡Correcto!' : 'Incorrecto'}
          </p>
        </div>
      )}
    </div>
  );
}
