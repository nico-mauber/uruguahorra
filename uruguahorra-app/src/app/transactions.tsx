import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@components';
import { useTheme } from '@theme';
import { useAuthStore } from '@store/useAuthStore';
import { TransactionsService } from '@/services/transactions.service';
import { type TransactionRaw } from '@/schemas';
import { Ionicons } from '@expo/vector-icons';
import { logger, LogModule } from '@/utils/logger';
import { ToastService } from '@/utils/toast';
import {
  getCategoryColor,
  getCategoryIcon,
  type TransactionCategory,
} from '@/utils/categorizer';

export default function TransactionsScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();

  const [transactions, setTransactions] = useState<TransactionRaw[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<{
    total: number;
    totalAmount: number;
    categories: Record<string, number>;
  } | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | string>('all');

  const loadTransactions = useCallback(
    async (showLoading = false) => {
      if (!user?.id) return;

      if (showLoading) setIsLoading(true);

      try {
        logger.info(LogModule.UI, 'Cargando transacciones importadas');

        const data = await TransactionsService.getUserTransactions(
          user.id,
          100
        );
        const statsData = await TransactionsService.getTransactionStats(
          user.id
        );

        setTransactions(data);
        setStats({
          total: statsData.totalTransactions,
          totalAmount: statsData.totalAmount,
          categories: statsData.byCategory,
        });

        logger.success(
          LogModule.UI,
          `${data.length} transacciones cargadas exitosamente`
        );
      } catch (error) {
        logger.error(LogModule.UI, 'Error cargando transacciones', error);
        ToastService.handleError(error);
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadTransactions();
    setIsRefreshing(false);
  }, [loadTransactions]);

  useEffect(() => {
    loadTransactions(true);
  }, [loadTransactions]);

  const filteredTransactions = transactions.filter((transaction) => {
    if (selectedFilter === 'all') return true;
    return transaction.category === selectedFilter;
  });

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getUniqueCategories = () => {
    const categories = new Set(
      transactions
        .map((t) => t.category)
        .filter((cat): cat is string => Boolean(cat))
    );
    return Array.from(categories);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 20,
    },
    header: {
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    statsCard: {
      marginBottom: 24,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    filtersSection: {
      marginBottom: 24,
    },
    filtersTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    filtersRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    filterChipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    filterText: {
      fontSize: 12,
      color: theme.text,
      fontWeight: '500',
    },
    filterTextActive: {
      color: '#FFFFFF',
    },
    transactionsList: {
      gap: 12,
    },
    transactionItem: {
      padding: 16,
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    transactionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    transactionDescription: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
      marginRight: 12,
    },
    transactionAmount: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
    },
    transactionFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    transactionDate: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    transactionCategory: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    categoryText: {
      fontSize: 12,
      fontWeight: '500',
      marginLeft: 4,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.textSecondary,
    },
    importButton: {
      marginTop: 16,
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Cargando transacciones...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Transacciones Importadas</Text>
          <Text style={styles.subtitle}>
            Historial de movimientos desde archivos CSV
          </Text>
        </View>

        {stats && stats.total > 0 && (
          <Card style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Transacciones</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {formatCurrency(stats.totalAmount)}
                </Text>
                <Text style={styles.statLabel}>Total Importado</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {Object.keys(stats.categories).length}
                </Text>
                <Text style={styles.statLabel}>Categorías</Text>
              </View>
            </View>
          </Card>
        )}

        {transactions.length > 0 && (
          <View style={styles.filtersSection}>
            <Text style={styles.filtersTitle}>Filtrar por categoría</Text>
            <View style={styles.filtersRow}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedFilter === 'all' && styles.filterChipActive,
                ]}
                onPress={() => setSelectedFilter('all')}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedFilter === 'all' && styles.filterTextActive,
                  ]}
                >
                  Todas ({transactions.length})
                </Text>
              </TouchableOpacity>
              {getUniqueCategories().map((category) => {
                const count = transactions.filter(
                  (t) => t.category === category
                ).length;
                return (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.filterChip,
                      selectedFilter === category && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedFilter(category)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        selectedFilter === category && styles.filterTextActive,
                      ]}
                    >
                      {category} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {filteredTransactions.length > 0 ? (
          <View style={styles.transactionsList}>
            {filteredTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionHeader}>
                  <Text style={styles.transactionDescription} numberOfLines={2}>
                    {transaction.original_description}
                  </Text>
                  <Text style={styles.transactionAmount}>
                    {formatCurrency(transaction.amount)}
                  </Text>
                </View>
                <View style={styles.transactionFooter}>
                  <Text style={styles.transactionDate}>
                    {formatDate(transaction.transaction_date)}
                  </Text>
                  {transaction.category && (
                    <View style={styles.transactionCategory}>
                      <Ionicons
                        name={
                          getCategoryIcon(
                            transaction.category as TransactionCategory
                          ) as keyof typeof Ionicons.glyphMap
                        }
                        size={12}
                        color={getCategoryColor(
                          transaction.category as TransactionCategory
                        )}
                      />
                      <Text
                        style={[
                          styles.categoryText,
                          {
                            color: getCategoryColor(
                              transaction.category as TransactionCategory
                            ),
                          },
                        ]}
                      >
                        {transaction.category}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="document-outline"
              size={64}
              color={theme.textSecondary}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>No hay transacciones</Text>
            <Text style={styles.emptyText}>
              Aún no hay transacciones registradas.
            </Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="filter-outline"
              size={48}
              color={theme.textSecondary}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptyText}>
              No hay transacciones que coincidan con el filtro seleccionado.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
