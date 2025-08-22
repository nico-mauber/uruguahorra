import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
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

export default function ChallengesScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();

  // Estados
  const [categories, setCategories] = useState<ChallengeCategory[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeSessions, setActiveSessions] = useState<UserChallengeSession[]>(
    []
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    Alert.alert(challenge.title, 'Elige la duración de tu reto:', [
      {
        text: '1 semana',
        onPress: () => handleStartChallenge(challenge.id, '1_week'),
      },
      {
        text: '15 días',
        onPress: () => handleStartChallenge(challenge.id, '15_days'),
      },
      {
        text: '30 días',
        onPress: () => handleStartChallenge(challenge.id, '30_days'),
      },
      {
        text: '1 año',
        onPress: () => handleStartChallenge(challenge.id, '1_year'),
      },
      {
        text: 'Cancelar',
        style: 'cancel',
      },
    ]);
  };

  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <Text style={[styles.errorText, { color: theme.text }]}>
          Debes iniciar sesión para ver los retos
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView style={styles.scrollContainer}>
        {/* Header con sesiones activas */}
        <View style={[styles.activeHeader, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Retos Activos ({activeSessions.length}/5)
          </Text>
          {activeSessions.length === 0 ? (
            <Text style={[styles.noActiveText, { color: theme.textSecondary }]}>
              No tienes retos activos. ¡Selecciona uno para comenzar!
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {activeSessions.map((session) => (
                <View
                  key={session.id}
                  style={[
                    styles.activeSessionCard,
                    { backgroundColor: theme.background },
                  ]}
                >
                  <Text
                    style={[styles.activeSessionTitle, { color: theme.text }]}
                    numberOfLines={2}
                  >
                    {session.challenge?.title || 'Reto'}
                  </Text>
                  <Text
                    style={[
                      styles.activeSessionProgress,
                      { color: theme.primary },
                    ]}
                  >
                    {session.progress}% completado
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Categorías */}
        <View style={styles.categoriesSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
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
                        ? theme.primary
                        : theme.surface,
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
                      ? theme.surface
                      : theme.text
                  }
                />
                <Text
                  style={[
                    styles.categoryName,
                    {
                      color:
                        selectedCategory === category.id
                          ? theme.surface
                          : theme.text,
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
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Retos Disponibles
          </Text>
          {loading ? (
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Cargando retos...
            </Text>
          ) : challenges.length === 0 ? (
            <Text
              style={[styles.noChallengesText, { color: theme.textSecondary }]}
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
                    { backgroundColor: theme.surface },
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
                      style={[styles.challengeTitle, { color: theme.text }]}
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
                          { color: theme.surface },
                        ]}
                      >
                        {challenge.difficulty}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.challengeDescription,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {challenge.description}
                  </Text>

                  <View style={styles.challengeFooter}>
                    <Text style={[styles.xpReward, { color: theme.primary }]}>
                      +{challenge.xp_reward} XP
                    </Text>
                    {isActive ? (
                      <Text
                        style={[styles.activeStatus, { color: theme.success }]}
                      >
                        ✓ Activo
                      </Text>
                    ) : activeSessions.length >= 5 ? (
                      <Text
                        style={[
                          styles.disabledStatus,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Límite alcanzado
                      </Text>
                    ) : (
                      <Ionicons
                        name="add-circle"
                        size={24}
                        color={theme.primary}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
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
});
