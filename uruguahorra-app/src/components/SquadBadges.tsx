import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { Card } from '@components';
import { SquadGamificationService } from '@/services/squad-gamification.service';
import { logger, LogModule } from '@/utils/logger';

interface Squad {
  id: string;
  name: string;
}

interface SquadBadgesProps {
  squad: Squad;
  style?: ViewStyle;
}

interface BadgeInfo {
  icon: string;
  color: string;
  title: string;
  description: string;
}

export const SquadBadges: React.FC<SquadBadgesProps> = ({ squad, style }) => {
  const { theme } = useTheme();
  const [stats, setStats] = useState<{
    totalXpGenerated: number;
    topXpEarners: Array<{ userId: string; totalXp: number }>;
    recentAchievements: Array<{
      userId: string;
      eventType: string;
      xpEarned: number;
      createdAt: string;
    }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGamificationStats();
  }, [squad.id]);

  const loadGamificationStats = async () => {
    try {
      setIsLoading(true);
      const gamificationStats =
        await SquadGamificationService.getSquadGamificationStats(squad.id);
      setStats(gamificationStats);
    } catch (error) {
      logger.error(LogModule.UI, 'Error cargando stats de gamificación', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getBadgeInfo = (eventType: string): BadgeInfo => {
    const badgeMap: Record<string, BadgeInfo> = {
      squad_top_saver: {
        icon: 'trophy',
        color: '#FFD700',
        title: 'Top Ahorrador',
        description: 'Entre los mejores del grupo',
      },
      squad_consistent_saver: {
        icon: 'calendar',
        color: '#4CAF50',
        title: 'Ahorrador Constante',
        description: 'Ahorra regularmente',
      },
      squad_milestone: {
        icon: 'flag',
        color: '#2196F3',
        title: 'Milestone Grupal',
        description: 'Contribuyó a meta del grupo',
      },
      squad_team_player: {
        icon: 'people',
        color: '#9C27B0',
        title: 'Jugador de Equipo',
        description: 'Excelente colaboración',
      },
    };

    return (
      badgeMap[eventType] || {
        icon: 'star',
        color: theme.primary,
        title: 'Logro Especial',
        description: 'Logro desbloqueado',
      }
    );
  };

  if (isLoading) {
    return (
      <Card style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Cargando logros...
          </Text>
        </View>
      </Card>
    );
  }

  if (!stats || stats.recentAchievements.length === 0) {
    return (
      <Card style={[styles.container, style]}>
        <View style={styles.header}>
          <Ionicons name="trophy-outline" size={20} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>
            Logros del Grupo
          </Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons
            name="medal-outline"
            size={48}
            color={theme.textSecondary}
          />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            ¡Sigue ahorrando para desbloquear logros grupales!
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={[styles.container, style]}>
      <View style={styles.header}>
        <Ionicons name="trophy" size={20} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>
          Logros del Grupo
        </Text>
        <View style={styles.xpBadge}>
          <Text style={[styles.xpText, { color: theme.primary }]}>
            {stats.totalXpGenerated} XP
          </Text>
        </View>
      </View>

      <View style={styles.achievementsList}>
        {stats.recentAchievements.slice(0, 3).map((achievement, index) => {
          const badgeInfo = getBadgeInfo(achievement.eventType);
          return (
            <View key={index} style={styles.achievementItem}>
              <View
                style={[
                  styles.badgeIcon,
                  { backgroundColor: `${badgeInfo.color}20` },
                ]}
              >
                <Ionicons
                  name={badgeInfo.icon as any}
                  size={20}
                  color={badgeInfo.color}
                />
              </View>
              <View style={styles.achievementInfo}>
                <Text style={[styles.badgeTitle, { color: theme.text }]}>
                  {badgeInfo.title}
                </Text>
                <Text
                  style={[
                    styles.badgeDescription,
                    { color: theme.textSecondary },
                  ]}
                >
                  {badgeInfo.description}
                </Text>
              </View>
              <View style={styles.xpContainer}>
                <Text
                  style={[styles.achievementXp, { color: badgeInfo.color }]}
                >
                  +{achievement.xpEarned} XP
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {stats.topXpEarners.length > 0 && (
        <View style={styles.topEarnersSection}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Top XP del Grupo
          </Text>
          <View style={styles.topEarnersList}>
            {stats.topXpEarners.slice(0, 3).map((earner, index) => (
              <View key={earner.userId} style={styles.topEarnerItem}>
                <Ionicons
                  name={
                    index === 0 ? 'trophy' : index === 1 ? 'medal' : 'ribbon'
                  }
                  size={16}
                  color={
                    index === 0
                      ? '#FFD700'
                      : index === 1
                        ? '#C0C0C0'
                        : '#CD7F32'
                  }
                />
                <Text style={[styles.earnerXp, { color: theme.text }]}>
                  {earner.totalXp} XP
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  xpBadge: {
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  achievementsList: {
    gap: 12,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementInfo: {
    flex: 1,
    marginLeft: 12,
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  badgeDescription: {
    fontSize: 12,
  },
  xpContainer: {
    alignItems: 'flex-end',
  },
  achievementXp: {
    fontSize: 12,
    fontWeight: '600',
  },
  topEarnersSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  topEarnersList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  topEarnerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  earnerXp: {
    fontSize: 12,
    fontWeight: '500',
  },
});
