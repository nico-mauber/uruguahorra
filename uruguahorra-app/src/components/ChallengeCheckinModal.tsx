import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { ChallengeSessionsService } from '@/services/challenge-sessions.service';
import { logger, LogModule } from '@/utils/logger';
import { ToastService } from '@/utils/toast';

interface ChallengeCheckinModalProps {
  visible: boolean;
  onClose: () => void;
  sessionId: string;
  challengeTitle: string;
  userId: string;
  onCheckinComplete?: () => void;
}

export function ChallengeCheckinModal({
  visible,
  onClose,
  sessionId,
  challengeTitle,
  userId,
  onCheckinComplete,
}: ChallengeCheckinModalProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [hasAlreadyCheckedIn, setHasAlreadyCheckedIn] = useState(false);
  const [previousCheckin, setPreviousCheckin] = useState<{
    completed: boolean;
    note?: string;
  } | null>(null);
  const [note, setNote] = useState('');

  // Verificar si ya se hizo check-in hoy
  useEffect(() => {
    if (visible && sessionId && userId) {
      checkTodaysStatus();
    }
  }, [visible, sessionId, userId]);

  const checkTodaysStatus = async () => {
    try {
      setCheckingStatus(true);
      const status = await ChallengeSessionsService.getTodaysCheckinStatus(
        userId,
        sessionId
      );

      setHasAlreadyCheckedIn(status.hasCheckedIn);
      if (status.hasCheckedIn) {
        setPreviousCheckin({
          completed: status.completed || false,
          note: status.note,
        });
        setNote(status.note || '');
      }
    } catch (error) {
      logger.error(LogModule.UI, 'Error verificando check-in de hoy', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleCheckin = async (completed: boolean) => {
    try {
      setLoading(true);

      const result =
        await ChallengeSessionsService.performDailyCheckinAndUpdateProgress(
          userId,
          sessionId,
          completed,
          note.trim() || undefined
        );

      // Mostrar resultado con información de progreso
      if (completed) {
        ToastService.quickSuccess(
          `¡Día completado! 🎉 Progreso: ${Math.round(result.currentProgress)}% (${result.daysCompleted} días)`
        );
      } else {
        ToastService.quickInfo('Check-in registrado');
      }

      // Si se completó el reto completo
      if (result.wasCompleted) {
        setTimeout(() => {
          ToastService.quickSuccess('¡Reto completado! +XP ganado! 🏆');
        }, 1000);
      }

      // Actualizar estado local
      setHasAlreadyCheckedIn(true);
      setPreviousCheckin({ completed, note: note.trim() });

      // Notificar al componente padre
      onCheckinComplete?.();

      onClose();
    } catch (error) {
      logger.error(LogModule.UI, 'Error realizando check-in', error);
      Alert.alert(
        'Error',
        'No se pudo registrar el check-in. Intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNote('');
    onClose();
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={dismissKeyboard}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[styles.modalContent, { backgroundColor: colors.surface }]}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text.primary }]}>
                  Check-in Diario
                </Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Challenge Title */}
              <View style={styles.challengeInfo}>
                <Text
                  style={[
                    styles.challengeTitle,
                    { color: colors.text.primary },
                  ]}
                >
                  {challengeTitle}
                </Text>
                <Text
                  style={[styles.todayLabel, { color: colors.text.secondary }]}
                >
                  Hoy,{' '}
                  {new Date().toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </Text>
              </View>

              {checkingStatus ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text
                    style={[
                      styles.loadingText,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Verificando estado...
                  </Text>
                </View>
              ) : hasAlreadyCheckedIn ? (
                // Mostrar estado del check-in previo
                <View style={styles.alreadyCheckedContainer}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: previousCheckin?.completed
                          ? colors.success || '#4CAF50'
                          : colors.warning || '#FFA500',
                      },
                    ]}
                  >
                    <Ionicons
                      name={previousCheckin?.completed ? 'checkmark' : 'close'}
                      size={20}
                      color="white"
                    />
                    <Text style={styles.statusText}>
                      {previousCheckin?.completed ? 'Cumplido' : 'No cumplido'}
                    </Text>
                  </View>

                  {previousCheckin?.note && (
                    <Text
                      style={[
                        styles.previousNote,
                        { color: colors.text.secondary },
                      ]}
                    >
                      Nota: {previousCheckin.note}
                    </Text>
                  )}

                  <Text
                    style={[
                      styles.alreadyText,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Ya registraste tu check-in para hoy.
                  </Text>
                </View>
              ) : (
                // Formulario de check-in
                <>
                  <Text
                    style={[styles.question, { color: colors.text.primary }]}
                  >
                    ¿Cumpliste con el reto hoy?
                  </Text>

                  {/* Nota opcional */}
                  <TextInput
                    style={[
                      styles.noteInput,
                      {
                        color: colors.text.primary,
                        borderColor: colors.text.secondary,
                        backgroundColor: colors.background,
                      },
                    ]}
                    placeholder="Nota opcional (cómo te fue, dificultades, etc.)"
                    placeholderTextColor={colors.text.secondary}
                    value={note}
                    onChangeText={setNote}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    returnKeyType="done"
                    onSubmitEditing={dismissKeyboard}
                    blurOnSubmit={true}
                    enablesReturnKeyAutomatically={true}
                  />

                  {/* Botones de respuesta */}
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[
                        styles.answerButton,
                        styles.yesButton,
                        { backgroundColor: colors.success || '#4CAF50' },
                      ]}
                      onPress={() => handleCheckin(true)}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={24} color="white" />
                          <Text style={styles.buttonText}>Sí, cumplí</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.answerButton,
                        styles.noButton,
                        { backgroundColor: colors.warning || '#FFA500' },
                      ]}
                      onPress={() => handleCheckin(false)}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <>
                          <Ionicons name="close" size={24} color="white" />
                          <Text style={styles.buttonText}>No cumplí</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  challengeInfo: {
    marginBottom: 24,
    alignItems: 'center',
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  todayLabel: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  alreadyCheckedContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  previousNote: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  alreadyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 24,
    minHeight: 80,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  answerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  yesButton: {
    // backgroundColor set dynamically
  },
  noButton: {
    // backgroundColor set dynamically
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
