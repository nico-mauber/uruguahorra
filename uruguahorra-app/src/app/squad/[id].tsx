import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { Card, SquadStatsCard, SquadBadges } from '@components';
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
    setCurrentSquad,
    fetchSquadMembers,
    leaveSquad,
    getUserRoleInSquad,
  } = useSquadsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [isLeavingSquad, setIsLeavingSquad] = useState(false);

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

  const members = squadMembers[currentSquad.id] || [];
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
                  <Ionicons
                    name="shield-checkmark"
                    size={16}
                    color="#4A90E2"
                  />
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

        {/* Squad Badges & Achievements */}
        <SquadBadges squad={currentSquad} />

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
                        {member.user?.email || 'Usuario'}
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
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
    minWidth: 100,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: 'rgba(0,0,0,0.2)',
    backgroundColor: 'transparent',
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
});
