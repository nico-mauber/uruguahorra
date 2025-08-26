import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import {
  Button,
  Card,
  SimpleTransactionItem,
  PsychologicalFAB,
} from '@/components';
import {
  useTheme,
  spacing,
  typography,
  textStyles,
  PsychologicalIcon,
  categoryIcons,
  actionIcons,
  gamificationIcons,
} from '@theme';

/**
 * Psychological Design System Demo
 * Showcases all the psychologically optimized components
 */
export const PsychologicalDesignDemo: React.FC = () => {
  const { colors, isDark, getExpenseColor, getSavingsColor } = useTheme();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  // Mock transaction data for demonstration
  const mockTransactions = [
    {
      id: '1',
      description: 'Almuerzo saludable',
      amount: -450,
      type: 'expense' as const,
      category_name: 'Comida',
      category_emoji: '🍔',
      transaction_date: new Date().toISOString(),
      regret_level: 2,
    },
    {
      id: '2',
      description: 'Ahorro mensual',
      amount: 2500,
      type: 'income' as const,
      category_name: 'Ahorro',
      category_emoji: '💰',
      transaction_date: new Date().toISOString(),
      regret_level: 0,
    },
    {
      id: '3',
      description: 'Compra impulsiva online',
      amount: -1200,
      type: 'expense' as const,
      category_name: 'Compras',
      category_emoji: '🛍️',
      transaction_date: new Date().toISOString(),
      regret_level: 8,
    },
  ];

  const handleTransactionCreated = (transaction: any) => {
    Alert.alert('¡Éxito!', 'Transacción creada con animación de éxito');
  };

  const handleCardPress = (cardId: string) => {
    setSelectedCard(cardId === selectedCard ? null : cardId);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={[textStyles.screenTitle, { color: colors.text.primary }]}
          >
            Sistema de Diseño Psicológico
          </Text>
          <Text
            style={[textStyles.description, { color: colors.text.secondary }]}
          >
            Demostración de componentes optimizados para el comportamiento
            financiero
          </Text>
        </View>

        {/* Color Psychology Section */}
        <Card variant="elevated" padding="large" style={styles.section}>
          <Text style={[textStyles.cardTitle, { color: colors.text.primary }]}>
            Psicología del Color
          </Text>
          <Text
            style={[
              textStyles.description,
              { color: colors.text.secondary, marginBottom: spacing.lg },
            ]}
          >
            Colores basados en Loss Aversion y refuerzo positivo:
          </Text>

          <View style={styles.colorRow}>
            <View style={styles.colorDemo}>
              <View
                style={[
                  styles.colorSwatch,
                  { backgroundColor: getExpenseColor() },
                ]}
              />
              <Text style={[styles.colorLabel, { color: colors.text.primary }]}>
                Gastos (Precaución)
              </Text>
            </View>

            <View style={styles.colorDemo}>
              <View
                style={[
                  styles.colorSwatch,
                  { backgroundColor: getSavingsColor() },
                ]}
              />
              <Text style={[styles.colorLabel, { color: colors.text.primary }]}>
                Ahorros (Refuerzo +)
              </Text>
            </View>
          </View>
        </Card>

        {/* Button Variants Section */}
        <Card variant="elevated" padding="large" style={styles.section}>
          <Text style={[textStyles.cardTitle, { color: colors.text.primary }]}>
            Botones Psicológicos
          </Text>
          <Text
            style={[
              textStyles.description,
              { color: colors.text.secondary, marginBottom: spacing.lg },
            ]}
          >
            Variantes optimizadas para diferentes tipos de acciones:
          </Text>

          <View style={styles.buttonGrid}>
            <Button
              title="Acción Principal"
              variant="primary"
              size="medium"
              onPress={() => Alert.alert('Botón', 'Acción principal ejecutada')}
              style={styles.demoButton}
            />

            <Button
              title="Registrar Gasto"
              variant="expense"
              size="medium"
              onPress={() =>
                Alert.alert('Gasto', 'Activación de loss aversion')
              }
              style={styles.demoButton}
            />

            <Button
              title="Guardar Ahorro"
              variant="savings"
              size="medium"
              onPress={() =>
                Alert.alert('Ahorro', 'Refuerzo positivo activado')
              }
              style={styles.demoButton}
            />

            <Button
              title="Acción Crítica"
              variant="outline"
              size="critical"
              fullWidth
              onPress={() =>
                Alert.alert('Crítico', 'Botón de touch target grande')
              }
              style={styles.demoButton}
            />
          </View>
        </Card>

        {/* Card Variants Section */}
        <Card variant="elevated" padding="large" style={styles.section}>
          <Text style={[textStyles.cardTitle, { color: colors.text.primary }]}>
            Cards Contextuales
          </Text>
          <Text
            style={[
              textStyles.description,
              { color: colors.text.secondary, marginBottom: spacing.lg },
            ]}
          >
            Backgrounds psicológicos para diferentes contextos:
          </Text>

          <Card
            variant="expense"
            padding="medium"
            style={styles.demoCard}
            onPress={() => handleCardPress('expense')}
            interactive
          >
            <Text style={[styles.cardDemoText, { color: colors.text.primary }]}>
              💸 Contexto de Gasto (Loss Aversion)
            </Text>
            <Text
              style={[styles.cardSubText, { color: colors.text.secondary }]}
            >
              Fondo rojo suave para activar precaución
            </Text>
          </Card>

          <Card
            variant="savings"
            padding="medium"
            style={styles.demoCard}
            onPress={() => handleCardPress('savings')}
            interactive
          >
            <Text style={[styles.cardDemoText, { color: colors.text.primary }]}>
              💚 Contexto de Ahorro (Refuerzo Positivo)
            </Text>
            <Text
              style={[styles.cardSubText, { color: colors.text.secondary }]}
            >
              Fondo verde suave para motivar el ahorro
            </Text>
          </Card>
        </Card>

        {/* Icons Psychology Section */}
        <Card variant="elevated" padding="large" style={styles.section}>
          <Text style={[textStyles.cardTitle, { color: colors.text.primary }]}>
            Sistema de Íconos Psicológico
          </Text>
          <Text
            style={[
              textStyles.description,
              { color: colors.text.secondary, marginBottom: spacing.lg },
            ]}
          >
            Íconos categorizados por impacto psicológico:
          </Text>

          <View style={styles.iconSection}>
            <Text
              style={[styles.iconSectionTitle, { color: colors.text.primary }]}
            >
              Categorías de Gasto
            </Text>
            <View style={styles.iconGrid}>
              {Object.entries(categoryIcons)
                .slice(0, 6)
                .map(([key, icon]) => (
                  <View key={key} style={styles.iconItem}>
                    <Text style={styles.iconEmoji}>{icon.emoji}</Text>
                    <Text
                      style={[
                        styles.iconLabel,
                        { color: colors.text.secondary },
                      ]}
                    >
                      {icon.description}
                    </Text>
                  </View>
                ))}
            </View>
          </View>

          <View style={styles.iconSection}>
            <Text
              style={[styles.iconSectionTitle, { color: colors.text.primary }]}
            >
              Gamificación
            </Text>
            <View style={styles.iconGrid}>
              {Object.entries(gamificationIcons).map(([key, icon]) => (
                <View key={key} style={styles.iconItem}>
                  <Text style={styles.iconEmoji}>{icon.emoji}</Text>
                  <Text
                    style={[styles.iconLabel, { color: colors.text.secondary }]}
                  >
                    {icon.description}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Card>

        {/* Transactions List Section */}
        <Card variant="elevated" padding="large" style={styles.section}>
          <Text style={[textStyles.cardTitle, { color: colors.text.primary }]}>
            Lista de Transacciones Optimizada
          </Text>
          <Text
            style={[
              textStyles.description,
              { color: colors.text.secondary, marginBottom: spacing.lg },
            ]}
          >
            Items con colores psicológicos y animaciones de entrada:
          </Text>

          {mockTransactions.map((transaction, index) => (
            <SimpleTransactionItem
              key={transaction.id}
              transaction={transaction}
              index={index}
              onEdit={(t) => Alert.alert('Editar', `Editar: ${t.description}`)}
              onDelete={(id) =>
                Alert.alert('Eliminar', `Eliminar transacción: ${id}`)
              }
            />
          ))}
        </Card>

        {/* Typography Section */}
        <Card variant="elevated" padding="large" style={styles.section}>
          <Text style={[textStyles.cardTitle, { color: colors.text.primary }]}>
            Jerarquía Tipográfica
          </Text>
          <Text
            style={[
              textStyles.description,
              { color: colors.text.secondary, marginBottom: spacing.lg },
            ]}
          >
            Sistema basado en jerarquía cognitiva:
          </Text>

          <Text style={[textStyles.moneyPrimary, { color: getExpenseColor() }]}>
            $-1,250
          </Text>
          <Text style={[styles.typoLabel, { color: colors.text.secondary }]}>
            Montos (Máxima Atención)
          </Text>

          <Text style={[textStyles.cardTitle, { color: colors.text.primary }]}>
            Título de Card
          </Text>
          <Text style={[styles.typoLabel, { color: colors.text.secondary }]}>
            Títulos (Reconocimiento)
          </Text>

          <Text
            style={[textStyles.description, { color: colors.text.primary }]}
          >
            Texto descriptivo para lectura fluida con line-height optimizado.
          </Text>
          <Text style={[styles.typoLabel, { color: colors.text.secondary }]}>
            Descripción (Legibilidad)
          </Text>

          <Text style={[textStyles.metadata, { color: colors.text.tertiary }]}>
            Metadatos y información contextual
          </Text>
          <Text style={[styles.typoLabel, { color: colors.text.secondary }]}>
            Metadata (Sutil)
          </Text>
        </Card>

        {/* Spacing for FAB */}
        <View style={styles.fabSpacing} />
      </ScrollView>

      {/* Psychological FAB */}
      <PsychologicalFAB
        userId="demo-user"
        onTransactionCreated={handleTransactionCreated}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  header: {
    padding: spacing.xl,
    alignItems: 'center',
  },

  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },

  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  colorDemo: {
    alignItems: 'center',
  },

  colorSwatch: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: spacing.sm,
  },

  colorLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },

  buttonGrid: {
    gap: spacing.md,
  },

  demoButton: {
    marginBottom: spacing.sm,
  },

  demoCard: {
    marginBottom: spacing.md,
  },

  cardDemoText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },

  cardSubText: {
    fontSize: 12,
  },

  iconSection: {
    marginBottom: spacing.lg,
  },

  iconSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.md,
  },

  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  iconItem: {
    alignItems: 'center',
    width: '30%',
    marginBottom: spacing.md,
  },

  iconEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },

  iconLabel: {
    fontSize: 10,
    textAlign: 'center',
  },

  typoLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },

  fabSpacing: {
    height: 120, // Space for FAB and safe area
  },
});

export default PsychologicalDesignDemo;
