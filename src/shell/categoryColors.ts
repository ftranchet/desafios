import type { Category } from '../core/contract';

// Color por categoría (ADR-008): refuerza la etiqueta de texto de
// CATEGORY_LABELS con un acento visual — nunca la reemplaza (RNF-05), el
// texto sigue estando. Clases completas y literales a propósito: el JIT de
// Tailwind solo genera las clases que encuentra escritas tal cual en el
// código, no las que se arman con un template string en tiempo de ejecución.
interface CategoryAccent {
  text: string;
  chipBg: string;
  border: string;
  // Chip de filtro seleccionado: fondo sólido + texto oscuro (bg), mismo
  // patrón que el chip "Todos" ya usaba con accent-primary. Contraste
  // verificado ≥4.5:1 para los 6 colores (ver ADR-008).
  activeBg: string;
}

export const CATEGORY_ACCENT: Record<Category, CategoryAccent> = {
  math: {
    text: 'text-game-1',
    chipBg: 'bg-game-1/15',
    border: 'border-game-1/40',
    activeBg: 'bg-game-1',
  },
  memory: {
    text: 'text-game-2',
    chipBg: 'bg-game-2/15',
    border: 'border-game-2/40',
    activeBg: 'bg-game-2',
  },
  speed: {
    text: 'text-game-3',
    chipBg: 'bg-game-3/15',
    border: 'border-game-3/40',
    activeBg: 'bg-game-3',
  },
  logic: {
    text: 'text-game-4',
    chipBg: 'bg-game-4/15',
    border: 'border-game-4/40',
    activeBg: 'bg-game-4',
  },
  words: {
    text: 'text-game-5',
    chipBg: 'bg-game-5/15',
    border: 'border-game-5/40',
    activeBg: 'bg-game-5',
  },
  spatial: {
    text: 'text-game-6',
    chipBg: 'bg-game-6/15',
    border: 'border-game-6/40',
    activeBg: 'bg-game-6',
  },
};
