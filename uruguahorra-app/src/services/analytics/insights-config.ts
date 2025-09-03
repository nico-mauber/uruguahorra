import {
  PsychologicalInsight,
  PsychologicalInsightType,
  BasicRatios,
} from './types';

export interface InsightConfig {
  type: PsychologicalInsightType;
  category:
    | 'health'
    | 'temporal'
    | 'psychological'
    | 'efficiency'
    | 'motivation';
  priority: number;
  confidence: number;
  healthScore: number;
  conditions: (data: InsightAnalysisData) => boolean;
  generator: (
    data: InsightAnalysisData
  ) => Omit<
    PsychologicalInsight,
    'type' | 'category' | 'priority' | 'confidence' | 'healthScore'
  >;
}

export interface InsightAnalysisData {
  ratios: BasicRatios;
  userId: string;
  totalExpenses: number;
  transactionCount: number;
  topCategory: string;
  spendingTrend: 'up' | 'down' | 'stable';
  monthlyInsights: Array<{
    totalSpent: number;
    savingsRate: number;
    [key: string]: any;
  }>;
}

// HEALTH INSIGHTS
export const HEALTH_INSIGHTS: InsightConfig[] = [
  {
    type: 'balanced_spender',
    category: 'health',
    priority: 25,
    confidence: 0.88,
    healthScore: 85,
    conditions: (data) =>
      data.ratios.expense_ratio >= 70 &&
      data.ratios.expense_ratio <= 95 &&
      data.ratios.savings_rate >= 5,
    generator: (data) => ({
      title: '⚖️ Equilibrio Financiero Perfecto',
      description: `Gastas el ${Math.round(data.ratios.expense_ratio)}% de tus ingresos y ahorras ${Math.round(data.ratios.savings_rate)}%. Has encontrado el equilibrio ideal entre disfrutar el presente y asegurar el futuro.`,
      impact: 'low' as const,
      actionable: `¡Perfecto balance! Mantén esta distribución. Podrías optimizar aumentando ahorros al ${Math.round(data.ratios.savings_rate + 3)}% si surgen oportunidades.`,
    }),
  },
  {
    type: 'savings_champion',
    category: 'health',
    priority: 24,
    confidence: 0.92,
    healthScore: 95,
    conditions: (data) => data.ratios.savings_rate >= 20,
    generator: (data) => ({
      title: '🏆 Campeón del Ahorro',
      description: `¡Increíble! Ahorras el ${Math.round(data.ratios.savings_rate)}% de tus ingresos (${Math.round(data.ratios.cash_flow)} pesos mensuales). Perteneces al top 10% de ahorradores más disciplinados.`,
      impact: 'low' as const,
      actionable: `¡Excelente disciplina! Considera diversificar tus ahorros: 60% emergencias, 25% inversiones, 15% objetivos específicos.`,
    }),
  },
  {
    type: 'paycheck_to_paycheck',
    category: 'health',
    priority: 23,
    confidence: 0.85,
    healthScore: 35,
    conditions: (data) => data.ratios.expense_ratio > 95,
    generator: (data) => ({
      title: '⚠️ Viviendo al Límite',
      description: `Gastas el ${Math.round(data.ratios.expense_ratio)}% de tus ingresos, quedando muy poco margen para emergencias. Esta situación genera estrés financiero y vulnerabilidad.`,
      impact: 'high' as const,
      actionable: `Prioridad: crear un fondo de emergencia. Reduce gastos no esenciales en un 10% y automatiza el ahorro de esa cantidad.`,
    }),
  },
  {
    type: 'cash_flow_master',
    category: 'health',
    priority: 22,
    confidence: 0.87,
    healthScore: 88,
    conditions: (data) =>
      data.ratios.cash_flow > 0 && data.ratios.savings_rate >= 15,
    generator: (data) => ({
      title: '💰 Maestro del Flujo de Efectivo',
      description: `Tu flujo de efectivo positivo de ${Math.round(data.ratios.cash_flow)} pesos demuestra excelente control financiero. Generas más de lo que gastas consistentemente.`,
      impact: 'low' as const,
      actionable: `¡Excelente gestión! Usa tu superávit para acelerar objetivos: inversiones, fondo de emergencia o metas específicas.`,
    }),
  },
];

