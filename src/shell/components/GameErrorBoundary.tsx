import { Component, type ErrorInfo, type ReactNode } from 'react';
import { strings } from '../../i18n/es';

// Aislamiento de fallas (PRD 5.6): si un juego tira una excepción durante el
// render o un ciclo de vida, el error muere acá y el shell sigue vivo — el
// peor caso de un juego roto es este panel, nunca una pantalla en blanco.
// Es la garantía estructural que permite sumar juegos con bajo riesgo.

interface GameErrorBoundaryProps {
  children: ReactNode;
  onExit(): void;
}

interface GameErrorBoundaryState {
  hasError: boolean;
}

export class GameErrorBoundary extends Component<GameErrorBoundaryProps, GameErrorBoundaryState> {
  state: GameErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): GameErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Sin telemetría (RNF-08): el error queda en la consola local, suficiente
    // para diagnosticar en desarrollo o con el dispositivo conectado.
    console.error('El juego falló:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <h2 className="font-display text-lg font-bold text-text-primary">
          {strings.game.crashTitle}
        </h2>
        <p className="max-w-xs text-sm text-text-secondary">{strings.game.crashBody}</p>
        <button
          type="button"
          onClick={this.props.onExit}
          className="min-h-touch rounded-lg bg-accent-primary px-6 font-display text-base font-bold text-bg"
        >
          {strings.game.crashBack}
        </button>
      </div>
    );
  }
}
