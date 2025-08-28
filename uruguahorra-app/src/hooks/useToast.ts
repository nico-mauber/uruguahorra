import { useState, useCallback } from 'react';
import type { ToastType } from '@/components/settings/ToastNotification';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  action?: {
    label: string;
    onPress: () => void;
  };
}

const initialState: ToastState = {
  visible: false,
  message: '',
  type: 'info',
};

export const useToast = () => {
  const [toast, setToast] = useState<ToastState>(initialState);

  const showToast = useCallback((
    message: string,
    type: ToastType = 'info',
    action?: {
      label: string;
      onPress: () => void;
    }
  ) => {
    setToast({
      visible: true,
      message,
      type,
      action,
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  const showSuccess = useCallback((message: string, action?: { label: string; onPress: () => void }) => {
    showToast(message, 'success', action);
  }, [showToast]);

  const showError = useCallback((message: string, action?: { label: string; onPress: () => void }) => {
    showToast(message, 'error', action);
  }, [showToast]);

  const showWarning = useCallback((message: string, action?: { label: string; onPress: () => void }) => {
    showToast(message, 'warning', action);
  }, [showToast]);

  const showInfo = useCallback((message: string, action?: { label: string; onPress: () => void }) => {
    showToast(message, 'info', action);
  }, [showToast]);

  return {
    toast,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};