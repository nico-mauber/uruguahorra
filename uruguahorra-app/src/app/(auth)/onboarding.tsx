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
import { useAuthStore } from '@store/useAuthStore';
import { GoalsService } from '@/services/goals.service';
import { supabase } from '@/lib/supabase';

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { signup, login, user } = useAuthStore();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(true);
  
  // Step 1: Credenciales
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Step 2: Tipo de meta
  const [goalType, setGoalType] = useState<'emergency' | 'travel' | 'debt' | 'purchase'>('emergency');
  
  // Step 3: Detalles de meta
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [targetMonths, setTargetMonths] = useState('3');
  
  const goalOptions = [
    { id: 'emergency', label: '🛡️ Colchón de emergencia', value: 'emergency' },
    { id: 'travel', label: '✈️ Viaje', value: 'travel' },
    { id: 'debt', label: '💳 Pagar deudas', value: 'debt' },
    { id: 'purchase', label: '🛍️ Compra importante', value: 'purchase' },
  ];
  
  const handleAuth = async () => {
    console.log('handleAuth llamado - isNewUser:', isNewUser, 'email:', email);
    
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (isNewUser) {
        console.log('Intentando registrar nuevo usuario...');
        // Registrar nuevo usuario
        await signup(email, password, {
          country: 'UY',
          currency: 'UYU'
        });
        console.log('Usuario registrado exitosamente');
      } else {
        console.log('Intentando iniciar sesión...');
        // Iniciar sesión
        await login(email, password);
        console.log('Sesión iniciada exitosamente');
      }
      setStep(2);
    } catch (error: any) {
      console.error('Error detallado en autenticación:', error);
      
      // Manejar errores comunes
      if (error.message?.includes('already registered')) {
        Alert.alert(
          'Usuario existente',
          'Este email ya está registrado. ¿Deseas iniciar sesión?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Iniciar sesión', 
              onPress: () => {
                setIsNewUser(false);
                handleAuth();
              }
            }
          ]
        );
      } else if (error.message?.includes('Invalid login')) {
        Alert.alert('Error', 'Email o contraseña incorrectos');
      } else {
        Alert.alert('Error', error.message || 'No se pudo completar la autenticación');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateGoal = async () => {
    console.log('handleCreateGoal llamado - goalName:', goalName, 'goalAmount:', goalAmount);
    
    if (!goalName || !goalAmount) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Obtener el usuario actual
      console.log('Obteniendo usuario actual...');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        console.error('No se encontró usuario autenticado');
        Alert.alert('Error', 'No se encontró el usuario. Por favor, intenta iniciar sesión nuevamente.');
        return;
      }
      
      console.log('Usuario encontrado:', currentUser.id);
      
      // Calcular fecha objetivo
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + parseInt(targetMonths));
      
      const goalData = {
        user_id: currentUser.id,
        name: goalName,
        target_amount: parseFloat(goalAmount),
        target_date: targetDate.toISOString().split('T')[0],
      };
      
      console.log('Creando meta con datos:', goalData);
      
      // Crear la meta en Supabase
      const createdGoal = await GoalsService.createGoal(goalData);
      
      console.log('Meta creada exitosamente:', createdGoal);
      
      // Navegar al dashboard
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Error detallado creando meta:', error);
      Alert.alert('Error', `No se pudo crear la meta: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNext = async () => {
    if (step === 1) {
      await handleAuth();
    } else if (step === 2 && goalType) {
      // Pre-llenar nombre según el tipo de meta
      const defaultNames = {
        emergency: 'Mi Fondo de Emergencia',
        travel: 'Mi Viaje Soñado',
        debt: 'Libertad Financiera',
        purchase: 'Mi Gran Compra'
      };
      setGoalName(defaultNames[goalType]);
      setStep(3);
    } else if (step === 3) {
      await handleCreateGoal();
    }
  };
  
  const handleSkip = () => {
    // Si el usuario quiere saltar la creación de meta
    router.replace('/(tabs)');
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    header: {
      marginBottom: 32,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      lineHeight: 22,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.surface,
      marginBottom: 16,
    },
    goalOption: {
      marginBottom: 12,
    },
    goalOptionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    goalOptionText: {
      fontSize: 18,
      color: theme.text,
      marginLeft: 12,
    },
    selectedGoal: {
      borderColor: theme.primary,
      borderWidth: 2,
    },
    stepIndicator: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 32,
    },
    stepDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.border,
      marginHorizontal: 4,
    },
    stepDotActive: {
      backgroundColor: theme.primary,
      width: 24,
    },
    toggleContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 20,
    },
    toggleButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: theme.surface,
      marginHorizontal: 5,
    },
    toggleButtonActive: {
      backgroundColor: theme.primary,
    },
    toggleText: {
      color: theme.textSecondary,
      fontSize: 14,
    },
    toggleTextActive: {
      color: '#FFFFFF',
    },
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
    },
    skipButton: {
      marginTop: 16,
      opacity: 0.7,
    },
    monthsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    monthsLabel: {
      fontSize: 16,
      color: theme.text,
      marginRight: 10,
    },
    monthsInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.surface,
    },
  });
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.stepIndicator}>
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                style={[styles.stepDot, s === step && styles.stepDotActive]}
              />
            ))}
          </View>
          
          <View style={styles.header}>
            <Text style={styles.title}>
              {step === 1
                ? '¡Bienvenido a Uruguahorra!'
                : step === 2
                ? '¿Cuál es tu meta?'
                : 'Personaliza tu meta'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 1
                ? isNewUser 
                  ? 'Crea tu cuenta para comenzar a ahorrar'
                  : 'Inicia sesión para continuar'
                : step === 2
                ? 'Elige lo que más te motive'
                : 'Define los detalles de tu objetivo'}
            </Text>
          </View>
          
          {step === 1 && (
            <>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, isNewUser && styles.toggleButtonActive]}
                  onPress={() => {
                    console.log('Cambiando a modo: Crear cuenta');
                    setIsNewUser(true);
                  }}
                  disabled={isLoading}
                >
                  <Text style={[styles.toggleText, isNewUser && styles.toggleTextActive]}>
                    Crear cuenta
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, !isNewUser && styles.toggleButtonActive]}
                  onPress={() => {
                    console.log('Cambiando a modo: Ya tengo cuenta');
                    setIsNewUser(false);
                  }}
                  disabled={isLoading}
                >
                  <Text style={[styles.toggleText, !isNewUser && styles.toggleTextActive]}>
                    Ya tengo cuenta
                  </Text>
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.input}
                placeholder="Tu email"
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Contraseña (mínimo 6 caracteres)"
                placeholderTextColor={theme.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoading}
              />
            </>
          )}
          
          {step === 2 && (
            <>
              {goalOptions.map((option) => (
                <Card
                  key={option.id}
                  variant="outlined"
                  style={[
                    styles.goalOption,
                    goalType === option.value && styles.selectedGoal,
                  ]}
                  onPress={() => {
                    if (!isLoading) {
                      console.log('Seleccionando tipo de meta:', option.value);
                      setGoalType(option.value as any);
                    }
                  }}
                >
                  <View style={styles.goalOptionContent}>
                    <Text style={styles.goalOptionText}>{option.label}</Text>
                  </View>
                </Card>
              ))}
            </>
          )}
          
          {step === 3 && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Nombre de tu meta"
                placeholderTextColor={theme.textSecondary}
                value={goalName}
                onChangeText={setGoalName}
                editable={!isLoading}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Monto objetivo ($)"
                placeholderTextColor={theme.textSecondary}
                value={goalAmount}
                onChangeText={setGoalAmount}
                keyboardType="numeric"
                editable={!isLoading}
              />
              
              <View style={styles.monthsContainer}>
                <Text style={styles.monthsLabel}>Plazo:</Text>
                <TextInput
                  style={styles.monthsInput}
                  placeholder="3"
                  placeholderTextColor={theme.textSecondary}
                  value={targetMonths}
                  onChangeText={setTargetMonths}
                  keyboardType="numeric"
                  editable={!isLoading}
                />
                <Text style={[styles.monthsLabel, { marginLeft: 10 }]}>meses</Text>
              </View>
            </>
          )}
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.subtitle, { marginTop: 16 }]}>
                {step === 1 
                  ? isNewUser ? 'Creando tu cuenta...' : 'Iniciando sesión...'
                  : 'Guardando tu meta...'}
              </Text>
            </View>
          ) : (
            <>
              <Button
                title={
                  step === 1 
                    ? isNewUser ? 'Crear cuenta' : 'Iniciar sesión'
                    : step === 3 
                    ? 'Crear meta y comenzar' 
                    : 'Continuar'
                }
                onPress={handleNext}
                size="large"
                style={{ marginTop: 32 }}
              />
              
              {step === 3 && (
                <Button
                  title="Omitir por ahora"
                  onPress={handleSkip}
                  variant="outlined"
                  size="large"
                  style={styles.skipButton}
                />
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}