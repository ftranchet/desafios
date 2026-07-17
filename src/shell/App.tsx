import { useEffect } from 'react';
import { createHashRouter, Outlet, RouterProvider, useLocation } from 'react-router-dom';
import { CatalogScreen } from './screens/CatalogScreen';
import { ConfigScreen } from './screens/ConfigScreen';
import { GameScreen } from './screens/GameScreen';
import { NotFoundScreen } from './screens/NotFoundScreen';
import { StatsScreen } from './screens/StatsScreen';
import { useSettingsStore } from './store/useSettingsStore';

function Shell() {
  // Sin barra de navegación inferior: Estadísticas y Configuración se entra
  // por los botones-ícono del encabezado del catálogo y se sale con Volver.
  // En celular eso libera una franja entera de pantalla, y en la ruta de
  // juego nunca hubo navegación (el flujo de partida es a pantalla completa,
  // con salida explícita: Volver / Salir con confirmación).
  return (
    <div
      // Degradé radial muy sutil entre surface y bg (ADR-008): rompe la
      // sensación de fondo plano sin agregar un color nuevo ni comprometer el
      // minimalismo — son los dos mismos tokens de siempre, combinados.
      className="safe-area-shell flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,theme(colors.surface),theme(colors.bg)_70%)] text-text-primary"
    >
      {/* Ancho de contenido acotado y centrado (PC/tablet): en un celular esto
          no hace nada (ya es más angosto que el tope), pero evita que catálogo,
          estadísticas y configuración se estiren de punta a punta en pantallas
          grandes. Los juegos ya traen su propio ancho interno (max-w-xs, etc.);
          este tope solo les da un marco centrado en vez de pegarse al borde. */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}

function GameRoute() {
  const location = useLocation();
  // Cambiar de juego vía URL/historial remonta la pantalla desde cero, en vez
  // de heredar la fase de la partida anterior (la ruta base es la misma).
  return <GameScreen key={location.pathname} />;
}

// El data router permite que GameScreen bloquee navegación interna durante una
// partida. La variante hash preserva las URLs instalables de GitHub Pages/PWA.
const router = createHashRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <CatalogScreen /> },
      { path: 'game/:gameId', element: <GameRoute /> },
      { path: 'stats', element: <StatsScreen /> },
      { path: 'config', element: <ConfigScreen /> },
      { path: '*', element: <NotFoundScreen /> },
    ],
  },
]);

export function App() {
  const reduceAnimations = useSettingsStore((s) => s.reduceAnimations);
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-animations', reduceAnimations);
  }, [reduceAnimations]);

  // Tema (ADR-009): estampa data-theme en <html> — las variables CSS de
  // index.css hacen el resto — y alinea el meta theme-color (barra de estado
  // del navegador) con el fondo del tema activo, leyendo el token ya resuelto
  // en vez de duplicar el valor acá. El script inline de index.html aplica lo
  // mismo antes del primer paint; este efecto lo mantiene al vivo cuando la
  // preferencia cambia desde Configuración o cambia el tema del sistema.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = resolved;
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim();
      if (bg) {
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', `rgb(${bg})`);
      }
    };
    apply();
    if (theme !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  return <RouterProvider router={router} />;
}
