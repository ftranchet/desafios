import { useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AppHeader } from './components/AppHeader';
import { CatalogScreen } from './screens/CatalogScreen';
import { ConfigScreen } from './screens/ConfigScreen';
import { GameScreen } from './screens/GameScreen';
import { NotFoundScreen } from './screens/NotFoundScreen';
import { StatsScreen } from './screens/StatsScreen';
import { useSettingsStore } from './store/useSettingsStore';

function Shell() {
  // En la ruta de juego no se muestra la navegación inferior: el flujo de
  // partida es a pantalla completa. Evita que un toque accidental cerca del
  // borde (D-pad, controles) desmonte la partida sin confirmación ni registro;
  // la vuelta al catálogo es explícita (botón Volver / Salir con confirmación).
  const location = useLocation();
  const inGame = location.pathname.startsWith('/game/');

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text-primary">
      <main className="flex flex-1 flex-col">
        <Routes>
          <Route path="/" element={<CatalogScreen />} />
          {/* key por ruta: cambiar de juego vía URL/historial remonta la
              pantalla desde cero, en vez de heredar la fase de la partida
              anterior (la ruta es la misma y React no desmontaría nada). */}
          <Route path="/game/:gameId" element={<GameScreen key={location.pathname} />} />
          <Route path="/stats" element={<StatsScreen />} />
          <Route path="/config" element={<ConfigScreen />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </main>
      {!inGame && <AppHeader />}
    </div>
  );
}

export function App() {
  const reduceAnimations = useSettingsStore((s) => s.reduceAnimations);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-animations', reduceAnimations);
  }, [reduceAnimations]);

  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
