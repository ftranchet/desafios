import { useNavigate } from 'react-router-dom';
import { strings } from '../../i18n/es';
import { IconBack } from './icons';

// Botón Volver con etiqueta visible (feedback del product owner: la flecha
// sola era poco clara). Compartido por los encabezados de Estadísticas,
// Configuración y la portada de juego.

export function BackButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate('/')}
      className="flex min-h-touch items-center gap-1 rounded-lg border border-surface-alt bg-surface pl-2 pr-3 text-sm font-medium text-text-secondary shadow-card transition hover:border-accent-primary/60 hover:text-text-primary active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
    >
      <IconBack className="h-4 w-4" />
      {strings.common.back}
    </button>
  );
}
