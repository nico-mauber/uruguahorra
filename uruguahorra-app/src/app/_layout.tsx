import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider } from '@theme';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth, AuthProvider } from '@/contexts';
import { View, ActivityIndicator, Platform, LogBox } from 'react-native';
import { logger, LogModule } from '@/utils/logger';
import Toast from 'react-native-toast-message';
import { ErrorBoundary, PWAStatus } from '@components';
import { PostHogProvider } from 'posthog-react-native';
import { useAnalytics, AnalyticsEvents } from '@/hooks/useAnalytics';
import { toastConfig } from '@/utils/toast';

// Configurar logging mejorado en desarrollo
if (__DEV__) {
  // Mostrar todos los logs
  LogBox.ignoreAllLogs(false);
  
  // Interceptar errores de red (excluyendo Metro bundler)
  const originalFetch = global.fetch;
  global.fetch = async (...args) => {
    const url = args[0]?.toString() || '';
    
    // No interceptar requests de Metro bundler para evitar conflictos 409
    if (
      url.includes(':8081') || // Metro dev server
      url.includes('/symbolicate') || // Metro symbolication
      url.includes('.bundle') || // Bundle requests
      url.includes('index.bundle') || // Specific bundle
      url.includes('hot-reload') // Hot reload
    ) {
      return originalFetch(...args);
    }
    
    try {
      console.log('🌐 Fetch request:', url);
      const response = await originalFetch(...args);
      if (!response.ok) {
        console.error('🔴 Fetch error:', response.status, response.statusText, url);
      }
      return response;
    } catch (error) {
      console.error('🔴 Network error:', error, 'URL:', url);
      throw error;
    }
  };
}

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
      router.replace('/(auth)/simple-onboarding');
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
  const { track } = useAnalytics();

  useEffect(() => {
    // Log de inicio y estado de la red
    if (__DEV__) {
      console.log('🚀 App started in development mode');
      console.log('📱 Platform:', Platform.OS);
      console.log('🌐 Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
    }
    
    // Track app opened
    track(AnalyticsEvents.APP_OPENED);

    // SOLUCIÓN DE RAÍZ: Health check del sistema de quests en desarrollo
    if (__DEV__) {
      const checkQuestSystem = async () => {
        try {
          const { QuestInitializationService } = await import('@/features/gamification/services/quest-initialization.service');
          const health = await QuestInitializationService.healthCheck();
          console.log('🎮 Quest System Health Check:', health);
          
          if (!health.tablesExist) {
            console.warn('⚠️ Quest tables do not exist - run complete_database_schema.sql');
          }
          if (!health.rlsWorking) {
            console.warn('⚠️ Quest RLS policies need fixing - run fix_quests_rls_policies.sql');
          }
          if (!health.canCreateQuests) {
            console.warn('⚠️ Cannot create weekly quests - check RLS policies');
          }
          if (!health.canCreateProgress) {
            console.warn('⚠️ Cannot create quest progress - check RLS policies');
          }
        } catch (error) {
          console.error('🔴 Quest System Health Check failed:', error);
        }
      };
      
      checkQuestSystem();
    }
  }, [track]);

  return (
    <>
      <RootLayoutNav />
      {Platform.OS === 'web' && <PWAStatus />}
    </>
  );
}
export default function RootLayout() {
  return (
    <PostHogProvider
      apiKey="phc_Bpl5uyxSSfEXZelS6NlzphDCTwrhI1mhbGoItaoriTx"
      options={{
        host: 'https://us.i.posthog.com',
      }}
    >
      <ThemeProvider>
        <ErrorBoundary>
          <SafeAreaProvider>
            <AuthProvider>
              <StatusBar style="auto" />
              <AppContent />
              <Toast config={toastConfig} />
            </AuthProvider>
          </SafeAreaProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </PostHogProvider>
  );
}
