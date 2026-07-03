import type { HTMLAttributes } from 'react';
import styles from './Card.module.css';

/** Card. Fuente: docs/design-system §4. */
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'outlined';
  padding?: 'none';
}

export function Card({
  variant,
  padding,
  className,
  children,
  ...rest
}: CardProps) {
  const cls = [
    styles.card,
    variant === 'outlined' && styles.outlined,
    padding === 'none' && styles.paddingNone,
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}
