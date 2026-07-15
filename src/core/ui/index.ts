// Kit de interacción para juegos (ADR-005): implementación canónica de los
// patrones de la sección 10.7 del PRD. Solo primitivas agnósticas del juego;
// estilos únicamente con tokens.
export { PressButton, type PressButtonVariant } from './PressButton';
export { GameLayout, type GameLayoutProps } from './GameLayout';
export { useAutoFocus } from './useAutoFocus';
export { CountdownBar } from './CountdownBar';
export { useSecondsLeft } from './useSecondsLeft';
export {
  useGridPathDrag,
  extendPath,
  type CellCoord,
  type UseGridPathDragOptions,
  type UseGridPathDragResult,
} from './useGridPathDrag';
