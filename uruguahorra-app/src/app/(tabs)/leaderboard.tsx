import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@components';
import { useTheme } from '@theme';
import { useAuthStore } from '@store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';

interface LeaderboardEntry {
  id: string;
  name: string;
  level: number;
  totalXP: number;
  streak: number;
  rank: number;
  avatar?: string;
}

export default function LeaderboardScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = React.useState<'friends' | 'global'>(
    'friends'
  );

  const mockLeaderboard: LeaderboardEntry[] = [
    {
      id: '1',
      name: 'María G.',
      level: 12,
      totalXP: 2450,
      streak: 45,
      rank: 1,
    },
    {
      id: '2',
      name: 'Carlos R.',
      level: 10,
      totalXP: 1890,
      streak: 30,
      rank: 2,
    },
    { id: '3', name: 'Ana L.', level: 9, totalXP: 1650, streak: 22, rank: 3 },
    {
      id: '4',
      name: 'Tú',
      level: user?.level || 1,
      totalXP: user?.totalXP || 0,
      streak: user?.streak || 0,
      rank: 4,
    },
    { id: '5', name: 'Pedro M.', level: 7, totalXP: 1200, streak: 15, rank: 5 },
    { id: '6', name: 'Laura S.', level: 6, totalXP: 980, streak: 10, rank: 6 },
    { id: '7', name: 'Diego F.', level: 5, totalXP: 750, streak: 7, rank: 7 },
  ];

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return '#FFD700'; // Gold
      case 2:
        return '#C0C0C0'; // Silver
      case 3:
        return '#CD7F32'; // Bronze
      default:
        return theme.textSecondary;
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return 'trophy';
      case 2:
        return 'medal';
      case 3:
        return 'ribbon';
      default:
        return null;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 20,
    },
    header: {
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    tabContainer: {
      flexDirection: 'row',
      marginBottom: 20,
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 4,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 8,
    },
    activeTab: {
      backgroundColor: theme.primary,
    },
    tabText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    activeTabText: {
      color: '#FFFFFF',
    },
    podiumContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'flex-end',
      marginBottom: 32,
      paddingHorizontal: 20,
    },
    podiumItem: {
      alignItems: 'center',
    },
    podiumRank: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    podiumName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    podiumXP: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    podiumBar: {
      width: 80,
      backgroundColor: theme.primary,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      marginTop: 8,
    },
    entryCard: {
      marginBottom: 12,
    },
    entryContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rankContainer: {
      width: 40,
      alignItems: 'center',
      marginRight: 16,
    },
    rankNumber: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    entryInfo: {
      flex: 1,
    },
    entryName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    entryStats: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 16,
    },
    statText: {
      fontSize: 12,
      color: theme.textSecondary,
      marginLeft: 4,
    },
    entryXP: {
      alignItems: 'flex-end',
    },
    xpValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.primary,
    },
    xpLabel: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    highlightedEntry: {
      borderColor: theme.primary,
      borderWidth: 2,
    },
  });

  const topThree = mockLeaderboard.slice(0, 3);
  const restOfLeaderboard = mockLeaderboard.slice(3);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Ranking</Text>
          <Text style={styles.subtitle}>Compite con tus amigos</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
            onPress={() => setActiveTab('friends')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'friends' && styles.activeTabText,
              ]}
            >
              Amigos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'global' && styles.activeTab]}
            onPress={() => setActiveTab('global')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'global' && styles.activeTabText,
              ]}
            >
              Global
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.podiumContainer}>
          {/* Second place */}
          <View style={styles.podiumItem}>
            <View
              style={[
                styles.podiumRank,
                { backgroundColor: getRankColor(2) + '20' },
              ]}
            >
              <Ionicons name="medal" size={32} color={getRankColor(2)} />
            </View>
            <Text style={styles.podiumName}>{topThree[1].name}</Text>
            <Text style={styles.podiumXP}>{topThree[1].totalXP} XP</Text>
            <View style={[styles.podiumBar, { height: 80 }]} />
          </View>

          {/* First place */}
          <View style={styles.podiumItem}>
            <View
              style={[
                styles.podiumRank,
                { backgroundColor: getRankColor(1) + '20' },
              ]}
            >
              <Ionicons name="trophy" size={32} color={getRankColor(1)} />
            </View>
            <Text style={styles.podiumName}>{topThree[0].name}</Text>
            <Text style={styles.podiumXP}>{topThree[0].totalXP} XP</Text>
            <View style={[styles.podiumBar, { height: 100 }]} />
          </View>

          {/* Third place */}
          <View style={styles.podiumItem}>
            <View
              style={[
                styles.podiumRank,
                { backgroundColor: getRankColor(3) + '20' },
              ]}
            >
              <Ionicons name="ribbon" size={32} color={getRankColor(3)} />
            </View>
            <Text style={styles.podiumName}>{topThree[2].name}</Text>
            <Text style={styles.podiumXP}>{topThree[2].totalXP} XP</Text>
            <View style={[styles.podiumBar, { height: 60 }]} />
          </View>
        </View>

        {restOfLeaderboard.map((entry) => (
          <Card
            key={entry.id}
            style={[
              styles.entryCard,
              entry.name === 'Tú' && styles.highlightedEntry,
            ]}
          >
            <View style={styles.entryContent}>
              <View style={styles.rankContainer}>
                {getRankIcon(entry.rank) ? (
                  <Ionicons
                    name={getRankIcon(entry.rank) as any}
                    size={24}
                    color={getRankColor(entry.rank)}
                  />
                ) : (
                  <Text
                    style={[
                      styles.rankNumber,
                      { color: getRankColor(entry.rank) },
                    ]}
                  >
                    {entry.rank}
                  </Text>
                )}
              </View>

              <View style={styles.avatar}>
                <Ionicons name="person" size={24} color={theme.textSecondary} />
              </View>

              <View style={styles.entryInfo}>
                <Text style={styles.entryName}>{entry.name}</Text>
                <View style={styles.entryStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="star" size={12} color={theme.warning} />
                    <Text style={styles.statText}>Nivel {entry.level}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="flame" size={12} color={theme.error} />
                    <Text style={styles.statText}>{entry.streak} días</Text>
                  </View>
                </View>
              </View>

              <View style={styles.entryXP}>
                <Text style={styles.xpValue}>{entry.totalXP}</Text>
                <Text style={styles.xpLabel}>XP</Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