// EFFICIENCY INSIGHTS
export const EFFICIENCY_INSIGHTS: InsightConfig[] = [
  {
    type: 'income_utilization_optimizer',
    category: 'efficiency',
    priority: 24,
    confidence: 0.9,
    healthScore: 82,
    conditions: (data) =>
      data.ratios.expense_ratio >= 60 && data.ratios.expense_ratio <= 95,
    generator: (data) => ({
      title: '🎯 Optimizador de Ingresos',
      description: `Utilizas el ${Math.round(data.ratios.expense_ratio)}% de tus ingresos de forma eficiente. Este alto nivel de utilización demuestra criterio para maximizar valor por peso invertido.`,
      impact: 'low' as const,
      actionable: `Excelente utilización. Mantén este balance optimizando las categorías de mayor impacto en tu calidad de vida.`,
    }),
  },
  {
    type: 'expense_efficiency_master',
    category: 'efficiency',
    priority: 20,
    confidence: 0.82,
    healthScore: 78,
    conditions: (data) =>
      data.ratios.expense_ratio <= 80 && data.ratios.savings_rate >= 10,
    generator: (data) => ({
      title: '⚡ Maestro de Eficiencia',
      description: `Gastas solo el ${Math.round(data.ratios.expense_ratio)}% de tus ingresos manteniendo calidad de vida. Tu eficiencia en gastos esenciales es ejemplar.`,
      impact: 'low' as const,
      actionable: `Mantén esta eficiencia. Considera automatizar más ahorros aprovechando tu margen disponible del ${Math.round(100 - data.ratios.expense_ratio)}%.`,
    }),
  },
  {
    type: 'financial_runway_calculator',
    category: 'efficiency',
    priority: 19,
    confidence: 0.78,
    healthScore: 72,
    conditions: (data) => data.ratios.savings_rate > 5,
    generator: (data) => ({
      title: '🛫 Calculadora de Supervivencia Financiera',
      description: `Con tu tasa de ahorro del ${Math.round(data.ratios.savings_rate)}%, construyes una pista de aterrizaje financiera sólida para emergencias o oportunidades.`,
      impact: 'medium' as const,
      actionable: `Objetivo: alcanzar 3-6 meses de gastos en emergencias. A tu ritmo actual, lograrías esto en ${Math.round((data.ratios.total_expenses * 3) / Math.max(data.ratios.cash_flow, 1000))} meses.`,
    }),
  },
];

// PSYCHOLOGICAL INSIGHTS
export const PSYCHOLOGICAL_INSIGHTS: InsightConfig[] = [
  {
    type: 'loss_aversion',
    category: 'psychological',
    priority: 18,
    confidence: 0.75,
    healthScore: 45,
    conditions: (data) =>
      data.spendingTrend === 'up' && data.monthlyInsights.length >= 2,
    generator: (data) => {
      const lastMonth = data.monthlyInsights[0]?.totalSpent || 0;
      const previousMonth = data.monthlyInsights[1]?.totalSpent || 0;
      const increasePercent =
        previousMonth > 0
          ? ((lastMonth - previousMonth) / previousMonth) * 100
          : 0;

      return {
        title: 'Aumento en Gastos Detectado',
        description: `Tus gastos aumentaron ${Math.round(increasePercent)}% este mes ($${Math.round(lastMonth - previousMonth)}). Es natural resistirse a "perder" dinero, pero pequeños ajustes pueden revertir esta tendencia.`,
        impact: increasePercent > 25 ? ('high' as const) : ('medium' as const),
        actionable: `Revisa tu categoría principal (${data.topCategory}) y establece un límite diario de $${Math.round((data.totalExpenses / 30) * 0.9)} para reducir gradualmente.`,
      };
    },
  },
  {
    type: 'mental_accounting',
    category: 'psychological',
    priority: 17,
    confidence: 0.72,
    healthScore: 60,
    conditions: (data) => {
      // Simulate high spending category check
      const categoryPercent = data.totalExpenses > 0 ? 45 : 0; // Simplified logic
      return categoryPercent > 40;
    },
    generator: (data) => ({
      title: 'Concentración de Gasto Detectada',
      description: `Un alto porcentaje de tus gastos se concentra en ${data.topCategory}. Tendemos a crear "cuentas mentales" separadas, pero es importante ver el panorama completo.`,
      impact: 'medium' as const,
      actionable: `Diversifica tus gastos: destina máximo 50% a ${data.topCategory} y explora alternativas más económicas.`,
    }),
  },
];

