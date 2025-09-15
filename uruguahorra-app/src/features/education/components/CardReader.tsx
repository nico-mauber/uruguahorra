import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import type { EducationCard } from '../types';
import { CardsService } from '../services';

interface CardReaderProps {
  card: EducationCard;
  onCardRead: (readingTime: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  currentIndex: number;
  totalCards: number;
  isLast: boolean;
  showProgress?: boolean;
}

export function CardReader({
  card,
  onCardRead,
  onNext,
  onPrevious,
  currentIndex,
  totalCards,
  isLast,
  showProgress = true
}: CardReaderProps) {
  const { colors } = useTheme();
  const [startTime] = useState(Date.now());
  const [isRead, setIsRead] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    // Reset state when card changes
    setIsRead(false);
    setShowTip(false);
    
    // Scroll to top when card changes
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [card.id]);

  const handleMarkAsRead = () => {
    if (isRead) return;

    const readingTime = Math.floor((Date.now() - startTime) / 1000);
    setIsRead(true);
    onCardRead(readingTime);
  };

  const handleNext = () => {
    if (!isRead) {
      Alert.alert(
        'Marca como leída',
        'Marca esta card como leída antes de continuar',
        [{ text: 'Entendido' }]
      );
      return;
    }
    onNext?.();
  };

  const estimatedTime = CardsService.formatReadingTime(card.reading_time_seconds);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header con progreso */}
      {showProgress && (
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <View style={styles.progressInfo}>
            <Text style={[styles.progressText, { color: colors.text.secondary }]}>
              Card {currentIndex + 1} de {totalCards}
            </Text>
            <Text style={[styles.timeText, { color: colors.text.secondary }]}>
              📖 {estimatedTime} lectura
            </Text>
          </View>
          
          <View style={[styles.progressBar, { backgroundColor: colors.border.primary }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${((currentIndex + 1) / totalCards) * 100}%`,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Contenido de la card */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { minHeight: screenHeight - 200 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Título */}
        <Text style={[styles.title, { color: colors.text.primary }]}>
          {card.title}
        </Text>

        {/* Contenido principal */}
        <Text style={[styles.contentText, { color: colors.text.primary }]}>
          {card.content}
        </Text>

        {/* Punto clave */}
        <View style={[styles.keyTakeawayContainer, { backgroundColor: colors.primary + '10' }]}>
          <View style={styles.keyTakeawayHeader}>
            <Ionicons name="bulb" size={20} color={colors.primary} />
            <Text style={[styles.keyTakeawayTitle, { color: colors.primary }]}>
              Punto Clave
            </Text>
          </View>
          <Text style={[styles.keyTakeawayText, { color: colors.text.primary }]}>
            {card.key_takeaway}
          </Text>
        </View>

        {/* Tip práctico (si existe) */}
        {card.practical_tip && (
          <Pressable
            style={[styles.tipContainer, { backgroundColor: colors.surface }]}
            onPress={() => setShowTip(!showTip)}
          >
            <View style={styles.tipHeader}>
              <Ionicons name="lightbulb" size={18} color={colors.warning} />
              <Text style={[styles.tipHeaderText, { color: colors.text.primary }]}>
                Consejo Práctico
              </Text>
              <Ionicons 
                name={showTip ? "chevron-up" : "chevron-down"} 
                size={16} 
                color={colors.text.secondary} 
              />
            </View>
            
            {showTip && (
              <Text style={[styles.tipText, { color: colors.text.secondary }]}>
                {card.practical_tip}
              </Text>
            )}
          </Pressable>
        )}

        {/* Espaciado para el botón flotante */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Botones de acción */}
      <View style={[styles.actionContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.actionButtons}>
          {/* Botón anterior */}
          {onPrevious && currentIndex > 0 && (
            <Pressable
              style={[styles.secondaryButton, { borderColor: colors.border.primary }]}
              onPress={onPrevious}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text.secondary} />
              <Text style={[styles.secondaryButtonText, { color: colors.text.secondary }]}>
                Anterior
              </Text>
            </Pressable>
          )}

          {/* Botón principal */}
          {!isRead ? (
            <Pressable
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleMarkAsRead}
            >
              <Ionicons name="checkmark-circle" size={20} color={colors.surface} />
              <Text style={[styles.primaryButtonText, { color: colors.surface }]}>
                Marcar como Leída
              </Text>
            </Pressable>
          ) : (
            <View style={styles.readActions}>
              <View style={[styles.readIndicator, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={[styles.readText, { color: colors.success }]}>
                  ✓ Leída (+{card.xp_reward} XP)
                </Text>
              </View>
              
              {onNext && (
                <Pressable
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                  onPress={handleNext}
                >
                  <Text style={[styles.primaryButtonText, { color: colors.surface }]}>
                    {isLast ? 'Finalizar Módulo' : 'Siguiente Card'}
                  </Text>
                  {!isLast && (
                    <Ionicons name="chevron-forward" size={20} color={colors.surface} />
                  )}
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 12,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    lineHeight: 32,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  keyTakeawayContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: 'currentColor',
  },
  keyTakeawayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  keyTakeawayTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  keyTakeawayText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  tipContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  bottomSpacing: {
    height: 100,
  },
  actionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  readActions: {
    flex: 1,
    gap: 12,
  },
  readIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  readText: {
    fontSize: 14,
    fontWeight: '500',
  },
});