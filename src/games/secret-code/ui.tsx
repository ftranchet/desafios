import { useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PROGRESSIVE_STAGES } from '../../core/modes';
import { PressButton, useAutoFocus } from '../../core/ui';
import {
  advanceRound,
  buildResult,
  createInitialState,
  currentRound,
  submitGuess,
  type GameState,
} from './logic';

// Interfaz de "Código secreto". Aplica los patrones de PRD 10.7: auto-foco
// del contenedor, keypad propio (nunca <input>, RNF-04), acción en
// pointerdown vía PressButton y atajos de teclado (dígitos, Backspace, Enter).

const DIGIT_ROWS = [7, 8, 9, 4, 5, 6, 1, 2, 3];

export function SecretCodeGame({ config, onFinish, audio }: GameProps) {
  const containerRef = useAutoFocus<HTMLDivElement>();
  const sessionStartRef = useRef(performance.now());
  const [state, setState] = useState<GameState>(() =>
    createInitialState(config.mode, config.seed ?? Date.now()),
  );
  const [guess, setGuess] = useState<number[]>([]);

  const round = currentRound(state);
  const codeLength = round?.code.length ?? 0;
  // En Progresivo, ronda y grado son el mismo número: se muestra solo el grado.
  const showRoundCount = state.rounds.length > 1 && config.mode !== 'progressive';
  const attemptNumber = Math.min(state.attempts.length + 1, round?.maxGuesses ?? 1);

  function finishGame(finalState: GameState) {
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, finalState, durationMs));
  }

  function appendDigit(digit: number) {
    if (state.roundOver || guess.length >= codeLength || guess.includes(digit)) return;
    setGuess((g) => [...g, digit]);
  }

  function deleteDigit() {
    if (state.roundOver) return;
    setGuess((g) => g.slice(0, -1));
  }

  function submit() {
    if (state.roundOver || guess.length !== codeLength) return;
    const next = submitGuess(state, guess);
    const lastAttempt = next.attempts[next.attempts.length - 1];
    audio?.tone(240 + (lastAttempt?.exact ?? 0) * 90, 100);
    if (next.roundOver) audio?.play(next.roundWon ? 'success' : 'error');
    setState(next);
    setGuess([]);
  }

  function continueSession() {
    if (state.gameOver) {
      finishGame(state);
      return;
    }
    setState(advanceRound(state));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (state.roundOver) {
      if (event.key === 'Enter') {
        event.preventDefault();
        continueSession();
      }
      return;
    }
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      appendDigit(Number(event.key));
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      deleteDigit();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  }

  if (!round) return null;

  return (
    <div
      ref={containerRef}
      className="flex min-h-[70vh] flex-col items-center gap-4 p-6 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-xs text-center text-sm text-text-secondary">
        {showRoundCount && `Código ${state.roundIndex + 1}/${state.rounds.length} · `}
        {config.mode === 'progressive' && `Grado ${round.stage}/${PROGRESSIVE_STAGES} · `}
        Intento {attemptNumber}/{round.maxGuesses}
      </div>

      <p className="max-w-xs text-center text-sm text-text-secondary">
        Descubrí el código de {codeLength} dígitos distintos. Cada intento te dice cuántos están en
        el lugar correcto (exactos) y cuántos están en el código pero en otro lugar (parciales).
      </p>

      {/* La ranura de la jugada actual ocupa siempre el mismo lugar (PRD 10.7.12). */}
      <div className="flex gap-2" aria-label="Tu intento">
        {Array.from({ length: codeLength }, (_, i) => (
          <div
            key={i}
            className={`flex h-11 w-9 items-center justify-center rounded-lg border font-display text-lg font-bold text-text-primary ${
              guess[i] !== undefined ? 'border-accent-primary/60 bg-surface' : 'border-surface-alt'
            }`}
          >
            {guess[i] ?? ''}
          </div>
        ))}
      </div>

      {state.roundOver ? (
        <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-lg border border-surface-alt bg-surface p-4 text-center">
          <p
            className={`font-display text-lg font-extrabold ${
              state.roundWon ? 'text-accent-success' : 'text-accent-error'
            }`}
          >
            {state.roundWon ? '¡Lo descifraste!' : 'Se acabaron los intentos'}
          </p>
          {!state.roundWon && (
            <p className="text-sm text-text-secondary">El código era {round.code.join(' ')}.</p>
          )}
          <PressButton variant="primary" onPress={continueSession} className="px-8">
            {state.gameOver ? 'Ver resultado' : 'Siguiente código'}
          </PressButton>
        </div>
      ) : (
        <div className="grid w-full max-w-xs grid-cols-3 gap-2">
          {DIGIT_ROWS.map((digit) => (
            <PressButton
              key={digit}
              variant="key"
              disabled={guess.length >= codeLength || guess.includes(digit)}
              onPress={() => appendDigit(digit)}
            >
              {digit}
            </PressButton>
          ))}
          <PressButton
            variant="key"
            disabled={guess.length >= codeLength || guess.includes(0)}
            onPress={() => appendDigit(0)}
          >
            0
          </PressButton>
          <PressButton variant="key" ariaLabel="Borrar último dígito" onPress={deleteDigit}>
            ⌫
          </PressButton>
          <PressButton variant="primary" disabled={guess.length !== codeLength} onPress={submit}>
            Probar
          </PressButton>
        </div>
      )}

      {state.attempts.length > 0 && (
        <div
          className="flex w-full max-w-xs flex-col gap-2 overflow-y-auto"
          style={{ maxHeight: '30vh' }}
        >
          {[...state.attempts].reverse().map((attempt, i) => (
            <div
              key={state.attempts.length - i}
              className="flex items-center justify-between gap-3 rounded-lg border border-surface-alt bg-surface px-3 py-2"
            >
              <span className="font-display text-sm font-bold tracking-wide text-text-primary">
                {attempt.digits.join(' ')}
              </span>
              <span className="text-xs text-text-secondary">
                <span className="text-accent-success">
                  {attempt.exact} exacto{attempt.exact === 1 ? '' : 's'}
                </span>
                {' · '}
                <span className="text-accent-primary">
                  {attempt.partial} parcial{attempt.partial === 1 ? '' : 'es'}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
