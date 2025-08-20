import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StreakData } from '../types/gamification.types';

interface StreakDisplayProps {
  streak: StreakData;
  size?: 'small' | 'medium' | 'large';
  showProtections?: boolean;
  style?: ViewStyle | ViewStyle[];
}

const SIZES = {
  small: {
    container: 80,
    iconSize: 20,
    numberSize: 16,
    labelSize: 10,
    padding: 8,
  },
  medium: {
    container: 100,
    iconSize: 24,
    numberSize: 20,
    labelSize: 12,
    padding: 12,
  },
  large: {
    container: 120,
    iconSize: 28,
    numberSize: 24,
    labelSize: 14,
    padding: 16,
  },
};

const getStreakColor = (streak: number): string => {
  if (streak === 0) return '#CCCCCC';
  if (streak < 7) return '#FF6B35'; // Naranja - primeros días
  if (streak < 30) return '#F7931E'; // Naranja dorado - primera semana+
  if (streak < 100) return '#FFD700'; // Dorado - primer mes+
  return '#FF1493'; // Rosa fuego - 100+ días
};

export const StreakDisplay: React.FC<StreakDisplayProps> = ({
  streak,
  size = 'medium',
  showProtections = false,
  style,
}) => {
  const sizeConfig = SIZES[size];
  const streakColor = getStreakColor(streak.current_streak);
  const isActive = streak.current_streak > 0;

  return (
    <View style={[styles.container, { padding: sizeConfig.padding }, style]}>
      <View style={styles.streakInfo}>
        <View style={[styles.streakBadge, { borderColor: streakColor }]}>
          <Ionicons
            name={isActive ? 'flame' : 'flame-outline'}
            size={sizeConfig.iconSize}
            color={streakColor}
          />
          <Text
            style={[
              styles.streakNumber,
              {
                fontSize: sizeConfig.numberSize,
                color: streakColor,
              },
            ]}
          >
            {streak.current_streak}
          </Text>
        </View>

        <View style={styles.streakLabels}>
          <Text
            style={[styles.streakLabel, { fontSize: sizeConfig.labelSize }]}
          >
            Racha actual
          </Text>

          {streak.longest_streak > 0 && (
            <Text
              style={[
                styles.maxStreakLabel,
                { fontSize: sizeConfig.labelSize - 1 },
              ]}
            >
              Mejor: {streak.longest_streak} días
            </Text>
          )}
        </View>
      </View>

      {showProtections && (
        <View style={styles.protectionsInfo}>
          <View style={styles.protectionItem}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={streak.streak_protections_used < 1 ? '#4CAF50' : '#999'}
            />
            <Text style={styles.protectionText}>
              Protecciones: {1 - streak.streak_protections_used}/1
            </Text>
          </View>
        </View>
      )}

      {/* Indicador de estado */}
      <View
        style={[
          styles.statusIndicator,
          { backgroundColor: isActive ? '#4CAF50' : '#FFC107' },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    position: 'relative',
  },
  streakInfo: {
    alignItems: 'center',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  streakNumber: {
    fontWeight: 'bold',
    marginLeft: 6,
  },
  streakLabels: {
    alignItems: 'center',
    marginTop: 8,
  },
  streakLabel: {
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  maxStreakLabel: {
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  protectionsInfo: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  protectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  protectionText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  statusIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default StreakDisplay;
