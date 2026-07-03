/**
 * ToastService. Fuente: docs/design-system §4 (API de toasts) + api §5 (handleError).
 * Emite hacia useUIStore; el componente <Toaster/> los renderiza.
 */
import { useUIStore, type ToastType } from '@/store/useUIStore';
import { getErrorMessage } from './errors';

let seq = 0;
function nextId(): string {
  seq += 1;
  return `t-${seq}-${performance.now().toString(36)}`;
}

function push(
  type: ToastType,
  title: string,
  message?: string,
  duration?: number
): string {
  const id = nextId();
  useUIStore.getState().showToast({ id, type, title, message, duration });
  return id;
}

const AUTO = 3000;
const AUTO_ERROR = 5000;

export const ToastService = {
  quickSuccess: (title: string) => push('success', title, undefined, AUTO),
  quickInfo: (title: string) => push('info', title, undefined, AUTO),
  success: (title: string, message?: string) =>
    push('success', title, message, AUTO),
  error: (title: string, message?: string) =>
    push('error', title, message, AUTO_ERROR),
  warning: (title: string, message?: string) =>
    push('warning', title, message, AUTO),
  info: (title: string, message?: string) => push('info', title, message, AUTO),
  /** Toast persistente de carga; devuelve id para dismiss manual. */
  loading: (title: string) => push('loading', title),
  dismiss: (id: string) => useUIStore.getState().dismissToast(id),
  handleError: (error: unknown) =>
    push('error', getErrorMessage(error), undefined, AUTO_ERROR),
  // Helpers de dominio (usados en fases siguientes; definidos aquí para reuso).
  savingSuccess: (amount: number, goalName: string) =>
    push('success', `¡$${amount} ahorrado en «${goalName}»!`, undefined, AUTO),
  welcome: (name: string) =>
    push('success', `¡Hola de nuevo${name ? `, ${name}` : ''}!`, undefined, AUTO),
  levelUp: (level: number) =>
    push('success', `🎉 ¡Subiste a nivel ${level}!`, undefined, AUTO_ERROR),
};
