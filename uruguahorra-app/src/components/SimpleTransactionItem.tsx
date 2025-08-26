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
  const { theme } = useTheme();

  // Animaciones simples
  const opacity = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.delay(index * 50),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideIn, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]);
    sequence.start();
  }, [index, opacity, slideIn]);

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

  // Colores psicológicos
  const amountColor = transaction.type === 'expense' ? '#FF6B6B' : '#51CF66';
  const regretColor =
    transaction.regret_level && transaction.regret_level > 5
      ? 'rgba(255, 107, 107, 0.1)'
      : 'transparent';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: regretColor || theme.card,
          borderColor: theme.border,
          opacity,
          transform: [{ translateY: slideIn }],
        },
      ]}
    >
      <TouchableOpacity style={styles.content} activeOpacity={0.7}>
        {/* Icono de categoría */}
        <View style={styles.categoryIcon}>
          <Text style={styles.categoryEmoji}>
            {transaction.category_emoji || '💰'}
          </Text>
        </View>

        {/* Contenido principal */}
        <View style={styles.mainContent}>
          <Text style={[styles.description, { color: theme.text }]}>
            {transaction.description || 'Transacción'}
          </Text>

          <Text style={[styles.category, { color: theme.textSecondary }]}>
            {transaction.category_name || 'Sin categoría'}
          </Text>

          {transaction.regret_level && transaction.regret_level > 7 && (
            <View style={styles.regretBadge}>
              <Ionicons name="sad" size={12} color="#FF6B6B" />
              <Text style={styles.regretText}>Arrepentimiento alto</Text>
            </View>
          )}
        </View>

        {/* Monto y fecha */}
        <View style={styles.rightContent}>
          <Text style={[styles.amount, { color: amountColor }]}>
            {transaction.type === 'expense' ? '-' : '+'}$
            {Math.abs(transaction.amount).toFixed(0)}
          </Text>

          <Text style={[styles.date, { color: theme.textSecondary }]}>
            {new Date(transaction.transaction_date).toLocaleDateString(
              'es-UY',
              {
                day: '2-digit',
                month: '2-digit',
              }
            )}
          </Text>
        </View>

        {/* Botones de acción */}
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
              <Ionicons name="create-outline" size={16} color="#339AF0" />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },

  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  categoryEmoji: {
    fontSize: 18,
  },

  mainContent: {
    flex: 1,
  },

  description: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },

  category: {
    fontSize: 13,
    marginBottom: 4,
  },

  regretBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
    alignSelf: 'flex-start',
  },

  regretText: {
    fontSize: 10,
    color: '#FF6B6B',
    fontWeight: '500',
  },

  rightContent: {
    alignItems: 'flex-end',
    marginRight: 12,
  },

  amount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },

  date: {
    fontSize: 12,
  },

  actions: {
    flexDirection: 'row',
    gap: 8,
  },

  actionButton: {
    padding: 8,
  },
});
