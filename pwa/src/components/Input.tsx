import type { InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

/** Input de texto y de monto. Fuente: docs/design-system §4. */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  prefix?: string; // p.ej. "$" para montos
}

export function Input({ prefix, className, ...rest }: InputProps) {
  return (
    <div className={styles.field}>
      {prefix && <span className={styles.prefix}>{prefix}</span>}
      <input
        className={[styles.input, prefix && styles.withPrefix, className]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
    </div>
  );
}
