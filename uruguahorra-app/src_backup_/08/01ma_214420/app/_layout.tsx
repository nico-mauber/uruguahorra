import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider } from '@theme';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth, AuthProvider } from '@/contexts';
import { View, ActivityIndicator, Platform } from 'react-native';
import { logger, LogModule } from '@/utils/logger';
import Toast from 'react-native-toast-message';
import { ErrorBoundary, PWAStatus } from '@components';
import { usePWA } from '@/hooks/usePWA';

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
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // El AuthProvider ya maneja la inicialización automáticamente
    // No necesitamos checkSession aquí

    // No navegar mientras se está cargando
    if (isLoading) return;

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
  }, [isLoading, isAuthenticated, segments, router]);

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
      {/* <Stack.Screen
        name="transactions"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Transacciones',
        }}
      /> */}
    </Stack>
  );
}

function AppContent() {
  const { isOnline } = usePWA();

  return (
    <>
      <RootLayoutNav />
      {Platform.OS === 'web' && <PWAStatus />}
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <SafeAreaProvider>
          <AuthProvider>
            <StatusBar style="auto" />
            <AppContent />
            <Toast />
          </AuthProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
