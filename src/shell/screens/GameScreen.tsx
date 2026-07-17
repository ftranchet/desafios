import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import type { GameAudio, GameResult, ModeId } from '../../core/contract';
import { getGameById } from '../../core/registry';
import { playSound, playTone, warmUpAudio } from '../../core/sound';
import { normalizeGameResult, storage } from '../../core/storage';
import { vibrate } from '../../core/vibration';
import { strings } from '../../i18n/es';
import { BackButton } from '../components/BackButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { GameErrorBoundary } from '../components/GameErrorBoundary';
import { GameIconChip } from '../components/GameIconChip';
import { ModePicker } from '../components/ModePicker';
import { ResultPanel } from '../components/ResultPanel';
import { useSettingsStore } from '../store/useSettingsStore';
import { NotFoundScreen } from './NotFoundScreen';

type ScreenPhase = 'select-mode' | 'playing' | 'result';

const DEFAULT_MODE: ModeId = 'medium';

function runBestEffort(action: () => void, label: string): void {
  try {
    action();
  } catch (error) {
    // Persistencia, audio y vibración son capacidades auxiliares. Una falla de
    // plataforma nunca debe impedir el cambio de fase o la navegación.
    console.warn(`${label}:`, error);
  }
}

export function GameScreen() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const game = gameId ? getGameById(gameId) : undefined;

  const lastPlayed = useSettingsStore((s) => s.lastPlayed);
  const setLastPlayed = useSettingsStore((s) => s.setLastPlayed);
  const soundEnabled = useSettingsStore((s) => s.sound);
  const vibrationEnabled = useSettingsStore((s) => s.vibration);
  const defaultDifficulty = useSettingsStore((s) => s.defaultDifficulty);

  // Preselección del modo (RF-03): si en Configuración se fijó una dificultad
  // por defecto, manda para todo el catálogo (las tres dificultades son
  // obligatorias en todo juego, ADR-007). Con 'last', el último modo jugado
  // en ESTE juego — solo si el juego lo sigue declarando, porque un juego
  // puede retirar un modo entre versiones.
  const initialMode =
    defaultDifficulty !== 'last'
      ? defaultDifficulty
      : lastPlayed &&
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
  const sessionStartRef = useRef(0);
  const sessionClosedRef = useRef(false);
  const blocker = useBlocker(() => phase === 'playing' && !sessionClosedRef.current);

  // El módulo interactivo se evalúa recién al abrir la ruta. La promesa
  // rechazada cae dentro de GameErrorBoundary en vez de impedir que arranque
  // todo el catálogo.
  const GameComponent = useMemo(
    () =>
      game
        ? lazy(async () => {
            const module = await game.load();
            if (module.metadata.id !== game.metadata.id) {
              throw new Error(
                `El módulo cargado (${module.metadata.id}) no coincide con ${game.metadata.id}.`,
              );
            }
            return { default: module.Component };
          })
        : null,
    [game],
  );

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

  // La recarga/cierre de pestaña no puede usar nuestro diálogo React, pero el
  // navegador sí puede advertir que hay una partida activa.
  useEffect(() => {
    if (phase !== 'playing') return;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', preventUnload);
    return () => window.removeEventListener('beforeunload', preventUnload);
  }, [phase]);

  // Back del navegador, gesto de Android y cualquier navegación interna usan
  // la misma confirmación que el botón Salir. La ruta solo continúa después
  // de persistir el abandono.
  useEffect(() => {
    if (phase === 'playing' && blocker.state === 'blocked') setShowQuitConfirm(true);
  }, [blocker.state, phase]);

  // Una partida puede terminar por timer mientras la navegación está
  // bloqueada y el diálogo sigue abierto. En ese caso el resultado gana: se
  // cancela el Back pendiente para no dejar un modal imposible de confirmar
  // después de que el cierre one-shot ya se consumió.
  useEffect(() => {
    if (phase !== 'playing' && blocker.state === 'blocked') blocker.reset();
  }, [blocker, phase]);

  if (!game) {
    return <NotFoundScreen />;
  }

  function handlePlay() {
    if (!game) return;
    sessionClosedRef.current = false;
    // Este tap es un gesto directo: desbloquea el audio para que los efectos
    // que se disparan después (desde timers/tick) suenen en iOS/Safari.
    if (soundEnabled) runBestEffort(warmUpAudio, 'No se pudo preparar el audio');
    const best = storage.getBest(game.metadata.id, mode);
    setPreviousBest(best ? best.score : null);
    runBestEffort(
      () => setLastPlayed({ gameId: game.metadata.id, mode }),
      'No se pudo recordar el último juego',
    );
    sessionStartRef.current = performance.now();
    setPhase('playing');
  }

  function handleFinish(gameResult: GameResult) {
    if (!game || sessionClosedRef.current) return;
    // Marcar primero: un doble tap o dos timers que terminan juntos no pueden
    // persistir ni celebrar dos veces la misma sesión.
    sessionClosedRef.current = true;
    setShowQuitConfirm(false);
    // Frontera desconfiada (PRD 5.6): el shell conoce el juego y el modo que
    // montó — no depende de que el juego los devuelva bien. Un buildResult
    // copiado de otro juego no puede corromper récords.
    const normalized = normalizeGameResult(gameResult, {
      identity: { gameId: game.metadata.id, mode },
      fallbackDurationMs: Math.round(performance.now() - sessionStartRef.current),
      fallbackTimestamp: new Date().toISOString(),
    });
    // Con una identidad proveniente del registro el normalizador siempre
    // produce un resultado seguro; este guard mantiene la frontera total ante
    // una futura ampliación del contrato.
    if (!normalized) return;
    runBestEffort(() => storage.saveResult(normalized), 'No se pudo guardar el resultado');
    // Récord solo si supera el mejor puntaje previo (o 0 si es la primera vez).
    // El modo Tranquilo no compite (ADR-007): nunca marca récord.
    const isRecord =
      normalized.completed && mode !== 'zen' && normalized.score > (previousBest ?? 0);
    if (soundEnabled) {
      runBestEffort(
        () => playSound(isRecord ? 'record' : normalized.completed ? 'success' : 'error'),
        'No se pudo reproducir el resultado',
      );
    }
    if (vibrationEnabled && isRecord) {
      runBestEffort(() => vibrate([40, 30, 40]), 'No se pudo vibrar');
    }
    setIsNewRecord(isRecord);
    setResult(normalized);
    setPhase('result');
  }

  function handleAbandon() {
    if (!game || sessionClosedRef.current) return;
    sessionClosedRef.current = true;
    setShowQuitConfirm(false);
    const durationMs = Math.max(0, Math.round(performance.now() - sessionStartRef.current));
    runBestEffort(
      () =>
        storage.saveResult({
          gameId: game.metadata.id,
          mode,
          score: 0,
          completed: false,
          durationMs,
          metrics: {},
          timestamp: new Date().toISOString(),
        }),
      'No se pudo guardar el abandono',
    );
    if (soundEnabled) {
      runBestEffort(() => playSound('gameover'), 'No se pudo reproducir el abandono');
    }
    if (vibrationEnabled) runBestEffort(() => vibrate(30), 'No se pudo vibrar');
    if (blocker.state === 'blocked') blocker.proceed();
    else navigate('/');
  }

  function handleCancelAbandon() {
    setShowQuitConfirm(false);
    if (blocker.state === 'blocked') blocker.reset();
  }

  function handleRetry() {
    setResult(null);
    setPhase('select-mode');
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Encabezado con blur: sticky para que la salida quede siempre a mano
          aunque el contenido scrollee. La vuelta al catálogo vive acá (botón
          Volver con etiqueta, ADR-010); durante la partida se reemplaza por
          "Salir" con confirmación, y el nombre gana el chip del juego — en la
          portada no hace falta título en el header, la portada ya lo lleva. */}
      <header className="sticky top-[env(safe-area-inset-top)] z-20 flex min-h-touch items-center justify-between border-b border-surface-alt bg-surface/75 px-4 py-1.5 backdrop-blur">
        <div className="flex items-center gap-3">
          {phase !== 'playing' && <BackButton />}
          {phase === 'playing' && (
            <>
              <GameIconChip metadata={game.metadata} size="sm" />
              <h1 className="font-display text-base font-bold text-text-primary">
                {game.metadata.name}
              </h1>
            </>
          )}
          {phase === 'result' && (
            <h1 className="font-display text-base font-bold text-text-primary">
              {game.metadata.name}
            </h1>
          )}
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

      {/* Centrado vertical: en un celular esto no se nota (la pantalla ya
          mide poco más que el contenido), pero evita que el selector de modo
          o el resultado queden pegados arriba con un vacío grande debajo en
          tablet/PC. Cada juego ya centra su propio contenido igual durante
          la partida (min-h-[70dvh] + justify-center); esto solo extiende el
          mismo criterio a las otras dos fases. */}
      <div className="flex flex-1 flex-col items-center justify-[safe_center]">
        {phase === 'select-mode' && (
          <ModePicker
            metadata={game.metadata}
            selectedMode={mode}
            onSelect={setMode}
            onPlay={handlePlay}
          />
        )}

        {phase === 'playing' && GameComponent && (
          <GameErrorBoundary onExit={handleAbandon}>
            <Suspense
              fallback={
                <p className="p-6 text-sm text-text-secondary" role="status" aria-live="polite">
                  {strings.game.loading}
                </p>
              }
            >
              <GameComponent
                config={{ mode }}
                onFinish={handleFinish}
                onQuit={handleAbandon}
                audio={gameAudio}
              />
            </Suspense>
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
      </div>

      {showQuitConfirm && (
        <ConfirmDialog
          title={strings.game.quitConfirmTitle}
          body={strings.game.quitConfirmBody}
          acceptLabel={strings.game.quitConfirmAccept}
          cancelLabel={strings.game.quitConfirmCancel}
          onAccept={handleAbandon}
          onCancel={handleCancelAbandon}
        />
      )}
    </div>
  );
}
