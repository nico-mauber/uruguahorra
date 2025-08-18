import React from 'react';
import { Stack } from 'expo-router';
import { ThemeProvider } from '@theme';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <StatusBar style="auto" />
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
      </SafeAreaProvider>
    </ThemeProvider>
  );
}