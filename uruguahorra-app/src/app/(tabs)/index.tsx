import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Card, ProgressBar } from '@components';
import { useTheme } from '@theme';
import { useAuthStore } from '@store/useAuthStore';
import { useGoalsStore } from '@store/useGoalsStore';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user, updateUserXP } = useAuthStore();
  const { goals, addContribution, getGoalProgress, getTotalSaved } = useGoalsStore();
  
  const handleQuickSave = (amount: number) => {
    if (goals.length > 0) {
      addContribution(goals[0].id, amount, 'manual');
      updateUserXP(amount * 2);
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
    greeting: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      marginHorizontal: 6,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
    },
    statUnit: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
    },
    goalCard: {
      marginBottom: 16,
    },
    goalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    goalName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    goalAmount: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    quickSaveSection: {
      marginBottom: 24,
    },
    quickSaveButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    streakCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      marginBottom: 16,
    },
    streakInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    streakText: {
      marginLeft: 12,
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    addButton: {
      position: 'absolute',
      bottom: 24,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
  });
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>¡Hola, {user?.email?.split('@')[0]}!</Text>
          <Text style={styles.subtitle}>Tu progreso de hoy</Text>
        </View>
        
        <View style={styles.statsRow}>
          <Card style={styles.statCard} padding="small">
            <Text style={styles.statLabel}>Nivel</Text>
            <Text style={styles.statValue}>{user?.level || 1}</Text>
          </Card>
          <Card style={styles.statCard} padding="small">
            <Text style={styles.statLabel}>XP Total</Text>
            <Text style={styles.statValue}>{user?.totalXP || 0}</Text>
          </Card>
          <Card style={styles.statCard} padding="small">
            <Text style={styles.statLabel}>Ahorrado</Text>
            <Text style={styles.statValue}>
              ${getTotalSaved()}
            </Text>
          </Card>
        </View>
        
        <Card style={styles.streakCard} variant="outlined">
          <View style={styles.streakInfo}>
            <Ionicons name="flame" size={32} color={theme.warning} />
            <Text style={styles.streakText}>
              {user?.streak || 0} días de racha
            </Text>
          </View>
          <Ionicons name="shield-checkmark" size={24} color={theme.success} />
        </Card>
        
        <View style={styles.quickSaveSection}>
          <Text style={styles.sectionTitle}>Ahorro rápido</Text>
          <View style={styles.quickSaveButtons}>
            <Button
              title="$1"
              variant="outline"
              onPress={() => handleQuickSave(1)}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title="$2"
              variant="outline"
              onPress={() => handleQuickSave(2)}
              style={{ flex: 1, marginHorizontal: 8 }}
            />
            <Button
              title="$5"
              variant="outline"
              onPress={() => handleQuickSave(5)}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
        </View>
        
        <View>
          <Text style={styles.sectionTitle}>Mis metas</Text>
          {goals.length === 0 ? (
            <Card>
              <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
                No tienes metas activas. ¡Crea una para empezar!
              </Text>
            </Card>
          ) : (
            goals.map((goal) => (
              <Card key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalName}>{goal.name}</Text>
                  <Text style={styles.goalAmount}>
                    ${goal.savedAmount} / ${goal.targetAmount}
                  </Text>
                </View>
                <ProgressBar
                  progress={getGoalProgress(goal.id)}
                  showLabel
                  color={theme.primary}
                />
              </Card>
            ))
          )}
        </View>
      </ScrollView>
      
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/import-csv')}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}