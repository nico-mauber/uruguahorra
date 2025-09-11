import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../components/Button';
import { colors } from '../theme';

export default function SubscriptionSuccess() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>¡Suscripción Exitosa!</Text>
        <Text style={styles.description}>
          Tu suscripción a Uruguahorra Premium ha sido activada correctamente.
          Ahora tienes acceso a todas las funciones premium.
        </Text>
        
        <Button
          title="Continuar"
          onPress={() => router.replace('/(tabs)/')}
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    minWidth: 200,
  },
});