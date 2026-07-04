import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { GameAudio, GameResult, ModeId } from '../../core/contract';
import { getGameById } from '../../core/registry';
import { playSound, playTone, warmUpAudio } from '../../core/sound';
import { storage } from '../../core/storage';
import { vibrate } from '../../core/vibration';
import { strings } from '../../i18n/es';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { GameErrorBoundary } from '../components/GameErrorBoundary';
import { ModePicker } from '../components/ModePicker';
import { ResultPanel } from '../components/ResultPanel';
import { useSettingsStore } from '../store/useSettingsStore';

type ScreenPhase = 'select-mode' | 'playing' | 'result';

const DEFAULT_MODE: ModeId = 'medium';

export function GameScreen() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const game = gameId ? getGameById(gameId) : undefined;

  const lastPlayed = useSettingsStore((s) => s.lastPlayed);
  const setLastPlayed = useSettingsStore((s) => s.setLastPlayed);
  const soundEnabled = useSettingsStore((s) => s.sound);
  const vibrationEnabled = useSettingsStore((s) => s.vibration);

  // El último modo jugado se preselecciona (RF-03) solo si el juego lo sigue
  // declarando — un juego puede retirar un modo entre versiones.
  const initialMode =
    lastPlayed &&
    lastPlayed.gameId === gameId &&
    game?.metadata.modes.some((m) => m.id === lastPlayed.mode)
      ? lastPlayed.mode
      : DEFAULT_MODE;

  const [phase, setPhase] = useState<ScreenPhase>('select-mode');
  const [mode, setMode] = useState<ModeId>(initialMode);
  const [result, setResult] = useState<GameResult | null>(null);
  const [previousBest, setPreviousBest] = useState<number | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [sessionStart, setSessionStart] = useState(0);

  // Capacidad de audio para el juego (ADR-006), ya gateada por la
  // configuración: con sonido apagado se inyecta la implementación nula, así
  // los juegos nunca ramifican por preferencia del usuario.
  const gameAudio: GameAudio = useMemo(
    () =>
      soundEnabled
        ? { play: playSound, tone: playTone }
        : { play: () => undefined, tone: () => undefined },
    [soundEnabled],
  );

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
    const best = storage.getBest(game.metadata.id, mode);
    setPreviousBest(best ? best.score : null);
    setLastPlayed({ gameId: game.metadata.id, mode });
    setSessionStart(performance.now());
    setPhase('playing');
  }

  function handleFinish(gameResult: GameResult) {
    if (!game) return;
    // Frontera desconfiada (PRD 5.6): el shell conoce el juego y el modo que
    // montó — no depende de que el juego los devuelva bien. Un buildResult
    // copiado de otro juego no puede corromper récords.
    if (gameResult.gameId !== game.metadata.id || gameResult.mode !== mode) {
      console.warn(
        `GameResult inconsistente (gameId="${gameResult.gameId}", mode=${gameResult.mode}); ` +
          `se normaliza a "${game.metadata.id}" modo ${mode}.`,
      );
    }
    const result: GameResult = {
      ...gameResult,
      gameId: game.metadata.id,
      mode,
    };
    storage.saveResult(result);
    // Récord solo si supera el mejor puntaje previo (o 0 si es la primera vez).
    // El modo Tranquilo no compite (ADR-007): nunca marca récord.
    const isRecord = mode !== 'zen' && result.score > (previousBest ?? 0);
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
      mode,
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
    setPhase('select-mode');
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

      {phase === 'select-mode' && (
        <ModePicker
          modes={game.metadata.modes}
          selectedMode={mode}
          onSelect={setMode}
          onPlay={handlePlay}
        />
      )}

      {phase === 'playing' && (
        <GameErrorBoundary onExit={() => navigate('/')}>
          <game.Component
            config={{ mode }}
            onFinish={handleFinish}
            onQuit={handleAbandon}
            audio={gameAudio}
          />
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
