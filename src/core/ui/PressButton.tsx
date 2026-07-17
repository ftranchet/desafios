import { useCallback, useEffect, useRef, type PointerEvent, type ReactNode } from 'react';

// Botón de juego (ADR-005, patrones PRD 10.7.1/10.7.2): dispara en
// `pointerdown` — no en `click` — para respuesta inmediata en juegos en
// tiempo real o contra reloj (RNF-03), conserva la activación por teclado
// (Enter/Espacio generan un click sintético con `detail === 0`, la única vía
// que se atiende en onClick), y opcionalmente auto-repite al mantener
// presionado con la cadencia de un teclado físico.

export type PressButtonVariant = 'control' | 'key' | 'primary' | 'bare';

const BASE = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary';

// transition (no solo transition-colors) + active:scale (ADR-008): el toque
// anima color y tamaño juntos, para que se sienta con peso físico y no solo
// como un cambio de color instantáneo.
const PRESS_SCALE = 'active:scale-95 disabled:active:scale-100';

const VARIANTS: Record<PressButtonVariant, string> = {
  // Botón de control de tiempo real (D-pad, mover/rotar): cuadrado táctil.
  control: `min-h-touch min-w-touch rounded-lg border border-surface-alt bg-surface font-display text-lg font-bold text-text-primary transition hover:border-accent-primary/60 active:bg-accent-primary active:text-bg disabled:opacity-40 ${PRESS_SCALE}`,
  // Tecla de keypad numérico.
  key: `min-h-touch rounded-lg border border-surface-alt bg-surface font-display text-lg font-bold text-text-primary transition active:bg-surface-alt disabled:opacity-40 ${PRESS_SCALE}`,
  // Acción principal del keypad (enviar).
  primary: `min-h-touch rounded-lg bg-accent-primary font-display text-lg font-bold text-bg shadow-card transition disabled:opacity-40 disabled:shadow-none ${PRESS_SCALE}`,
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
  const activePointerRef = useRef<number | null>(null);
  // El interval captura el onPress del render en el que arrancó; la ref
  // mantiene el más reciente para que la repetición no actúe sobre estado viejo.
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  const stopRepeat = useCallback(() => {
    if (timersRef.current.delay !== null) window.clearTimeout(timersRef.current.delay);
    if (timersRef.current.interval !== null) window.clearInterval(timersRef.current.interval);
    timersRef.current = { delay: null, interval: null };
  }, []);

  const stopPointer = useCallback(
    (pointerId?: number) => {
      if (pointerId !== undefined && activePointerRef.current !== pointerId) return;
      activePointerRef.current = null;
      stopRepeat();
    },
    [stopRepeat],
  );

  useEffect(() => () => stopPointer(), [stopPointer]);

  useEffect(() => {
    if (disabled) stopPointer();
  }, [disabled, stopPointer]);

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    // Guard explícito: no todos los entornos suprimen los eventos de puntero
    // sobre un botón deshabilitado (jsdom no lo hace; navegadores viejos
    // tampoco lo hacían de forma consistente).
    if (
      disabled ||
      event.button !== 0 ||
      event.isPrimary === false ||
      activePointerRef.current !== null
    ) {
      return;
    }
    // preventDefault: el botón no roba el foco del contenedor del juego, así
    // el teclado físico sigue funcionando en escritorio.
    event.preventDefault();
    activePointerRef.current = event.pointerId;
    onPress();
    try {
      // Con captura, el pointerup llega aunque el dedo se corra del botón.
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // jsdom y navegadores viejos no implementan la captura: solo se pierde
      // la robustez del gesto largo, no la funcionalidad.
    }
    if (!repeatOnHold) return;
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
      onPointerUp={(event) => stopPointer(event.pointerId)}
      onPointerCancel={(event) => stopPointer(event.pointerId)}
      onLostPointerCapture={(event) => stopPointer(event.pointerId)}
      onClick={(event) => {
        if (!disabled && event.detail === 0) onPress();
      }}
      className={`${BASE} ${VARIANTS[variant]} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
