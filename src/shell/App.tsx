import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppHeader } from './components/AppHeader';
import { CatalogScreen } from './screens/CatalogScreen';
import { ConfigScreen } from './screens/ConfigScreen';
import { GameScreen } from './screens/GameScreen';
import { StatsScreen } from './screens/StatsScreen';
import { useSettingsStore } from './store/useSettingsStore';

export function App() {
  const reduceAnimations = useSettingsStore((s) => s.reduceAnimations);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-animations', reduceAnimations);
  }, [reduceAnimations]);

  return (
    <HashRouter>
      <div className="flex min-h-screen flex-col bg-bg text-text-primary">
        <main className="flex-1 pb-touch">
          <Routes>
            <Route path="/" element={<CatalogScreen />} />
            <Route path="/game/:gameId" element={<GameScreen />} />
            <Route path="/stats" element={<StatsScreen />} />
            <Route path="/config" element={<ConfigScreen />} />
          </Routes>
        </main>
        <AppHeader />
      </div>
    </HashRouter>
  );
}
