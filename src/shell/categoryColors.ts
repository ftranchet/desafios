import type { Category } from '../core/contract';

// Color por categoría (ADR-008, chips sólidos desde ADR-009): refuerza la
// etiqueta de texto de CATEGORY_LABELS con un acento visual — nunca la
// reemplaza (RNF-05), el texto sigue estando. Clases completas y literales a
// propósito: el JIT de Tailwind solo genera las clases que encuentra escritas
// tal cual en el código, no las que se arman con un template string en
// tiempo de ejecución.
interface CategoryAccent {
  text: string;
  // Fondo sólido: chip de ícono de la tarjeta y chip de filtro seleccionado,
  // siempre con contenido en bg encima (el rol "sobre acento" del sistema).
  // Contraste verificado ≥4.5:1 para los 6 colores en ambos temas (ADR-009).
  activeBg: string;
}

export const CATEGORY_ACCENT: Record<Category, CategoryAccent> = {
  math: {
    text: 'text-game-1',
    activeBg: 'bg-game-1',
  },
  memory: {
    text: 'text-game-2',
    activeBg: 'bg-game-2',
  },
  speed: {
    text: 'text-game-3',
    activeBg: 'bg-game-3',
  },
  logic: {
    text: 'text-game-4',
    activeBg: 'bg-game-4',
  },
  words: {
    text: 'text-game-5',
    activeBg: 'bg-game-5',
  },
  spatial: {
    text: 'text-game-6',
    activeBg: 'bg-game-6',
  },
};
