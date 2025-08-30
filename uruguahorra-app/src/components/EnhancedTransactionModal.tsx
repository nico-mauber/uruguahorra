import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { Card } from '@components';
import { TransactionsService } from '@/services/transactions.service';
import type { TransactionInsert } from '@/schemas';

const { width, height } = Dimensions.get('window');

interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  type: 'expense' | 'income' | 'transfer';
}

interface EnhancedTransactionModalProps {
  visible: boolean;
  userId: string;
  initialType?: 'expense' | 'income' | null;
  categories: Category[];
  onClose: () => void;
  onTransactionCreated: (transaction: any) => void;
}

type Step = 1 | 2 | 3; // 1: Amount, 2: Category, 3: Confirmation

export const EnhancedTransactionModal: React.FC<
  EnhancedTransactionModalProps
> = ({
  visible,
  userId,
  initialType,
  categories,
  onClose,
  onTransactionCreated,
}) => {
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>(1);
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const styles = React.useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setStep(1);
    setAmount('');
    setSelectedCategory(null);
    setDescription('');
    setIsLoading(false);
  };

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    const decimalCount = (numericValue.match(/\./g) || []).length;
    if (decimalCount <= 1) {
      setAmount(numericValue);
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep((prev) => (prev + 1) as Step);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return amount && parseFloat(amount) > 0;
      case 2:
        return selectedCategory;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!selectedCategory || !amount) {
      Alert.alert('Error', 'Por favor completa todos los campos requeridos');
      return;
    }

    try {
      setIsLoading(true);

      const transactionData: TransactionInsert = {
        user_id: userId,
        amount:
          selectedCategory.type === 'expense'
            ? -parseFloat(amount)
            : parseFloat(amount),
        category: selectedCategory.name,
        description: description || '',
        date: new Date().toISOString(),
        type: selectedCategory.type,
      };

      const newTransaction =
        await TransactionsService.createTransaction(transactionData);

      if (newTransaction) {
        onTransactionCreated(newTransaction);
        onClose();
        resetForm();
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert('Error', 'No se pudo crear la transacción');
    } finally {
      setIsLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return '💰 Monto';
      case 2:
        return '📁 Categoría';
      case 3:
        return '✅ Confirmar';
      default:
        return '';
    }
  };

  const getProgress = () => (step / 3) * 100;

  const renderAmountStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>💰 Ingresa el Monto</Text>

      <View style={styles.amountInputContainer}>
        <Text style={styles.currencySymbol}>$</Text>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={handleAmountChange}
          placeholder="0.00"
          placeholderTextColor={colors.text.secondary}
          keyboardType="numeric"
          returnKeyType="next"
          onSubmitEditing={() => canProceed() && handleNext()}
          autoFocus
        />
      </View>

      <TextInput
        style={styles.descriptionInput}
        value={description}
        onChangeText={setDescription}
        placeholder="Descripción (opcional)"
        placeholderTextColor={colors.text.secondary}
        multiline
        numberOfLines={2}
      />
    </View>
  );

  const renderCategoryStep = () => {
    const filteredCategories = initialType
      ? categories.filter((cat) => cat.type === initialType)
      : categories;

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>📁 Selecciona una Categoría</Text>

        <View style={styles.categoriesGrid}>
          {filteredCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryItem,
                selectedCategory?.id === category.id && styles.selectedCategory,
                { borderColor: category.color },
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderConfirmationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>✅ Confirmar Transacción</Text>

      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Monto:</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            ${parseFloat(amount).toFixed(2)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Categoría:</Text>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryInfoEmoji}>
              {selectedCategory?.emoji}
            </Text>
            <Text style={styles.summaryValue}>{selectedCategory?.name}</Text>
          </View>
        </View>

        {description && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Descripción:</Text>
            <Text style={styles.summaryValue}>{description}</Text>
          </View>
        )}
      </Card>
    </View>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return renderAmountStep();
      case 2:
        return renderCategoryStep();
      case 3:
        return renderConfirmationStep();
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.modalTitle}>Nueva Transacción</Text>
            <Text style={styles.stepIndicator}>{step}/3</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBar,
                { width: `${getProgress()}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
          <Text style={styles.stepTitle}>{getStepTitle()}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>{renderCurrentStep()}</View>

        {/* Footer */}
        <View style={styles.footer}>
          {step > 1 && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handlePrevious}
              disabled={isLoading}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Anterior
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              { backgroundColor: colors.primary },
              (!canProceed() || isLoading) && styles.disabledButton,
            ]}
            onPress={handleNext}
            disabled={!canProceed() || isLoading}
          >
            <Text style={styles.primaryButtonText}>
              {step === 3 ? 'Crear' : 'Siguiente'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 10,
    },
    closeButton: {
      padding: 8,
    },
    titleContainer: {
      flex: 1,
      alignItems: 'center',
      marginRight: 40,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    stepIndicator: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    progressContainer: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    progressBarBackground: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      marginBottom: 10,
    },
    progressBar: {
      height: '100%',
      borderRadius: 2,
    },
    stepTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      textAlign: 'center',
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    stepContainer: {
      flex: 1,
    },
    amountInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 30,
    },
    currencySymbol: {
      fontSize: 32,
      fontWeight: '600',
      color: colors.primary,
      marginRight: 8,
    },
    amountInput: {
      flex: 1,
      fontSize: 32,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'left',
    },
    descriptionInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    categoriesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    categoryItem: {
      width: (width - 60) / 3,
      aspectRatio: 1,
      borderWidth: 2,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
      backgroundColor: colors.cardBackground,
    },
    selectedCategory: {
      backgroundColor: colors.primaryLight,
    },
    categoryEmoji: {
      fontSize: 24,
      marginBottom: 4,
    },
    categoryName: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text,
      textAlign: 'center',
    },
    summaryCard: {
      marginTop: 20,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    summaryLabel: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    summaryValue: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    categoryInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    categoryInfoEmoji: {
      fontSize: 16,
      marginRight: 6,
    },
    footer: {
      flexDirection: 'row',
      padding: 20,
      gap: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    disabledButton: {
      opacity: 0.5,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    primaryButtonText: {
      color: colors.primaryText,
    },
    secondaryButtonText: {
      color: colors.text,
    },
  });
