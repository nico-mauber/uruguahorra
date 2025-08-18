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
import { useGoalsStore } from '@store/useGoalsStore';
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
        
        // Los usuarios existentes van directo al dashboard
        console.log('Usuario existente, navegando directamente a tabs...');
        router.replace('/(tabs)');
        return; // No continuar al paso 2
      }
      // Solo los nuevos usuarios continúan al paso 2 (crear meta)
      setStep(2);
    } catch (error: any) {
      console.error('Error detallado en autenticación:', error);
      
      // Manejar errores comunes
      if (error.message?.includes('already registered') || error.message?.includes('User already registered')) {
        Alert.alert(
          'Usuario existente',
          'Este email ya está registrado. ¿Deseas iniciar sesión?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Iniciar sesión', 
              onPress: () => {
                setIsNewUser(false);
                // No llamar handleAuth aquí para evitar loop, solo cambiar el modo
              }
            }
          ]
        );
      } else if (error.message?.includes('Invalid login')) {
        Alert.alert('Error', 'Email o contraseña incorrectos');
      } else if (error.code === '42501' || error.message?.includes('row-level security')) {
        Alert.alert(
          'Error de configuración', 
          'Hay un problema con los permisos. Por favor, contacta al administrador o intenta iniciar sesión en lugar de registrarte.'
        );
      } else {
        Alert.alert('Error', error.message || 'No se pudo completar la autenticación');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateGoal = async () => {
    console.log('=== handleCreateGoal INICIADO ===');
    console.log('Estado actual:');
    console.log('- goalName:', goalName);
    console.log('- goalAmount:', goalAmount);
    console.log('- targetMonths:', targetMonths);
    console.log('- goalType:', goalType);
    
    // Validación de campos
    if (!goalName || goalName.trim() === '') {
      console.error('Validación fallida: goalName vacío');
      Alert.alert('Error', 'Por favor ingresa un nombre para tu meta');
      return;
    }
    
    if (!goalAmount || goalAmount.trim() === '') {
      console.error('Validación fallida: goalAmount vacío');
      Alert.alert('Error', 'Por favor ingresa el monto objetivo');
      return;
    }
    
    const parsedAmount = parseFloat(goalAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      console.error('Validación fallida: monto inválido:', goalAmount);
      Alert.alert('Error', 'Por favor ingresa un monto válido mayor a 0');
      return;
    }
    
    console.log('Validación completada exitosamente');
    setIsLoading(true);
    
    try {
      // Verificar sesión primero
      console.log('Verificando sesión...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error obteniendo sesión:', sessionError);
        throw sessionError;
      }
      
      if (!session) {
        console.error('No hay sesión activa');
        Alert.alert('Sesión expirada', 'Por favor, inicia sesión nuevamente');
        router.replace('/(auth)/onboarding');
        return;
      }
      
      console.log('Sesión válida, usuario ID:', session.user.id);
      
      // Obtener el usuario actual
      console.log('Obteniendo datos del usuario...');
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error obteniendo usuario:', userError);
        throw userError;
      }
      
      if (!currentUser) {
        console.error('Usuario no encontrado a pesar de tener sesión');
        Alert.alert('Error', 'No se pudo obtener la información del usuario');
        return;
      }
      
      console.log('Usuario obtenido:', currentUser.email);
      
      // Calcular fecha objetivo
      const targetDate = new Date();
      const monthsToAdd = parseInt(targetMonths) || 3;
      targetDate.setMonth(targetDate.getMonth() + monthsToAdd);
      
      const goalData = {
        user_id: currentUser.id,
        name: goalName.trim(),
        target_amount: parsedAmount,
        target_date: targetDate.toISOString().split('T')[0],
        saved_amount: 0,
        is_active: true
      };
      
      console.log('Datos de la meta a crear:', JSON.stringify(goalData, null, 2));
      
      // Crear la meta en Supabase
      console.log('Llamando a GoalsService.createGoal...');
      const createdGoal = await GoalsService.createGoal(goalData);
      
      console.log('¡Meta creada exitosamente!:', createdGoal);
      
      // Actualizar el store de metas antes de navegar (force=true para recargar)
      const { fetchGoals } = useGoalsStore.getState();
      await fetchGoals(currentUser.id, true);
      console.log('Store de metas actualizado');
      
      Alert.alert('¡Éxito!', 'Tu meta ha sido creada correctamente');
      
      // Navegar al dashboard
      console.log('Navegando al dashboard...');
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('=== ERROR CREANDO META ===');
      console.error('Tipo de error:', error.constructor.name);
      console.error('Mensaje:', error.message);
      console.error('Código:', error.code);
      console.error('Detalles:', error.details);
      console.error('Stack:', error.stack);
      
      // Mensajes de error específicos
      let errorMessage = 'No se pudo crear la meta';
      
      if (error.code === '23505') {
        errorMessage = 'Ya existe una meta con ese nombre';
      } else if (error.code === '42501') {
        errorMessage = 'No tienes permisos para crear metas. Verifica tu sesión.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      console.log('=== handleCreateGoal FINALIZADO ===');
      setIsLoading(false);
    }
  };
  
  const handleNext = async () => {
    console.log('=== handleNext llamado ===');
    console.log('Step actual:', step);
    console.log('Goal type:', goalType);
    console.log('Goal name:', goalName);
    console.log('Goal amount:', goalAmount);
    console.log('Target months:', targetMonths);
    
    try {
      if (step === 1) {
        console.log('Ejecutando handleAuth...');
        await handleAuth();
      } else if (step === 2 && goalType) {
        console.log('Pasando al paso 3, configurando nombre por defecto...');
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
        console.log('Step 3 detectado, ejecutando handleCreateGoal...');
        await handleCreateGoal();
      } else {
        console.log('Ninguna condición cumplida. Step:', step, 'GoalType:', goalType);
      }
    } catch (error) {
      console.error('Error en handleNext:', error);
      console.error('Stack trace:', error.stack);
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