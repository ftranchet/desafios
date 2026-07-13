import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PROGRESSIVE_STAGES } from '../../core/modes';
import { PressButton, useAutoFocus } from '../../core/ui';
import {
  advanceRound,
  buildResult,
  createInitialState,
  currentRound,
  isValidWord,
  keyboardLetterStates,
  submitGuess,
  type GameState,
  type LetterState,
} from './logic';

// Interfaz de "Palabra del día". El teclado en pantalla evita el teclado del
// sistema (PRD 10.7.3): nunca tapa el tablero ni aparece y desaparece entre
// intentos. El estado de cada letra (acertada/presente/ausente) nunca
// depende solo del color (RNF-05): cada ficha también lleva un símbolo.

const KEYBOARD_ROWS = ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'];

function tileClass(state: LetterState | undefined): string {
  if (state === 'correct') return 'border-accent-success bg-accent-success text-bg';
  if (state === 'present') return 'border-game-1 bg-game-1 text-bg';
  if (state === 'absent') return 'border-surface-alt bg-surface-alt text-text-secondary';
  return 'border-surface-alt bg-surface text-text-primary';
}

function tileSymbol(state: LetterState | undefined): string | null {
  if (state === 'correct') return '✓';
  if (state === 'present') return '○';
  return null;
}

function keyClass(letter: string, states: Record<string, LetterState>): string {
  const state = states[letter];
  if (state === 'correct') return 'bg-accent-success text-bg';
  if (state === 'present') return 'bg-game-1 text-bg';
  if (state === 'absent') return 'bg-surface-alt text-text-secondary opacity-50';
  return 'bg-surface text-text-primary';
}

