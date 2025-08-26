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
 *
 * Patrones de vibración según contexto emocional:
 * - Success: Vibración suave y satisfactoria
 * - Warning: Vibración de alerta moderada
 * - Error: Vibración intensa y distintiva
 * - Transaction: Vibración específica para confirmación monetaria
 * - Achievement: Secuencia de vibraciones para logros
 */
export const useHapticFeedback = () => {
  const isHapticsAvailable = Platform.OS !== 'web' && Haptics !== null;

  // Feedback para éxito (transacción creada, objetivo alcanzado)
  const success = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isHapticsAvailable]);

  // Feedback para advertencias (límites, validaciones)
  const warning = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isHapticsAvailable]);

  // Feedback para errores (transacción fallida, validación)
  const error = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isHapticsAvailable]);

  // Feedback ligero para selecciones
  const light = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isHapticsAvailable]);

  // Feedback medio para acciones importantes
  const medium = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isHapticsAvailable]);

  // Feedback fuerte para acciones críticas
  const heavy = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isHapticsAvailable]);

  // Feedback para selección de elementos
  const selection = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isHapticsAvailable]);

  // Feedback especial para transacciones (doble vibración)
  const transaction = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTimeout(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 100);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isHapticsAvailable]);

  // Feedback para logros desbloqueados (secuencia ascendente)
  const achievement = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 100);
      setTimeout(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 200);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isHapticsAvailable]);

  // Feedback para subir de nivel (triple vibración fuerte)
  const levelUp = useCallback(async () => {
    if (!isHapticsAvailable || !Haptics) return;

    try {
      for (let i = 0; i < 3; i++) {
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, i * 150);
      }
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
    isAvailable: isHapticsAvailable,
  };
};
