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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Card } from '@components';
import { useTheme } from '@theme';
import { useAuthStore } from '@store/useAuthStore';
import { useGoalsStore } from '@store/useGoalsStore';
import { GoalsService } from '@/services/goals.service';
import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';

export default function CreateGoalScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { fetchGoals } = useGoalsStore();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Step 1: Tipo de meta
  const [goalType, setGoalType] = useState<'emergency' | 'travel' | 'debt' | 'purchase'>('emergency');
  
  // Step 2: Detalles de meta
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [targetMonths, setTargetMonths] = useState('3');
  
  const goalOptions = [
    { id: 'emergency', label: '🛡️ Colchón de emergencia', value: 'emergency' },
    { id: 'travel', label: '✈️ Viaje', value: 'travel' },
    { id: 'debt', label: '💳 Pagar deudas', value: 'debt' },
    { id: 'purchase', label: '🛍️ Compra importante', value: 'purchase' },
  ];
  
  const handleCreateGoal = async () => {
    logger.start(LogModule.GOALS, 'Iniciando creación de meta desde create-goal');
    
    // Validación de campos
    if (!goalName || goalName.trim() === '') {
      Alert.alert('Error', 'Por favor ingresa un nombre para tu meta');
      return;
    }
    
    if (!goalAmount || goalAmount.trim() === '') {
      Alert.alert('Error', 'Por favor ingresa el monto objetivo');
      return;
    }
    
    const parsedAmount = parseFloat(goalAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Por favor ingresa un monto válido mayor a 0');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Verificar que tengamos un usuario autenticado
      if (!user?.id) {
        logger.error(LogModule.AUTH, 'No hay usuario autenticado para crear meta');
        Alert.alert('Error', 'Debes iniciar sesión para crear una meta');
        router.replace('/(auth)/onboarding');
        return;
      }
      
      logger.info(LogModule.GOALS, 'Usuario autenticado, procediendo con creación', { userId: user.id });
      
      // Calcular fecha objetivo
      const targetDate = new Date();
      const monthsToAdd = parseInt(targetMonths) || 3;
      targetDate.setMonth(targetDate.getMonth() + monthsToAdd);
      
      const goalData = {
        user_id: user.id,
        name: goalName.trim(),
        target_amount: parsedAmount,
        target_date: targetDate.toISOString().split('T')[0],
        saved_amount: 0,
        is_active: true
      };
      
      logger.debug(LogModule.GOALS, 'Datos de la meta a crear', goalData);
      
      // Crear la meta en Supabase
      const createdGoal = await GoalsService.createGoal(goalData);
      
      logger.success(LogModule.GOALS, 'Meta creada exitosamente', { goalId: createdGoal.id });
      
      // Actualizar el store de metas
      await fetchGoals(user.id, true);
      
      Alert.alert(
        '¡Éxito!', 
        'Tu meta ha sido creada correctamente',
        [
          {
            text: 'OK',
            onPress: () => {
              logger.info(LogModule.NAV, 'Cerrando modal de creación de meta');
              router.back();
            }
          }
        ]
      );
    } catch (error: any) {
      logger.error(LogModule.GOALS, 'Error creando meta', error);
      
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
      setIsLoading(false);
    }
  };
  
  const handleNext = () => {
    if (step === 1 && goalType) {
      // Pre-llenar nombre según el tipo de meta
      const defaultNames = {
        emergency: 'Mi Fondo de Emergencia',
        travel: 'Mi Viaje Soñado',
        debt: 'Libertad Financiera',
        purchase: 'Mi Gran Compra'
      };
      setGoalName(defaultNames[goalType]);
      setStep(2);
    } else if (step === 2) {
      handleCreateGoal();
    }
  };
  
  const handleCancel = () => {
    logger.info(LogModule.NAV, 'Usuario canceló creación de meta');
    router.back();
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
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
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
    buttonContainer: {
      marginTop: 32,
    },
    cancelButton: {
      marginTop: 16,
      opacity: 0.7,
    },
  });
  
  // Verificar autenticación
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.subtitle}>Debes iniciar sesión para crear una meta</Text>
          <Button
            title="Ir al inicio"
            onPress={() => router.replace('/(auth)/onboarding')}
            size="large"
            style={{ marginTop: 20 }}
          />
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.stepIndicator}>
            {[1, 2].map((s) => (
              <View
                key={s}
                style={[styles.stepDot, s === step && styles.stepDotActive]}
              />
            ))}
          </View>
          
          <View style={styles.header}>
            <Text style={styles.title}>
              {step === 1 ? '¿Cuál es tu meta?' : 'Personaliza tu meta'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 1 
                ? 'Elige lo que más te motive'
                : 'Define los detalles de tu objetivo'}
            </Text>
          </View>
          
          {step === 1 && (
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
                      logger.debug(LogModule.UI, 'Tipo de meta seleccionado', { type: option.value });
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
          
          {step === 2 && (
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
                Guardando tu meta...
              </Text>
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              <Button
                title={step === 1 ? 'Continuar' : 'Crear meta'}
                onPress={handleNext}
                size="large"
              />
              
              <Button
                title="Cancelar"
                onPress={handleCancel}
                variant="outlined"
                size="large"
                style={styles.cancelButton}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}