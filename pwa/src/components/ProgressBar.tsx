import styles from './ProgressBar.module.css';

/** ProgressBar. Fuente: docs/design-system §4. */
interface ProgressBarProps {
  progress: number; // 0-100
  color?: string;
  showLabel?: boolean;
}

export function ProgressBar({ progress, color, showLabel }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, progress));
  return (
    <div
      className={styles.wrap}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {showLabel && <span className={styles.label}>{Math.round(pct)}%</span>}
    </div>
  );
}
