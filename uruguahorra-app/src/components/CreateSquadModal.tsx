import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
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

interface CreateSquadModalProps {
  visible: boolean;
  onClose: () => void;
  onSquadCreated?: (squad: {
    id: string;
    name: string;
    inviteCode: string;
  }) => void;
}

export const CreateSquadModal: React.FC<CreateSquadModalProps> = ({
  visible,
  onClose,
  onSquadCreated,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { createSquad, isCreating } = useSquadsStore();
  const screenHeight = Dimensions.get('window').height;

  // Estado del formulario
  const [squadName, setSquadName] = useState('');
  const [squadDescription, setSquadDescription] = useState('');
  const [maxMembers, setMaxMembers] = useState('10');

  // Validaciones
  const isFormValid =
    squadName.trim().length >= 3 && squadName.trim().length <= 50;
  const maxMembersNum = parseInt(maxMembers) || 10;
  const isMaxMembersValid = maxMembersNum >= 2 && maxMembersNum <= 50;

  const handleClose = () => {
    if (isCreating) return; // Prevenir cerrar durante creación
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setSquadName('');
    setSquadDescription('');
    setMaxMembers('10');
  };

  const handleCreateSquad = async () => {
    if (!user?.id) {
      ToastService.error('Error', 'Usuario no autenticado');
      return;
    }

    if (!isFormValid) {
      ToastService.warning(
        'Nombre inválido',
        'El nombre debe tener entre 3 y 50 caracteres'
      );
      return;
    }

    if (!isMaxMembersValid) {
      ToastService.warning(
        'Límite inválido',
        'El número de miembros debe estar entre 2 y 50'
      );
      return;
    }

    logger.start(LogModule.UI, 'Creando squad desde modal', {
      name: squadName.trim(),
      maxMembers: maxMembersNum,
    });

    try {
      const newSquad = await createSquad({
        name: squadName.trim(),
        description: squadDescription.trim() || null,
        ownerId: user.id,
        maxMembers: maxMembersNum,
      });

      if (newSquad) {
        ToastService.success(
          '🎉 Squad creado',
          `"${newSquad.name}" creado exitosamente`
        );

        // Mostrar código de invitación
        Alert.alert(
          '✅ Squad Creado',
          `Tu squad "${newSquad.name}" ha sido creado.\n\n` +
            `Código de invitación: ${newSquad.inviteCode}\n\n` +
            'Comparte este código con tus amigos para que se unan.',
          [{ text: 'Entendido', style: 'default' }]
        );

        onSquadCreated?.(newSquad);
        handleClose();

        logger.success(LogModule.UI, 'Squad creado exitosamente desde modal', {
          squadId: newSquad.id,
          inviteCode: newSquad.inviteCode,
        });
      }
    } catch (error) {
      logger.error(LogModule.UI, 'Error creando squad desde modal', error);
      ToastService.handleError(error);
    }
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
              backgroundColor: theme.background,
              maxHeight: screenHeight * 0.85,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              🏛️ Crear Pod de Ahorro
            </Text>
            <TouchableOpacity onPress={handleClose} disabled={isCreating}>
              <Ionicons
                name="close"
                size={24}
                color={isCreating ? theme.textSecondary : theme.text}
              />
            </TouchableOpacity>
          </View>

          {/* Formulario */}
          <Card style={styles.formCard}>
            {/* Nombre del squad */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                Nombre del Pod *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={squadName}
                onChangeText={setSquadName}
                placeholder="Ej: Vacaciones 2025"
                placeholderTextColor={theme.textSecondary}
                maxLength={50}
                editable={!isCreating}
              />
              <Text style={[styles.inputInfo, { color: theme.textSecondary }]}>
                {squadName.length}/50 caracteres
              </Text>
            </View>

            {/* Descripción (opcional) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                Descripción (opcional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={squadDescription}
                onChangeText={setSquadDescription}
                placeholder="¿Para qué van a ahorrar juntos?"
                placeholderTextColor={theme.textSecondary}
                maxLength={200}
                multiline
                numberOfLines={3}
                editable={!isCreating}
              />
              <Text style={[styles.inputInfo, { color: theme.textSecondary }]}>
                {squadDescription.length}/200 caracteres
              </Text>
            </View>

            {/* Máximo de miembros */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                Máximo de miembros
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={maxMembers}
                onChangeText={setMaxMembers}
                placeholder="10"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                maxLength={2}
                editable={!isCreating}
              />
              <Text style={[styles.inputInfo, { color: theme.textSecondary }]}>
                Entre 2 y 50 miembros
              </Text>
            </View>
          </Card>

          {/* Info adicional */}
          <View style={styles.infoSection}>
            <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
              <Ionicons
                name="information-circle"
                size={20}
                color={theme.primary}
              />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Una vez creado, recibirás un código de invitación para compartir
                con tus amigos.
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
              disabled={isCreating}
            />
            <Button
              title={isCreating ? 'Creando...' : 'Crear Pod'}
              variant={isFormValid && isMaxMembersValid ? 'primary' : 'outline'}
              onPress={handleCreateSquad}
              style={styles.button}
              disabled={!isFormValid || !isMaxMembersValid || isCreating}
              loading={isCreating}
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
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    paddingVertical: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputInfo: {
    fontSize: 12,
    marginTop: 4,
  },
  infoSection: {
    marginBottom: 20,
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
