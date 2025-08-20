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
import { useGoalsStore } from '@store/useGoalsStore';
import { GoalsService } from '@/services/goals.service';
import { logger, LogModule } from '@/utils/logger';

export default function CreateGoalScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { fetchGoals } = useGoalsStore();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Tipo de meta
  const [goalType, setGoalType] = useState<
    'emergency' | 'travel' | 'debt' | 'purchase'
  >('emergency');

  // Step 2: Detalles de meta
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [targetMonths, setTargetMonths] = useState('3');

  // Campos específicos por tipo de meta
  const [travelDestination, setTravelDestination] = useState('');
  const [debtInterestRate, setDebtInterestRate] = useState('');
  const [purchaseDescription, setPurchaseDescription] = useState('');

  const goalOptions = [
    { id: 'emergency', label: '🛡️ Colchón de emergencia', value: 'emergency' },
    { id: 'travel', label: '✈️ Viaje', value: 'travel' },
    { id: 'debt', label: '💳 Pagar deudas', value: 'debt' },
    { id: 'purchase', label: '🛍️ Compra importante', value: 'purchase' },
  ];

  const handleCreateGoal = async () => {
    logger.start(
      LogModule.GOALS,
      'Iniciando creación de meta desde create-goal'
    );

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
        logger.error(
          LogModule.AUTH,
          'No hay usuario autenticado para crear meta'
        );
        Alert.alert('Error', 'Debes iniciar sesión para crear una meta');
        router.replace('/(auth)/onboarding');
        return;
      }

      // Si el usuario está en el store, está autenticado. Punto.
      logger.info(
        LogModule.GOALS,
        'Usuario autenticado, procediendo con creación',
        {
          userId: user.id,
          email: user.email,
        }
      );

      // Calcular fecha objetivo
      const targetDate = new Date();
      const monthsToAdd = parseInt(targetMonths) || 3;
      targetDate.setMonth(targetDate.getMonth() + monthsToAdd);

      // No incluir user_id, el servicio lo obtendrá de la sesión
      // Personalizar el nombre de la meta según el tipo y los detalles adicionales
      let finalGoalName = goalName.trim();

      // Agregar información adicional al nombre de la meta
      if (goalType === 'travel' && travelDestination) {
        finalGoalName = `${finalGoalName} - ${travelDestination}`;
      } else if (goalType === 'purchase' && purchaseDescription) {
        finalGoalName = `${finalGoalName} - ${purchaseDescription}`;
      }

      const goalData = {
        name: finalGoalName,
        target_amount: parsedAmount,
        target_date: targetDate.toISOString().split('T')[0],
        saved_amount: 0,
        is_active: true,
        category: goalType,
        // Establecer color e ícono según el tipo
        color:
          goalType === 'travel'
            ? '#10B981'
            : goalType === 'debt'
              ? '#EF4444'
              : goalType === 'purchase'
                ? '#8B5CF6'
                : '#3B82F6',
        icon:
          goalType === 'travel'
            ? 'airplane'
            : goalType === 'debt'
              ? 'card'
              : goalType === 'purchase'
                ? 'cart'
                : 'shield',
      };

      logger.debug(LogModule.GOALS, 'Datos de la meta a crear', goalData);

      // Crear la meta en Supabase
      const createdGoal = await GoalsService.createGoal(user.id, goalData);

      logger.success(LogModule.GOALS, 'Meta creada exitosamente', {
        goalId: createdGoal.id,
      });

      // Actualizar el store de metas
      await fetchGoals(user.id, true);

      Alert.alert('¡Éxito!', 'Tu meta ha sido creada correctamente', [
        {
          text: 'OK',
          onPress: () => {
            logger.info(LogModule.NAV, 'Cerrando modal de creación de meta');
            router.back();
          },
        },
      ]);
    } catch (error: unknown) {
      logger.error(LogModule.GOALS, 'Error creando meta', error);

      let errorMessage = 'No se pudo crear la meta';

      if (error && typeof error === 'object' && 'code' in error) {
        const err = error as { code?: string; message?: string };
        if (err.code === '23505') {
          errorMessage = 'Ya existe una meta con ese nombre';
        } else if (err.code === '42501') {
          errorMessage =
            'No tienes permisos para crear metas. Verifica tu sesión.';
        } else if ('message' in error && typeof err.message === 'string') {
          errorMessage = err.message;
        }
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && goalType) {
      // Pre-llenar nombre y configuraciones según el tipo de meta
      const defaultConfigs = {
        emergency: {
          name: 'Mi Fondo de Emergencia',
          months: '6',
          amount: '',
        },
        travel: {
          name: 'Mi Viaje Soñado',
          months: '12',
          amount: '',
        },
        debt: {
          name: 'Libertad Financiera',
          months: '24',
          amount: '',
        },
        purchase: {
          name: 'Mi Gran Compra',
          months: '8',
          amount: '',
        },
      };

      const config = defaultConfigs[goalType];
      setGoalName(config.name);
      setTargetMonths(config.months);
      setGoalAmount(config.amount);
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
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 40,
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
    goalOptionCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
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
    tipCard: {
      marginBottom: 20,
      backgroundColor: theme.primary + '10',
      borderColor: theme.primary + '30',
    },
    tipTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.primary,
      marginBottom: 8,
    },
    tipText: {
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
    },
    calculatorCard: {
      marginTop: 16,
      backgroundColor: theme.success + '10',
      borderColor: theme.success + '30',
      borderWidth: 1,
    },
    calculatorTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.success,
      marginBottom: 8,
    },
    calculatorText: {
      fontSize: 16,
      color: theme.text,
      fontWeight: '600',
      marginBottom: 4,
    },
    calculatorSubtext: {
      fontSize: 14,
      color: theme.textSecondary,
    },
  });

  // Verificar autenticación
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.subtitle}>
            Debes iniciar sesión para crear una meta
          </Text>
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
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}
        >
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
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.goalOptionCard,
                    goalType === option.value && styles.selectedGoal,
                  ]}
                  onPress={() => {
                    if (!isLoading) {
                      logger.debug(LogModule.UI, 'Tipo de meta seleccionado', {
                        type: option.value,
                      });
                      setGoalType(
                        option.value as
                          | 'emergency'
                          | 'travel'
                          | 'debt'
                          | 'purchase'
                      );
                    }
                  }}
                  disabled={isLoading}
                >
                  <View style={styles.goalOptionContent}>
                    <Text style={styles.goalOptionText}>{option.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {step === 2 && (
            <>
              {/* Consejo específico por tipo de meta */}
              <Card style={styles.tipCard} variant="outlined">
                <Text style={styles.tipTitle}>
                  {goalType === 'emergency' &&
                    '💡 Consejo para Fondo de Emergencia'}
                  {goalType === 'travel' && '💡 Consejo para tu Viaje'}
                  {goalType === 'debt' && '💡 Consejo para Pagar Deudas'}
                  {goalType === 'purchase' && '💡 Consejo para tu Compra'}
                </Text>
                <Text style={styles.tipText}>
                  {goalType === 'emergency' &&
                    'Idealmente 3-6 meses de gastos mensuales. Esto te protege ante imprevistos.'}
                  {goalType === 'travel' &&
                    'Investiga costos de vuelos, alojamiento y actividades. ¡Planificar te ayuda a ahorrar más!'}
                  {goalType === 'debt' &&
                    'Pagar deudas rápido te ahorra intereses. Considera empezar por la de mayor tasa.'}
                  {goalType === 'purchase' &&
                    'Comprar al contado suele tener descuentos. ¡Tu paciencia será recompensada!'}
                </Text>
              </Card>

              <TextInput
                style={styles.input}
                placeholder={
                  goalType === 'emergency'
                    ? 'Ej: Fondo de Emergencia Familiar'
                    : goalType === 'travel'
                      ? 'Ej: Viaje a Europa 2025'
                      : goalType === 'debt'
                        ? 'Ej: Eliminar deuda tarjeta de crédito'
                        : 'Ej: Auto nuevo'
                }
                placeholderTextColor={theme.textSecondary}
                value={goalName}
                onChangeText={setGoalName}
                editable={!isLoading}
              />

              {/* Campos específicos según el tipo de meta */}
              {goalType === 'travel' && (
                <TextInput
                  style={styles.input}
                  placeholder="Destino (opcional)"
                  placeholderTextColor={theme.textSecondary}
                  value={travelDestination}
                  onChangeText={setTravelDestination}
                  editable={!isLoading}
                />
              )}

              {goalType === 'debt' && (
                <TextInput
                  style={styles.input}
                  placeholder="Tasa de interés actual (%) - opcional"
                  placeholderTextColor={theme.textSecondary}
                  value={debtInterestRate}
                  onChangeText={setDebtInterestRate}
                  keyboardType="numeric"
                  editable={!isLoading}
                />
              )}

              {goalType === 'purchase' && (
                <TextInput
                  style={styles.input}
                  placeholder="Descripción del producto (opcional)"
                  placeholderTextColor={theme.textSecondary}
                  value={purchaseDescription}
                  onChangeText={setPurchaseDescription}
                  editable={!isLoading}
                  multiline
                />
              )}

              <TextInput
                style={styles.input}
                placeholder={
                  goalType === 'emergency'
                    ? 'Monto objetivo (Ej: $50,000)'
                    : goalType === 'travel'
                      ? 'Presupuesto total del viaje'
                      : goalType === 'debt'
                        ? 'Total de la deuda a pagar'
                        : 'Precio estimado de la compra'
                }
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
                  placeholder={targetMonths}
                  placeholderTextColor={theme.textSecondary}
                  value={targetMonths}
                  onChangeText={setTargetMonths}
                  keyboardType="numeric"
                  editable={!isLoading}
                />
                <Text style={[styles.monthsLabel, { marginLeft: 10 }]}>
                  meses
                </Text>
              </View>

              {/* Calculadora automática */}
              {goalAmount && targetMonths && (
                <Card style={styles.calculatorCard}>
                  <Text style={styles.calculatorTitle}>
                    📊 Tu plan de ahorro
                  </Text>
                  <Text style={styles.calculatorText}>
                    Necesitas ahorrar: $
                    {(parseFloat(goalAmount) / parseInt(targetMonths)).toFixed(
                      0
                    )}{' '}
                    por mes
                  </Text>
                  <Text style={styles.calculatorSubtext}>
                    ≈ $
                    {(
                      parseFloat(goalAmount) /
                      (parseInt(targetMonths) * 30)
                    ).toFixed(0)}{' '}
                    por día
                  </Text>
                </Card>
              )}
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
                variant="outline"
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
