import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { Card } from './Card';
import { Button } from './Button';
import { useSquadsStore } from '@/store/useSquadsStore';
import { useAuth } from '@/contexts';
import { ToastService } from '@/utils/toast';
import { logger, LogModule } from '@/utils/logger';

interface JoinSquadModalProps {
  visible: boolean;
  onClose: () => void;
  onSquadJoined?: () => void;
}

export const JoinSquadModal: React.FC<JoinSquadModalProps> = ({
  visible,
  onClose,
  onSquadJoined,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { joinSquad, isJoining } = useSquadsStore();
  const screenHeight = Dimensions.get('window').height;

  // Estado del formulario
  const [inviteCode, setInviteCode] = useState('');

  // Validaciones
  const isCodeValid = inviteCode.trim().length >= 6;

  const handleClose = () => {
    if (isJoining) return; // Prevenir cerrar durante unión
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setInviteCode('');
  };

  const handleJoinSquad = async () => {
    if (!user?.id) {
      ToastService.error('Error', 'Usuario no autenticado');
      return;
    }

    if (!isCodeValid) {
      ToastService.warning(
        'Código inválido',
        'Ingresa un código de invitación válido'
      );
      return;
    }

    const cleanCode = inviteCode.trim().toUpperCase();

    logger.start(LogModule.UI, 'Uniéndose a squad desde modal', {
      inviteCode: cleanCode,
    });

    try {
      const success = await joinSquad(user.id, cleanCode);

      if (success) {
        ToastService.success(
          '🎉 ¡Te uniste al pod!',
          'Ahora puedes ahorrar junto a tu equipo'
        );

        onSquadJoined?.();
        handleClose();

        logger.success(
          LogModule.UI,
          'Se unió a squad exitosamente desde modal'
        );
      }
    } catch (error) {
      logger.error(LogModule.UI, 'Error uniéndose a squad desde modal', error);

      // Manejar errores específicos
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';

      if (
        errorMessage.includes('inválido') ||
        errorMessage.includes('inactivo')
      ) {
        ToastService.error(
          'Código inválido',
          'El código de invitación no existe o el pod está inactivo'
        );
      } else if (errorMessage.includes('miembro')) {
        ToastService.warning(
          'Ya eres miembro',
          'Ya perteneces a este pod de ahorro'
        );
      } else if (errorMessage.includes('lleno')) {
        ToastService.warning(
          'Pod completo',
          'Este pod ya alcanzó su límite máximo de miembros'
        );
      } else {
        ToastService.error(
          'Error',
          'No se pudo unir al pod. Intenta nuevamente.'
        );
      }
    }
  };

  const handleCodeChange = (text: string) => {
    // Solo permitir letras y números, convertir a mayúsculas
    const cleanText = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    setInviteCode(cleanText);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} />

        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.background,
              maxHeight: screenHeight * 0.8,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              🔗 Unirse a Pod
            </Text>
            <TouchableOpacity onPress={handleClose} disabled={isJoining}>
              <Ionicons
                name="close"
                size={24}
                color={isJoining ? colors.text.secondary : colors.text.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Formulario */}
          <Card style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.primary }]}>
                Código de Invitación *
              </Text>
              <TextInput
                style={[
                  styles.codeInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border.primary,
                    color: colors.text.primary,
                  },
                ]}
                value={inviteCode}
                onChangeText={handleCodeChange}
                placeholder="ABC123"
                placeholderTextColor={colors.text.secondary}
                maxLength={10}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!isJoining}
                textAlign="center"
              />
              <Text style={[styles.inputInfo, { color: colors.text.secondary }]}>
                Ingresa el código que te compartió tu amigo
              </Text>
            </View>
          </Card>

          {/* Info adicional */}
          <View style={styles.infoSection}>
            <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="people-outline" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text.secondary }]}>
                Al unirte podrás ver el progreso del grupo y competir de forma
                amigable con tus compañeros de ahorro.
              </Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="trophy-outline" size={20} color={colors.success} />
              <Text style={[styles.infoText, { color: colors.text.secondary }]}>
                ¡Ahorrar en grupo es más motivador! Verás rankings y podrás
                celebrar logros juntos.
              </Text>
            </View>
          </View>

          {/* Botones */}
          <View style={styles.buttonContainer}>
            <Button
              title="Cancelar"
              variant="outline"
              onPress={handleClose}
              style={styles.button}
              disabled={isJoining}
            />
            <Button
              title={isJoining ? 'Uniéndose...' : 'Unirse al Pod'}
              variant={isCodeValid ? 'primary' : 'outline'}
              onPress={handleJoinSquad}
              style={styles.button}
              disabled={!isCodeValid || isJoining}
              loading={isJoining}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
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
  formCard: {
    marginBottom: 20,
  },
  inputGroup: {
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  codeInput: {
    borderWidth: 2,
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 4,
    width: '100%',
    marginBottom: 8,
  },
  inputInfo: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  infoSection: {
    marginBottom: 20,
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 16,
  },
});
