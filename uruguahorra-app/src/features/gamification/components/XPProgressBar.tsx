import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ViewStyle } from 'react-native';
import { getLevelInfo, getXPForLevel } from '../utils/formulas';
import { getLevelColor } from '../utils/constants';

interface XPProgressBarProps {
  currentXP: number;
  animated?: boolean;
  showLabels?: boolean;
  height?: number;
  style?: ViewStyle | ViewStyle[];
}

export const XPProgressBar: React.FC<XPProgressBarProps> = ({
  currentXP,
  animated = true,
  showLabels = true,
  height = 20,
  style,
}) => {
  const levelInfo = getLevelInfo(currentXP);
  const levelColor = getLevelColor(levelInfo.level);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(progressAnim, {
        toValue: levelInfo.progress,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(levelInfo.progress);
    }
  }, [levelInfo.progress, animated, progressAnim]);

  const currentLevelXP = getXPForLevel(levelInfo.level);
  const nextLevelXP = levelInfo.nextLevelXP;
  const xpInLevel = currentXP - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;

  return (
    <View style={[styles.container, style]}>
      {showLabels && (
        <View style={styles.labelsTop}>
          <Text style={styles.levelLabel}>Nivel {levelInfo.level}</Text>
          <Text style={styles.nextLevelLabel}>
            {xpInLevel} / {xpNeededForLevel} XP
          </Text>
        </View>
      )}

      <View style={[styles.progressContainer, { height }]}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
              backgroundColor: levelColor,
            },
          ]}
        />

        {/* Brillo/efecto de carga */}
        {animated && (
          <Animated.View
            style={[
              styles.shine,
              {
                backgroundColor: `${levelColor}40`,
              },
            ]}
          />
        )}
      </View>

      {showLabels && (
        <View style={styles.labelsBottom}>
          <Text style={styles.progressText}>
            {levelInfo.progress}% al Nivel {levelInfo.level + 1}
          </Text>
          <Text style={styles.totalXPText}>{currentXP} XP total</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  nextLevelLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  progressContainer: {
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    borderRadius: 10,
    minWidth: 2, // Mínimo ancho visible
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    borderRadius: 10,
    opacity: 0.6,
  },
  labelsBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  totalXPText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default XPProgressBar;
