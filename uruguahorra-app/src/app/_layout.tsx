import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider } from '@theme';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@store/useAuthStore';
import { View, ActivityIndicator } from 'react-native';
import { logger, LogModule } from '@/utils/logger';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@/utils/toast';
import { ErrorBoundary } from '@components';

function LoadingScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
      }}
    >
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, checkSession, isLoading } = useAuthStore();
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  useEffect(() => {
    // Solo verificar sesión una vez
    if (!hasCheckedSession) {
      logger.info(
        LogModule.NAV,
        'RootLayout iniciado, verificando autenticación'
      );
      checkSession();
      setHasCheckedSession(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar al montar

  useEffect(() => {
    // No navegar mientras se está cargando o no se ha verificado la sesión
    if (isLoading || !hasCheckedSession) return;

    const currentRoute = segments[0];
    const inAuthGroup = currentRoute === '(auth)';
    const inTabsGroup = currentRoute === '(tabs)';
    const modalRoutes = ['create-goal', 'paywall', 'transactions'];
    const isModalRoute = modalRoutes.includes(currentRoute);

    // Solo navegar si no estamos ya en la ruta correcta
    if (isAuthenticated && !inTabsGroup && !isModalRoute) {
      logger.info(LogModule.NAV, 'Redirigiendo a tabs');
      router.replace('/(tabs)');
    } else if (!isAuthenticated && !inAuthGroup && !isModalRoute) {
      logger.info(LogModule.NAV, 'Redirigiendo a onboarding');
      router.replace('/(auth)/onboarding');
    }
  }, [hasCheckedSession, isLoading, isAuthenticated, segments, router]);

  // Mostrar pantalla de carga mientras se verifica la sesión
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="create-goal"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Crear Nueva Meta',
        }}
      />
      <Stack.Screen
        name="paywall"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Premium',
        }}
      />
      <Stack.Screen
        name="transactions"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Transacciones',
        }}
      />
    </Stack>
  );
}

function AppContent() {
  return <RootLayoutNav />;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <AppContent />
          <Toast config={toastConfig} />
        </SafeAreaProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
