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
