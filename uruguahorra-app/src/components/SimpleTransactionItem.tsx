import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import {
  spacing,
  borderRadius,
  elevation,
  typography,
  opacity,
  textStyles,
} from '@theme';
import { Transaction } from '@/schemas';

interface SimpleTransactionItemProps {
  transaction: Transaction;
  onDelete?: (id: string) => void;
  onEdit?: (transaction: Transaction) => void;
  index: number;
}

export const SimpleTransactionItem: React.FC<SimpleTransactionItemProps> = ({
  transaction,
  onDelete,
  onEdit,
  index,
}) => {
  const { colors, getExpenseColor, getSavingsColor, getContextualBackground } =
    useTheme();

  // Psychological color determination (Loss Aversion principle)
  const isExpense = transaction.type === 'expense';
  const amountColor = isExpense ? getExpenseColor() : getSavingsColor();
  const cardBackgroundColor = isExpense
    ? getContextualBackground('expense')
    : getContextualBackground('savings');

  // High regret level gets stronger psychological warning
  const hasHighRegret =
    transaction.regret_level && transaction.regret_level > 7;
  const regretBackgroundColor = hasHighRegret
    ? colors.expense.background
    : 'transparent';

  // Staggered entrance animations for list fluidity
  const opacityValue = useRef(new Animated.Value(0)).current;
  const slideValue = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.delay(index * 50), // Staggered delay
      Animated.parallel([
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideValue, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]);
    sequence.start();
  }, [index, opacityValue, slideValue]);

  const handleEdit = () => {
    if (onEdit) {
      onEdit(transaction);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(transaction.id);
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: regretBackgroundColor || cardBackgroundColor,
          borderColor: isExpense
            ? colors.expense.secondary
            : colors.savings.secondary,
          opacity: opacityValue,
          transform: [{ translateY: slideValue }],
          ...elevation.sm,
        },
      ]}
    >
      <TouchableOpacity style={styles.content} activeOpacity={opacity.pressed}>
        {/* Category Icon (Mental Accounting visualization) */}
        <View
          style={[
            styles.categoryIcon,
            {
              backgroundColor: isExpense
                ? colors.expense.light
                : colors.savings.light,
            },
          ]}
        >
          <Text style={styles.categoryEmoji}>
            {transaction.category_emoji || (isExpense ? '�' : '�💰')}
          </Text>
        </View>

        {/* Main Content (Progressive Disclosure) */}
        <View style={styles.mainContent}>
          <Text
            style={[
              styles.description,
              { color: colors.text.primary },
              textStyles.categoryWithEmoji,
            ]}
          >
            {transaction.description || 'Transacción'}
          </Text>

          <Text
            style={[
              styles.category,
              { color: colors.text.secondary },
              textStyles.metadata,
            ]}
          >
            {transaction.category_name || 'Sin categoría'}
          </Text>

          {hasHighRegret && (
            <View
              style={[
                styles.regretBadge,
                { backgroundColor: colors.expense.background },
              ]}
            >
              <Ionicons name="sad" size={12} color={colors.expense.primary} />
              <Text
                style={[styles.regretText, { color: colors.expense.primary }]}
              >
                Alto arrepentimiento
              </Text>
            </View>
          )}
        </View>

        {/* Amount and Date (Information Hierarchy) */}
        <View style={styles.rightContent}>
          <Text
            style={[
              styles.amount,
              { color: amountColor },
              textStyles.transactionAmount,
            ]}
          >
            {transaction.type === 'expense' ? '-' : '+'}$
            {Math.abs(transaction.amount).toFixed(0)}
          </Text>

          <Text
            style={[
              styles.date,
              { color: colors.text.tertiary },
              textStyles.metadata,
            ]}
          >
            {new Date(transaction.transaction_date).toLocaleDateString(
              'es-UY',
              {
                day: '2-digit',
                month: '2-digit',
              }
            )}
          </Text>
        </View>

        {/* Action Buttons (Touch-friendly design) */}
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.primary + '20' },
              ]}
              onPress={handleEdit}
              activeOpacity={opacity.pressed}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={colors.primary}
              />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.expense.primary + '20' },
              ]}
              onPress={handleDelete}
              activeOpacity={opacity.pressed}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color={colors.expense.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg, // 16px
    marginVertical: spacing.xs, // 4px
    borderRadius: borderRadius.lg, // 12px psychological softness
    borderWidth: 1,
    overflow: 'hidden',
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg, // 16px
    minHeight: 72, // Touch-friendly height
  },

  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md, // 12px
  },

  categoryEmoji: {
    fontSize: 20, // Emoji recognition
  },

  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },

  description: {
    marginBottom: spacing.xs / 2, // 2px
  },

  category: {
    marginBottom: spacing.xs, // 4px
  },

  regretBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm, // 8px
    paddingVertical: spacing.xs / 2, // 2px
    borderRadius: borderRadius.sm, // 4px
    gap: spacing.xs, // 4px
    alignSelf: 'flex-start',
  },

  regretText: {
    fontSize: 10,
    fontWeight: '500',
  },

  rightContent: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: spacing.md, // 12px
  },

  amount: {
    marginBottom: spacing.xs / 2, // 2px
    textAlign: 'right',
  },

  date: {
    textAlign: 'right',
  },

  actions: {
    flexDirection: 'column',
    gap: spacing.sm, // 8px
  },

  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
