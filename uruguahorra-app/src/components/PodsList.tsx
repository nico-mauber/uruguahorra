import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme';
import {
  Card,
  Button,
  ProgressBar,
  CreateSquadModal,
  JoinSquadModal,
} from '@components';
import { useSquadsStore } from '@/store/useSquadsStore';
import { useAuth } from '@/contexts';
import { logger, LogModule } from '@/utils/logger';

import { ViewStyle } from 'react-native';

interface PodsListProps {
  style?: ViewStyle;
}

export const PodsList: React.FC<PodsListProps> = ({ style }) => {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { userSquads, isLoading, fetchUserSquads } = useSquadsStore();

  // Estados para modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Cargar squads del usuario al montar el componente
  useEffect(() => {
    if (user?.id) {
      logger.debug(LogModule.UI, 'Cargando squads del usuario desde PodsList');
      fetchUserSquads(user.id);
    }
  }, [user?.id, fetchUserSquads]);

  const handleSquadCreated = () => {
    // Refrescar la lista después de crear un squad
    if (user?.id) {
      fetchUserSquads(user.id, true);
    }
  };

  const handleSquadJoined = () => {
    // Refrescar la lista después de unirse a un squad
    if (user?.id) {
      fetchUserSquads(user.id, true);
    }
  };

  const handleViewSquadDetail = (squadId: string) => {
    router.push(`/squad/${squadId}`);
  };

  // Si está cargando, mostrar skeleton
  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            🏛️ Pods de Ahorro
          </Text>
          <Text
            style={[styles.sectionSubtitle, { color: colors.text.secondary }]}
          >
            Ahorra junto a otros usuarios
          </Text>
        </View>
        <Card style={styles.loadingCard}>
          <View style={styles.loadingContent}>
            <Text
              style={[styles.loadingText, { color: colors.text.secondary }]}
            >
              Cargando tus pods...
            </Text>
          </View>
        </Card>
      </View>
    );
  }

  // Si no hay squads, mostrar invitación a crear/unirse
  if (userSquads.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            🏛️ Pods de Ahorro
          </Text>
          <Text
            style={[styles.sectionSubtitle, { color: colors.text.secondary }]}
          >
            Ahorra junto a otros usuarios
          </Text>
        </View>

        <Card style={styles.emptyCard}>
          <View style={styles.emptyContent}>
            <Ionicons
              name="people-outline"
              size={48}
              color={colors.text.secondary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              ¡Únete a un Pod de Ahorro!
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.text.secondary }]}
            >
              Ahorra junto a tus amigos y motívense mutuamente para alcanzar sus
              metas.
            </Text>

            <View style={styles.actionButtons}>
              <Button
                title="Crear Pod"
                variant="primary"
                onPress={() => setShowCreateModal(true)}
                style={styles.actionButton}
              />
              <Button
                title="Unirse con Código"
                variant="outline"
                onPress={() => setShowJoinModal(true)}
                style={styles.actionButton}
              />
            </View>
          </View>
        </Card>

        {/* Modales */}
        <CreateSquadModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSquadCreated={handleSquadCreated}
        />
        <JoinSquadModal
          visible={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          onSquadJoined={handleSquadJoined}
        />
      </View>
    );
  }

  // Mostrar lista de squads
  return (
    <View style={[styles.container, style]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          🏛️ Pods de Ahorro ({userSquads.length})
        </Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <Ionicons
            name="add-circle-outline"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.squadsList}
      >
        {userSquads.map((squad) => (
          <Card key={squad.id} style={styles.squadCard}>
            <View style={styles.squadHeader}>
              <Text style={[styles.squadName, { color: colors.text.primary }]}>
                {squad.name}
              </Text>
              <View style={styles.roleIndicator}>
                <Text style={[styles.roleText, { color: colors.primary }]}>
                  {squad.memberRole === 'owner'
                    ? '👑'
                    : squad.memberRole === 'admin'
                      ? '⭐'
                      : '👤'}
                </Text>
              </View>
            </View>

            {squad.description && (
              <Text
                style={[
                  styles.squadDescription,
                  { color: colors.text.secondary },
                ]}
              >
                {squad.description}
              </Text>
            )}

            <View style={styles.squadStats}>
              <Text
                style={[styles.memberCount, { color: colors.text.secondary }]}
              >
                👥 {squad.memberCount}/{squad.maxMembers} miembros
              </Text>
            </View>

            {/* Progreso real del pod */}
            <View style={styles.progressSection}>
              {squad.goalAmount && squad.goalAmount > 0 ? (
                <>
                  <ProgressBar
                    progress={Math.min(
                      ((squad.totalSquadSaved || 0) / squad.goalAmount) * 100,
                      100
                    )}
                    height={8}
                    color={colors.primary}
                    backgroundColor={colors.border.primary}
                  />
                  <Text
                    style={[
                      styles.progressText,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {Math.round(
                      ((squad.totalSquadSaved || 0) / squad.goalAmount) * 100
                    )}
                    % de la meta grupal
                  </Text>
                  <Text
                    style={[
                      styles.progressAmount,
                      { color: colors.text.tertiary, fontSize: 11 },
                    ]}
                  >
                    ${squad.totalSquadSaved?.toFixed(0) || 0} / $
                    {squad.goalAmount.toFixed(0)}
                  </Text>
                </>
              ) : (
                <Text
                  style={[
                    styles.progressText,
                    { color: colors.text.secondary },
                  ]}
                >
                  Sin meta definida
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => handleViewSquadDetail(squad.id)}
            >
              <Text style={[styles.viewButtonText, { color: colors.primary }]}>
                Ver Detalle →
              </Text>
            </TouchableOpacity>
          </Card>
        ))}

        {/* Botón para unirse a más pods */}
        <Card style={[styles.squadCard, styles.addCard]}>
          <View style={styles.addCardContent}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowJoinModal(true)}
            >
              <Ionicons name="add" size={32} color={colors.primary} />
              <Text style={[styles.addButtonText, { color: colors.primary }]}>
                Unirse con Código
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>

      {/* Modales */}
      <CreateSquadModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSquadCreated={handleSquadCreated}
      />
      <JoinSquadModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSquadJoined={handleSquadJoined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },

  // Loading state
  loadingCard: {
    padding: 20,
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },

  // Empty state
  emptyCard: {
    padding: 24,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },

  // Squads list
  squadsList: {
    paddingHorizontal: 4,
  },
  squadCard: {
    width: 280,
    maxHeight: 200,
    marginRight: 16,
    padding: 16,
  },
  squadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  squadName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  roleIndicator: {
    marginLeft: 8,
  },
  roleText: {
    fontSize: 16,
  },
  squadDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 12,
    maxHeight: 36,
    overflow: 'hidden',
  },
  squadStats: {
    marginBottom: 12,
  },
  memberCount: {
    fontSize: 12,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressText: {
    fontSize: 12,
    marginTop: 4,
  },
  progressAmount: {
    fontSize: 11,
    marginTop: 2,
  },
  viewButton: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Add card
  addCard: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 2,
  },
  addCardContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    alignItems: 'center',
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
