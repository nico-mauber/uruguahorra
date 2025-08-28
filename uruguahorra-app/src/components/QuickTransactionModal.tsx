import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTransactionsStore } from '@/store/useTransactionsStore';
import { QuickTransaction } from '@/schemas';

const { width } = Dimensions.get('window');

interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  type: 'expense' | 'income' | 'transfer';
}

interface Transaction {
  id: string;
  amount: number;
  description?: string | null;
  category_id?: string | null;
  type: 'expense' | 'income' | 'transfer';
  user_id: string;
  transaction_date: string;
  xp_earned: number;
  goal_id?: string | null;
  squad_id?: string | null;
}

interface QuickTransactionModalProps {
  visible: boolean;
  userId: string;
  initialType?: 'expense' | 'income' | null;
  onClose: () => void;
  onTransactionCreated: (transaction: Transaction) => void;
}

/**
 * QuickTransactionModal - Modal para entrada ultra-rápida (3 taps)
 *
 * Características psicológicas:
 * - Flujo 3-tap optimizado
 * - Teclado numérico grande y prominente
 * - Categorías visuales con emojis grandes
 * - Feedback inmediato
 * - Colores según psicología (rojo gastos, verde ingresos)
 */
export const QuickTransactionModal: React.FC<QuickTransactionModalProps> = ({
  visible,
  userId,
  initialType,
  onClose,
  onTransactionCreated,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Cantidad, 2: Categoría, 3: Confirmación
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { categories, fetchCategories, createQuickTransaction } =
    useTransactionsStore();

  // Animaciones
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      // Cargar categorías si no las tenemos
      fetchCategories();

      // Reset state
      setStep(1);
      setAmount('');
      setSelectedCategory(null);
      setDescription('');

      // Animación de entrada
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, fetchCategories, scaleAnim, slideAnim]);

  const handleAmountChange = (value: string) => {
    // Solo permitir números y un punto decimal
    const cleanValue = value.replace(/[^0-9.]/g, '');
    const parts = cleanValue.split('.');
    if (parts.length <= 2 && (parts[1]?.length || 0) <= 2) {
      setAmount(cleanValue);
    }
  };

  const handleAmountSubmit = () => {
    const numAmount = parseFloat(amount);
    if (numAmount <= 0) {
      Alert.alert('Error', 'El monto debe ser mayor a 0');
      return;
    }
    if (numAmount > 999999.99) {
      Alert.alert('Error', 'El monto es demasiado grande');
      return;
    }
    setStep(2);
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setStep(3);
  };

  const handleCreate = async () => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Selecciona una categoría');
      return;
    }

    setIsLoading(true);

    try {
      const transactionData: QuickTransaction = {
        amount: parseFloat(amount),
        category_id: selectedCategory.id,
        description: description.trim() || undefined,
        type: initialType || selectedCategory.type,
      };

      const newTransaction = await createQuickTransaction(
        userId,
        transactionData
      );

      // Feedback de éxito
      Alert.alert(
        '¡Listo! 💚',
        `Transacción de $${amount} registrada correctamente`,
        [{ text: 'OK', onPress: () => onTransactionCreated(newTransaction) }]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudo crear la transacción. Intenta nuevamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoriesByType = () => {
    if (initialType) {
      return categories.filter((cat) => cat.type === initialType);
    }
    return categories.filter((cat) => cat.type === 'expense'); // Default a gastos
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return '💰 ¿Cuánto?';
      case 2:
        return '📂 ¿Categoría?';
      case 3:
        return '✅ Confirmar';
      default:
        return '';
    }
  };

  const getStepColor = () => {
    if (initialType === 'income') return '#51CF66';
    if (initialType === 'expense') return '#FF6B6B';
    return '#339AF0';
  };

  const renderAmountStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: getStepColor() }]}>
        {getStepTitle()}
      </Text>

      <View style={styles.amountContainer}>
        <Text style={styles.currencySymbol}>$</Text>
        <TextInput
          style={[styles.amountInput, { borderColor: getStepColor() }]}
          value={amount}
          onChangeText={handleAmountChange}
          placeholder="0.00"
          placeholderTextColor="#ADB5BD"
          keyboardType="decimal-pad"
          selectTextOnFocus
        />
      </View>

      <TouchableOpacity
        style={[styles.nextButton, { backgroundColor: getStepColor() }]}
        onPress={handleAmountSubmit}
        disabled={!amount || parseFloat(amount) <= 0}
      >
        <Text style={styles.nextButtonText}>Siguiente</Text>
        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const renderCategoryStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: getStepColor() }]}>
        {getStepTitle()}
      </Text>

      <ScrollView
        style={styles.categoriesContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.categoriesGrid}>
          {getCategoriesByType().map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryButton, { borderColor: category.color }]}
              onPress={() => handleCategorySelect(category)}
            >
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text style={styles.categoryName} numberOfLines={2}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderConfirmStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: getStepColor() }]}>
        {getStepTitle()}
      </Text>

      <View style={styles.confirmContainer}>
        {/* Monto Section - Más prominente */}
        <View style={styles.confirmAmountSection}>
          <Text style={styles.confirmSectionLabel}>Monto</Text>
          <Text style={[styles.confirmAmountValue, { color: getStepColor() }]}>
            ${amount}
          </Text>
        </View>

        {/* Categoría Section - Más espaciosa */}
        <View style={styles.confirmCategorySection}>
          <Text style={styles.confirmSectionLabel}>Categoría</Text>
          <View style={styles.confirmCategoryDisplay}>
            <View
              style={[
                styles.categoryIconContainer,
                { backgroundColor: selectedCategory?.color + '20' },
              ]}
            >
              <Text style={styles.confirmCategoryEmoji}>
                {selectedCategory?.emoji}
              </Text>
            </View>
            <Text style={styles.confirmCategoryName}>
              {selectedCategory?.name}
            </Text>
          </View>
        </View>

        {/* Descripción Section - Mejorada */}
        <View style={styles.confirmDescriptionSection}>
          <Text style={styles.confirmSectionLabel}>Descripción</Text>
          <TextInput
            style={styles.descriptionInputImproved}
            value={description}
            onChangeText={setDescription}
            placeholder="Añade una nota sobre esta transacción (opcional)"
            placeholderTextColor="#ADB5BD"
            multiline
            maxLength={100}
            textAlignVertical="top"
          />
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.createButton,
          { backgroundColor: getStepColor() },
          isLoading && styles.disabledButton,
        ]}
        onPress={handleCreate}
        disabled={isLoading}
      >
        {isLoading ? (
          <Text style={styles.createButtonText}>Guardando...</Text>
        ) : (
          <>
            <Text style={styles.createButtonText}>Crear Transacción</Text>
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return renderAmountStep();
      case 2:
        return renderCategoryStep();
      case 3:
        return renderConfirmStep();
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.overlay}>
            <Animated.View
              style={[
                styles.modal,
                {
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [300, 0],
                      }),
                    },
                    { scale: scaleAnim },
                  ],
                },
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                {step > 1 && (
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() =>
                      setStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3)
                    }
                  >
                    <Ionicons name="arrow-back" size={24} color="#6C757D" />
                  </TouchableOpacity>
                )}

                <View style={styles.progressContainer}>
                  {[1, 2, 3].map((stepNumber) => (
                    <View
                      key={stepNumber}
                      style={[
                        styles.progressDot,
                        stepNumber <= step && {
                          backgroundColor: getStepColor(),
                        },
                      ]}
                    />
                  ))}
                </View>

                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Ionicons name="close" size={24} color="#6C757D" />
                </TouchableOpacity>
              </View>

              {/* Content with ScrollView for keyboard handling */}
              <ScrollView
                style={styles.scrollContent}
                contentContainerStyle={styles.scrollContentContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {renderCurrentStep()}
              </ScrollView>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%', // Aumentado de 75% a 85%
    minHeight: Platform.OS === 'ios' ? 500 : 400, // Altura mínima mayor en iOS
    width: '100%',
  },

  scrollContent: {
    flex: 1,
  },

  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  progressContainer: {
    flexDirection: 'row',
    gap: 8,
  },

  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E9ECEF',
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  stepContainer: {
    padding: Platform.OS === 'ios' ? 32 : 24, // Más padding en iOS
    flex: 1,
  },

  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Platform.OS === 'ios' ? 40 : 32, // Más espacio en iOS
  },

  // Amount Step
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },

  currencySymbol: {
    fontSize: 32,
    fontWeight: '600',
    color: '#6C757D',
    marginRight: 8,
  },

  amountInput: {
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'center',
    borderBottomWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 120,
  },

  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#51CF66',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },

  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Category Step
  categoriesContainer: {
    flex: 1,
  },

  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },

  categoryButton: {
    width: (width - 80) / 3, // 3 columnas con padding
    aspectRatio: 1,
    borderWidth: 2,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },

  categoryEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },

  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: '#495057',
  },

  // Confirm Step - Improved
  confirmContainer: {
    flex: 1,
    paddingTop: 8,
  },

  // New improved styles
  confirmAmountSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },

  confirmSectionLabel: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  confirmAmountValue: {
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
  },

  confirmCategorySection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },

  confirmCategoryDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  confirmCategoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
  },

  confirmDescriptionSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flex: 1,
  },

  descriptionInputImproved: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
  },

  // Legacy styles for backwards compatibility
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },

  confirmLabel: {
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500',
  },

  confirmValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },

  confirmCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  confirmCategoryEmoji: {
    fontSize: 20,
  },

  descriptionInput: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 24,
    fontSize: 16,
    maxHeight: 80,
  },

  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#51CF66',
    borderRadius: 16, // Más redondeado
    paddingVertical: Platform.OS === 'ios' ? 20 : 16, // Más altura en iOS
    paddingHorizontal: 32, // Más ancho
    gap: 10,
    marginTop: Platform.OS === 'ios' ? 32 : 24, // Más espacio arriba en iOS
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },

  createButtonText: {
    color: '#FFFFFF',
    fontSize: 17, // Ligeramente más grande
    fontWeight: '600',
  },

  disabledButton: {
    opacity: 0.6,
  },
});
