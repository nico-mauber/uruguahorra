import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { CardsService } from '../../features/education/services';
import { CardReader } from '../../features/education/components';
import type { ModuleProgress, CardProgress, EducationCard } from '../../features/education/types';

export default function ReaderScreen() {
  const { colors } = useTheme();
  const { user } = useSimpleAuth();
  const { moduleId, cardIndex } = useLocalSearchParams<{ 
    moduleId: string; 
    cardIndex: string; 
  }>();
  
  const [moduleProgress, setModuleProgress] = useState<ModuleProgress | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const loadModuleData = async () => {
    if (!user?.id || !moduleId) return;

    try {
      setLoading(true);
      const progress = await CardsService.getModuleProgress(user.id, moduleId);
      setModuleProgress(progress);
      
      // Set initial card index
      const initialIndex = cardIndex ? parseInt(cardIndex, 10) : 0;
      setCurrentIndex(Math.max(0, Math.min(initialIndex, progress.cards.length - 1)));
    } catch (error) {
      console.error('Error loading module data:', error);
      Alert.alert('Error', 'No se pudo cargar la información del módulo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModuleData();
  }, [user?.id, moduleId, cardIndex]);

  const handleCardRead = async (readingTime: number) => {
    if (!user?.id || !moduleProgress) return;

    const currentCard = moduleProgress.cards[currentIndex];
    if (!currentCard) return;

    try {
      await CardsService.markCardAsRead(user.id, currentCard.card.id, readingTime);
      
      // Update local state
      const updatedCards = [...moduleProgress.cards];
      updatedCards[currentIndex] = {
        ...updatedCards[currentIndex],
        is_read: true,
        // Progress will be updated via the backend call
      };
      
      setModuleProgress({
        ...moduleProgress,
        cards: updatedCards,
        read_cards: moduleProgress.read_cards + 1,
        completion_percentage: ((moduleProgress.read_cards + 1) / moduleProgress.total_cards) * 100,
      });

      // Show XP earned feedback
      Alert.alert(
        '¡Card completada!',
        `Ganaste ${currentCard.card.xp_reward} XP por leer esta card`,
        [{ text: 'Continuar' }]
      );
      
    } catch (error) {
      console.error('Error marking card as read:', error);
      Alert.alert('Error', 'No se pudo marcar la card como leída');
    }
  };

  const handleNext = () => {
    if (!moduleProgress) return;
    
    if (currentIndex < moduleProgress.cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Module completed
      Alert.alert(
        '¡Módulo completado!',
        `Has terminado el módulo "${moduleProgress.module.title}"`,
        [
          {
            text: 'Volver al módulo',
            onPress: () => router.back(),
          },
          {
            text: 'Ver educación',
            onPress: () => router.push('/education'),
          },
        ]
      );
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleClose = () => {
    Alert.alert(
      'Salir de la lectura',
      '¿Estás seguro que quieres salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Salir', 
          onPress: () => router.back(),
          style: 'destructive' 
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text.primary }]}>
          Cargando card...
        </Text>
      </SafeAreaView>
    );
  }

  if (!moduleProgress || !moduleProgress.cards[currentIndex]) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.text.primary }]}>
          Card no encontrada
        </Text>
        <Pressable
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: colors.surface }]}>
            Volver
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const currentCard = moduleProgress.cards[currentIndex];
  const isLast = currentIndex === moduleProgress.cards.length - 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with close button */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Pressable
          style={styles.closeButton}
          onPress={handleClose}
        >
          <Ionicons name="close" size={24} color={colors.text.primary} />
        </Pressable>
        
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          {moduleProgress.module.title}
        </Text>
        
        <View style={styles.headerSpacer} />
      </View>

      <CardReader
        card={currentCard.card}
        onCardRead={handleCardRead}
        onNext={isLast ? undefined : handleNext}
        onPrevious={currentIndex > 0 ? handlePrevious : undefined}
        currentIndex={currentIndex}
        totalCards={moduleProgress.total_cards}
        isLast={isLast}
        showProgress={true}
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
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Same width as close button to center title
  },
});