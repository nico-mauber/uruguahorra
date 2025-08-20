import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card } from '@components';
import { useTheme } from '@theme';
import { useAuthStore } from '@store/useAuthStore';
import { AuthService } from '@/services/auth.service';
import { Ionicons } from '@expo/vector-icons';
import { logger, LogModule } from '@/utils/logger';

const OTP_LENGTH = 6;

export default function OTPVerificationScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Focus on input when component mounts
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    // Handle resend cooldown
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleOtpChange = (value: string) => {
    // Only allow numbers and limit to OTP_LENGTH
    const cleanValue = value.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
    setOtp(cleanValue);

    // Auto-verify when OTP is complete
    if (cleanValue.length === OTP_LENGTH) {
      handleVerifyOtp(cleanValue);
    }
  };

  const handleVerifyOtp = async (otpCode?: string) => {
    if (!email) {
      Alert.alert('Error', 'Email no encontrado');
      return;
    }

    const codeToVerify = otpCode || otp;
    if (codeToVerify.length !== OTP_LENGTH) {
      Alert.alert(
        'Error',
        `Por favor ingresa el código de ${OTP_LENGTH} dígitos`
      );
      return;
    }

    setIsLoading(true);
    try {
      logger.info(LogModule.AUTH, 'Verificando OTP', { email });

      const { user, session } = await AuthService.verifyOTP(
        email,
        codeToVerify
      );

      if (!user || !session) {
        throw new Error('No se pudo verificar el código');
      }

      logger.success(LogModule.AUTH, 'OTP verificado, iniciando sesión');

      // Update auth store with the authenticated user
      await useAuthStore.getState().checkSession();

      logger.info(LogModule.NAV, 'Redirigiendo al dashboard tras OTP exitoso');
      router.replace('/(tabs)');
    } catch (error: unknown) {
      logger.error(LogModule.AUTH, 'Error verificando OTP', error);

      Alert.alert(
        'Código incorrecto',
        error.message ||
          'El código ingresado no es válido. Intenta nuevamente.',
        [
          {
            text: 'OK',
            onPress: () => {
              setOtp('');
              inputRef.current?.focus();
            },
          },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email || resendCooldown > 0) return;

    try {
      logger.info(LogModule.AUTH, 'Reenviando OTP');
      await AuthService.resendOTP(email);

      Alert.alert(
        'Código reenviado',
        'Te hemos enviado un nuevo código a tu email.'
      );

      setResendCooldown(60); // 60 seconds cooldown
      setOtp('');
      inputRef.current?.focus();
    } catch (error: unknown) {
      logger.error(LogModule.AUTH, 'Error reenviando OTP', error);
      Alert.alert('Error', 'No se pudo reenviar el código. Intenta más tarde.');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      padding: 20,
      justifyContent: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: 40,
    },
    icon: {
      marginBottom: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    email: {
      fontWeight: '600',
      color: theme.primary,
    },
    otpContainer: {
      marginBottom: 32,
    },
    otpInput: {
      borderWidth: 2,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 24,
      textAlign: 'center',
      color: theme.text,
      backgroundColor: theme.surface,
      letterSpacing: 8,
      fontWeight: '600',
    },
    otpInputFocused: {
      borderColor: theme.primary,
    },
    otpInputFilled: {
      borderColor: theme.success,
      backgroundColor: theme.success + '10',
    },
    buttons: {
      gap: 16,
    },
    verifyButton: {
      opacity: 1,
    },
    verifyButtonDisabled: {
      opacity: 0.5,
    },
    resendContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
    },
    resendText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    resendButton: {
      marginLeft: 4,
    },
    resendButtonText: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: '600',
    },
    resendButtonDisabled: {
      opacity: 0.5,
    },
    backButton: {
      alignItems: 'center',
      marginTop: 16,
    },
    backButtonText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
  });

  if (!email) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Email no encontrado</Text>
          <Button title="Volver" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Ionicons
              name="mail-outline"
              size={64}
              color={theme.primary}
              style={styles.icon}
            />
            <Text style={styles.title}>Verifica tu email</Text>
            <Text style={styles.subtitle}>
              Hemos enviado un código de {OTP_LENGTH} dígitos a{'\n'}
              <Text style={styles.email}>{email}</Text>
            </Text>
          </View>

          <Card style={styles.otpContainer}>
            <TextInput
              ref={inputRef}
              style={[
                styles.otpInput,
                otp.length > 0 && styles.otpInputFocused,
                otp.length === OTP_LENGTH && styles.otpInputFilled,
              ]}
              value={otp}
              onChangeText={handleOtpChange}
              placeholder="000000"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              maxLength={OTP_LENGTH}
              autoFocus
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
            />
          </Card>

          <View style={styles.buttons}>
            <Button
              title={
                isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  'Verificar código'
                )
              }
              onPress={() => handleVerifyOtp()}
              disabled={isLoading || otp.length !== OTP_LENGTH}
              style={[
                styles.verifyButton,
                (isLoading || otp.length !== OTP_LENGTH) &&
                  styles.verifyButtonDisabled,
              ]}
            />
          </View>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>¿No recibiste el código?</Text>
            <TouchableOpacity
              onPress={handleResendOtp}
              disabled={resendCooldown > 0}
              style={[
                styles.resendButton,
                resendCooldown > 0 && styles.resendButtonDisabled,
              ]}
            >
              <Text style={styles.resendButtonText}>
                {resendCooldown > 0
                  ? `Reenviar (${resendCooldown}s)`
                  : 'Reenviar'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Cambiar email</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
