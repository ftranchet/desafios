import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { GameResult } from '../../core/contract';
import { getGameById } from '../../core/registry';
import { playSound, warmUpAudio } from '../../core/sound';
import { storage } from '../../core/storage';
import { vibrate } from '../../core/vibration';
import { strings } from '../../i18n/es';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { GameErrorBoundary } from '../components/GameErrorBoundary';
import { LevelPicker } from '../components/LevelPicker';
import { ResultPanel } from '../components/ResultPanel';
import { useSettingsStore } from '../store/useSettingsStore';

type ScreenPhase = 'select-level' | 'playing' | 'result';

const DEFAULT_LEVEL = 3;

export function GameScreen() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const game = gameId ? getGameById(gameId) : undefined;

  const lastPlayed = useSettingsStore((s) => s.lastPlayed);
  const setLastPlayed = useSettingsStore((s) => s.setLastPlayed);
  const soundEnabled = useSettingsStore((s) => s.sound);
  const vibrationEnabled = useSettingsStore((s) => s.vibration);

  const initialLevel =
    lastPlayed && lastPlayed.gameId === gameId ? lastPlayed.level : DEFAULT_LEVEL;

  const [phase, setPhase] = useState<ScreenPhase>('select-level');
  const [level, setLevel] = useState(initialLevel);
  const [result, setResult] = useState<GameResult | null>(null);
  const [previousBest, setPreviousBest] = useState<number | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [sessionStart, setSessionStart] = useState(0);

  if (!game) {
    return (
      <div className="p-4">
        <p className="text-sm text-text-secondary">Juego no encontrado.</p>
      </div>
    );
  }

  function handlePlay() {
    if (!game) return;
    // Este tap es un gesto directo: desbloquea el audio para que los efectos
    // que se disparan después (desde timers/tick) suenen en iOS/Safari.
    if (soundEnabled) warmUpAudio();
    const best = storage.getBest(game.metadata.id, level);
    setPreviousBest(best ? best.score : null);
    setLastPlayed({ gameId: game.metadata.id, level });
    setSessionStart(performance.now());
    setPhase('playing');
  }

  function handleFinish(gameResult: GameResult) {
    if (!game) return;
    // Frontera desconfiada (PRD 5.6): el shell conoce el juego y el nivel que
    // montó — no depende de que el juego los devuelva bien. Un buildResult
    // copiado de otro juego con el gameId viejo no puede corromper récords.
    if (gameResult.gameId !== game.metadata.id || gameResult.level !== level) {
      console.warn(
        `GameResult inconsistente (gameId="${gameResult.gameId}", level=${gameResult.level}); ` +
          `se normaliza a "${game.metadata.id}" nivel ${level}.`,
      );
    }
    const result: GameResult = {
      ...gameResult,
      gameId: game.metadata.id,
      level,
    };
    storage.saveResult(result);
    // Récord solo si supera el mejor puntaje previo (o 0 si es la primera vez):
    // así una primera partida perdida con 0 no se marca como récord nuevo.
    const isRecord = result.score > (previousBest ?? 0);
    if (soundEnabled) {
      playSound(isRecord ? 'record' : result.completed ? 'success' : 'error');
    }
    if (vibrationEnabled && isRecord) vibrate([40, 30, 40]);
    setIsNewRecord(isRecord);
    setResult(result);
    setPhase('result');
  }

  function handleAbandon() {
    if (!game) return;
    setShowQuitConfirm(false);
    const durationMs = Math.round(performance.now() - sessionStart);
    storage.saveResult({
      gameId: game.metadata.id,
      level,
      score: 0,
      completed: false,
      durationMs,
      metrics: {},
      timestamp: new Date().toISOString(),
    });
    if (soundEnabled) playSound('gameover');
    if (vibrationEnabled) vibrate(30);
    navigate('/');
  }

  function handleRetry() {
    setResult(null);
    setPhase('select-level');
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex min-h-touch items-center justify-between border-b border-surface-alt px-4">
        <div className="flex items-center gap-1">
          {/* Sin navegación inferior en esta ruta, la vuelta al catálogo vive acá;
              durante la partida se reemplaza por "Salir" con confirmación. */}
          {phase !== 'playing' && (
            <button
              type="button"
              aria-label={strings.common.back}
              className="-ml-2 flex min-h-touch min-w-touch items-center justify-center rounded-lg text-lg text-text-secondary"
              onClick={() => navigate('/')}
            >
              ←
            </button>
          )}
          <h1 className="font-display text-base font-bold text-text-primary">
            {game.metadata.name}
          </h1>
        </div>
        {phase === 'playing' && (
          <button
            type="button"
            className="min-h-touch rounded-lg px-3 text-sm font-medium text-accent-error"
            onClick={() => setShowQuitConfirm(true)}
          >
            {strings.game.quit}
          </button>
        )}
      </header>

      {phase === 'select-level' && (
        <LevelPicker
          levels={game.metadata.levels}
          selectedLevel={level}
          onSelect={setLevel}
          onPlay={handlePlay}
        />
      )}

      {phase === 'playing' && (
        <GameErrorBoundary onExit={() => navigate('/')}>
          <game.Component config={{ level }} onFinish={handleFinish} onQuit={handleAbandon} />
        </GameErrorBoundary>
      )}

      {phase === 'result' && result && (
        <ResultPanel
          result={result}
          previousBest={previousBest}
          isNewRecord={isNewRecord}
          onRetry={handleRetry}
          onBackToCatalog={() => navigate('/')}
        />
      )}

      {showQuitConfirm && (
        <ConfirmDialog
          title={strings.game.quitConfirmTitle}
          body={strings.game.quitConfirmBody}
          acceptLabel={strings.game.quitConfirmAccept}
          cancelLabel={strings.game.quitConfirmCancel}
          onAccept={handleAbandon}
          onCancel={() => setShowQuitConfirm(false)}
        />
      )}
    </div>
  );
}
