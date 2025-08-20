import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '@components';
import { useTheme } from '@theme';
import { useAuthStore } from '@/contexts';
import { Ionicons } from '@expo/vector-icons';

interface Challenge {
  id: string;
  title: string;
  description: string;
  points: number;
  type: 'daily' | 'weekly' | 'special';
  completed: boolean;
  icon: string;
}

export default function ChallengesScreen() {
  const { theme } = useTheme();
  const { updateUserXP } = useAuthStore();

  const [challenges, setChallenges] = React.useState<Challenge[]>([
    {
      id: '1',
      title: 'Primer aporte del día',
      description: 'Realiza tu primer aporte de hoy',
      points: 10,
      type: 'daily',
      completed: false,
      icon: 'sunny',
    },
    {
      id: '2',
      title: 'Racha de 7 días',
      description: 'Mantén tu racha durante una semana',
      points: 50,
      type: 'weekly',
      completed: false,
      icon: 'flame',
    },
    {
      id: '3',
      title: 'Importa tus gastos',
      description: 'Carga tu primer archivo CSV',
      points: 30,
      type: 'special',
      completed: false,
      icon: 'document-text',
    },
    {
      id: '4',
      title: 'Meta del 10%',
      description: 'Alcanza el 10% de tu meta principal',
      points: 40,
      type: 'weekly',
      completed: false,
      icon: 'trending-up',
    },
  ]);

  const handleCompleteChallenge = (challengeId: string) => {
    const challenge = challenges.find((c) => c.id === challengeId);
    if (challenge && !challenge.completed) {
      setChallenges((prev) =>
        prev.map((c) => (c.id === challengeId ? { ...c, completed: true } : c))
      );
      updateUserXP(challenge.points);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'daily':
        return theme.info;
      case 'weekly':
        return theme.warning;
      case 'special':
        return theme.secondary;
      default:
        return theme.primary;
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
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
    },
    challengeCard: {
      marginBottom: 12,
    },
    challengeContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    challengeIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    challengeInfo: {
      flex: 1,
    },
    challengeTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    challengeDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    challengePoints: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.primary,
    },
    completedCard: {
      opacity: 0.6,
    },
    completedBadge: {
      backgroundColor: theme.success,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    completedText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    progressCard: {
      marginBottom: 24,
    },
    progressContent: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    progressItem: {
      alignItems: 'center',
    },
    progressValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    progressLabel: {
      fontSize: 12,
      color: theme.textSecondary,
    },
  });

  const dailyChallenges = challenges.filter((c) => c.type === 'daily');
  const weeklyChallenges = challenges.filter((c) => c.type === 'weekly');
  const specialChallenges = challenges.filter((c) => c.type === 'special');
  const completedCount = challenges.filter((c) => c.completed).length;
  const totalPoints = challenges
    .filter((c) => c.completed)
    .reduce((sum, c) => sum + c.points, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Retos</Text>
          <Text style={styles.subtitle}>Completa retos y gana XP</Text>
        </View>

        <Card style={styles.progressCard}>
          <View style={styles.progressContent}>
            <View style={styles.progressItem}>
              <Text style={styles.progressValue}>{completedCount}</Text>
              <Text style={styles.progressLabel}>Completados</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressValue}>{totalPoints}</Text>
              <Text style={styles.progressLabel}>XP ganados</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressValue}>
                {challenges.length - completedCount}
              </Text>
              <Text style={styles.progressLabel}>Pendientes</Text>
            </View>
          </View>
        </Card>

        {dailyChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Retos diarios</Text>
            {dailyChallenges.map((challenge) => (
              <Card
                key={challenge.id}
                style={[
                  styles.challengeCard,
                  challenge.completed && styles.completedCard,
                ]}
              >
                <View style={styles.challengeContent}>
                  <View
                    style={[
                      styles.challengeIcon,
                      { backgroundColor: getTypeColor(challenge.type) + '20' },
                    ]}
                  >
                    <Ionicons
                      name={challenge.icon as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={getTypeColor(challenge.type)}
                    />
                  </View>
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeTitle}>{challenge.title}</Text>
                    <Text style={styles.challengeDescription}>
                      {challenge.description}
                    </Text>
                    <Text style={styles.challengePoints}>
                      +{challenge.points} XP
                    </Text>
                  </View>
                  {challenge.completed ? (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedText}>✓ Hecho</Text>
                    </View>
                  ) : (
                    <Button
                      title="Completar"
                      size="small"
                      onPress={() => handleCompleteChallenge(challenge.id)}
                    />
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}

        {weeklyChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Retos semanales</Text>
            {weeklyChallenges.map((challenge) => (
              <Card
                key={challenge.id}
                style={[
                  styles.challengeCard,
                  challenge.completed && styles.completedCard,
                ]}
              >
                <View style={styles.challengeContent}>
                  <View
                    style={[
                      styles.challengeIcon,
                      { backgroundColor: getTypeColor(challenge.type) + '20' },
                    ]}
                  >
                    <Ionicons
                      name={challenge.icon as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={getTypeColor(challenge.type)}
                    />
                  </View>
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeTitle}>{challenge.title}</Text>
                    <Text style={styles.challengeDescription}>
                      {challenge.description}
                    </Text>
                    <Text style={styles.challengePoints}>
                      +{challenge.points} XP
                    </Text>
                  </View>
                  {challenge.completed ? (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedText}>✓ Hecho</Text>
                    </View>
                  ) : (
                    <Button
                      title="Completar"
                      size="small"
                      onPress={() => handleCompleteChallenge(challenge.id)}
                    />
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}

        {specialChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Retos especiales</Text>
            {specialChallenges.map((challenge) => (
              <Card
                key={challenge.id}
                style={[
                  styles.challengeCard,
                  challenge.completed && styles.completedCard,
                ]}
              >
                <View style={styles.challengeContent}>
                  <View
                    style={[
                      styles.challengeIcon,
                      { backgroundColor: getTypeColor(challenge.type) + '20' },
                    ]}
                  >
                    <Ionicons
                      name={challenge.icon as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={getTypeColor(challenge.type)}
                    />
                  </View>
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeTitle}>{challenge.title}</Text>
                    <Text style={styles.challengeDescription}>
                      {challenge.description}
                    </Text>
                    <Text style={styles.challengePoints}>
                      +{challenge.points} XP
                    </Text>
                  </View>
                  {challenge.completed ? (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedText}>✓ Hecho</Text>
                    </View>
                  ) : (
                    <Button
                      title="Completar"
                      size="small"
                      onPress={() => handleCompleteChallenge(challenge.id)}
                    />
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
