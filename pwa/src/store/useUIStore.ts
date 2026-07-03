import { create } from 'zustand';

/** UI global. Fuente: docs/architecture/state-management §2.6. */
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms; undefined = persistente (loading)
}

interface UIState {
  isOnline: boolean;
  toasts: ToastItem[];
  swUpdateAvailable: boolean;
  setOnline: (online: boolean) => void;
  showToast: (toast: ToastItem) => void;
  dismissToast: (id: string) => void;
  setSwUpdate: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  toasts: [],
  swUpdateAvailable: false,
  setOnline: (online) => set({ isOnline: online }),
  showToast: (toast) => set((s) => ({ toasts: [...s.toasts, toast] })),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setSwUpdate: (v) => set({ swUpdateAvailable: v }),
}));
