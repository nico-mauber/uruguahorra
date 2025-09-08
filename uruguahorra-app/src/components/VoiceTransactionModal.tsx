import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@theme';
import { AudioTransactionComponent } from './AudioTransactionComponent';
import { Card, Button, ProgressBar } from '@components';
import { VoiceTransactionProcessor } from '@/services/ai/VoiceTransactionProcessor';
import { logger, LogModule } from '@/utils/logger';
import { ToastService } from '@/utils/toast';
import {
  VoiceTransactionStep,
  VoiceTransactionProgress,
  VoiceTransactionResult,
  ParsedTransaction,
  AudioTranscription,
} from '@/types/voice-transaction.types';
import { Transaction } from '@/schemas';

interface VoiceTransactionModalProps {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onTransactionCreated?: (transaction: Transaction) => void;
}

export const VoiceTransactionModal: React.FC<VoiceTransactionModalProps> = ({
  visible,
  userId,
  onClose,
  onTransactionCreated,
}) => {
  const { colors } = useTheme();

  // State management
  const [currentStep, setCurrentStep] = useState<VoiceTransactionStep>('idle');
  const [progress, setProgress] = useState<VoiceTransactionProgress>({
    currentStep: 'idle',
    progress: 0,
    message: 'Listo para grabar',
  });

  const [result, setResult] = useState<VoiceTransactionResult | null>(null);
  const [editableTransaction, setEditableTransaction] =
    useState<ParsedTransaction | null>(null);

  // Initialize processor progress callback
  useEffect(() => {
    VoiceTransactionProcessor.setProgressCallback((progressUpdate) => {
      setProgress(progressUpdate);
      setCurrentStep(progressUpdate.currentStep);
    });

    return () => {
      VoiceTransactionProcessor.setProgressCallback(() => {});
    };
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      resetState();
    }
  }, [visible]);

  const resetState = () => {
    setCurrentStep('idle');
    setProgress({
      currentStep: 'idle',
      progress: 0,
      message: 'Listo para grabar',
    });
    setResult(null);
    setEditableTransaction(null);
  };

  const handleRecordingComplete = async (audioUri: string) => {
    try {
      setCurrentStep('transcribing');
      logger.info(LogModule.TRANSACTIONS, 'Processing voice transaction', {
        audioUri,
      });

      const transactionResult =
        await VoiceTransactionProcessor.processVoiceTransaction(
          audioUri,
          userId
        );

      setResult(transactionResult);

      if (transactionResult.success) {
        // Transaction was created successfully
        setCurrentStep('success');
        ToastService.quickSuccess('¡Transacción creada por voz!');

        // Close modal after a short delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else if (
        transactionResult.needsConfirmation &&
        transactionResult.parsedTransaction
      ) {
        // Need user confirmation
        setCurrentStep('confirming');
        setEditableTransaction({ ...transactionResult.parsedTransaction });
      } else {
        // Error occurred
        setCurrentStep('error');
        ToastService.handleError(
          new Error(transactionResult.error || 'Error procesando audio')
        );

        // Reset to idle after showing error
        setTimeout(() => {
          setCurrentStep('idle');
        }, 3000);
      }
    } catch (error) {
      logger.error(LogModule.TRANSACTIONS, 'Voice transaction failed', error);
      setCurrentStep('error');
      ToastService.handleError(error);

      setTimeout(() => {
        setCurrentStep('idle');
      }, 3000);
    }
  };

  const handleConfirmTransaction = async () => {
    if (!editableTransaction) return;

    try {
      setCurrentStep('creating');

      const transaction =
        await VoiceTransactionProcessor.createConfirmedTransaction(
          editableTransaction,
          userId
        );

      setCurrentStep('success');
      ToastService.quickSuccess('¡Transacción confirmada y creada!');
      onTransactionCreated?.(transaction);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Failed to create confirmed transaction',
        error
      );
      ToastService.handleError(error);
      setCurrentStep('error');
    }
  };

  const handleEditTransaction = (
    field: keyof ParsedTransaction,
    value: any
  ) => {
    if (!editableTransaction) return;

    setEditableTransaction((prev) =>
      prev
        ? {
            ...prev,
            [field]: value,
          }
        : null
    );
  };

  const handleRetry = () => {
    resetState();
  };

  const handleClose = () => {
    if (
      currentStep === 'recording' ||
      currentStep === 'transcribing' ||
      currentStep === 'parsing'
    ) {
      Alert.alert(
        'Procesando audio',
        '¿Estás seguro de que quieres cancelar? El audio se está procesando.',
        [
          { text: 'Continuar', style: 'cancel' },
          { text: 'Cancelar', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'idle':
        return 'Transacción por Voz';
      case 'recording':
        return 'Grabando...';
      case 'transcribing':
        return 'Transcribiendo audio...';
      case 'parsing':
        return 'Analizando transacción...';
      case 'confirming':
        return 'Confirmar transacción';
      case 'creating':
        return 'Creando transacción...';
      case 'success':
        return '¡Éxito!';
      case 'error':
        return 'Error';
      default:
        return 'Transacción por Voz';
    }
  };

  const renderConfirmationSection = () => {
    if (!editableTransaction || !result) return null;

    return (
      <View style={styles.confirmationSection}>
        <Card style={styles.transactionPreview}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Transacción detectada:
          </Text>

          <View style={styles.transactionDetails}>
            <View style={styles.detailRow}>
              <Text
                style={[styles.detailLabel, { color: colors.text.secondary }]}
              >
                Tipo:
              </Text>
              <Text
                style={[styles.detailValue, { color: colors.text.primary }]}
              >
                {editableTransaction.type === 'expense' ? 'Gasto' : 'Ingreso'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text
                style={[styles.detailLabel, { color: colors.text.secondary }]}
              >
                Monto:
              </Text>
              <Text
                style={[styles.detailValue, { color: colors.text.primary }]}
              >
                ${editableTransaction.amount}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text
                style={[styles.detailLabel, { color: colors.text.secondary }]}
              >
                Categoría:
              </Text>
              <Text
                style={[styles.detailValue, { color: colors.text.primary }]}
              >
                {editableTransaction.suggestedCategory?.emoji}{' '}
                {editableTransaction.category}
              </Text>
            </View>

            {editableTransaction.description && (
              <View style={styles.detailRow}>
                <Text
                  style={[styles.detailLabel, { color: colors.text.secondary }]}
                >
                  Descripción:
                </Text>
                <Text
                  style={[styles.detailValue, { color: colors.text.primary }]}
                >
                  {editableTransaction.description}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.confidenceSection}>
            <Text
              style={[styles.confidenceLabel, { color: colors.text.secondary }]}
            >
              Confianza: {Math.round(editableTransaction.confidence * 100)}%
            </Text>
            <ProgressBar
              progress={editableTransaction.confidence * 100}
              color={
                editableTransaction.confidence > 0.8
                  ? colors.success
                  : editableTransaction.confidence > 0.6
                    ? '#FFA500'
                    : colors.error
              }
              showLabel={false}
            />
          </View>

          {result.transcription && (
            <View style={styles.transcriptionSection}>
              <Text
                style={[
                  styles.transcriptionLabel,
                  { color: colors.text.secondary },
                ]}
              >
                Audio transcrito:
              </Text>
              <Text
                style={[
                  styles.transcriptionText,
                  { color: colors.text.primary },
                ]}
              >
                "{result.transcription.text}"
              </Text>
            </View>
          )}
        </Card>

        <View style={styles.confirmationButtons}>
          <Button
            title="Corregir"
            variant="outline"
            onPress={() => {
              // TODO: Implementar edición de transacción
              Alert.alert(
                'Próximamente',
                'La edición manual estará disponible pronto'
              );
            }}
            style={{ flex: 1, marginRight: 8 }}
          />

          <Button
            title="Confirmar"
            variant="primary"
            onPress={handleConfirmTransaction}
            style={{ flex: 1, marginLeft: 8 }}
          />
        </View>
      </View>
    );
  };

  const styles = StyleSheet.create({
    modal: {
      flex: 1,
      backgroundColor: colors.background,
    },

    container: {
      flex: 1,
      padding: 20,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },

    title: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text.primary,
      flex: 1,
      textAlign: 'center',
    },

    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },

    content: {
      flex: 1,
      justifyContent: 'center',
    },

    progressSection: {
      marginBottom: 30,
    },

    progressCard: {
      padding: 20,
      alignItems: 'center',
    },

    progressMessage: {
      fontSize: 16,
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: 16,
    },

    progressIndicator: {
      width: '100%',
      marginBottom: 10,
    },

    confirmationSection: {
      marginTop: 20,
    },

    transactionPreview: {
      marginBottom: 20,
    },

    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 16,
    },

    transactionDetails: {
      marginBottom: 16,
    },

    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.primary,
    },

    detailLabel: {
      fontSize: 14,
      fontWeight: '500',
    },

    detailValue: {
      fontSize: 14,
      fontWeight: '600',
    },

    confidenceSection: {
      marginTop: 12,
      marginBottom: 16,
    },

    confidenceLabel: {
      fontSize: 12,
      marginBottom: 8,
    },

    transcriptionSection: {
      marginTop: 16,
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 8,
    },

    transcriptionLabel: {
      fontSize: 12,
      marginBottom: 8,
    },

    transcriptionText: {
      fontSize: 14,
      fontStyle: 'italic',
      lineHeight: 20,
    },

    confirmationButtons: {
      flexDirection: 'row',
      gap: 16,
    },

    errorSection: {
      alignItems: 'center',
      padding: 20,
    },

    errorText: {
      fontSize: 16,
      color: colors.error,
      textAlign: 'center',
      marginBottom: 20,
    },

    successSection: {
      alignItems: 'center',
      padding: 20,
    },

    successIcon: {
      marginBottom: 16,
    },

    successText: {
      fontSize: 18,
      color: colors.success,
      textAlign: 'center',
      fontWeight: '600',
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.modal} edges={['top']}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ width: 40 }} />
            <Text style={styles.title}>{getStepTitle()}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Progress Section */}
            {(currentStep === 'transcribing' ||
              currentStep === 'parsing' ||
              currentStep === 'creating') && (
              <View style={styles.progressSection}>
                <Card style={styles.progressCard}>
                  <Text style={styles.progressMessage}>{progress.message}</Text>
                  <ProgressBar
                    progress={progress.progress}
                    color={colors.primary}
                    style={styles.progressIndicator}
                    showLabel
                  />
                </Card>
              </View>
            )}

            {/* Audio Recording Component */}
            {(currentStep === 'idle' || currentStep === 'recording') && (
              <AudioTransactionComponent
                onRecordingComplete={handleRecordingComplete}
                currentStep={currentStep}
                disabled={currentStep !== 'idle'}
              />
            )}

            {/* Confirmation Section */}
            {currentStep === 'confirming' && renderConfirmationSection()}

            {/* Success Section */}
            {currentStep === 'success' && (
              <View style={styles.successSection}>
                <Ionicons
                  name="checkmark-circle"
                  size={64}
                  color={colors.success}
                  style={styles.successIcon}
                />
                <Text style={styles.successText}>
                  ¡Transacción creada exitosamente!
                </Text>
              </View>
            )}

            {/* Error Section */}
            {currentStep === 'error' && (
              <View style={styles.errorSection}>
                <Ionicons name="alert-circle" size={64} color={colors.error} />
                <Text style={styles.errorText}>
                  {result?.error || 'Error procesando la transacción'}
                </Text>
                <Button
                  title="Intentar de nuevo"
                  variant="outline"
                  onPress={handleRetry}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};
