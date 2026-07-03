import { useEffect } from 'react';
import styles from './Toast.module.css';
import { useUIStore, type ToastItem } from '@/store/useUIStore';

/** Renderiza los toasts activos del store. Fuente: docs/design-system §4. */
function ToastRow({ toast }: { toast: ToastItem }) {
  const dismiss = useUIStore((s) => s.dismissToast);

  useEffect(() => {
    if (!toast.duration) return;
    const t = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, dismiss]);

  return (
    <div
      className={[styles.toast, styles[toast.type]].join(' ')}
      role={toast.type === 'error' ? 'alert' : 'status'}
    >
      {toast.type === 'loading' && <span className={styles.spinner} aria-hidden />}
      <div className={styles.body}>
        <div className={styles.title}>{toast.title}</div>
        {toast.message && <div className={styles.message}>{toast.message}</div>}
      </div>
    </div>
  );
}

export function Toaster() {
  const toasts = useUIStore((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className={styles.container} aria-live="polite">
      {toasts.map((t) => (
        <ToastRow key={t.id} toast={t} />
      ))}
    </div>
  );
}
