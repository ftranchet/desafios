import { NavLink } from 'react-router-dom';
import { strings } from '../../i18n/es';

const TABS = [
  { to: '/', label: strings.nav.catalog, end: true },
  { to: '/stats', label: strings.nav.stats, end: false },
  { to: '/config', label: strings.nav.config, end: false },
];

export function AppHeader() {
  return (
    // sticky: la barra queda siempre a la vista aunque el contenido scrollee;
    // el padding inferior respeta el área segura (indicador de inicio de iOS).
    <nav
      className="sticky bottom-0 border-t border-surface-alt bg-surface pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegación principal"
    >
      {/* La franja de fondo va de punta a punta; el contenido se acota y
          centra igual que el resto de la app (ver App.tsx) para no verse
          desproporcionadamente ancho en pantallas grandes. */}
      <div className="mx-auto flex w-full max-w-4xl">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex min-h-touch flex-1 items-center justify-center px-2 py-3 text-sm transition-colors ${
                isActive ? 'font-semibold text-accent-primary' : 'text-text-secondary'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
