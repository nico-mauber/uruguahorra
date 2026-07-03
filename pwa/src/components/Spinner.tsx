import styles from './Spinner.module.css';

/** Spinner de carga. Fuente: docs/design-system §4 (skeletons/loading). */
interface SpinnerProps {
  fullscreen?: boolean;
  label?: string;
}

export function Spinner({ fullscreen, label }: SpinnerProps) {
  return (
    <div className={fullscreen ? styles.fullscreen : styles.inline}>
      <div className={styles.spinner} aria-hidden />
      {label && <span className={styles.label}>{label}</span>}
      <span role="status" hidden>
        {label ?? 'Cargando'}
      </span>
    </div>
  );
}
