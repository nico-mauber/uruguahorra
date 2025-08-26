/**
 * Pantalla de Onboarding Simplificada
 *
 * Solo email + password, sin OTP ni verificación de email
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Card } from '@components';
import { useTheme } from '@theme';
import { useAuth } from '@/contexts';

export default function SimpleOnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { signup, login } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(true);

  // Credenciales
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async () => {
    // Validaciones básicas
    if (!email || !email.includes('@')) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return;
    }

    if (!password || password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (isNewUser && password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);

    try {
      let success = false;

      if (isNewUser) {
        // Registro
        console.log('[Onboarding] Registrando usuario:', email);
        success = await signup(email, password, {
          country: 'UY',
          currency: 'UYU',
        });

        if (success) {
          console.log(
            '[Onboarding] Registro exitoso, navegando al dashboard...'
          );
          // Navegar directamente sin Alert para evitar que el usuario se quede en onboarding
          router.replace('/(tabs)');
        } else {
          Alert.alert(
            'Error',
            'No se pudo crear la cuenta. Es posible que el email ya esté registrado.'
          );
        }
      } else {
        // Login
        console.log('[Onboarding] Iniciando sesión:', email);
        success = await login(email, password);

        if (success) {
          console.log('[Onboarding] Login exitoso');
          router.replace('/(tabs)');
        } else {
          Alert.alert('Error', 'Email o contraseña incorrectos');
        }
      }
    } catch (error) {
      console.error('[Onboarding] Error:', error);
      Alert.alert(
        'Error',
        'Ocurrió un error inesperado. Por favor intenta nuevamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Definir estilos dentro del componente donde theme está disponible
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme?.colors?.background || '#FFFFFF',
    },
    content: {
      flex: 1,
      padding: 20,
    },
    header: {
      alignItems: 'center',
      marginVertical: 30,
    },
    logo: {
      fontSize: 48,
      marginBottom: 10,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme?.colors?.text || '#000000',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme?.colors?.textSecondary || '#666666',
      textAlign: 'center',
    },
    form: {
      marginTop: 20,
    },
    inputContainer: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      color: theme?.colors?.textSecondary || '#666666',
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme?.colors?.surface || '#F5F5F5',
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: theme?.colors?.text || '#000000',
      borderWidth: 1,
      borderColor: theme?.colors?.border || '#E0E0E0',
    },
    inputFocused: {
      borderColor: theme?.colors?.primary || '#007AFF',
    },
    switchContainer: {
      marginVertical: 20,
      alignItems: 'center',
    },
    switchText: {
      color: theme?.colors?.textSecondary || '#666666',
      fontSize: 14,
    },
    switchLink: {
      color: theme?.colors?.primary || '#007AFF',
      fontWeight: 'bold',
      textDecorationLine: 'underline',
    },
    button: {
      marginTop: 20,
    },
    footer: {
      padding: 20,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 12,
      color: theme?.colors?.textSecondary || '#666666',
      textAlign: 'center',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.logo}>💰</Text>
              <Text style={styles.title}>UruguAhorra</Text>
              <Text style={styles.subtitle}>
                {isNewUser
                  ? 'Crea tu cuenta y empieza a ahorrar'
                  : 'Inicia sesión para continuar'}
              </Text>
            </View>

            {/* Formulario */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tu@email.com"
                  placeholderTextColor={
                    theme?.colors?.textTertiary || '#999999'
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Contraseña</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={
                    theme?.colors?.textTertiary || '#999999'
                  }
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>

              {isNewUser && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Confirmar Contraseña</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Repite tu contraseña"
                    placeholderTextColor={
                      theme?.colors?.textTertiary || '#999999'
                    }
                    secureTextEntry
                    editable={!isLoading}
                  />
                </View>
              )}

              {/* Botón principal */}
              <View style={styles.button}>
                <Button
                  title={
                    isLoading
                      ? 'Procesando...'
                      : isNewUser
                        ? 'Crear Cuenta'
                        : 'Iniciar Sesión'
                  }
                  onPress={handleSubmit}
                  disabled={isLoading}
                  icon={isLoading ? undefined : 'arrow-forward'}
                />
              </View>

              {/* Switch entre registro y login */}
              <View style={styles.switchContainer}>
                <Text style={styles.switchText}>
                  {isNewUser ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
                  <Text
                    style={styles.switchLink}
                    onPress={() => setIsNewUser(!isNewUser)}
                  >
                    {isNewUser ? 'Inicia sesión' : 'Regístrate'}
                  </Text>
                </Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Al continuar, aceptas nuestros términos y condiciones
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Loading overlay */}
      {isLoading && (
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator
            size="large"
            color={theme?.colors?.primary || '#007AFF'}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
