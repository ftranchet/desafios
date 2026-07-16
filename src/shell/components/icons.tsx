// Íconos de interfaz del shell: glifos vectoriales mínimos en currentColor,
// para que tomen el color del texto del elemento que los contiene (tokens,
// nunca colores propios). Decorativos: el elemento interactivo que los usa
// lleva siempre su aria-label (RNF-05).

interface IconProps {
  className?: string;
}

/** Barras de estadísticas. */
export function IconStats({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M5 20V12M12 20V4M19 20v-6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Deslizadores de configuración (más simple y moderno que un engranaje). */
export function IconSettings({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M4 7h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="2.6" fill="currentColor" />
      <circle cx="15" cy="17" r="2.6" fill="currentColor" />
    </svg>
  );
}

/** Llama de racha de días. */
export function IconFlame({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 3c.6 3-1.2 4.6-2.6 6C7.9 10.5 7 12 7 14a5 5 0 0 0 10 0c0-1.6-.7-2.9-1.6-4.1-.5 1-1 1.6-1.9 2.1.3-2.8-.3-6.4-1.5-9Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Flecha de volver. */
export function IconBack({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M14.5 5.5 8 12l6.5 6.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
