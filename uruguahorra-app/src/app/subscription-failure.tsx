import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../components/Button';
import { colors } from '../theme';

export default function SubscriptionFailure() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>❌</Text>
        <Text style={styles.title}>Error en el Pago</Text>
        <Text style={styles.description}>
          Hubo un problema al procesar tu pago. No se realizó ningún cargo.
          Puedes intentar nuevamente o contactar con soporte.
        </Text>
        
        <View style={styles.buttons}>
          <Button
            title="Intentar de Nuevo"
            onPress={() => router.back()}
            style={styles.button}
          />
          <Button
            title="Volver al Inicio"
            onPress={() => router.replace('/(tabs)/')}
            variant="outline"
            style={styles.button}
          />
        </View>
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
    color: colors.error,
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
  buttons: {
    gap: 12,
    minWidth: 200,
  },
  button: {
    minWidth: 200,
  },
});