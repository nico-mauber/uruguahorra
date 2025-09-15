import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { CardsService } from '../../../features/education/services';
import { ModuleOverview } from '../../../features/education/components';
import type { ModuleProgress, CardProgress } from '../../../features/education/types';

export default function ModuleScreen() {
  const { colors } = useTheme();
  const { user } = useSimpleAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [moduleProgress, setModuleProgress] = useState<ModuleProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const loadModuleData = async () => {
    if (!user?.id || !id) return;

    try {
      setLoading(true);
      const progress = await CardsService.getModuleProgress(user.id, id);
      setModuleProgress(progress);
    } catch (error) {
      console.error('Error loading module data:', error);
      Alert.alert('Error', 'No se pudo cargar la información del módulo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModuleData();
  }, [user?.id, id]);

  const handleCardSelect = (cardProgress: CardProgress, index: number) => {
    if (!cardProgress.is_unlocked) {
      Alert.alert('Card bloqueada', 'Debes completar las cards anteriores primero');
      return;
    }

    router.push({
      pathname: '/education/reader',
      params: {
        moduleId: id,
        cardIndex: index.toString(),
      },
    });
  };

  const handleStartReading = () => {
    if (!moduleProgress) return;

    // Encontrar la primera card no leída
    const nextCardIndex = moduleProgress.cards.findIndex(
      cardProgress => !cardProgress.is_read && cardProgress.is_unlocked
    );

    if (nextCardIndex === -1) {
      Alert.alert('Módulo completado', 'Ya has leído todas las cards de este módulo');
      return;
    }

    router.push({
      pathname: '/education/reader',
      params: {
        moduleId: id,
        cardIndex: nextCardIndex.toString(),
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text.primary }]}>
          Cargando módulo...
        </Text>
      </SafeAreaView>
    );
  }

  if (!moduleProgress) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.text.primary }]}>
          Módulo no encontrado
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ModuleOverview
        moduleProgress={moduleProgress}
        onCardSelect={handleCardSelect}
        onStartReading={handleStartReading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 12,
  },
});