import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, TransactionFAB } from '@components';
import { useTheme } from '@theme';
import { useAuth } from '@/contexts';
import { useTransactionsStore } from '@store/useTransactionsStore';
import { Transaction, TransactionFilters } from '@/schemas';
import { logger, LogModule } from '@/utils/logger';
import { ToastService } from '@/utils/toast';

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const {
    transactions,
    categories,
    currentBalance,
    isLoading,
    error,
    fetchTransactions,
    fetchCategories,
    getCurrentBalance,
    deleteTransaction,
  } = useTransactionsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<
    'week' | 'month' | 'year'
  >('month');

  // Inicializar datos
  useEffect(() => {
    if (!user?.id) return;

    const initializeTransactions = async () => {
      try {
        logger.start(
          LogModule.TRANSACTIONS,
          'Inicializando pantalla de transacciones'
        );

        const filters: TransactionFilters = {
          user_id: user.id,
          limit: 50,
          offset: 0,
          period: selectedPeriod,
        };

        await Promise.all([
          fetchTransactions(filters, true),
          fetchCategories(),
          getCurrentBalance(user.id),
        ]);

        logger.success(LogModule.TRANSACTIONS, 'Transacciones inicializadas');
      } catch (error) {
        logger.error(
          LogModule.TRANSACTIONS,
          'Error inicializando transacciones',
          error
        );
        ToastService.handleError(error);
      }
    };

    initializeTransactions();
  }, [user?.id, selectedPeriod]);

  // Refrescar datos
  const onRefresh = async () => {
    if (!user?.id) return;

    setRefreshing(true);
    try {
      const filters: TransactionFilters = {
        user_id: user.id,
        limit: 50,
        offset: 0,
      };

      await Promise.all([
        fetchTransactions(filters, true),
        getCurrentBalance(user.id),
      ]);

      ToastService.quickSuccess('Transacciones actualizadas');
    } catch (error) {
      ToastService.handleError(error);
    } finally {
      setRefreshing(false);
    }
  };

  // Handler para eliminar transacción
  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (!user?.id) return;

    try {
      await deleteTransaction(transaction.id, user.id);
      ToastService.quickSuccess('Transacción eliminada');
    } catch (error) {
      ToastService.handleError(error);
    }
  };

  // Handler para nueva transacción
  const handleTransactionCreated = () => {
    ToastService.quickSuccess('¡Transacción creada exitosamente!');
    if (user?.id) {
      onRefresh();
    }
  };

  // Formatear fecha
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Fecha desconocida';

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `${diffDays} días`;

    return date.toLocaleDateString('es-UY', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Obtener categoría por ID
  const getCategoryById = (categoryId?: string | null) => {
    if (!categoryId) return null;
    return categories.find((cat) => cat.id === categoryId);
  };

  // Agrupar transacciones por fecha
  const groupTransactionsByDate = () => {
    const grouped: { [key: string]: Transaction[] } = {};

    transactions.forEach((transaction) => {
      const dateStr = transaction.created_at || new Date().toISOString();
      const date = new Date(dateStr).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(transaction);
    });

    return Object.entries(grouped).sort(
      ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
    );
  };

  const renderBalanceCard = () => {
    if (!currentBalance) return null;

    return (
      <Card style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Text style={[styles.balanceTitle, { color: colors.text.primary }]}>
            Balance del{' '}
            {selectedPeriod === 'week'
              ? 'período'
              : selectedPeriod === 'month'
                ? 'mes'
                : 'año'}
          </Text>
          <View style={styles.periodSelector}>
            {(['week', 'month', 'year'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  { borderColor: colors.primary },
                  selectedPeriod === period && {
                    backgroundColor: colors.primary,
                  },
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    {
                      color:
                        selectedPeriod === period ? '#FFFFFF' : colors.primary,
                    },
                  ]}
                >
                  {period === 'week' ? '7d' : period === 'month' ? '1M' : '1A'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={[styles.balanceLabel, { color: colors.text.secondary }]}>
              Ingresos
            </Text>
            <Text style={[styles.balanceValue, { color: '#51CF66' }]}>
              +${currentBalance.income.toFixed(0)}
            </Text>
          </View>

          <View style={styles.balanceItem}>
            <Text style={[styles.balanceLabel, { color: colors.text.secondary }]}>
              Gastos
            </Text>
            <Text style={[styles.balanceValue, { color: '#FF6B6B' }]}>
              -${currentBalance.expenses.toFixed(0)}
            </Text>
          </View>

          <View style={styles.balanceItem}>
            <Text style={[styles.balanceLabel, { color: colors.text.secondary }]}>
              Balance
            </Text>
            <Text
              style={[
                styles.balanceValue,
                { color: currentBalance.balance >= 0 ? '#51CF66' : '#FF6B6B' },
              ]}
            >
              {currentBalance.balance >= 0 ? '+' : ''}$
              {currentBalance.balance.toFixed(0)}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderTransactionItem = (transaction: Transaction) => {
    const category = getCategoryById(transaction.category_id);
    const isExpense = transaction.type === 'expense';

    return (
      <Card key={transaction.id} style={styles.transactionCard}>
        <View style={styles.transactionContent}>
          <View style={styles.transactionLeft}>
            <View
              style={[
                styles.categoryIcon,
                { backgroundColor: category?.color || colors.primary },
              ]}
            >
              <Text style={styles.categoryEmoji}>
                {category?.emoji || '💰'}
              </Text>
            </View>

            <View style={styles.transactionInfo}>
              <Text
                style={[styles.transactionDescription, { color: colors.text.primary }]}
              >
                {transaction.description || category?.name || 'Sin descripción'}
              </Text>
              <Text
                style={[
                  styles.transactionCategory,
                  { color: colors.text.secondary },
                ]}
              >
                {category?.name} • {formatDate(transaction.created_at)}
              </Text>
            </View>
          </View>

          <View style={styles.transactionRight}>
            <Text
              style={[
                styles.transactionAmount,
                { color: isExpense ? '#FF6B6B' : '#51CF66' },
              ]}
            >
              {isExpense ? '-' : '+'}${transaction.amount.toFixed(0)}
            </Text>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteTransaction(transaction)}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  if (isLoading && transactions.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Cargando transacciones...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Inicia sesión para ver tus transacciones
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const groupedTransactions = groupTransactionsByDate();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          Transacciones
        </Text>

        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Balance Card */}
        {renderBalanceCard()}

        {/* Error State */}
        {error && (
          <Card style={styles.errorCard}>
            <Text style={[styles.errorText, { color: colors.error }]}>
              {error}
            </Text>
          </Card>
        )}

        {/* Transacciones agrupadas por fecha */}
        {groupedTransactions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyContainer}>
              <Ionicons
                name="receipt-outline"
                size={64}
                color={colors.text.secondary}
              />
              <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
                No hay transacciones
              </Text>
              <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                Usa el botón + para registrar tu primera transacción
              </Text>
            </View>
          </Card>
        ) : (
          groupedTransactions.map(([dateStr, dayTransactions]) => (
            <View key={dateStr} style={styles.dayGroup}>
              <Text style={[styles.dayHeader, { color: colors.text.secondary }]}>
                {formatDate(dayTransactions[0].created_at)}
              </Text>

              {dayTransactions.map(renderTransactionItem)}
            </View>
          ))
        )}

        {/* Spacing para el FAB */}
        <View style={styles.fabSpacing} />
      </ScrollView>

      {/* FAB para nuevas transacciones */}
      <TransactionFAB
        userId={user.id}
        onTransactionCreated={handleTransactionCreated}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
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

  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },

  headerRight: {
    width: 40,
  },

  // Content
  content: {
    flex: 1,
    padding: 20,
  },

  // Balance Card
  balanceCard: {
    marginBottom: 20,
  },

  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  balanceTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  periodSelector: {
    flexDirection: 'row',
    gap: 4,
  },

  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },

  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },

  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  balanceItem: {
    alignItems: 'center',
  },

  balanceLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },

  balanceValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Transaction Items
  dayGroup: {
    marginBottom: 20,
  },

  dayHeader: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },

  transactionCard: {
    marginBottom: 8,
  },

  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  transactionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  categoryEmoji: {
    fontSize: 20,
  },

  transactionInfo: {
    flex: 1,
  },

  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },

  transactionCategory: {
    fontSize: 12,
  },

  transactionRight: {
    alignItems: 'flex-end',
  },

  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },

  deleteButton: {
    padding: 4,
  },

  // States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },

  errorCard: {
    marginBottom: 20,
    backgroundColor: '#FFE8E8',
  },

  errorText: {
    textAlign: 'center',
    fontSize: 14,
  },

  emptyCard: {
    paddingVertical: 40,
  },

  emptyContainer: {
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },

  fabSpacing: {
    height: 80,
  },
});
