import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { Card, ProgressBar } from '@components';

interface SquadMember {
  id: string;
  squadId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  totalSaved: number;
  monthlySaved: number;
  user?: {
    id: string;
    email: string | null;
    country: string | null;
    premium: boolean;
  };
}

interface Squad {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  inviteCode: string;
  maxMembers: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  memberRole?: 'owner' | 'admin' | 'member';
  memberCount?: number;
}

interface SquadStatsCardProps {
  squad: Squad;
  members: SquadMember[];
}

export const SquadStatsCard: React.FC<SquadStatsCardProps> = ({
  squad,
  members,
}) => {
  const { theme } = useTheme();

  // Calcular estadísticas
  const totalSaved = members.reduce(
    (sum, member) => sum + member.totalSaved,
    0
  );
  const monthlyTotal = members.reduce(
    (sum, member) => sum + member.monthlySaved,
    0
  );
  const avgPerMember = members.length > 0 ? totalSaved / members.length : 0;
  const topSaver = members.reduce(
    (top, member) =>
      member.totalSaved > (top?.totalSaved || 0) ? member : top,
    null as SquadMember | null
  );

  // Meta grupal estimada (basada en el promedio de metas individuales)
  const estimatedGroupGoal = 50000; // Por ahora hardcodeado, luego se puede calcular
  const groupProgress = Math.min((totalSaved / estimatedGroupGoal) * 100, 100);

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="stats-chart" size={20} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>
          Estadísticas del Grupo
        </Text>
      </View>

      {/* Progreso grupal */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Progreso Grupal
        </Text>
        <View style={styles.progressSection}>
          <ProgressBar progress={groupProgress / 100} />
          <View style={styles.progressInfo}>
            <Text style={[styles.progressAmount, { color: theme.text }]}>
              ${totalSaved.toFixed(0)} / ${estimatedGroupGoal.toFixed(0)}
            </Text>
            <Text style={[styles.progressPercent, { color: theme.primary }]}>
              {groupProgress.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Estadísticas generales */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Estadísticas Generales
        </Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={16} color={theme.primary} />
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Miembros Activos
            </Text>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {members.length}/{squad.maxMembers}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="trending-up" size={16} color={theme.success} />
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Promedio por Miembro
            </Text>
            <Text style={[styles.statValue, { color: theme.text }]}>
              ${avgPerMember.toFixed(0)}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="calendar" size={16} color={theme.warning} />
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Este Mes
            </Text>
            <Text style={[styles.statValue, { color: theme.text }]}>
              ${monthlyTotal.toFixed(0)}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="trophy" size={16} color="#FFD700" />
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Top Ahorrador
            </Text>
            <Text
              style={[styles.statValue, { color: theme.text }]}
              numberOfLines={1}
            >
              {topSaver?.user?.email?.split('@')[0] || 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Resumen de actividad reciente */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Actividad Reciente
        </Text>
        <View style={styles.activitySummary}>
          <Text style={[styles.activityText, { color: theme.textSecondary }]}>
            El grupo ha ahorrado ${monthlyTotal.toFixed(0)} este mes
          </Text>
          {topSaver && (
            <Text style={[styles.activityText, { color: theme.textSecondary }]}>
              {topSaver.user?.email?.split('@')[0]} lidera con $
              {topSaver.totalSaved.toFixed(0)}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    marginTop: 0,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  progressSection: {
    gap: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressAmount: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  activitySummary: {
    gap: 4,
  },
  activityText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
