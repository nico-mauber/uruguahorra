import { NavLink } from 'react-router-dom';
import styles from './TabBar.module.css';
import { Icon, type IconName } from './Icon';

/** Tab bar inferior. Fuente: docs/design-system §4, docs/architecture/pwa §7. */
const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Inicio', icon: 'home' },
  { to: '/goals', label: 'Metas', icon: 'flag' },
  { to: '/challenges', label: 'Retos', icon: 'trophy' },
  { to: '/analytics', label: 'Análisis', icon: 'analytics' },
  { to: '/profile', label: 'Perfil', icon: 'person' },
];

export function TabBar() {
  return (
    <nav className={styles.bar} aria-label="Navegación principal">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            [styles.tab, isActive && styles.active].filter(Boolean).join(' ')
          }
        >
          <Icon name={tab.icon} size={24} />
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
