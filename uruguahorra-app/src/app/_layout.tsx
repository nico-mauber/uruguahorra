import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider } from '@theme';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@store/useAuthStore';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '@theme';

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { theme } = useTheme();
  const { isAuthenticated, isLoading, checkSession } = useAuthStore();

  useEffect(() => {
    console.log('RootLayout: Verificando estado de autenticación...');
    
    // Verificar si hay una sesión activa
    const initializeApp = async () => {
      await checkSession();
    };
    
    initializeApp();
  }, []);

  useEffect(() => {
    console.log('RootLayout: isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);
    
    if (!isLoading) {
      // Verificar si estamos en el grupo correcto
      const inAuthGroup = segments[0] === '(auth)';
      const inTabsGroup = segments[0] === '(tabs)';
      
      if (isAuthenticated && !inTabsGroup) {
        console.log('Usuario autenticado, navegando a tabs...');
        router.replace('/(tabs)');
      } else if (!isAuthenticated && !inAuthGroup) {
        console.log('Usuario no autenticado, navegando a onboarding...');
        router.replace('/(auth)/onboarding');
      }
    }
  }, [isAuthenticated, isLoading, segments]);

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: theme.background 
      }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
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
        name="import-csv"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Importar CSV',
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
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <RootLayoutNav />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}