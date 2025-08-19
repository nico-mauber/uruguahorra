import Toast from 'react-native-toast-message';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

// Tipo para errores que pueden ser manejados por el sistema de toast
export interface ToastError {
  message?: string;
  code?: string;
  name?: string;
  [key: string]: unknown;
}

interface ToastConfig {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  position?: 'top' | 'bottom';
  onPress?: () => void;
  onHide?: () => void;
}

export class ToastService {
  /**
   * Mostrar toast de éxito
   */
  static success(title: string, message?: string, duration: number = 3000) {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      visibilityTime: duration,
      position: 'top',
      topOffset: 50,
    });
  }

  /**
   * Mostrar toast de error
   */
  static error(title: string, message?: string, duration: number = 4000) {
    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
      visibilityTime: duration,
      position: 'top',
      topOffset: 50,
    });
  }

  /**
   * Mostrar toast de información
   */
  static info(title: string, message?: string, duration: number = 3000) {
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      visibilityTime: duration,
      position: 'top',
      topOffset: 50,
    });
  }

  /**
   * Mostrar toast de advertencia
   */
  static warning(title: string, message?: string, duration: number = 4000) {
    Toast.show({
      type: 'warning',
      text1: title,
      text2: message,
      visibilityTime: duration,
      position: 'top',
      topOffset: 50,
    });
  }

  /**
   * Mostrar toast personalizado
   */
  static show(config: ToastConfig) {
    Toast.show({
      type: config.type,
      text1: config.title,
      text2: config.message,
      visibilityTime: config.duration || 3000,
      position: config.position || 'top',
      topOffset: 50,
      onPress: config.onPress,
      onHide: config.onHide,
    });
  }

  /**
   * Ocultar toast activo
   */
  static hide() {
    Toast.hide();
  }

  /**
   * Toast rápido para operaciones exitosas
   */
  static quickSuccess(message: string) {
    this.success('¡Éxito!', message, 2000);
  }

  /**
   * Toast rápido para errores
   */
  static quickError(message: string) {
    this.error('Error', message, 3000);
  }

  /**
   * Toast para operaciones de ahorro
   */
  static savingSuccess(amount: number, goalName?: string) {
    const message = goalName
      ? `$${amount} agregados a "${goalName}"`
      : `$${amount} ahorrados exitosamente`;

    this.success('¡Bien hecho! 💰', message, 3000);
  }

  /**
   * Toast para nuevos niveles/logros
   */
  static levelUp(newLevel: number) {
    this.success(
      '🎉 ¡Subiste de nivel!',
      `Ahora eres nivel ${newLevel}. ¡Sigue así!`,
      4000
    );
  }

  /**
   * Toast para desafíos completados
   */
  static challengeCompleted(challengeName: string, points: number) {
    this.success(
      '🏆 ¡Desafío completado!',
      `"${challengeName}" - Ganaste ${points} puntos`,
      4000
    );
  }

  /**
   * Toast para metas completadas
   */
  static goalCompleted(goalName: string) {
    this.success(
      '🎯 ¡Meta alcanzada!',
      `¡Felicidades por completar "${goalName}"!`,
      5000
    );
  }

  /**
   * Toast para errores de red
   */
  static networkError() {
    this.error(
      'Sin conexión',
      'Verifica tu conexión a internet e intenta de nuevo',
      4000
    );
  }

  /**
   * Toast para errores de autenticación
   */
  static authError(message?: string) {
    this.error(
      'Error de autenticación',
      message || 'Tu sesión ha expirado. Inicia sesión nuevamente',
      4000
    );
  }

  /**
   * Toast para operaciones de carga
   */
  static loading(message: string = 'Procesando...') {
    this.info('⏳ Cargando', message, 2000);
  }

  /**
   * Toast para recordatorios
   */
  static reminder(title: string, message: string) {
    this.info(`🔔 ${title}`, message, 4000);
  }

  /**
   * Toast para confirmaciones
   */
  static confirmation(message: string) {
    this.success('✅ Confirmado', message, 2500);
  }

  /**
   * Toast para validaciones
   */
  static validation(message: string) {
    this.warning('⚠️ Atención', message, 3500);
  }

  /**
   * Toast para actualizaciones de la app
   */
  static updateAvailable() {
    this.info(
      '🚀 Actualización disponible',
      'Hay una nueva versión de Uruguahorra disponible',
      5000
    );
  }

  /**
   * Toast para bienvenida de nuevos usuarios
   */
  static welcome(userName?: string) {
    const name = userName || 'ahorrista';
    this.success(
      `¡Bienvenido, ${name}! 👋`,
      'Estás listo para comenzar tu journey de ahorro',
      4000
    );
  }

  /**
   * Toast para recordatorio de ahorro diario
   */
  static dailySavingReminder() {
    this.info(
      '💡 Recordatorio diario',
      '¡No olvides hacer tu ahorro de hoy!',
      4000
    );
  }

  /**
   * Toast para cuando se alcanza una racha
   */
  static streakAchieved(days: number) {
    this.success(
      '🔥 ¡Racha activa!',
      `${days} días consecutivos ahorrando. ¡Increíble!`,
      4000
    );
  }

  /**
   * Toast personalizado para diferentes proveedores de error
   */
  static handleError(error: unknown) {
    if (!error) {
      this.quickError('Ha ocurrido un error inesperado');
      return;
    }

    // Errores de Supabase
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const errorCode = (error as ToastError).code;
      switch (errorCode) {
        case '23505':
          this.error('Datos duplicados', 'Este elemento ya existe');
          break;
        case '42501':
          this.authError('No tienes permisos para realizar esta acción');
          break;
        case 'PGRST116':
          this.error('No encontrado', 'El elemento solicitado no existe');
          break;
        default:
          this.error(
            'Error de base de datos',
            (error as ToastError).message || 'Error desconocido'
          );
      }
      return;
    }

    // Errores de red
    if (
      typeof error === 'object' &&
      error !== null &&
      ((error as ToastError).name === 'NetworkError' ||
        (error as ToastError).message?.includes('network'))
    ) {
      this.networkError();
      return;
    }

    // Error genérico
    this.error(
      'Error',
      (typeof error === 'object' && error !== null
        ? (error as ToastError).message
        : undefined) || 'Ha ocurrido un error inesperado'
    );
  }

  /**
   * Toast para operaciones premium
   */
  static premiumRequired(feature: string) {
    this.warning(
      '⭐ Función Premium',
      `"${feature}" está disponible solo para usuarios premium`,
      4000
    );
  }

  /**
   * Toast para límites alcanzados
   */
  static limitReached(limit: string) {
    this.warning(
      '📊 Límite alcanzado',
      `Has alcanzado el límite de ${limit}. Considera actualizar a Premium`,
      5000
    );
  }
}

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Configuración personalizada para los tipos de toast
export const toastConfig = {
  success: (props: { text1: string; text2?: string }) => (
    <View style={[styles.toastContainer, styles.successToast]}>
      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
      <View style={styles.textContainer}>
        <Text style={[styles.title, styles.successTitle]}>{props.text1}</Text>
        {props.text2 ? (
          <Text style={[styles.message, styles.successMessage]}>
            {props.text2}
          </Text>
        ) : null}
      </View>
    </View>
  ),
  error: (props: { text1: string; text2?: string }) => (
    <View style={[styles.toastContainer, styles.errorToast]}>
      <Ionicons name="alert-circle" size={24} color="#EF4444" />
      <View style={styles.textContainer}>
        <Text style={[styles.title, styles.errorTitle]}>{props.text1}</Text>
        {props.text2 ? (
          <Text style={[styles.message, styles.errorMessage]}>
            {props.text2}
          </Text>
        ) : null}
      </View>
    </View>
  ),
  info: (props: { text1: string; text2?: string }) => (
    <View style={[styles.toastContainer, styles.infoToast]}>
      <Ionicons name="information-circle" size={24} color="#3B82F6" />
      <View style={styles.textContainer}>
        <Text style={[styles.title, styles.infoTitle]}>{props.text1}</Text>
        {props.text2 ? (
          <Text style={[styles.message, styles.infoMessage]}>
            {props.text2}
          </Text>
        ) : null}
      </View>
    </View>
  ),
  warning: (props: { text1: string; text2?: string }) => (
    <View style={[styles.toastContainer, styles.warningToast]}>
      <Ionicons name="warning" size={24} color="#F59E0B" />
      <View style={styles.textContainer}>
        <Text style={[styles.title, styles.warningTitle]}>{props.text1}</Text>
        {props.text2 ? (
          <Text style={[styles.message, styles.warningMessage]}>
            {props.text2}
          </Text>
        ) : null}
      </View>
    </View>
  ),
};

const styles = StyleSheet.create({
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    lineHeight: 18,
  },
  // Success styles
  successToast: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  successTitle: {
    color: '#047857',
  },
  successMessage: {
    color: '#065F46',
  },
  // Error styles
  errorToast: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorTitle: {
    color: '#DC2626',
  },
  errorMessage: {
    color: '#991B1B',
  },
  // Info styles
  infoToast: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoTitle: {
    color: '#1D4ED8',
  },
  infoMessage: {
    color: '#1E40AF',
  },
  // Warning styles
  warningToast: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningTitle: {
    color: '#D97706',
  },
  warningMessage: {
    color: '#92400E',
  },
});

export default ToastService;
