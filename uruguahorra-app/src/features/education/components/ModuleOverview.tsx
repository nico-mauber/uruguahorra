import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import type { ModuleProgress, CardProgress } from '../types';
import { CardsService } from '../services';

interface ModuleOverviewProps {
  moduleProgress: ModuleProgress;
  onCardSelect: (card: CardProgress, index: number) => void;
  onStartReading?: () => void;
}

export function ModuleOverview({ 
  moduleProgress, 
  onCardSelect, 
  onStartReading 
}: ModuleOverviewProps) {
  const { colors } = useTheme();
  const { module, cards, read_cards, total_cards, completion_percentage } = moduleProgress;

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'principiante': return colors.success;
      case 'intermedio': return colors.warning;
      case 'avanzado': return colors.error;
      case 'experto': return colors.primary;
      default: return colors.text.secondary;
    }
  };

  const getNextUnreadCard = () => {
    return cards.find(cardProgress => !cardProgress.is_read && cardProgress.is_unlocked);
  };

  const totalEstimatedTime = cards.reduce((total, cardProgress) => 
    total + cardProgress.card.reading_time_seconds, 0);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header del módulo */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.moduleInfo}>
          <Text style={styles.moduleIcon}>{module.icon}</Text>
          <View style={styles.moduleDetails}>
            <Text style={[styles.moduleTitle, { color: colors.text.primary }]}>
              {module.title}
            </Text>
            <Text style={[styles.moduleDescription, { color: colors.text.secondary }]}>
              {module.description}
            </Text>
            
            <View style={styles.moduleMetadata}>
              <View
                style={[
                  styles.difficultyBadge,
                  { backgroundColor: getDifficultyColor(module.difficulty_level) + '20' }
                ]}
              >
                <Text
                  style={[
                    styles.difficultyText,
                    { color: getDifficultyColor(module.difficulty_level) }
                  ]}
                >
                  {module.difficulty_level}
                </Text>
              </View>
              
              <Text style={[styles.timeText, { color: colors.text.secondary }]}>
                📖 {CardsService.formatReadingTime(totalEstimatedTime)} total
              </Text>
            </View>
          </View>
        </View>

        {/* Progreso general */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressText, { color: colors.text.secondary }]}>
              {read_cards}/{total_cards} cards leídas
            </Text>
            <Text style={[styles.progressPercentage, { color: colors.primary }]}>
              {Math.round(completion_percentage)}%
            </Text>
          </View>
          
          <View style={[styles.progressBar, { backgroundColor: colors.border.primary }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${completion_percentage}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Botón de acción principal */}
        {getNextUnreadCard() && (
          <Pressable
            style={[styles.startButton, { backgroundColor: colors.primary }]}
            onPress={onStartReading}
          >
            <Ionicons name="play" size={20} color={colors.surface} />
            <Text style={[styles.startButtonText, { color: colors.surface }]}>
              {read_cards === 0 ? 'Comenzar Lectura' : 'Continuar Leyendo'}
            </Text>
          </Pressable>
        )}

        {moduleProgress.is_completed && (
          <View style={[styles.completedBanner, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={[styles.completedText, { color: colors.success }]}>
              ¡Módulo Completado! 🎉
            </Text>
          </View>
        )}
      </View>

      {/* Lista de cards */}
      <View style={styles.cardsList}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Cards de Lectura
        </Text>

        {cards.map((cardProgress, index) => (
          <CardItem
            key={cardProgress.card.id}
            cardProgress={cardProgress}
            index={index}
            onPress={() => onCardSelect(cardProgress, index)}
            colors={colors}
          />
        ))}
      </View>
    </ScrollView>
  );
}

interface CardItemProps {
  cardProgress: CardProgress;
  index: number;
  onPress: () => void;
  colors: any;
}

function CardItem({ cardProgress, index, onPress, colors }: CardItemProps) {
  const { card, is_read, is_unlocked } = cardProgress;

  return (
    <Pressable
      style={[
        styles.cardItem,
        {
          backgroundColor: colors.surface,
          borderColor: is_read ? colors.success : colors.border.primary,
          opacity: is_unlocked ? 1 : 0.6,
        },
      ]}
      onPress={onPress}
      disabled={!is_unlocked}
    >
      {/* Número e indicador de estado */}
      <View
        style={[
          styles.cardNumber,
          {
            backgroundColor: is_read 
              ? colors.success 
              : is_unlocked 
                ? colors.primary 
                : colors.text.secondary,
          },
        ]}
      >
        {is_read ? (
          <Ionicons name="checkmark" size={16} color={colors.surface} />
        ) : (
          <Text style={[styles.cardNumberText, { color: colors.surface }]}>
            {index + 1}
          </Text>
        )}
      </View>

      {/* Contenido de la card */}
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
          {card.title}
        </Text>
        
        <View style={styles.cardMetadata}>
          <View style={styles.cardInfo}>
            <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
            <Text style={[styles.cardInfoText, { color: colors.text.secondary }]}>
              {CardsService.formatReadingTime(card.reading_time_seconds)}
            </Text>
          </View>

          <View style={styles.cardInfo}>
            <Ionicons name="diamond-outline" size={14} color={colors.warning} />
            <Text style={[styles.cardInfoText, { color: colors.text.secondary }]}>
              {card.xp_reward} XP
            </Text>
          </View>
        </View>

        {card.key_takeaway && (
          <Text 
            style={[styles.cardTakeaway, { color: colors.text.secondary }]}
            numberOfLines={2}
          >
            💡 {card.key_takeaway}
          </Text>
        )}
      </View>

      {/* Indicador de estado */}
      <View style={styles.cardStatus}>
        {is_read ? (
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        ) : !is_unlocked ? (
          <Ionicons name="lock-closed" size={20} color={colors.text.secondary} />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
  },
  moduleInfo: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  moduleIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  moduleDetails: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 12,
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
  timeText: {
    fontSize: 12,
  },
  progressSection: {
    marginBottom: 16,
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
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardsList: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 16,
  },
  cardNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardMetadata: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 6,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardInfoText: {
    fontSize: 12,
  },
  cardTakeaway: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  cardStatus: {
    padding: 4,
  },
});