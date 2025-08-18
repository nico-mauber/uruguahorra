import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Card } from '@components';
import { useTheme } from '@theme';
import { Ionicons } from '@expo/vector-icons';

export default function ImportCSVScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleSelectFile = async () => {
    // Simulación de selección de archivo
    // En producción, usar expo-document-picker
    setIsLoading(true);
    setTimeout(() => {
      setFileName('gastos_noviembre_2024.csv');
      setIsLoading(false);
    }, 1000);
  };

  const handleImport = async () => {
    if (!fileName) {
      Alert.alert('Error', 'Por favor selecciona un archivo primero');
      return;
    }

    setIsLoading(true);
    // Simulación de procesamiento
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        'Éxito',
        'Archivo importado correctamente. Se han categorizado 45 transacciones.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }, 2000);
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
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Importar movimientos</Text>
          <Text style={styles.subtitle}>
            Carga tu archivo CSV con tus gastos para analizarlos y categorizar
            tus ahorros automáticamente.
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
              El archivo debe contener columnas: Fecha, Descripción, Monto
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
              Los datos se procesan localmente, no se envían a servidores
              externos
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
              <Text style={styles.tableCell}>Café</Text>
              <Text style={styles.tableCell}>-3.50</Text>
            </View>
          </View>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title="Importar archivo"
            size="large"
            loading={isLoading}
            disabled={!fileName}
            onPress={handleImport}
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
    </SafeAreaView>
  );
}