// MOTIVATION INSIGHTS
export const MOTIVATION_INSIGHTS: InsightConfig[] = [
  {
    type: 'progress_champion',
    category: 'motivation',
    priority: 16,
    confidence: 0.8,
    healthScore: 75,
    conditions: (data) =>
      data.ratios.savings_rate > 0 && data.transactionCount >= 5,
    generator: (data) => ({
      title: '🎯 Campeón del Progreso',
      description: `Con ${data.transactionCount} transacciones este mes y una tasa de ahorro del ${Math.round(data.ratios.savings_rate)}%, demuestras constancia en tu gestión financiera.`,
      impact: 'low' as const,
      actionable: `¡Mantén el impulso! Establece una meta específica para el próximo mes: aumentar ahorros en un 2% adicional.`,
    }),
  },
  {
    type: 'financial_discipline_score',
    category: 'motivation',
    priority: 15,
    confidence: 0.77,
    healthScore: 80,
    conditions: (data) =>
      data.ratios.expense_ratio >= 70 && data.ratios.expense_ratio <= 90,
    generator: (data) => ({
      title: '💪 Puntuación de Disciplina Financiera',
      description: `Tu ratio de gastos del ${Math.round(data.ratios.expense_ratio)}% refleja disciplina controlada. Mantienes un equilibrio consciente entre gastos y ahorros.`,
      impact: 'low' as const,
      actionable: `¡Excelente autocontrol! Recompénsate con una meta alcanzable: destinar el 1% extra a algo que disfrutas.`,
    }),
  },
];

// LEGACY INSIGHTS (lower priority)
export const LEGACY_INSIGHTS: InsightConfig[] = [
  {
    type: 'present_bias',
    category: 'psychological',
    priority: 10,
    confidence: 0.65,
    healthScore: 55,
    conditions: (data) => data.transactionCount >= 10,
    generator: (data) => {
      const avgTransactionAmount = data.totalExpenses / data.transactionCount;
      return {
        title: 'Patrón de Gastos Frecuentes',
        description: `Realizaste ${data.transactionCount} transacciones este mes (promedio $${Math.round(avgTransactionAmount)}). Los gastos pequeños y frecuentes pueden sumar más de lo que esperamos.`,
        impact:
          avgTransactionAmount < 20 ? ('high' as const) : ('medium' as const),
        actionable: `Implementa la regla del "día de espera": antes de compras menores a $50, espera 24 horas para decidir si realmente las necesitas.`,
      };
    },
  },
];

// Combine all insights by category
export const ALL_INSIGHTS_CONFIG: InsightConfig[] = [
  ...HEALTH_INSIGHTS,
  ...EFFICIENCY_INSIGHTS,
  ...PSYCHOLOGICAL_INSIGHTS,
  ...MOTIVATION_INSIGHTS,
  ...LEGACY_INSIGHTS,
];

// Category weights for scoring
export const CATEGORY_WEIGHTS: Record<string, number> = {
  health: 3.5,
  efficiency: 2.2,
  psychological: 2.8,
  temporal: 2.5,
  motivation: 2.0,
  behavioral: 1.8,
  social: 1.5,
  other: 1.0,
};

// Time-based boosts
export const getTimeBasedBoost = (category: string): number => {
  const hourOfDay = new Date().getHours();

  // Morning boost for health & efficiency (6AM-11AM)
  if (
    hourOfDay >= 6 &&
    hourOfDay <= 11 &&
    (category === 'health' || category === 'efficiency')
  ) {
    return 0.5;
  }
  // Afternoon boost for psychological & behavioral (12PM-5PM)
  if (
    hourOfDay >= 12 &&
    hourOfDay <= 17 &&
    (category === 'psychological' || category === 'temporal')
  ) {
    return 0.3;
  }
  // Evening boost for motivation (6PM-9PM)
  if (hourOfDay >= 18 && hourOfDay <= 21 && category === 'motivation') {
    return 0.4;
  }

  return 0;
};
