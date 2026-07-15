import type { ReactNode } from 'react';

// Layout de partida (ADR-005/ADR-009, design-system.md §6.2): tres slots —
// HUD (marcador/estado), tablero (el elemento principal) y panel (controles,
// acciones y ayudas). En vertical se apilan en ese orden; en apaisado corto
// (celular horizontal, media query en .game-layout de index.css) el tablero
// pasa a la izquierda y HUD + panel a la derecha, para que tablero y
// controles queden visibles juntos sin scrollear en plena partida.
//
// El tablero es responsabilidad del juego: si es más alto que el viewport
// apaisado, el juego lo acota con la variante `short:` (ver Snake/Cascada).

export interface GameLayoutProps {
  hud?: ReactNode;
  board: ReactNode;
  panel?: ReactNode;
}

export function GameLayout({ hud, board, panel }: GameLayoutProps) {
  return (
    <div className="game-layout">
      {hud && (
        <div className="game-layout-hud flex w-full max-w-xs flex-col items-center gap-3">
          {hud}
        </div>
      )}
      <div className="game-layout-board flex min-w-0 flex-col items-center">{board}</div>
      {panel && (
        <div className="game-layout-panel flex w-full max-w-xs flex-col items-center gap-3">
          {panel}
        </div>
      )}
    </div>
  );
}
