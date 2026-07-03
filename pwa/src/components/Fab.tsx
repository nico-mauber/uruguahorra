import type { ButtonHTMLAttributes } from 'react';
import styles from './Fab.module.css';
import { Icon, type IconName } from './Icon';

/** FAB. Fuente: docs/design-system §4. */
interface FabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: IconName;
  label: string; // accesibilidad
}

export function Fab({ icon = 'add', label, className, ...rest }: FabProps) {
  return (
    <button
      className={[styles.fab, className].filter(Boolean).join(' ')}
      aria-label={label}
      {...rest}
    >
      <Icon name={icon} size={32} color="#fff" />
    </button>
  );
}
