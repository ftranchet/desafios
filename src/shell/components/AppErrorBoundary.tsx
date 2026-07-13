import { Component, type ErrorInfo, type ReactNode } from 'react';
import { strings } from '../../i18n/es';

// Red de contención del shell: GameErrorBoundary aísla las fallas de cada
// juego (PRD 5.6), pero nada protegía antes al resto de la app (catálogo,
// estadísticas, configuración, selector de modo, resultado) — una excepción
// ahí tiraba abajo todo el árbol de React y dejaba una pantalla en blanco sin
// ningún mensaje. Esta es la última red: si algo se rompe en cualquier
// pantalla del shell, se ve un panel con la opción de recargar en vez de nada.

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Sin telemetría (RNF-08): el error queda en la consola local.
    console.error('La aplicación falló:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
        <h1 className="font-display text-lg font-bold text-text-primary">
          {strings.appCrash.title}
        </h1>
        <p className="max-w-xs text-sm text-text-secondary">{strings.appCrash.body}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-touch rounded-lg bg-accent-primary px-6 font-display text-base font-bold text-bg"
        >
          {strings.appCrash.reload}
        </button>
      </div>
    );
  }
}
