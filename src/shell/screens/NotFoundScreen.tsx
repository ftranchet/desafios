import { Link } from 'react-router-dom';
import { strings } from '../../i18n/es';

// Ruta comodín (PRD 5.6): un hash que no matchea ninguna ruta declarada
// (enlace viejo, typo, deep link roto) ya no deja el área de contenido en
// blanco — Routes devuelve null sin esto.

export function NotFoundScreen() {
  return (
    <div className="flex min-h-[70dvh] animate-fade-in flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-display text-lg font-bold text-text-primary">{strings.notFound.title}</h1>
      <p className="max-w-xs text-sm text-text-secondary">{strings.notFound.body}</p>
      <Link
        to="/"
        className="flex min-h-touch items-center rounded-lg bg-accent-primary px-6 font-display text-base font-bold text-bg shadow-card transition active:scale-95"
      >
        {strings.notFound.backToCatalog}
      </Link>
    </div>
  );
}
