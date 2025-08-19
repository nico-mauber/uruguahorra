import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card, Button, ProgressBar } from '@components';
import { useTheme } from '@theme';
import { useAuthStore } from '@store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/onboarding');
  };

  const nextLevelXP = Math.pow((user?.level || 1) + 1, 2) * 4;
  const currentLevelXP = Math.pow(user?.level || 1, 2) * 4;
  const progressToNextLevel =
    (((user?.totalXP || 0) - currentLevelXP) / (nextLevelXP - currentLevelXP)) *
    100;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 32,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    name: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    email: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    levelCard: {
      marginBottom: 24,
    },
    levelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    levelText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    xpText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 24,
      marginHorizontal: -6,
    },
    statCard: {
      width: '50%',
      padding: 6,
    },
    statContent: {
      alignItems: 'center',
      padding: 16,
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
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
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    settingLabel: {
      fontSize: 16,
      color: theme.text,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    menuIcon: {
      marginRight: 16,
      marginLeft: 8,
    },
    menuText: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
    },
    badge: {
      backgroundColor: theme.primary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color={theme.primary} />
          </View>
          <Text style={styles.name}>
            {user?.email?.split('@')[0] || 'Usuario'}
          </Text>
          <Text style={styles.email}>{user?.email || 'email@ejemplo.com'}</Text>
        </View>

        <Card style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <Text style={styles.levelText}>Nivel {user?.level || 1}</Text>
            <Text style={styles.xpText}>
              {user?.totalXP || 0} / {nextLevelXP} XP
            </Text>
          </View>
          <ProgressBar
            progress={progressToNextLevel}
            showLabel={false}
            color={theme.primary}
          />
        </Card>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Card>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{user?.streak || 0}</Text>
                <Text style={styles.statLabel}>Días de racha</Text>
              </View>
            </Card>
          </View>
          <View style={styles.statCard}>
            <Card>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{user?.totalXP || 0}</Text>
                <Text style={styles.statLabel}>XP Total</Text>
              </View>
            </Card>
          </View>
          <View style={styles.statCard}>
            <Card>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>3</Text>
                <Text style={styles.statLabel}>Metas activas</Text>
              </View>
            </Card>
          </View>
          <View style={styles.statCard}>
            <Card>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>12</Text>
                <Text style={styles.statLabel}>Retos completados</Text>
              </View>
            </Card>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuración</Text>
          <Card>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Tema oscuro</Text>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={isDark ? theme.primary : '#f4f3f4'}
              />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          <Card padding="none">
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/paywall')}
            >
              <Ionicons
                name="diamond"
                size={24}
                color={theme.warning}
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Premium</Text>
              {!user?.premium && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Upgrade</Text>
                </View>
              )}
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Ionicons
                name="notifications"
                size={24}
                color={theme.text}
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Notificaciones</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Ionicons
                name="shield-checkmark"
                size={24}
                color={theme.text}
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Privacidad</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Ionicons
                name="help-circle"
                size={24}
                color={theme.text}
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Ayuda</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </Card>
        </View>

        <Button
          title="Cerrar sesión"
          variant="outline"
          onPress={handleLogout}
          style={{ marginBottom: 32 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
