import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { Card, SquadStatsCard } from '@components';
import { useAuth } from '@/contexts';
import { useSquadsStore } from '@/store/useSquadsStore';
import { useClipboard } from '@/hooks/useClipboard';
import { logger, LogModule } from '@/utils/logger';
import { ToastService } from '@/utils/toast';

export default function SquadDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { copyToClipboard } = useClipboard();

  const {
    currentSquad,
    squadMembers,
    isLoading,
    isAddingContribution,
    setCurrentSquad,
    fetchSquadMembers,
    leaveSquad,
    getUserRoleInSquad,
    addSquadContribution,
    updateSquadGoal,
  } = useSquadsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [isLeavingSquad, setIsLeavingSquad] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionDescription, setContributionDescription] = useState('');

  // Estados para editar meta
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalAmount, setGoalAmount] = useState('');
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false);

  // Obtener miembros activos (debe estar antes de cualquier return condicional)
  const members = useMemo(() => squadMembers[id] || [], [squadMembers, id]);

  // Debug: Log de miembros para diagnosticar
  useEffect(() => {
    if (members.length > 0) {
      console.log(
        'Squad members debug:',
        members.map((m) => ({
          userId: m.userId,
          email: m.user?.email,
          hasUser: !!m.user,
        }))
      );
    }
  }, [members]);

  // Función para cargar datos del squad
  const loadSquadDetail = useCallback(async () => {
    if (!id || !user?.id) return;

    try {
      // Buscar el squad en la lista del usuario
      const { userSquads } = useSquadsStore.getState();
      const squad = userSquads.find((s) => s.id === id);

      if (!squad) {
        ToastService.error('Squad no encontrado');
        router.back();
        return;
      }

      setCurrentSquad(squad);
      await fetchSquadMembers(id, true);
    } catch (error) {
      logger.error(LogModule.UI, 'Error cargando detalle del squad', error);
      ToastService.error('Error cargando los datos del grupo');
    }
  }, [id, user?.id, router, setCurrentSquad, fetchSquadMembers]);

  // Cargar datos del squad
  useEffect(() => {
    if (id && user?.id) {
      logger.debug(LogModule.UI, 'Cargando detalle de squad', { squadId: id });
      loadSquadDetail();
    }
  }, [id, user?.id, loadSquadDetail]);

  const handleRefresh = async () => {
    if (!id) return;
    setRefreshing(true);
    try {
      await fetchSquadMembers(id, true);
    } catch (error) {
      logger.error(LogModule.UI, 'Error refrescando squad', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLeaveSquad = () => {
    if (!currentSquad || !user?.id) return;

    const userRole = getUserRoleInSquad(currentSquad.id);
    const isOwner = userRole === 'owner';

    Alert.alert(
      isOwner ? 'Transferir grupo' : 'Salir del grupo',
      isOwner
        ? 'Como creador del grupo, necesitas transferir el liderazgo a otro miembro antes de salir. ¿Quieres transferir el liderazgo?'
        : `¿Estás seguro que quieres salir de "${currentSquad.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: isOwner ? 'Transferir' : 'Salir',
          style: isOwner ? 'default' : 'destructive',
          onPress: isOwner ? handleTransferOwnership : confirmLeaveSquad,
        },
      ]
    );
  };

  const handleTransferOwnership = () => {
    ToastService.info(
      'Función próximamente',
      'La transferencia de liderazgo estará disponible pronto'
    );
  };

  const confirmLeaveSquad = async () => {
    if (!currentSquad || !user?.id) return;

    setIsLeavingSquad(true);
    try {
      await leaveSquad(user.id, currentSquad.id);
      ToastService.success(`Has salido de "${currentSquad.name}"`);
      router.back();
    } catch (error) {
      logger.error(LogModule.UI, 'Error saliendo del squad', error);
      ToastService.error('Error al salir del grupo');
    } finally {
      setIsLeavingSquad(false);
    }
  };

  const handleInviteMembers = () => {
    if (!currentSquad) return;

    Alert.alert(
      'Código de invitación',
      `Comparte este código para invitar nuevos miembros:\n\n${currentSquad.inviteCode}`,
      [
        { text: 'Cerrar' },
        {
          text: 'Copiar',
          onPress: () =>
            copyToClipboard(currentSquad.inviteCode, 'Código copiado'),
        },
      ]
    );
  };

  // Función para agregar contribución
  const handleAddContribution = async () => {
    if (!currentSquad || !user?.id) return;

    const amount = parseFloat(contributionAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    try {
      const contribution = await addSquadContribution({
        squadId: currentSquad.id,
        userId: user.id,
        amount,
        description: contributionDescription.trim() || undefined,
        source: 'manual',
      });

      if (contribution) {
        ToastService.success(
          `¡Contribución agregada!`,
          `$${amount} agregados al pod`
        );
        // Limpiar formulario y cerrar modal
        setContributionAmount('');
        setContributionDescription('');
        setShowContributionModal(false);

        // Refrescar datos
        await loadSquadDetail();
      }
    } catch (error) {
      logger.error(LogModule.UI, 'Error agregando contribución', error);
      ToastService.error('Error al agregar contribución');
    }
  };

  const handleUpdateGoal = async () => {
    if (!currentSquad) return;

    const amount = parseFloat(goalAmount);

    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Ingresa una meta válida');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Usuario no autenticado');
      return;
    }

    try {
      setIsUpdatingGoal(true);
      const success = await updateSquadGoal(currentSquad.id, amount, user.id);

      if (success) {
        ToastService.success(
          '¡Meta actualizada!',
          `Nueva meta: $${amount.toFixed(0)}`
        );
        setGoalAmount('');
        setShowGoalModal(false);
        // Refrescar datos para mostrar la nueva meta
        await loadSquadDetail();
      }
    } catch (error) {
      logger.error(LogModule.UI, 'Error actualizando meta', error);
      ToastService.error('Error al actualizar la meta');
    } finally {
      setIsUpdatingGoal(false);
    }
  };

  if (!currentSquad) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Cargando grupo...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const userRole = getUserRoleInSquad(currentSquad.id);
  // Todos pueden invitar ahora
  const canInvite = true;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Detalle del Grupo
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Squad Info Card */}
        <Card style={styles.squadCard}>
          <View style={styles.squadHeader}>
            <View style={styles.squadInfo}>
              <Text style={[styles.squadName, { color: theme.text }]}>
                {currentSquad.name}
              </Text>
              {currentSquad.description && (
                <Text
                  style={[
                    styles.squadDescription,
                    { color: theme.textSecondary },
                  ]}
                >
                  {currentSquad.description}
                </Text>
              )}
              <View style={styles.squadMeta}>
                <View style={styles.metaItem}>
                  <Ionicons
                    name="people"
                    size={16}
                    color={theme.textSecondary}
                  />
                  <Text
                    style={[styles.metaText, { color: theme.textSecondary }]}
                  >
                    {members.length}/{currentSquad.maxMembers} miembros
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="shield-checkmark" size={16} color="#4A90E2" />
                  <Text
                    style={[styles.metaText, { color: theme.textSecondary }]}
                  >
                    {userRole === 'owner'
                      ? 'Creador'
                      : userRole === 'admin'
                        ? 'Admin'
                        : 'Miembro'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {canInvite && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleInviteMembers}
              >
                <Ionicons name="person-add" size={16} color={theme.primary} />
                <Text
                  style={[styles.actionButtonText, { color: theme.primary }]}
                >
                  Invitar
                </Text>
              </TouchableOpacity>
            )}
            {/* Botón Contribuir */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowContributionModal(true)}
            >
              <Ionicons name="wallet" size={16} color={theme.secondary} />
              <Text
                style={[styles.actionButtonText, { color: theme.secondary }]}
              >
                Contribuir
              </Text>
            </TouchableOpacity>
            {/* Botón Editar Meta */}
            {(canInvite || getUserRoleInSquad(currentSquad.id) === 'owner') && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setGoalAmount((currentSquad.goalAmount || 0).toString());
                  setShowGoalModal(true);
                }}
              >
                <Ionicons name="flag" size={16} color={theme.info} />
                <Text style={[styles.actionButtonText, { color: theme.info }]}>
                  Meta
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, styles.leaveButton]}
              onPress={handleLeaveSquad}
              disabled={isLeavingSquad}
            >
              {isLeavingSquad ? (
                <ActivityIndicator size={16} color={theme.error} />
              ) : (
                <Ionicons name="exit-outline" size={16} color={theme.error} />
              )}
              <Text style={[styles.actionButtonText, { color: theme.error }]}>
                Salir
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Squad Stats Card */}
        <SquadStatsCard squad={currentSquad} members={members} />

        {/* Members Ranking */}
        <Card style={styles.rankingCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Ranking de Ahorros
            </Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text
                style={[styles.loadingText, { color: theme.textSecondary }]}
              >
                Cargando ranking...
              </Text>
            </View>
          ) : members.length > 0 ? (
            <View style={styles.membersList}>
              {members
                .sort((a, b) => b.totalSaved - a.totalSaved)
                .map((member, index) => (
                  <View key={member.id} style={styles.memberItem}>
                    <View style={styles.memberRank}>
                      {index < 3 ? (
                        <Ionicons
                          name={
                            index === 0
                              ? 'trophy'
                              : index === 1
                                ? 'medal'
                                : 'ribbon'
                          }
                          size={20}
                          color={
                            index === 0
                              ? '#FFD700'
                              : index === 1
                                ? '#C0C0C0'
                                : '#CD7F32'
                          }
                        />
                      ) : (
                        <Text
                          style={[
                            styles.rankNumber,
                            { color: theme.textSecondary },
                          ]}
                        >
                          #{index + 1}
                        </Text>
                      )}
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberEmail, { color: theme.text }]}>
                        {member.user?.email
                          ? member.user.email.split('@')[0]
                          : `Usuario ${member.userId.slice(-4)}`}
                        {member.userId === user?.id && (
                          <Text
                            style={[styles.youLabel, { color: theme.primary }]}
                          >
                            {' '}
                            (Tú)
                          </Text>
                        )}
                      </Text>
                      <Text
                        style={[
                          styles.memberRole,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {member.role === 'owner'
                          ? 'Creador'
                          : member.role === 'admin'
                            ? 'Admin'
                            : 'Miembro'}
                      </Text>
                    </View>
                    <View style={styles.memberStats}>
                      <Text
                        style={[styles.memberAmount, { color: theme.text }]}
                      >
                        ${member.totalSaved.toFixed(0)}
                      </Text>
                      <Text
                        style={[
                          styles.memberMonthly,
                          { color: theme.textSecondary },
                        ]}
                      >
                        ${member.monthlySaved.toFixed(0)} este mes
                      </Text>
                    </View>
                  </View>
                ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="people-outline"
                size={48}
                color={theme.textSecondary}
              />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No hay miembros para mostrar
              </Text>
            </View>
          )}
        </Card>
      </ScrollView>

      {/* Modal de Contribución */}
      <Modal
        visible={showContributionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowContributionModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: theme.surface },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Contribuir al Pod
                </Text>
                <TouchableOpacity
                  onPress={() => setShowContributionModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalBody}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>
                    Monto *
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: theme.border,
                        color: theme.text,
                        backgroundColor: theme.background,
                      },
                    ]}
                    value={contributionAmount}
                    onChangeText={setContributionAmount}
                    placeholder="Ej: 100"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />

                  <Text style={[styles.inputLabel, { color: theme.text }]}>
                    Descripción (opcional)
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: theme.border,
                        color: theme.text,
                        backgroundColor: theme.background,
                      },
                    ]}
                    value={contributionDescription}
                    onChangeText={setContributionDescription}
                    placeholder="Ej: Ahorro semanal"
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    numberOfLines={2}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>
              </TouchableWithoutFeedback>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowContributionModal(false)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={handleAddContribution}
                  disabled={isAddingContribution}
                >
                  {isAddingContribution ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={[styles.buttonText, { color: 'white' }]}>
                      Contribuir
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal de Editar Meta */}
      <Modal
        visible={showGoalModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGoalModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: theme.surface },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Editar Meta del Pod
                </Text>
                <TouchableOpacity
                  onPress={() => setShowGoalModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalBody}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>
                    Meta de Ahorro *
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: theme.border,
                        color: theme.text,
                        backgroundColor: theme.background,
                      },
                    ]}
                    value={goalAmount}
                    onChangeText={setGoalAmount}
                    placeholder="Ej: 10000"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>
              </TouchableWithoutFeedback>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowGoalModal(false)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={handleUpdateGoal}
                  disabled={isUpdatingGoal}
                >
                  {isUpdatingGoal ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={[styles.buttonText, { color: 'white' }]}>
                      Actualizar
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  squadCard: {
    margin: 16,
    padding: 20,
  },
  squadHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  squadInfo: {
    flex: 1,
  },
  squadName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  squadDescription: {
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 22,
  },
  squadMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 14,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
    flex: 1,
    minWidth: 100,
    maxWidth: 120,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: 'rgba(0,0,0,0.2)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  leaveButton: {
    borderColor: 'rgba(255, 0, 0, 0.3)',
  },
  rankingCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  membersList: {
    gap: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  memberRank: {
    width: 32,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberEmail: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  youLabel: {
    fontWeight: '600',
  },
  memberRole: {
    fontSize: 14,
  },
  memberStats: {
    alignItems: 'flex-end',
  },
  memberAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  memberMonthly: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white', // Para el botón primario
  },
});