export function WordOfTheDayGame({ config, onFinish, audio }: GameProps) {
  const containerRef = useAutoFocus<HTMLDivElement>();
  const sessionStartRef = useRef(performance.now());
  const errorTimeoutRef = useRef<number | null>(null);
  const [state, setState] = useState<GameState>(() =>
    createInitialState(config.mode, config.seed ?? Date.now()),
  );
  const [guess, setGuess] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (errorTimeoutRef.current !== null) window.clearTimeout(errorTimeoutRef.current);
    },
    [],
  );

  const round = currentRound(state);
  const wordLength = round?.wordLength ?? 0;
  const showRoundCount = state.rounds.length > 1 && config.mode !== 'progressive';
  const keyStates = keyboardLetterStates(state.attempts);

  function clearError() {
    if (errorTimeoutRef.current !== null) window.clearTimeout(errorTimeoutRef.current);
    setErrorMessage(null);
  }

  function flashError(message: string) {
    clearError();
    setErrorMessage(message);
    errorTimeoutRef.current = window.setTimeout(() => setErrorMessage(null), 1500);
  }

  function finishGame(finalState: GameState) {
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, finalState, durationMs));
  }

  function appendLetter(letter: string) {
    if (state.roundOver || guess.length >= wordLength) return;
    clearError();
    setGuess((g) => g + letter);
  }

  function deleteLetter() {
    if (state.roundOver) return;
    clearError();
    setGuess((g) => g.slice(0, -1));
  }

  function submit() {
    if (state.roundOver || !round) return;
    if (guess.length !== wordLength) {
      flashError('Te faltan letras');
      return;
    }
    if (!isValidWord(guess, round.wordLength)) {
      flashError('No es una palabra válida');
      return;
    }
    const next = submitGuess(state, guess);
    if (next.roundOver) audio?.play(next.roundWon ? 'success' : 'error');
    else audio?.tone(320, 60);
    setState(next);
    setGuess('');
  }

  function continueSession() {
    if (state.gameOver) {
      finishGame(state);
      return;
    }
    setState(advanceRound(state));
    setGuess('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (state.roundOver) {
      if (event.key === 'Enter') {
        event.preventDefault();
        continueSession();
      }
      return;
    }
    if (/^[a-zA-Z]$/.test(event.key)) {
      event.preventDefault();
      appendLetter(event.key.toUpperCase());
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      deleteLetter();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  }

  if (!round) return null;

  return (
    <div
      ref={containerRef}
      className="flex min-h-[70vh] flex-col items-center gap-3 p-6 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-xs text-center text-sm text-text-secondary">
        {showRoundCount && `Palabra ${state.roundIndex + 1}/${state.rounds.length} · `}
        {config.mode === 'progressive' && `Grado ${round.stage}/${PROGRESSIVE_STAGES} · `}
        Intento {Math.min(state.attempts.length + 1, round.maxGuesses)}/{round.maxGuesses}
      </div>

      {/* El mensaje de error ocupa siempre el mismo lugar (PRD 10.7.12). */}
      <p aria-live="polite" className="min-h-[1.25rem] text-sm font-semibold text-accent-error">
        {errorMessage}
      </p>

      <div className="flex flex-col gap-1.5">
        {Array.from({ length: round.maxGuesses }, (_, rowIndex) => {
          const attempt = state.attempts[rowIndex];
          const isCurrentRow = rowIndex === state.attempts.length && !state.roundOver;
          return (
            <div key={rowIndex} className="flex justify-center gap-1.5">
              {Array.from({ length: wordLength }, (_, colIndex) => {
                const letter = attempt
                  ? attempt.guess[colIndex]
                  : isCurrentRow
                    ? guess[colIndex]
                    : undefined;
                const feedback = attempt?.feedback[colIndex];
                const active = isCurrentRow && !!letter;
                return (
                  <div
                    key={colIndex}
                    className={`relative flex h-11 w-11 items-center justify-center rounded-md border font-display text-lg font-bold ${
                      attempt
                        ? tileClass(feedback)
                        : active
                          ? 'border-accent-primary/60 bg-surface text-text-primary'
                          : errorMessage && isCurrentRow
                            ? 'border-accent-error bg-surface text-text-primary'
                            : 'border-surface-alt bg-surface text-text-primary'
                    }`}
                  >
                    {letter ?? ''}
                    {attempt && tileSymbol(feedback) && (
                      <span className="absolute bottom-0.5 right-0.5 text-[0.5rem] leading-none opacity-80">
                        {tileSymbol(feedback)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {state.roundOver ? (
        <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-lg border border-surface-alt bg-surface p-4 text-center">
          <p
            className={`font-display text-lg font-extrabold ${
              state.roundWon ? 'text-accent-success' : 'text-accent-error'
            }`}
          >
            {state.roundWon ? '¡La adivinaste!' : 'Se acabaron los intentos'}
          </p>
          {!state.roundWon && (
            <p className="text-sm text-text-secondary">La palabra era {round.word}.</p>
          )}
          <PressButton variant="primary" onPress={continueSession} className="px-8">
            {state.gameOver ? 'Ver resultado' : 'Siguiente palabra'}
          </PressButton>
        </div>
      ) : (
        <div className="flex w-full max-w-xs flex-col gap-1.5">
          {KEYBOARD_ROWS.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-1">
              {rowIndex === 2 && (
                <PressButton
                  variant="bare"
                  ariaLabel="Confirmar palabra"
                  onPress={submit}
                  className="min-h-touch flex-[1.6] rounded-md bg-surface font-display text-xs font-bold text-text-primary"
                >
                  Enter
                </PressButton>
              )}
              {row.split('').map((letter) => (
                <PressButton
                  key={letter}
                  variant="bare"
                  onPress={() => appendLetter(letter)}
                  className={`min-h-touch flex-1 rounded-md font-display text-sm font-bold transition-colors ${keyClass(letter, keyStates)}`}
                >
                  {letter}
                </PressButton>
              ))}
              {rowIndex === 2 && (
                <PressButton
                  variant="bare"
                  ariaLabel="Borrar última letra"
                  onPress={deleteLetter}
                  className="min-h-touch flex-[1.6] rounded-md bg-surface font-display text-sm font-bold text-text-primary"
                >
                  ⌫
                </PressButton>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
