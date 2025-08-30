import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@components';
import { useTheme } from '@theme';
import { SpendingInsight } from '@/schemas';

const { width } = Dimensions.get('window');

interface SpendingAnalyticsProps {
  insights: SpendingInsight | null;
  isLoading?: boolean;
}

interface AnimatedBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  icon: string;
  delay?: number;
}

const AnimatedBar: React.FC<AnimatedBarProps> = ({
  label,
  value,
  maxValue,
  color,
  icon,
  delay = 0,
}) => {
  const { colors } = useTheme();
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const animatedOpacity = useRef(new Animated.Value(0)).current;

  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(animatedOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(animatedWidth, {
          toValue: percentage,
          duration: 800,
          useNativeDriver: false,
        }),
      ]),
    ]);

    sequence.start();
  }, [percentage, delay]);

  return (
    <Animated.View style={[styles.barContainer, { opacity: animatedOpacity }]}>
      <View style={styles.barHeader}>
        <View style={styles.barLabelContainer}>
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={16}
            color={color}
          />
          <Text style={[styles.barLabel, { color: colors.text.primary }]}>
            {label}
          </Text>
        </View>
        <Text style={[styles.barValue, { color: colors.text.primary }]}>
          ${value.toFixed(0)}
        </Text>
      </View>

      <View
        style={[
          styles.barBackground,
          { backgroundColor: colors.border.primary },
        ]}
      >
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: color,
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
};

interface PsychologyMeterProps {
  title: string;
  value: number;
  maxValue: number;
  icon: string;
  color: string;
  interpretation: string;
  delay?: number;
}

