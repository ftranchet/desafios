import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react';

// Botón de juego (ADR-005, patrones PRD 10.7.1/10.7.2): dispara en
// `pointerdown` — no en `click` — para respuesta inmediata en juegos en
// tiempo real o contra reloj (RNF-03), conserva la activación por teclado
// (Enter/Espacio generan un click sintético con `detail === 0`, la única vía
// que se atiende en onClick), y opcionalmente auto-repite al mantener
// presionado con la cadencia de un teclado físico.

export type PressButtonVariant = 'control' | 'key' | 'primary' | 'bare';

const BASE = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary';

const VARIANTS: Record<PressButtonVariant, string> = {
  // Botón de control de tiempo real (D-pad, mover/rotar): cuadrado táctil.
  control:
    'min-h-touch min-w-touch rounded-lg border border-surface-alt bg-surface font-display text-lg font-bold text-text-primary transition-colors hover:border-accent-primary/60 active:bg-accent-primary active:text-bg disabled:opacity-40',
  // Tecla de keypad numérico.
  key: 'min-h-touch rounded-lg border border-surface-alt bg-surface font-display text-lg font-bold text-text-primary transition-colors active:bg-surface-alt disabled:opacity-40',
  // Acción principal del keypad (enviar).
  primary:
    'min-h-touch rounded-lg bg-accent-primary font-display text-lg font-bold text-bg transition-colors disabled:opacity-40',
  // Sin estilo propio: el juego trae todas sus clases (pads de Simon).
  bare: '',
};

const REPEAT_DELAY_MS = 260;
const REPEAT_INTERVAL_MS = 110;

export interface PressButtonProps {
  onPress(): void;
  ariaLabel?: string;
  disabled?: boolean;
  repeatOnHold?: boolean;
  variant?: PressButtonVariant;
  className?: string;
  children: ReactNode;
}

export function PressButton({
  onPress,
  ariaLabel,
  disabled = false,
  repeatOnHold = false,
  variant = 'control',
  className = '',
  children,
}: PressButtonProps) {
  const timersRef = useRef<{ delay: number | null; interval: number | null }>({
    delay: null,
    interval: null,
  });
  // El interval captura el onPress del render en el que arrancó; la ref
  // mantiene el más reciente para que la repetición no actúe sobre estado viejo.
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  function stopRepeat() {
    if (timersRef.current.delay !== null) window.clearTimeout(timersRef.current.delay);
    if (timersRef.current.interval !== null) window.clearInterval(timersRef.current.interval);
    timersRef.current = { delay: null, interval: null };
  }

  useEffect(() => stopRepeat, []);

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    // Guard explícito: no todos los entornos suprimen los eventos de puntero
    // sobre un botón deshabilitado (jsdom no lo hace; navegadores viejos
    // tampoco lo hacían de forma consistente).
    if (disabled) return;
    // preventDefault: el botón no roba el foco del contenedor del juego, así
    // el teclado físico sigue funcionando en escritorio.
    event.preventDefault();
    onPress();
    if (!repeatOnHold) return;
    try {
      // Con captura, el pointerup llega aunque el dedo se corra del botón.
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // jsdom y navegadores viejos no implementan la captura: solo se pierde
      // la robustez del gesto largo, no la funcionalidad.
    }
    stopRepeat();
    timersRef.current.delay = window.setTimeout(() => {
      timersRef.current.interval = window.setInterval(
        () => onPressRef.current(),
        REPEAT_INTERVAL_MS,
      );
    }, REPEAT_DELAY_MS);
  }

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
      onPointerUp={stopRepeat}
      onPointerCancel={stopRepeat}
      onClick={(event) => {
        if (!disabled && event.detail === 0) onPress();
      }}
      className={`${BASE} ${VARIANTS[variant]} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
