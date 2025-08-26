import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  PanGestureHandler,
  State,
  PanGestureHandlerGestureEvent,
  HandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { Transaction, TransactionCategory } from '@/schemas';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface TransactionWithCategory extends Transaction {
  category?: Pick<TransactionCategory, 'name' | 'emoji' | 'color'> | null;
}

interface AnimatedTransactionItemProps {
  transaction: TransactionWithCategory;
  onDelete?: (id: string) => void;
  onEdit?: (transaction: TransactionWithCategory) => void;
  index: number;
}

export const AnimatedTransactionItem: React.FC<
  AnimatedTransactionItemProps
> = ({ transaction, onDelete, onEdit, index }) => {
  const { theme } = useTheme();
  const haptics = useHapticFeedback();
  const [isDeleting, setIsDeleting] = useState(false);

  // Animaciones
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(50)).current;

  // Animación de entrada
  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.delay(index * 100), // Stagger animation
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideIn, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]);
    sequence.start();
  }, [index]);

  // Handlers para swipe
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: false }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX } = event.nativeEvent;

      if (translationX < -100) {
        // Swipe left - eliminar
        haptics.warning();
        showDeleteConfirmation();
      } else if (translationX > 100) {
        // Swipe right - editar
        haptics.light();
        handleEdit();
      }

      // Resetear posición
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
    }
  };

  const showDeleteConfirmation = () => {
    Alert.alert(
      'Eliminar transacción',
      '¿Estás seguro de que quieres eliminar esta transacción?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: handleDelete,
        },
      ]
    );
  };

  const handleDelete = () => {
    if (!onDelete) return;

    setIsDeleting(true);
    haptics.error();

    // Animación de salida
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDelete(transaction.id);
    });
  };

  const handleEdit = () => {
    if (!onEdit) return;

    haptics.light();

    // Micro-animación de feedback
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.05,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onEdit(transaction);
  };

  const handlePress = () => {
    haptics.selection();

    // Micro-animación de tap
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.98,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Colores basados en UX psicológico
  const amountColor = transaction.amount > 0 ? '#FF6B6B' : '#51CF66'; // Rojo pérdida, verde ganancia
  const moodColor =
    transaction.mood_after === 5
      ? '#51CF66' // Muy feliz
      : transaction.mood_after === 4
        ? '#69DB7C' // Feliz
        : transaction.mood_after === 3
          ? '#339AF0' // Neutral
          : transaction.mood_after === 2
            ? '#FFD93D' // Triste
            : '#FF8C00'; // Muy triste

  const regretIntensity = transaction.regret_level
    ? transaction.regret_level / 10
    : 0;
  const regretColor = `rgba(255, 107, 107, ${0.1 + regretIntensity * 0.3})`;

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            opacity,
            transform: [{ translateX }, { translateY: slideIn }, { scale }],
          },
          transaction.regret_level &&
            transaction.regret_level > 5 && {
              backgroundColor: regretColor,
            },
        ]}
      >
        <TouchableOpacity
          style={styles.content}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          {/* Indicador de mood */}
          <View
            style={[styles.moodIndicator, { backgroundColor: moodColor }]}
          />

          {/* Icono de categoría */}
          <View style={styles.categoryIcon}>
            <Text style={styles.categoryEmoji}>
              {transaction.category?.emoji || '💰'}
            </Text>
          </View>

          {/* Contenido principal */}
          <View style={styles.mainContent}>
            <Text style={[styles.description, { color: theme.text }]}>
              {transaction.description}
            </Text>

            <View style={styles.metadata}>
              <Text style={[styles.category, { color: theme.textSecondary }]}>
                {transaction.category?.name || 'Sin categoría'}
              </Text>

              {transaction.regret_level && transaction.regret_level > 7 && (
                <View style={styles.regretBadge}>
                  <Ionicons name="sad" size={12} color="#FF6B6B" />
                  <Text style={styles.regretText}>Te arrepientes</Text>
                </View>
              )}
            </View>
          </View>

          {/* Monto y fecha */}
          <View style={styles.rightContent}>
            <Text style={[styles.amount, { color: amountColor }]}>
              {transaction.amount > 0 ? '-' : '+'}$
              {Math.abs(transaction.amount).toFixed(0)}
            </Text>

            <Text style={[styles.date, { color: theme.textSecondary }]}>
              {new Date(transaction.created_at).toLocaleDateString('es-UY', {
                day: '2-digit',
                month: '2-digit',
              })}
            </Text>

            {/* Indicador de necesidad */}
            {transaction.necessity_level && (
              <View style={styles.necessityIndicator}>
                {Array.from({ length: 5 }, (_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.necessityDot,
                      i < transaction.necessity_level
                        ? { backgroundColor: '#51CF66' }
                        : { backgroundColor: theme.border },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Indicadores de swipe */}
        <Animated.View
          style={[
            styles.swipeIndicator,
            styles.leftIndicator,
            {
              opacity: translateX.interpolate({
                inputRange: [-100, -50, 0],
                outputRange: [1, 0.5, 0],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          <Ionicons name="trash" size={20} color="#FF6B6B" />
        </Animated.View>

        <Animated.View
          style={[
            styles.swipeIndicator,
            styles.rightIndicator,
            {
              opacity: translateX.interpolate({
                inputRange: [0, 50, 100],
                outputRange: [0, 0.5, 1],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          <Ionicons name="create" size={20} color="#339AF0" />
        </Animated.View>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },

  moodIndicator: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },

  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  categoryEmoji: {
    fontSize: 20,
  },

  mainContent: {
    flex: 1,
  },

  description: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },

  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  category: {
    fontSize: 13,
  },

  regretBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },

  regretText: {
    fontSize: 10,
    color: '#FF6B6B',
    fontWeight: '500',
  },

  rightContent: {
    alignItems: 'flex-end',
    gap: 4,
  },

  amount: {
    fontSize: 18,
    fontWeight: '700',
  },

  date: {
    fontSize: 12,
  },

  necessityIndicator: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },

  necessityDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Swipe indicators
  swipeIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },

  leftIndicator: {
    left: 0,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },

  rightIndicator: {
    right: 0,
    backgroundColor: 'rgba(51, 154, 240, 0.1)',
  },
});
