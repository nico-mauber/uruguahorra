import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Button, Card } from '@components';
import { useTheme } from '@theme';
import { Ionicons } from '@expo/vector-icons';
import { TransactionsService } from '@/services/transactions.service';
import { useAuthStore } from '@store/useAuthStore';
import { ToastService } from '@/utils/toast';
import { logger, LogModule } from '@/utils/logger';
import {
  getCategoryColor,
  getCategoryIcon,
  type TransactionCategory,
} from '@/utils/categorizer';

interface PreviewData {
  rowCount: number;
  sampleRows: Array<{
    date: string;
    description: string;
    amount: number;
    category?: string;
  }>;
  categoryDistribution: Record<string, number>;
}

export default function ImportCSVScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [importResult, setImportResult] = useState<{
    totalProcessed: number;
    successfulImports: number;
    errors: string[];
    stats?: {
      byCategory: Record<string, { count: number; total: number }>;
    };
  } | null>(null);

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        setFileName(result.name);

        // Leer contenido del archivo
        const response = await fetch(result.uri);
        const text = await response.text();
        setFileContent(text);

        // Validar formato
        const validation = TransactionsService.validateCSVFormat(text);
        if (!validation.isValid) {
          Alert.alert('Formato inválido', validation.errors.join('\n'));
          setFileName(null);
          setFileContent(null);
          return;
        }

        // Generar preview
        try {
          const preview = TransactionsService.previewCSVImport(text);
          setPreviewData({
            rowCount: preview.rowCount,
            sampleRows: preview.sampleRows,
            categoryDistribution: preview.categoryDistribution,
          });
          setShowPreview(true);
        } catch (error) {
          logger.error(LogModule.UI, 'Error generando preview', error);
          Alert.alert('Error', 'No se pudo procesar el archivo CSV');
          setFileName(null);
          setFileContent(null);
        }
      }
    } catch (error) {
      logger.error(LogModule.UI, 'Error seleccionando archivo', error);
      ToastService.error('Error al seleccionar archivo');
    }
  };

  const handleImport = async () => {
    if (!fileContent || !user) {
      Alert.alert('Error', 'Por favor selecciona un archivo primero');
      return;
    }

    setIsLoading(true);
    setShowPreview(false);

    try {
      // Parsear CSV
      const csvData = TransactionsService.parseCSV(fileContent);

      // Importar a Supabase
      const result = await TransactionsService.importCSV(user.id, csvData);

      setImportResult(result);
      setShowSummary(true);

      ToastService.success(
        'Importación exitosa',
        `${result.successfulImports} transacciones importadas`
      );

      // Obtener estadísticas actualizadas
      const stats = await TransactionsService.getTransactionStats(user.id);
      setImportResult({ ...result, stats });
    } catch (error) {
      logger.error(LogModule.UI, 'Error importando CSV', error);
      Alert.alert('Error', 'No se pudo importar el archivo');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${Math.abs(amount).toFixed(2)}`;
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 20,
    },
    header: {
      marginBottom: 32,
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
      lineHeight: 22,
    },
    uploadCard: {
      alignItems: 'center',
      padding: 32,
      marginBottom: 24,
      borderStyle: 'dashed',
      borderWidth: 2,
      borderColor: theme.border,
    },
    uploadIcon: {
      marginBottom: 16,
    },
    uploadText: {
      fontSize: 16,
      color: theme.text,
      marginBottom: 8,
    },
    uploadHint: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    selectedFile: {
      backgroundColor: theme.success + '10',
      borderColor: theme.success,
    },
    fileName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.success,
      marginTop: 8,
    },
    infoSection: {
      marginBottom: 24,
    },
    infoTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    infoItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    infoIcon: {
      marginRight: 12,
      marginTop: 2,
    },
    infoText: {
      flex: 1,
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    exampleCard: {
      marginBottom: 24,
    },
    exampleTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    exampleTable: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      overflow: 'hidden',
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    tableCell: {
      flex: 1,
      padding: 8,
      fontSize: 12,
      color: theme.text,
    },
    tableHeaderCell: {
      fontWeight: '600',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    buttonContainer: {
      marginTop: 32,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '80%',
      paddingBottom: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
    },
    closeButton: {
      padding: 8,
    },
    previewContent: {
      padding: 20,
    },
    statsCard: {
      marginBottom: 16,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    statsLabel: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    statsValue: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    categoryGrid: {
      marginTop: 16,
    },
    categoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.surface,
      borderRadius: 8,
      marginBottom: 8,
    },
    categoryIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    categoryInfo: {
      flex: 1,
    },
    categoryName: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
    },
    categoryCount: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    sampleSection: {
      marginTop: 20,
    },
    sampleTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    transactionItem: {
      padding: 12,
      backgroundColor: theme.surface,
      borderRadius: 8,
      marginBottom: 8,
    },
    transactionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    transactionDescription: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
      flex: 1,
    },
    transactionAmount: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.primary,
    },
    transactionFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    transactionDate: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    transactionCategory: {
      fontSize: 12,
      color: theme.primary,
      fontWeight: '500',
    },
    modalButtons: {
      flexDirection: 'row',
      padding: 20,
      gap: 12,
    },
    summaryCard: {
      padding: 20,
      backgroundColor: theme.success + '10',
      borderRadius: 12,
      marginBottom: 20,
    },
    summaryIcon: {
      alignSelf: 'center',
      marginBottom: 12,
    },
    summaryTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.success,
      textAlign: 'center',
      marginBottom: 16,
    },
    summaryStats: {
      gap: 12,
    },
    summaryStatRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    summaryStatLabel: {
      fontSize: 14,
      color: theme.text,
    },
    summaryStatValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingCard: {
      backgroundColor: theme.background,
      padding: 20,
      borderRadius: 12,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: theme.text,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Importar movimientos</Text>
          <Text style={styles.subtitle}>
            Carga tu archivo CSV con tus gastos para analizarlos y categorizar
            tus transacciones automáticamente.
          </Text>
        </View>

        <Card
          style={[styles.uploadCard, fileName && styles.selectedFile]}
          onTouchEnd={handleSelectFile}
        >
          <Ionicons
            name={fileName ? 'checkmark-circle' : 'cloud-upload'}
            size={48}
            color={fileName ? theme.success : theme.primary}
            style={styles.uploadIcon}
          />
          <Text style={styles.uploadText}>
            {fileName
              ? 'Archivo seleccionado'
              : 'Toca para seleccionar archivo'}
          </Text>
          <Text style={styles.uploadHint}>
            {fileName ? fileName : 'Formato CSV, máximo 10MB'}
          </Text>
        </Card>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Formato esperado</Text>
          <View style={styles.infoItem}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={theme.success}
              style={styles.infoIcon}
            />
            <Text style={styles.infoText}>
              El archivo debe contener columnas: Fecha, Descripción, Monto (máx.
              1000 filas)
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={theme.success}
              style={styles.infoIcon}
            />
            <Text style={styles.infoText}>
              La categoría es opcional, la app puede asignarla automáticamente
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons
              name="information-circle"
              size={20}
              color={theme.info}
              style={styles.infoIcon}
            />
            <Text style={styles.infoText}>
              Categorización automática basada en palabras clave (Uber →
              Transporte, etc.)
            </Text>
          </View>
        </View>

        <Card style={styles.exampleCard}>
          <Text style={styles.exampleTitle}>Ejemplo de formato</Text>
          <View style={styles.exampleTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>
                Fecha
              </Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>
                Descripción
              </Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>
                Monto
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>2024-11-15</Text>
              <Text style={styles.tableCell}>Supermercado</Text>
              <Text style={styles.tableCell}>-45.50</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>2024-11-14</Text>
              <Text style={styles.tableCell}>Uber</Text>
              <Text style={styles.tableCell}>-12.00</Text>
            </View>
            <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.tableCell}>2024-11-13</Text>
              <Text style={styles.tableCell}>Starbucks</Text>
              <Text style={styles.tableCell}>-3.50</Text>
            </View>
          </View>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title="Seleccionar archivo CSV"
            size="large"
            onPress={handleSelectFile}
            style={{ marginBottom: 12 }}
          />
          <Button
            title="Cancelar"
            variant="outline"
            size="large"
            onPress={() => router.back()}
          />
        </View>
      </ScrollView>

      {/* Modal de Preview */}
      <Modal
        visible={showPreview}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vista previa</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPreview(false)}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.previewContent}>
              {previewData && (
                <>
                  <Card style={styles.statsCard}>
                    <View style={styles.statsRow}>
                      <Text style={styles.statsLabel}>
                        Total de transacciones:
                      </Text>
                      <Text style={styles.statsValue}>
                        {previewData.rowCount}
                      </Text>
                    </View>
                  </Card>

                  <Text style={styles.sampleTitle}>
                    Distribución por categorías
                  </Text>
                  <View style={styles.categoryGrid}>
                    {Object.entries(previewData.categoryDistribution).map(
                      ([category, count]) => (
                        <View key={category} style={styles.categoryItem}>
                          <View
                            style={[
                              styles.categoryIcon,
                              {
                                backgroundColor:
                                  getCategoryColor(
                                    category as TransactionCategory
                                  ) + '20',
                              },
                            ]}
                          >
                            <Ionicons
                              name={
                                getCategoryIcon(
                                  category as TransactionCategory
                                ) as keyof typeof Ionicons.glyphMap
                              }
                              size={20}
                              color={getCategoryColor(
                                category as TransactionCategory
                              )}
                            />
                          </View>
                          <View style={styles.categoryInfo}>
                            <Text style={styles.categoryName}>{category}</Text>
                            <Text style={styles.categoryCount}>
                              {count} transacciones
                            </Text>
                          </View>
                        </View>
                      )
                    )}
                  </View>

                  <View style={styles.sampleSection}>
                    <Text style={styles.sampleTitle}>
                      Primeras transacciones
                    </Text>
                    {previewData.sampleRows.map((row, index) => (
                      <View key={index} style={styles.transactionItem}>
                        <View style={styles.transactionHeader}>
                          <Text
                            style={styles.transactionDescription}
                            numberOfLines={1}
                          >
                            {row.description}
                          </Text>
                          <Text style={styles.transactionAmount}>
                            {formatCurrency(row.amount)}
                          </Text>
                        </View>
                        <View style={styles.transactionFooter}>
                          <Text style={styles.transactionDate}>
                            {formatDate(row.date)}
                          </Text>
                          <Text style={styles.transactionCategory}>
                            {row.category || 'Sin categoría'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setShowPreview(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Importar"
                variant="primary"
                onPress={handleImport}
                style={{ flex: 1 }}
                loading={isLoading}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Resumen */}
      <Modal
        visible={showSummary}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowSummary(false);
          router.back();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Importación completada</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowSummary(false);
                  router.back();
                }}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.previewContent}>
              {importResult && (
                <>
                  <View style={styles.summaryCard}>
                    <Ionicons
                      name="checkmark-circle"
                      size={48}
                      color={theme.success}
                      style={styles.summaryIcon}
                    />
                    <Text style={styles.summaryTitle}>¡Éxito!</Text>
                    <View style={styles.summaryStats}>
                      <View style={styles.summaryStatRow}>
                        <Text style={styles.summaryStatLabel}>Procesadas:</Text>
                        <Text style={styles.summaryStatValue}>
                          {importResult.totalProcessed}
                        </Text>
                      </View>
                      <View style={styles.summaryStatRow}>
                        <Text style={styles.summaryStatLabel}>Importadas:</Text>
                        <Text style={styles.summaryStatValue}>
                          {importResult.successfulImports}
                        </Text>
                      </View>
                      {importResult.errors.length > 0 && (
                        <View style={styles.summaryStatRow}>
                          <Text style={styles.summaryStatLabel}>Errores:</Text>
                          <Text
                            style={[
                              styles.summaryStatValue,
                              { color: theme.error },
                            ]}
                          >
                            {importResult.errors.length}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {importResult.stats && (
                    <>
                      <Text style={styles.sampleTitle}>
                        Resumen por categorías
                      </Text>
                      <View style={styles.categoryGrid}>
                        {Object.entries(importResult.stats.byCategory).map(
                          ([category, data]) => (
                            <View key={category} style={styles.categoryItem}>
                              <View
                                style={[
                                  styles.categoryIcon,
                                  {
                                    backgroundColor:
                                      getCategoryColor(
                                        category as TransactionCategory
                                      ) + '20',
                                  },
                                ]}
                              >
                                <Ionicons
                                  name={
                                    getCategoryIcon(
                                      category as TransactionCategory
                                    ) as keyof typeof Ionicons.glyphMap
                                  }
                                  size={20}
                                  color={getCategoryColor(
                                    category as TransactionCategory
                                  )}
                                />
                              </View>
                              <View style={styles.categoryInfo}>
                                <Text style={styles.categoryName}>
                                  {category}
                                </Text>
                                <Text style={styles.categoryCount}>
                                  {
                                    (data as { count: number; total: number })
                                      .count
                                  }{' '}
                                  trans. - $
                                  {(
                                    data as { count: number; total: number }
                                  ).total.toFixed(2)}
                                </Text>
                              </View>
                            </View>
                          )
                        )}
                      </View>
                    </>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button
                title="Finalizar"
                variant="primary"
                onPress={() => {
                  setShowSummary(false);
                  router.back();
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>Importando transacciones...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