const PsychologyMeter: React.FC<PsychologyMeterProps> = ({
  title,
  value,
  maxValue,
  icon,
  color,
  interpretation,
  delay = 0,
}) => {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const animatedOpacity = useRef(new Animated.Value(0)).current;

  const percentage = (value / maxValue) * 100;

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(animatedOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: percentage,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]),
    ]);

    sequence.start();
  }, [percentage, delay]);

  return (
    <Animated.View
      style={[styles.meterContainer, { opacity: animatedOpacity }]}
    >
      <View style={styles.meterHeader}>
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={20}
          color={color}
        />
        <Text style={[styles.meterTitle, { color: colors.text.primary }]}>
          {title}
        </Text>
      </View>

      <View style={styles.meterContent}>
        <View
          style={[
            styles.meterBackground,
            { backgroundColor: colors.border.primary },
          ]}
        >
          <Animated.View
            style={[
              styles.meterFill,
              {
                backgroundColor: color,
                width: animatedValue.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        </View>

        <Text style={[styles.meterValue, { color: colors.text.primary }]}>
          {value.toFixed(1)}/{maxValue}
        </Text>
      </View>

      <Text
        style={[styles.meterInterpretation, { color: colors.text.secondary }]}
      >
        {interpretation}
      </Text>
    </Animated.View>
  );
};

export const SpendingAnalytics: React.FC<SpendingAnalyticsProps> = ({
  insights,
  isLoading = false,
}) => {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (insights && !isLoading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [insights, isLoading]);

  if (isLoading) {
    return (
      <Card style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [
                {
                  rotate: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            }}
          >
            <Ionicons name="analytics" size={48} color={colors.primary} />
          </Animated.View>
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Analizando tus patrones de gasto...
          </Text>
        </View>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons
            name="bar-chart-outline"
            size={48}
            color={colors.text.secondary}
          />
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
            Sin datos suficientes
          </Text>
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
            Registra más transacciones para ver insights psicológicos
          </Text>
        </View>
      </Card>
    );
  }

  // Procesar datos para visualización
  const categoryData =
    insights.top_categories?.map((cat) => ({
      label: cat.category_name || 'Sin categoría',
      value: cat.total_amount,
      color: cat.category_color || colors.primary,
      icon: 'trending-up',
    })) || [];

  const maxCategoryValue = Math.max(...categoryData.map((c) => c.value), 1);

  // Interpretaciones psicológicas
  const getRegretInterpretation = (regret: number) => {
    if (regret <= 2) return 'Muy pocas compras impulsivas 👍';
    if (regret <= 4) return 'Algunas decisiones cuestionables 🤔';
    if (regret <= 6) return 'Bastantes compras de las que te arrepientes 😔';
    if (regret <= 8) return 'Muchas decisiones impulsivas 😰';
    return 'Patrón de compras muy impulsivas 🚨';
  };

  const getNecessityInterpretation = (necessity: number) => {
    if (necessity >= 4) return 'Enfocado en necesidades básicas 💪';
    if (necessity >= 3) return 'Equilibrio entre necesidades y gustos ⚖️';
    if (necessity >= 2) return 'Bastantes compras por placer 😊';
    return 'Muchos gastos de lujo y caprichos 💸';
  };

  const getMoodInterpretation = (moodChange: number) => {
    if (moodChange > 1) return 'Las compras te mejoran el ánimo 😄';
    if (moodChange > 0) return 'Ligera mejora de ánimo al comprar 😊';
    if (moodChange > -0.5) return 'Neutro: compras sin impacto emocional 😐';
    if (moodChange > -1) return 'Ligero bajón después de comprar 😕';
    return 'Las compras te hacen sentir peor 😞';
  };

  return (
    <Animated.View style={[{ opacity: fadeAnim }]}>
      <Card style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="analytics" size={24} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Análisis Psicológico de Gastos
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Resumen General */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              📊 Resumen del Período
            </Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text
                  style={[
                    styles.summaryLabel,
                    { color: colors.text.secondary },
                  ]}
                >
                  Total Gastado
                </Text>
                <Text style={[styles.summaryValue, { color: '#FF6B6B' }]}>
                  ${insights.total_spent?.toFixed(0) || '0'}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text
                  style={[
                    styles.summaryLabel,
                    { color: colors.text.secondary },
                  ]}
                >
                  Promedio/Día
                </Text>
                <Text
                  style={[styles.summaryValue, { color: colors.text.primary }]}
                >
                  ${insights.avg_daily_spend?.toFixed(0) || '0'}
                </Text>
              </View>
            </View>
          </View>

          {/* Categorías Top */}
          {categoryData.length > 0 && (
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: colors.text.primary }]}
              >
                🏆 Categorías que más gastas
              </Text>

              {categoryData.slice(0, 5).map((category, index) => (
                <AnimatedBar
                  key={category.label}
                  label={category.label}
                  value={category.value}
                  maxValue={maxCategoryValue}
                  color={category.color}
                  icon="trending-up"
                  delay={index * 100}
                />
              ))}
            </View>
          )}

          {/* Análisis Psicológico */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              🧠 Tu Perfil Psicológico
            </Text>

            {insights.psychology?.avg_regret_level !== undefined && (
              <PsychologyMeter
                title="Nivel de Arrepentimiento"
                value={insights.psychology.avg_regret_level}
                maxValue={10}
                icon="sad"
                color="#FF6B6B"
                interpretation={getRegretInterpretation(
                  insights.psychology.avg_regret_level
                )}
                delay={0}
              />
            )}

            {insights.psychology?.avg_necessity_level !== undefined && (
              <PsychologyMeter
                title="Enfoque en Necesidades"
                value={insights.psychology.avg_necessity_level}
                maxValue={5}
                icon="shield-checkmark"
                color="#51CF66"
                interpretation={getNecessityInterpretation(
                  insights.psychology.avg_necessity_level
                )}
                delay={200}
              />
            )}

            {insights.psychology?.mood_impact !== undefined && (
              <PsychologyMeter
                title="Impacto en tu Estado de Ánimo"
                value={insights.psychology.mood_impact + 2.5} // Normalizar de -2.5 a +2.5 a 0-5
                maxValue={5}
                icon="happy"
                color="#339AF0"
                interpretation={getMoodInterpretation(
                  insights.psychology.mood_impact
                )}
                delay={400}
              />
            )}
          </View>

          {/* Recomendaciones */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              💡 Recomendaciones Personalizadas
            </Text>

            <View style={styles.recommendationCard}>
              <Ionicons name="bulb" size={20} color="#FFD93D" />
              <Text
                style={[
                  styles.recommendationText,
                  { color: colors.text.primary },
                ]}
              >
                {insights.psychology?.avg_regret_level &&
                insights.psychology.avg_regret_level > 5
                  ? 'Considera esperar 24 horas antes de compras grandes para reducir el arrepentimiento.'
                  : '¡Buen control de impulsos! Sigues tomando decisiones conscientes.'}
              </Text>
            </View>

            {insights.psychology?.avg_necessity_level &&
              insights.psychology.avg_necessity_level < 3 && (
                <View style={styles.recommendationCard}>
                  <Ionicons name="warning" size={20} color="#FF8C00" />
                  <Text
                    style={[
                      styles.recommendationText,
                      { color: colors.text.primary },
                    ]}
                  >
                    Muchos de tus gastos son por placer. Intenta equilibrar con
                    más necesidades básicas.
                  </Text>
                </View>
              )}

            {insights.most_expensive_category && (
              <View style={styles.recommendationCard}>
                <Ionicons name="trending-up" size={20} color="#FF6B6B" />
                <Text
                  style={[
                    styles.recommendationText,
                    { color: colors.text.primary },
                  ]}
                >
                  Tu categoría de mayor gasto: "
                  {insights.most_expensive_category}". ¿Es donde quieres enfocar
                  tu dinero?
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  summaryItem: {
    alignItems: 'center',
  },

  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },

  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },

  // Animated Bars
  barContainer: {
    marginBottom: 16,
  },

  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  barLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  barLabel: {
    fontSize: 14,
    fontWeight: '500',
  },

  barValue: {
    fontSize: 14,
    fontWeight: '600',
  },

  barBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },

  barFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Psychology Meters
  meterContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },

  meterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  meterTitle: {
    fontSize: 14,
    fontWeight: '600',
  },

  meterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },

  meterBackground: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },

  meterFill: {
    height: '100%',
    borderRadius: 3,
  },

  meterValue: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },

  meterInterpretation: {
    fontSize: 12,
    fontStyle: 'italic',
  },

  // Recommendations
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 217, 61, 0.1)',
    marginBottom: 8,
    gap: 12,
  },

  recommendationText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  // States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
