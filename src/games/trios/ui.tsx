import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../core/contract';
import { PROGRESSIVE_STAGES } from '../../core/modes';
import { CountdownBar, GameLayout, PressButton, useAutoFocus, useSecondsLeft } from '../../core/ui';
import {
  buildResult,
  generateSession,
  isValidTrio,
  type AnswerRecord,
  type AttrValue,
  type Card,
  type Question,
} from './logic';

// Interfaz de "Tríos". Tocá 3 cartas: si forman un trío válido, avanza al
// próximo tablero; si no, un breve aviso y podés volver a intentar en el
// mismo tablero (no hay "perder" por un intento fallido, solo cuenta como un
// error). Ver logic.ts para la nota sobre RNF-05: de los 4 atributos, 3
// nunca dependen del color.

const FEEDBACK_DURATION_MS = 700;

const SHAPE_LABELS = ['círculo', 'cuadrado', 'triángulo'];
const FILL_LABELS = ['sólido', 'hueco', 'rayado'];
const COLOR_META: { label: string; swatchClass: string }[] = [
  { label: 'Amarillo', swatchClass: 'fill-game-1 stroke-game-1' },
  { label: 'Violeta', swatchClass: 'fill-game-2 stroke-game-2' },
  { label: 'Celeste', swatchClass: 'fill-game-4 stroke-game-4' },
];
const FILL_OPACITY = [1, 0, 0.4];

function pluralize(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}

function cardAriaLabel(card: Card, index: number): string {
  return `Carta ${index + 1}: ${card.count} ${pluralize(SHAPE_LABELS[card.shape]!, card.count)} color ${COLOR_META[card.color]!.label}, ${pluralize(FILL_LABELS[card.fill]!, card.count)}`;
}

function ShapeIcon({
  shape,
  fill,
  colorClass,
}: {
  shape: AttrValue;
  fill: AttrValue;
  colorClass: string;
}) {
  const style = { fillOpacity: FILL_OPACITY[fill] };
  if (shape === 0)
    return <circle cx="12" cy="12" r="8" strokeWidth={2} style={style} className={colorClass} />;
  if (shape === 1) {
    return (
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="3"
        strokeWidth={2}
        style={style}
        className={colorClass}
      />
    );
  }
  return <polygon points="12,3 21,20 3,20" strokeWidth={2} style={style} className={colorClass} />;
}

type Phase = 'question' | 'feedback';

export function TriosGame({ config, onFinish, audio }: GameProps) {
  const containerRef = useAutoFocus<HTMLDivElement>();
  const answersRef = useRef<AnswerRecord[]>([]);
  const sessionStartRef = useRef(0);
  const questionStartRef = useRef(0);
  const resolvedRef = useRef(false);
  const mistakesRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const [session, setSession] = useState<Question[]>([]);
  const [phase, setPhase] = useState<Phase>('question');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
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

  function advance(index: number, questions: Question[]) {
    const nextIndex = index + 1;
    if (nextIndex >= questions.length) {
      finishGame(questions, true);
      return;
    }
    setQuestionIndex(nextIndex);
    setPhase('question');
    startQuestion(nextIndex, questions);
  }

  function startQuestion(index: number, questions: Question[]) {
    const q = questions[index];
    if (!q) return;
    resolvedRef.current = false;
    mistakesRef.current = 0;
    questionStartRef.current = performance.now();
    setSelected([]);
    setLastCorrect(null);

    if (q.seconds > 0) {
      timeoutRef.current = window.setTimeout(() => {
        if (resolvedRef.current) return;
        resolvedRef.current = true;
        answersRef.current[index] = {
          correct: false,
          responseMs: null,
          mistakes: mistakesRef.current,
        };
        audio?.play('error');
        advance(index, questions);
      }, q.seconds * 1000);
    }
  }

  function handleCardTap(cardIndex: number) {
    if (phase !== 'question' || !question) return;
    if (selected.includes(cardIndex)) {
      setSelected((s) => s.filter((i) => i !== cardIndex));
      return;
    }
    if (selected.length >= 3) return;
    const next = [...selected, cardIndex];
    setSelected(next);
    if (next.length === 3) evaluateSelection(next);
  }

  function evaluateSelection(indices: number[]) {
    if (!question || resolvedRef.current) return;
    const [a, b, c] = indices.map((i) => question.board[i]!) as [Card, Card, Card];
    const valid = isValidTrio(a, b, c);

    if (valid) {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      resolvedRef.current = true;
      const responseMs = Math.round(performance.now() - questionStartRef.current);
      answersRef.current[questionIndex] = {
        correct: true,
        responseMs,
        mistakes: mistakesRef.current,
      };
      audio?.play('success');
      setLastCorrect(true);
      setPhase('feedback');
      feedbackTimeoutRef.current = window.setTimeout(() => {
        advance(questionIndex, session);
      }, FEEDBACK_DURATION_MS);
    } else {
      mistakesRef.current += 1;
      audio?.play('error');
      setLastCorrect(false);
      setPhase('feedback');
      feedbackTimeoutRef.current = window.setTimeout(() => {
        setSelected([]);
        setLastCorrect(null);
        setPhase('question');
      }, FEEDBACK_DURATION_MS);
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex min-h-[70dvh] flex-col items-center gap-4 p-6 focus:outline-none"
      tabIndex={0}
    >
      <GameLayout
        hud={
          <div className="w-full">
            <div className="mb-2 flex justify-between text-sm text-text-secondary">
              <span>
                Tablero {questionIndex + 1} / {session.length}
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
            <p
              aria-live="polite"
              className={`min-h-[1.25rem] font-display text-sm font-semibold ${
                lastCorrect === false ? 'text-accent-error' : 'text-accent-success'
              }`}
            >
              {phase === 'feedback' && (lastCorrect ? '¡Trío correcto!' : 'No es un trío válido')}
            </p>
          </div>
        }
        board={
          question && (
            <div
              className="grid w-full max-w-sm grid-cols-3 gap-2"
              role="group"
              aria-label="Tablero de cartas"
            >
              {question.board.map((card, index) => (
                <PressButton
                  key={index}
                  variant="bare"
                  disabled={phase !== 'question'}
                  onPress={() => handleCardTap(index)}
                  ariaLabel={cardAriaLabel(card, index)}
                  className={`flex min-h-touch items-center justify-center gap-1 rounded-lg border-2 p-2 transition-colors ${
                    selected.includes(index)
                      ? 'border-accent-primary bg-accent-primary/10'
                      : 'border-surface-alt bg-surface'
                  }`}
                >
                  {Array.from({ length: card.count }, (_, i) => (
                    <svg key={i} viewBox="0 0 24 24" className="h-5 w-5">
                      <ShapeIcon
                        shape={card.shape}
                        fill={card.fill}
                        colorClass={COLOR_META[card.color]!.swatchClass}
                      />
                    </svg>
                  ))}
                </PressButton>
              ))}
            </div>
          )
        }
      />
    </div>
  );
}
