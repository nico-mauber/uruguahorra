import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@components';
import { useTheme } from '@theme';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

const { width } = Dimensions.get('window');

interface GamificationStatsProps {
  totalXP: number;
  currentLevel: number;
  xpToNextLevel: number;
  streakDays: number;
  achievementsCount: number;
  isLoading?: boolean;
}

interface XPBarProps {
  currentXP: number;
  maxXP: number;
  level: number;
  animated?: boolean;
}

const XPBar: React.FC<XPBarProps> = ({
  currentXP,
  maxXP,
  level,
  animated = true,
}) => {
  const { colors } = useTheme();
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const percentage = maxXP > 0 ? (currentXP / maxXP) * 100 : 0;

  useEffect(() => {
    if (animated) {
      // Animación de llenado de la barra
      Animated.timing(animatedWidth, {
        toValue: percentage,
        duration: 1500,
        useNativeDriver: false,
      }).start();

      // Efecto de brillo cuando está cerca del siguiente nivel
      if (percentage > 70) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowOpacity, {
              toValue: 0.8,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(glowOpacity, {
              toValue: 0.2,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    }
  }, [percentage, animated]);

  return (
    <View style={styles.xpBarContainer}>
      <View style={styles.xpBarHeader}>
        <Text style={[styles.levelText, { color: colors.text.primary }]}>
          Nivel {level}
        </Text>
        <Text style={[styles.xpText, { color: colors.text.secondary }]}>
          {currentXP} / {maxXP} XP
        </Text>
      </View>

      <View
        style={[
          styles.xpBarBackground,
          { backgroundColor: colors.border.primary },
        ]}
      >
        <Animated.View
          style={[
            styles.xpBarFill,
            {
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          <Animated.View
            style={[
              styles.xpBarGlow,
              {
                opacity: glowOpacity,
              },
            ]}
          />
        </Animated.View>
      </View>
    </View>
  );
};

interface StreakCounterProps {
  days: number;
  animated?: boolean;
}

const StreakCounter: React.FC<StreakCounterProps> = ({
  days,
  animated = true,
}) => {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fireOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      // Animación de entrada
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Efecto de fuego para rachas largas
      if (days > 7) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(fireOpacity, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(fireOpacity, {
              toValue: 0.3,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    }
  }, [days, animated]);

  const getStreakColor = () => {
    if (days >= 30) return '#FF6B6B'; // Rojo fuego
    if (days >= 14) return '#FF8C00'; // Naranja
    if (days >= 7) return '#FFD93D'; // Amarillo
    return '#51CF66'; // Verde
  };

  const getStreakEmoji = () => {
    if (days >= 30) return '🔥';
    if (days >= 14) return '⚡';
    if (days >= 7) return '✨';
    return '💚';
  };

  return (
    <Animated.View
      style={[styles.streakContainer, { transform: [{ scale: scaleAnim }] }]}
    >
      <View style={styles.streakContent}>
        <Animated.Text
          style={[styles.streakEmoji, { opacity: days > 7 ? fireOpacity : 1 }]}
        >
          {getStreakEmoji()}
        </Animated.Text>

        <Text style={[styles.streakDays, { color: getStreakColor() }]}>
          {days}
        </Text>

        <Text style={[styles.streakLabel, { color: colors.text.secondary }]}>
          días consecutivos
        </Text>
      </View>

      {days > 0 && (
        <View style={styles.streakMotivation}>
          <Text style={[styles.motivationText, { color: colors.text.primary }]}>
            {days >= 30 && '¡Eres una máquina de ahorrar! 🚀'}
            {days >= 14 && days < 30 && '¡Excelente disciplina! 💪'}
            {days >= 7 && days < 14 && '¡Vas por buen camino! 🎯'}
            {days > 0 && days < 7 && '¡Sigue así! 👍'}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

interface AchievementBadgeProps {
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  delay?: number;
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  icon,
  title,
  description,
  unlocked,
  rarity,
  delay = 0,
}) => {
  const { colors } = useTheme();
  const haptics = useHapticFeedback();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.delay(delay),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]);

    sequence.start();

    if (unlocked && rarity !== 'common') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [unlocked, rarity, delay]);

  const getRarityColor = () => {
    switch (rarity) {
      case 'legendary':
        return '#FFD700';
      case 'epic':
        return '#9D4EDD';
      case 'rare':
        return '#06FFA5';
      default:
        return '#6B7280';
    }
  };

  const handlePress = () => {
    if (unlocked) {
      haptics.achievement();

      // Animación de celebración
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={unlocked ? 0.8 : 1}>
      <Animated.View
        style={[
          styles.achievementBadge,
          {
            backgroundColor: unlocked ? colors.card : colors.surface,
            borderColor: unlocked ? getRarityColor() : colors.border.primary,
            transform: [{ scale: scaleAnim }],
          },
          unlocked && {
            shadowColor: getRarityColor(),
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          },
        ]}
      >
        {unlocked && rarity !== 'common' && (
          <Animated.View
            style={[
              styles.achievementGlow,
              {
                backgroundColor: getRarityColor(),
                opacity: glowAnim,
              },
            ]}
          />
        )}

        <Text style={[styles.achievementIcon, { opacity: unlocked ? 1 : 0.3 }]}>
          {icon}
        </Text>

        <Text
          style={[
            styles.achievementTitle,
            {
              color: unlocked ? colors.text.primary : colors.text.secondary,
              opacity: unlocked ? 1 : 0.6,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.achievementDescription,
            {
              color: colors.text.secondary,
              opacity: unlocked ? 1 : 0.5,
            },
          ]}
        >
          {description}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const GamificationStats: React.FC<GamificationStatsProps> = ({
  totalXP,
  currentLevel,
  xpToNextLevel,
  streakDays,
  achievementsCount,
  isLoading = false,
}) => {
  const { colors } = useTheme();
  const [showAchievements, setShowAchievements] = useState(false);

  // XP necesario para el siguiente nivel (fórmula progresiva)
  const xpForCurrentLevel = currentLevel * 100 + (currentLevel - 1) * 50;
  const xpForNextLevel = (currentLevel + 1) * 100 + currentLevel * 50;
  const currentXPInLevel = totalXP - xpForCurrentLevel;

  if (isLoading) {
    return (
      <Card style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Cargando estadísticas...
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="trophy" size={24} color="#FFD700" />
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Tu Progreso de Ahorro
        </Text>
      </View>

      {/* Barra de XP */}
      <XPBar
        currentXP={currentXPInLevel}
        maxXP={xpForNextLevel - xpForCurrentLevel}
        level={currentLevel}
      />

      {/* Racha */}
      <StreakCounter days={streakDays} />

      {/* Logros */}
      <TouchableOpacity
        style={styles.achievementsHeader}
        onPress={() => setShowAchievements(!showAchievements)}
      >
        <View style={styles.achievementsTitle}>
          <Ionicons name="medal" size={20} color="#FFD700" />
          <Text
            style={[styles.achievementsText, { color: colors.text.primary }]}
          >
            Logros Desbloqueados ({achievementsCount}/12)
          </Text>
        </View>
        <Ionicons
          name={showAchievements ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.text.secondary}
        />
      </TouchableOpacity>

      {showAchievements && (
        <View style={styles.achievementsGrid}>
          <AchievementBadge
            icon="🎯"
            title="Primera Transacción"
            description="Registra tu primera transacción"
            unlocked={totalXP > 0}
            rarity="common"
            delay={0}
          />
          <AchievementBadge
            icon="💪"
            title="Una Semana Fuerte"
            description="7 días consecutivos"
            unlocked={streakDays >= 7}
            rarity="rare"
            delay={100}
          />
          <AchievementBadge
            icon="🔥"
            title="Máquina de Ahorrar"
            description="30 días consecutivos"
            unlocked={streakDays >= 30}
            rarity="epic"
            delay={200}
          />
          <AchievementBadge
            icon="🚀"
            title="Nivel 10"
            description="Alcanza el nivel 10"
            unlocked={currentLevel >= 10}
            rarity="legendary"
            delay={300}
          />
          <AchievementBadge
            icon="💰"
            title="Gran Ahorrador"
            description="$10,000 en transacciones"
            unlocked={totalXP >= 1000} // 10 XP por $100
            rarity="epic"
            delay={400}
          />
          <AchievementBadge
            icon="🎓"
            title="Maestro del Dinero"
            description="Completa 100 transacciones"
            unlocked={totalXP >= 500} // 5 XP por transacción promedio
            rarity="legendary"
            delay={500}
          />
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
  },

  // XP Bar
  xpBarContainer: {
    marginBottom: 24,
  },

  xpBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  levelText: {
    fontSize: 16,
    fontWeight: '600',
  },

  xpText: {
    fontSize: 14,
    fontWeight: '500',
  },

  xpBarBackground: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },

  xpBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 6,
    position: 'relative',
  },

  xpBarGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
  },

  // Streak Counter
  streakContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },

  streakContent: {
    alignItems: 'center',
    marginBottom: 8,
  },

  streakEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },

  streakDays: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },

  streakLabel: {
    fontSize: 14,
  },

  streakMotivation: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 20,
  },

  motivationText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Achievements
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },

  achievementsTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  achievementsText: {
    fontSize: 16,
    fontWeight: '600',
  },

  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },

  achievementBadge: {
    width: (width - 64) / 2,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },

  achievementGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 14,
  },

  achievementIcon: {
    fontSize: 32,
    marginBottom: 8,
  },

  achievementTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },

  achievementDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  loadingText: {
    fontSize: 16,
  },
});
