import type { Config } from 'tailwindcss';

// Tokens de diseño — contrato visual del proyecto (PRD sección 10.1).
// Ningún juego define colores, fuentes ni escalas fuera de este archivo.
// Paleta validada contra contraste AA (WCAG) sobre bg/surface — ver ADR-003.
// Tipografía y geometría: minimalismo moderno sobre tema oscuro — ver ADR-004
// (reemplaza el pixel art de la ADR-003; la paleta de colores sigue vigente).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: '#0f0e17',
      surface: '#1a1826',
      'surface-alt': '#26223a',
      'text-primary': '#f4f4f2',
      'text-secondary': '#a6a2bd',
      'accent-primary': '#3fd0c9',
      'accent-success': '#6bcf63',
      'accent-error': '#f4557a',
      'game-1': '#ffcd4b',
      'game-2': '#8a6dff',
      'game-3': '#ff8b3d',
      'game-4': '#3fa7d6',
      // game-5/game-6 (ADR-008): completan la paleta a 6 colores para poder
      // asignar uno distinto a cada categoría del catálogo (CATEGORY_LABELS)
      // sin repetir matiz con los ya existentes ni con los semánticos
      // (accent-success/accent-error). Contraste verificado ≥4.5:1 sobre
      // bg y surface, mismo criterio que el resto de la paleta (ADR-003).
      'game-5': '#b56ee0', // orquídea
      'game-6': '#6b7ff0', // índigo
    },
    fontFamily: {
      // Una sola familia (Inter): "display" y "body" son roles de peso/tamaño,
      // no tipografías distintas.
      display: ['Inter', 'system-ui', 'sans-serif'],
      body: ['Inter', 'system-ui', 'sans-serif'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1.4' }],
      sm: ['0.875rem', { lineHeight: '1.4' }],
      base: ['1rem', { lineHeight: '1.5' }],
      md: ['1.125rem', { lineHeight: '1.45' }],
      lg: ['1.25rem', { lineHeight: '1.4' }],
      xl: ['2rem', { lineHeight: '1.3' }],
      // 2xl (ADR-008): para números "hero" (puntaje de resultado) — el hueco
      // entre lg y xl ya alcanza para títulos, este tamaño es exclusivo de
      // lo que necesita pesar más que cualquier título de sección.
      '2xl': ['2.75rem', { lineHeight: '1.15' }],
    },
    extend: {
      spacing: {
        touch: '2.75rem', // 44px — objetivo táctil mínimo (RNF-04)
      },
      minHeight: {
        touch: '2.75rem',
      },
      minWidth: {
        touch: '2.75rem',
      },
      // Elevación (ADR-008): "card" para lo apoyado en la superficie (tarjetas,
      // filas de lista), "raised" para lo que flota sobre el contenido
      // (diálogos, panel de resultado). Neutras (negro), no atadas a un color
      // de marca — no necesitan theme() porque el negro no cambia.
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.24), 0 6px 16px -6px rgba(0,0,0,0.32)',
        raised: '0 4px 8px rgba(0,0,0,0.28), 0 16px 32px -8px rgba(0,0,0,0.4)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '60%': { opacity: '1', transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        // Entrada de pantalla (ADR-008); ya cubierta por la regla global de
        // prefers-reduced-motion/.reduce-animations (src/styles/index.css).
        'fade-in': 'fade-in 200ms ease-out',
        // Celebración puntual de récord nuevo en ResultPanel.
        pop: 'pop 420ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
