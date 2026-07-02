import { NavLink } from 'react-router-dom';
import { strings } from '../../i18n/es';

const TABS = [
  { to: '/', label: strings.nav.catalog, end: true },
  { to: '/stats', label: strings.nav.stats, end: false },
  { to: '/config', label: strings.nav.config, end: false },
];

export function AppHeader() {
  return (
    <nav className="flex border-t border-surface-alt bg-surface" aria-label="Navegación principal">
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
    </nav>
  );
}
