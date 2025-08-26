import { useCallback } from 'react';
import { Platform } from 'react-native';

// Lazy import para expo-haptics (solo carga en móvil)
let Haptics: any = null;

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Haptics = require('expo-haptics');
  } catch (error) {
    console.warn('expo-haptics no disponible:', error);
  }
}

/**
 * Hook para feedback háptico con patrones psicológicamente optimizados
 */
export const useHapticFeedback = () => {
  const isHapticsAvailable = Platform.OS !== 'web' && Haptics !== null;

  const success = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isHapticsAvailable]);

  const warning = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isHapticsAvailable]);

  const error = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isHapticsAvailable]);

  const light = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isHapticsAvailable]);

  const medium = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isHapticsAvailable]);

  const heavy = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isHapticsAvailable]);

  const selection = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isHapticsAvailable]);

  const transaction = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isHapticsAvailable]);

  const achievement = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isHapticsAvailable]);

  const levelUp = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isHapticsAvailable]);

  const streakComplete = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isHapticsAvailable]);

  return {
    success,
    warning,
    error,
    light,
    medium,
    heavy,
    selection,
    transaction,
    achievement,
    levelUp,
    streakComplete,
    isAvailable: isHapticsAvailable,
  };
};
