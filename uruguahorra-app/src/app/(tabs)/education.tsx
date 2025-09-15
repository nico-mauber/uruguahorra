import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@theme';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { CardsService } from '../../features/education/services';
import type { ModuleProgress, UserEducationStats } from '../../features/education/types';
import { Ionicons } from '@expo/vector-icons';

export default function EducationScreen() {
  const { colors, typography } = useTheme();
  const { user } = useSimpleAuth();
  const [moduleProgress, setModuleProgress] = useState<ModuleProgress[]>([]);
  const [userStats, setUserStats] = useState<UserEducationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEducationData = async () => {
    if (!user?.id) return;

    try {
      const [modules, stats] = await Promise.all([
        CardsService.getAllModulesProgress(user.id),
        CardsService.getUserStats(user.id)
      ]);

      setModuleProgress(modules);
      setUserStats(stats);
    } catch (error) {
      console.error('Error loading education data:', error);
      Alert.alert('Error', 'No se pudo cargar la información de educación');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEducationData();
    setRefreshing(false);
  };

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await loadEducationData();
      setLoading(false);
    };

    initData();
  }, [user?.id]);

  const handleModulePress = (module: ModuleProgress) => {
    router.push({
      pathname: '/education/module/[id]',
      params: { id: module.module.id }
    });
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'principiante': return colors.success;
      case 'intermedio': return colors.warning;
      case 'avanzado': return colors.error;
      case 'experto': return colors.primary;
      default: return colors.text.secondary;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text.primary }]}>
            Cargando Academia...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header con estadísticas */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.headerContent}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {userStats?.total_cards_read || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                Cards Leídas
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {userStats?.current_streak_days || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                Racha Días
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {userStats?.total_modules_completed || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                Módulos
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {userStats?.total_study_time_minutes || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                Min Estudio
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Lista de módulos */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Módulos de Aprendizaje
        </Text>

        {moduleProgress.map((module, index) => (
          <Pressable
            key={module.module.id}
            style={[
              styles.moduleCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border.primary,
                // Modules are always unlocked - cards have unlock logic
                opacity: 1,
              },
            ]}
            onPress={() => handleModulePress(module)}
          >
            <View style={styles.moduleHeader}>
              <View style={styles.moduleIconContainer}>
                <Text style={styles.moduleIcon}>{module.module.icon}</Text>
              </View>
              
              <View style={styles.moduleInfo}>
                <Text style={[styles.moduleTitle, { color: colors.text.primary }]}>
                  {module.module.title}
                </Text>
                <Text style={[styles.moduleDescription, { color: colors.text.secondary }]}>
                  {module.module.description}
                </Text>
                
                <View style={styles.moduleMetadata}>
                  <View
                    style={[
                      styles.difficultyBadge,
                      { backgroundColor: getDifficultyColor(module.module.difficulty_level) + '20' }
                    ]}
                  >
                    <Text
                      style={[
                        styles.difficultyText,
                        { color: getDifficultyColor(module.module.difficulty_level) }
                      ]}
                    >
                      {module.module.difficulty_level}
                    </Text>
                  </View>
                  
                  <Text style={[styles.durationText, { color: colors.text.secondary }]}>
                    {module.estimated_total_time} min
                  </Text>
                </View>
              </View>
            </View>

            {/* Progreso */}
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressText, { color: colors.text.secondary }]}>
                  {module.read_cards}/{module.total_cards} cards leídas
                </Text>
                <Text style={[styles.progressPercentage, { color: colors.primary }]}>
                  {Math.round(module.completion_percentage)}%
                </Text>
              </View>
              
              <View style={[styles.progressBar, { backgroundColor: colors.border.primary }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: colors.primary,
                      width: `${module.completion_percentage}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {module.completion_percentage === 100 && (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.completedText, { color: colors.success }]}>
                  Completado
                </Text>
              </View>
            )}
          </Pressable>
        ))}

        {moduleProgress.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={64} color={colors.text.secondary} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              No hay módulos disponibles
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.text.secondary }]}>
              Los módulos educativos se cargarán pronto
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  livesContainer: {
    alignItems: 'center',
  },
  livesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  heartIcon: {
    marginHorizontal: 1,
  },
  livesText: {
    fontSize: 12,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 16,
  },
  moduleCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  moduleHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  moduleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  moduleIcon: {
    fontSize: 24,
  },
  lockIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 18,
  },
  moduleMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  durationText: {
    fontSize: 12,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});