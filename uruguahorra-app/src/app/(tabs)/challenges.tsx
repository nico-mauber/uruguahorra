import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { ChallengeCategoriesService } from '@/services/challenge-categories.service';
import { ChallengeSessionsService } from '@/services/challenge-sessions.service';
import type {
  ChallengeCategory,
  Challenge,
  UserChallengeSession,
  ChallengeDurationType,
} from '@/types/challenge-system.types';
import { logger, LogModule } from '@/utils/logger';
import { useMultipleChallengeProgress } from '@/hooks/useChallengeProgress';
import { ChallengeCheckinModal } from '@/components/ChallengeCheckinModal';

export default function ChallengesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  // Estados
  const [categories, setCategories] = useState<ChallengeCategory[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeSessions, setActiveSessions] = useState<UserChallengeSession[]>(
    []
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(
    null
  );
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<UserChallengeSession | null>(null);

  // Hook para obtener progreso real de sesiones activas
  const activeSessionIds = activeSessions.map((session) => session.id);
  const challengeProgressData = useMultipleChallengeProgress(activeSessionIds);

  // Cargar datos iniciales
  const loadInitialData = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      logger.start(LogModule.UI, 'Loading challenges data');

      // Cargar categorías y sesiones activas en paralelo
      const [categoriesData, activeSessionsData] = await Promise.all([
        ChallengeCategoriesService.getActiveCategories(),
        ChallengeSessionsService.getUserActiveSessions(userId),
      ]);

      setCategories(categoriesData);
      setActiveSessions(activeSessionsData);

      // Cargar retos de la primera categoría por defecto
      if (categoriesData.length > 0) {
        const firstCategory = categoriesData[0];
        setSelectedCategory(firstCategory.id);
        const challengesData =
          await ChallengeCategoriesService.getChallengesByCategory(
            firstCategory.id
          );
        setChallenges(challengesData);
      }

      logger.success(LogModule.UI, 'Challenges data loaded successfully');
    } catch (error) {
      logger.error(LogModule.UI, 'Failed to load challenges data', error);
      Alert.alert(
        'Error',
        'No se pudieron cargar los retos. Intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  }, []); // Sin dependencias ya que recibe userId como parámetro

  useEffect(() => {
    if (!user?.id) return;

    loadInitialData(user.id);
  }, [user?.id, loadInitialData]);

  const handleCategorySelect = async (categoryId: string) => {
    try {
      setSelectedCategory(categoryId);
      logger.start(LogModule.UI, 'Loading challenges for category', {
        categoryId,
      });

      const challengesData =
        await ChallengeCategoriesService.getChallengesByCategory(categoryId);
      setChallenges(challengesData);

      logger.success(LogModule.UI, 'Category challenges loaded');
    } catch (error) {
      logger.error(LogModule.UI, 'Failed to load category challenges', error);
      Alert.alert(
        'Error',
        'No se pudieron cargar los retos de esta categoría.'
      );
    }
  };

  const handleStartChallenge = async (
    challengeId: string,
    durationType: ChallengeDurationType
  ) => {
    if (!user?.id) return;

    try {
      logger.start(LogModule.UI, 'Starting challenge session', {
        challengeId,
        durationType,
      });

      const sessionId = await ChallengeSessionsService.startChallengeSession({
        userId: user.id,
        challengeId,
        durationType,
      });

      logger.success(LogModule.UI, 'Challenge session started', { sessionId });

      // Recargar sesiones activas
      const updatedSessions =
        await ChallengeSessionsService.getUserActiveSessions(user.id);
      setActiveSessions(updatedSessions);

      Alert.alert('¡Reto iniciado!', 'Tu reto ha comenzado. ¡Buena suerte!');
    } catch (error) {
      logger.error(LogModule.UI, 'Failed to start challenge session', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      Alert.alert('Error', `No se pudo iniciar el reto: ${errorMessage}`);
    }
  };

  const showDurationSelector = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setShowDurationModal(true);
  };

  const closeDurationModal = () => {
    setShowDurationModal(false);
    setSelectedChallenge(null);
  };

  const selectDuration = async (durationType: ChallengeDurationType) => {
    if (selectedChallenge) {
      closeDurationModal();
      await handleStartChallenge(selectedChallenge.id, durationType);
    }
  };

  const handleActiveSessionClick = (session: UserChallengeSession) => {
    if (!user?.id) return;

    setSelectedSession(session);
    setShowCheckinModal(true);
  };

  const handleCheckinComplete = async () => {
    if (!user?.id) return;

    // Recargar sesiones activas después del check-in
    try {
      const updatedSessions =
        await ChallengeSessionsService.getUserActiveSessions(user.id);
      setActiveSessions(updatedSessions);
    } catch (error) {
      logger.error(
        LogModule.UI,
        'Error recargando sesiones después de check-in',
        error
      );
    }

    setShowCheckinModal(false);
    setSelectedSession(null);
  };

  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <Text style={[styles.errorText, { color: colors.text.primary }]}>
          Debes iniciar sesión para ver los retos
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView style={styles.scrollContainer}>
        {/* Header con sesiones activas */}
        <View
          style={[styles.activeHeader, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Retos Activos ({activeSessions.length}/5)
          </Text>
          {activeSessions.length === 0 ? (
            <Text
              style={[styles.noActiveText, { color: colors.text.secondary }]}
            >
              No tienes retos activos. ¡Selecciona uno para comenzar!
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {activeSessions.map((session) => {
                const progressData = challengeProgressData[session.id];
                const displayProgress =
                  progressData?.currentProgress ?? session.progress;
                const daysInfo = progressData
                  ? `${progressData.daysCompleted}/${progressData.totalDaysRequired} días`
                  : '';

                return (
                  <TouchableOpacity
                    key={session.id}
                    style={[
                      styles.activeSessionCard,
                      { backgroundColor: colors.background },
                      !progressData?.isOnTrack &&
                        progressData?.currentProgress > 0 && {
                          borderLeftWidth: 3,
                          borderLeftColor: colors.warning || '#FFA500',
                        },
                    ]}
                    onPress={() => handleActiveSessionClick(session)}
                  >
                    <Text
                      style={[
                        styles.activeSessionTitle,
                        { color: colors.text.primary },
                      ]}
                      numberOfLines={2}
                    >
                      {session.challenge?.title || 'Reto'}
                    </Text>
                    <Text
                      style={[
                        styles.activeSessionProgress,
                        { color: colors.primary },
                      ]}
                    >
                      {Math.round(displayProgress)}% completado
                    </Text>
                    {daysInfo && (
                      <Text
                        style={[
                          styles.activeSessionDays,
                          { color: colors.text.secondary },
                        ]}
                      >
                        {daysInfo}
                      </Text>
                    )}
                    {progressData &&
                      !progressData.isOnTrack &&
                      progressData.currentProgress > 0 && (
                        <Text
                          style={[
                            styles.warningText,
                            { color: colors.warning || '#FFA500' },
                          ]}
                        >
                          ⚠️ Atraso
                        </Text>
                      )}

                    {/* Indicador de que es clickeable */}
                    <View style={styles.clickIndicator}>
                      <Ionicons
                        name="finger-print"
                        size={16}
                        color={colors.text.secondary}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Categorías */}
        <View style={styles.categoriesSection}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Categorías
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor:
                      selectedCategory === category.id
                        ? colors.primary
                        : colors.surface,
                  },
                ]}
                onPress={() => handleCategorySelect(category.id)}
              >
                <Ionicons
                  name={
                    (category.icon as keyof typeof Ionicons.glyphMap) ||
                    'help-circle'
                  }
                  size={24}
                  color={
                    selectedCategory === category.id
                      ? colors.surface
                      : colors.text.primary
                  }
                />
                <Text
                  style={[
                    styles.categoryName,
                    {
                      color:
                        selectedCategory === category.id
                          ? colors.surface
                          : colors.text.primary,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Retos disponibles */}
        <View style={styles.challengesSection}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Retos Disponibles
          </Text>
          {loading ? (
            <Text
              style={[styles.loadingText, { color: colors.text.secondary }]}
            >
              Cargando retos...
            </Text>
          ) : challenges.length === 0 ? (
            <Text
              style={[
                styles.noChallengesText,
                { color: colors.text.secondary },
              ]}
            >
              No hay retos disponibles en esta categoría
            </Text>
          ) : (
            challenges.map((challenge) => {
              const isActive = activeSessions.some(
                (session) => session.challenge_id === challenge.id
              );

              return (
                <TouchableOpacity
                  key={challenge.id}
                  style={[
                    styles.challengeCard,
                    { backgroundColor: colors.surface },
                    isActive && { opacity: 0.6 },
                  ]}
                  onPress={() => {
                    if (isActive) {
                      Alert.alert(
                        'Reto ya activo',
                        'Este reto ya está en tu lista de retos activos. Ve a la sección "Retos Activos" para ver tu progreso.',
                        [{ text: 'Entendido', style: 'default' }]
                      );
                    } else if (activeSessions.length >= 5) {
                      Alert.alert(
                        'Límite alcanzado',
                        'Ya tienes 5 retos activos. Para agregar uno nuevo, completa o cancela alguno de los retos activos.',
                        [{ text: 'Entendido', style: 'default' }]
                      );
                    } else {
                      showDurationSelector(challenge);
                    }
                  }}
                  disabled={activeSessions.length >= 5 && !isActive}
                >
                  <View style={styles.challengeHeader}>
                    <Text
                      style={[
                        styles.challengeTitle,
                        { color: colors.text.primary },
                      ]}
                    >
                      {challenge.title}
                    </Text>
                    <View
                      style={[
                        styles.difficultyBadge,
                        {
                          backgroundColor: getDifficultyColor(
                            challenge.difficulty
                          ),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.difficultyText,
                          { color: colors.surface },
                        ]}
                      >
                        {challenge.difficulty}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.challengeDescription,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {challenge.description}
                  </Text>

                  <View style={styles.challengeFooter}>
                    <Text style={[styles.xpReward, { color: colors.primary }]}>
                      +{challenge.xp_reward} XP
                    </Text>
                    {isActive ? (
                      <Text
                        style={[styles.activeStatus, { color: colors.success }]}
                      >
                        ✓ Activo
                      </Text>
                    ) : activeSessions.length >= 5 ? (
                      <Text
                        style={[
                          styles.disabledStatus,
                          { color: colors.text.secondary },
                        ]}
                      >
                        Límite alcanzado
                      </Text>
                    ) : (
                      <Ionicons
                        name="add-circle"
                        size={24}
                        color={colors.primary}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Modal de check-in diario */}
      {selectedSession && (
        <ChallengeCheckinModal
          visible={showCheckinModal}
          onClose={() => setShowCheckinModal(false)}
          sessionId={selectedSession.id}
          challengeTitle={selectedSession.challenge?.title || 'Reto'}
          userId={user.id}
          onCheckinComplete={handleCheckinComplete}
        />
      )}

      {/* Modal de selección de duración */}
      <Modal
        visible={showDurationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeDurationModal}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                {selectedChallenge?.title}
              </Text>
              <TouchableOpacity
                onPress={closeDurationModal}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={[styles.modalSubtitle, { color: colors.text.secondary }]}
            >
              Elige la duración de tu reto:
            </Text>

            <View style={styles.durationOptions}>
              <TouchableOpacity
                style={[
                  styles.durationButton,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => selectDuration('1_week')}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text
                  style={[styles.durationText, { color: colors.text.primary }]}
                >
                  1 semana
                </Text>
                <Text
                  style={[
                    styles.durationSubtext,
                    { color: colors.text.secondary },
                  ]}
                >
                  7 días
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.durationButton,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => selectDuration('15_days')}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text
                  style={[styles.durationText, { color: colors.text.primary }]}
                >
                  15 días
                </Text>
                <Text
                  style={[
                    styles.durationSubtext,
                    { color: colors.text.secondary },
                  ]}
                >
                  2 semanas
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.durationButton,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => selectDuration('30_days')}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text
                  style={[styles.durationText, { color: colors.text.primary }]}
                >
                  30 días
                </Text>
                <Text
                  style={[
                    styles.durationSubtext,
                    { color: colors.text.secondary },
                  ]}
                >
                  1 mes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.durationButton,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => selectDuration('1_year')}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text
                  style={[styles.durationText, { color: colors.text.primary }]}
                >
                  1 año
                </Text>
                <Text
                  style={[
                    styles.durationSubtext,
                    { color: colors.text.secondary },
                  ]}
                >
                  365 días
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.cancelButton,
                { borderColor: colors.text.secondary },
              ]}
              onPress={closeDurationModal}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: colors.text.secondary },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case 'easy':
      return '#4CAF50';
    case 'medium':
      return '#FF9800';
    case 'hard':
      return '#F44336';
    case 'expert':
      return '#9C27B0';
    default:
      return '#757575';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  activeHeader: {
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  noActiveText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  activeSessionCard: {
    width: 150,
    padding: 12,
    marginRight: 12,
    borderRadius: 8,
    minHeight: 80,
  },
  activeSessionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  activeSessionProgress: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeSessionDays: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 4,
  },
  warningText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  clickIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    opacity: 0.5,
  },
  categoriesSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoriesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 80,
    maxWidth: 100,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  challengesSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
  },
  noChallengesText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
  },
  challengeCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  difficultyBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  challengeDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpReward: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  activeStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  disabledStatus: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  durationOptions: {
    gap: 12,
    marginBottom: 20,
  },
  durationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  durationText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  durationSubtext: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  cancelButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
