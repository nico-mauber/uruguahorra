/**
 * Motor de insights psicológicos, config-driven (port de
 * `services/analytics/insights-config.ts` de la app actual).
 * Fuente: docs/features/analytics/analytics-functional-specs.md (§Motor).
 *
 * Lógica pura y determinista salvo por el boost horario (usa la hora local).
 * Los títulos y condiciones de los insights sembrados son EXACTOS respecto al
 * archivo fuente original; sólo se aplanan los ratios a `InsightAnalysisData`.
 */
import type {
  EnhancedAnalytics,
  InsightAnalysisData,
  MonthlyInsight,
  PsychologicalInsight,
  SpendingPattern,
  TransactionSummary,
} from '@/types/analytics';

/** Salida cruda de un generador (sin metadatos del config). */
interface GeneratedInsight {
  title: string;
  description: string;
  actionable: string;
  impact: 'low' | 'medium' | 'high';
}

/** Configuración declarativa de un insight. */
interface InsightConfig {
  type: string;
  category: PsychologicalInsight['category'];
  priority: number;
  confidence: number;
  healthScore: number;
  icon: string;
  conditions: (data: InsightAnalysisData) => boolean;
  generator: (data: InsightAnalysisData) => GeneratedInsight;
}

const r = Math.round;

// ==================== SALUD (health) ====================
const HEALTH_INSIGHTS: InsightConfig[] = [
  {
    type: 'balanced_spender',
    category: 'health',
    priority: 25,
    confidence: 0.88,
    healthScore: 85,
    icon: '⚖️',
    conditions: (d) =>
      d.expense_ratio >= 70 && d.expense_ratio <= 95 && d.savings_rate >= 5,
    generator: (d) => ({
      title: '⚖️ Equilibrio Financiero Perfecto',
      description: `Gastas el ${r(d.expense_ratio)}% de tus ingresos y ahorras ${r(d.savings_rate)}%. Has encontrado el equilibrio ideal entre disfrutar el presente y asegurar el futuro.`,
      impact: 'low',
      actionable: `¡Perfecto balance! Mantén esta distribución. Podrías optimizar aumentando ahorros al ${r(d.savings_rate + 3)}% si surgen oportunidades.`,
    }),
  },
  {
    type: 'savings_champion',
    category: 'health',
    priority: 24,
    confidence: 0.92,
    healthScore: 95,
    icon: '🏆',
    conditions: (d) => d.savings_rate >= 20,
    generator: (d) => ({
      title: '🏆 Campeón del Ahorro',
      description: `¡Increíble! Ahorras el ${r(d.savings_rate)}% de tus ingresos (${r(d.cash_flow)} pesos mensuales). Perteneces al top 10% de ahorradores más disciplinados.`,
      impact: 'low',
      actionable: `¡Excelente disciplina! Considera diversificar tus ahorros: 60% emergencias, 25% inversiones, 15% objetivos específicos.`,
    }),
  },
  {
    type: 'paycheck_to_paycheck',
    category: 'health',
    priority: 23,
    confidence: 0.85,
    healthScore: 35,
    icon: '⚠️',
    conditions: (d) => d.expense_ratio > 95,
    generator: (d) => ({
      title: '⚠️ Viviendo al Límite',
      description: `Gastas el ${r(d.expense_ratio)}% de tus ingresos, quedando muy poco margen para emergencias. Esta situación genera estrés financiero y vulnerabilidad.`,
      impact: 'high',
      actionable: `Prioridad: crear un fondo de emergencia. Reduce gastos no esenciales en un 10% y automatiza el ahorro de esa cantidad.`,
    }),
  },
  {
    type: 'cash_flow_master',
    category: 'health',
    priority: 22,
    confidence: 0.87,
    healthScore: 88,
    icon: '💰',
    conditions: (d) => d.cash_flow > 0 && d.savings_rate >= 15,
    generator: (d) => ({
      title: '💰 Maestro del Flujo de Efectivo',
      description: `Tu flujo de efectivo positivo de ${r(d.cash_flow)} pesos demuestra excelente control financiero. Generas más de lo que gastas consistentemente.`,
      impact: 'low',
      actionable: `¡Excelente gestión! Usa tu superávit para acelerar objetivos: inversiones, fondo de emergencia o metas específicas.`,
    }),
  },
];

// ==================== EFICIENCIA (efficiency) ====================
const EFFICIENCY_INSIGHTS: InsightConfig[] = [
  {
    type: 'income_utilization_optimizer',
    category: 'efficiency',
    priority: 24,
    confidence: 0.9,
    healthScore: 82,
    icon: '🎯',
    conditions: (d) => d.expense_ratio >= 60 && d.expense_ratio <= 95,
    generator: (d) => ({
      title: '🎯 Optimizador de Ingresos',
      description: `Utilizas el ${r(d.expense_ratio)}% de tus ingresos de forma eficiente. Este alto nivel de utilización demuestra criterio para maximizar valor por peso invertido.`,
      impact: 'low',
      actionable: `Excelente utilización. Mantén este balance optimizando las categorías de mayor impacto en tu calidad de vida.`,
    }),
  },
  {
    type: 'expense_efficiency_master',
    category: 'efficiency',
    priority: 20,
    confidence: 0.82,
    healthScore: 78,
    icon: '⚡',
    conditions: (d) => d.expense_ratio <= 80 && d.savings_rate >= 10,
    generator: (d) => ({
      title: '⚡ Maestro de Eficiencia',
      description: `Gastas solo el ${r(d.expense_ratio)}% de tus ingresos manteniendo calidad de vida. Tu eficiencia en gastos esenciales es ejemplar.`,
      impact: 'low',
      actionable: `Mantén esta eficiencia. Considera automatizar más ahorros aprovechando tu margen disponible del ${r(100 - d.expense_ratio)}%.`,
    }),
  },
  {
    type: 'financial_runway_calculator',
    category: 'efficiency',
    priority: 19,
    confidence: 0.78,
    healthScore: 72,
    icon: '🛫',
    conditions: (d) => d.savings_rate > 5,
    generator: (d) => ({
      title: '🛫 Calculadora de Supervivencia Financiera',
      description: `Con tu tasa de ahorro del ${r(d.savings_rate)}%, construyes una pista de aterrizaje financiera sólida para emergencias o oportunidades.`,
      impact: 'medium',
      actionable: `Objetivo: alcanzar 3-6 meses de gastos en emergencias. A tu ritmo actual, lograrías esto en ${r((d.total_expenses * 3) / Math.max(d.cash_flow, 1000))} meses.`,
    }),
  },
];

// ==================== PSICOLÓGICO (psychological) ====================
const PSYCHOLOGICAL_INSIGHTS: InsightConfig[] = [
  {
    type: 'loss_aversion',
    category: 'psychological',
    priority: 18,
    confidence: 0.75,
    healthScore: 45,
    icon: '📈',
    conditions: (d) => d.spendingTrend === 'up' && d.monthlyInsights.length >= 2,
    generator: (d) => {
      const lastMonth = d.monthlyInsights[0]?.total_spent || 0;
      const previousMonth = d.monthlyInsights[1]?.total_spent || 0;
      const increasePercent =
        previousMonth > 0
          ? ((lastMonth - previousMonth) / previousMonth) * 100
          : 0;
      return {
        title: 'Aumento en Gastos Detectado',
        description: `Tus gastos aumentaron ${r(increasePercent)}% este mes ($${r(lastMonth - previousMonth)}). Es natural resistirse a "perder" dinero, pero pequeños ajustes pueden revertir esta tendencia.`,
        impact: increasePercent > 25 ? 'high' : 'medium',
        actionable: `Revisa tu categoría principal (${d.topCategory}) y establece un límite diario de $${r((d.total_expenses / 30) * 0.9)} para reducir gradualmente.`,
      };
    },
  },
  {
    type: 'mental_accounting',
    category: 'psychological',
    priority: 17,
    confidence: 0.72,
    healthScore: 60,
    icon: '🧮',
    conditions: (d) => {
      // Concentración de gasto: categoría principal > 40% (lógica simplificada
      // del origen; una categoría dominante existe cuando hay gasto real).
      const categoryPercent = d.total_expenses > 0 ? 45 : 0;
      return categoryPercent > 40;
    },
    generator: (d) => ({
      title: 'Concentración de Gasto Detectada',
      description: `Un alto porcentaje de tus gastos se concentra en ${d.topCategory}. Tendemos a crear "cuentas mentales" separadas, pero es importante ver el panorama completo.`,
      impact: 'medium',
      actionable: `Diversifica tus gastos: destina máximo 50% a ${d.topCategory} y explora alternativas más económicas.`,
    }),
  },
];

// ==================== MOTIVACIÓN (motivation) ====================
const MOTIVATION_INSIGHTS: InsightConfig[] = [
  {
    type: 'progress_champion',
    category: 'motivation',
    priority: 16,
    confidence: 0.8,
    healthScore: 75,
    icon: '🎯',
    conditions: (d) => d.savings_rate > 0 && d.transactionCount >= 5,
    generator: (d) => ({
      title: '🎯 Campeón del Progreso',
      description: `Con ${d.transactionCount} transacciones este mes y una tasa de ahorro del ${r(d.savings_rate)}%, demuestras constancia en tu gestión financiera.`,
      impact: 'low',
      actionable: `¡Mantén el impulso! Establece una meta específica para el próximo mes: aumentar ahorros en un 2% adicional.`,
    }),
  },
  {
    type: 'financial_discipline_score',
    category: 'motivation',
    priority: 15,
    confidence: 0.77,
    healthScore: 80,
    icon: '💪',
    conditions: (d) => d.expense_ratio >= 70 && d.expense_ratio <= 90,
    generator: (d) => ({
      title: '💪 Puntuación de Disciplina Financiera',
      description: `Tu ratio de gastos del ${r(d.expense_ratio)}% refleja disciplina controlada. Mantienes un equilibrio consciente entre gastos y ahorros.`,
      impact: 'low',
      actionable: `¡Excelente autocontrol! Recompénsate con una meta alcanzable: destinar el 1% extra a algo que disfrutas.`,
    }),
  },
];

// ==================== LEGACY (menor prioridad) ====================
const LEGACY_INSIGHTS: InsightConfig[] = [
  {
    type: 'present_bias',
    category: 'psychological',
    priority: 10,
    confidence: 0.65,
    healthScore: 55,
    icon: '⏳',
    conditions: (d) => d.transactionCount >= 10,
    generator: (d) => {
      const avgTransactionAmount =
        d.transactionCount > 0 ? d.total_expenses / d.transactionCount : 0;
      return {
        title: 'Patrón de Gastos Frecuentes',
        description: `Realizaste ${d.transactionCount} transacciones este mes (promedio $${r(avgTransactionAmount)}). Los gastos pequeños y frecuentes pueden sumar más de lo que esperamos.`,
        impact: avgTransactionAmount < 20 ? 'high' : 'medium',
        actionable: `Implementa la regla del "día de espera": antes de compras menores a $50, espera 24 horas para decidir si realmente las necesitas.`,
      };
    },
  },
];

/** Todos los configs, ordenados por bloque de categoría. */
const ALL_INSIGHTS_CONFIG: InsightConfig[] = [
  ...HEALTH_INSIGHTS,
  ...EFFICIENCY_INSIGHTS,
  ...PSYCHOLOGICAL_INSIGHTS,
  ...MOTIVATION_INSIGHTS,
  ...LEGACY_INSIGHTS,
];

/** Pesos por categoría para el scoring (§Motor). */
const CATEGORY_WEIGHTS: Record<PsychologicalInsight['category'], number> = {
  health: 3.5,
  psychological: 2.8,
  temporal: 2.5,
  efficiency: 2.2,
  motivation: 2.0,
};

/** Boost horario según la categoría y la hora local (§Motor). */
function getTimeBasedBoost(category: PsychologicalInsight['category']): number {
  const hourOfDay = new Date().getHours();
  // Mañana (6-11h): +0.5 salud/eficiencia.
  if (hourOfDay >= 6 && hourOfDay <= 11 && (category === 'health' || category === 'efficiency')) {
    return 0.5;
  }
  // Tarde (12-17h): +0.3 psicológico/temporal.
  if (hourOfDay >= 12 && hourOfDay <= 17 && (category === 'psychological' || category === 'temporal')) {
    return 0.3;
  }
  // Noche (18-21h): +0.4 motivación.
  if (hourOfDay >= 18 && hourOfDay <= 21 && category === 'motivation') {
    return 0.4;
  }
  return 0;
}

/** Rango numérico del impacto para ordenar por impacto descendente. */
const IMPACT_RANK: Record<GeneratedInsight['impact'], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Evalúa todos los configs, conserva los que cumplen sus condiciones, puntúa
 * (prioridad × peso de categoría + boost horario), limita `maxPerType` por tipo
 * y, si `preferHighImpact`, ordena por impacto descendente.
 */
export function generateInsights(
  data: InsightAnalysisData,
  opts: { maxPerType: number; preferHighImpact: boolean }
): PsychologicalInsight[] {
  const scored: Array<{ insight: PsychologicalInsight; score: number }> = [];

  for (const config of ALL_INSIGHTS_CONFIG) {
    try {
      if (!config.conditions(data)) continue;
      const generated = config.generator(data);
      const score =
        config.priority * CATEGORY_WEIGHTS[config.category] +
        getTimeBasedBoost(config.category);
      scored.push({
        score,
        insight: {
          id: config.type,
          type: config.type,
          category: config.category,
          icon: config.icon,
          title: generated.title,
          description: generated.description,
          actionable: generated.actionable,
          impact: generated.impact,
        },
      });
    } catch {
      // Un config que falla no debe romper el resto (analytics no crítico).
      continue;
    }
  }

  // Orden base por score descendente.
  scored.sort((a, b) => b.score - a.score);

  // Limitar `maxPerType` por tipo.
  const perType = new Map<string, number>();
  const limited: PsychologicalInsight[] = [];
  for (const { insight } of scored) {
    const count = perType.get(insight.type) ?? 0;
    if (count >= opts.maxPerType) continue;
    perType.set(insight.type, count + 1);
    limited.push(insight);
  }

  // Si se prefieren los de alto impacto, reordenar por impacto descendente.
  if (opts.preferHighImpact) {
    limited.sort((a, b) => IMPACT_RANK[b.impact] - IMPACT_RANK[a.impact]);
  }

  return limited;
}

/**
 * Deriva `InsightAnalysisData` a partir de los datos ya cargados. Prefiere las
 * métricas del enhanced analytics; si faltan, las calcula desde el summary.
 */
export function buildAnalysisData(input: {
  summary: TransactionSummary | null;
  enhanced: EnhancedAnalytics | null;
  monthlyInsights: MonthlyInsight[];
  patterns: SpendingPattern[];
}): InsightAnalysisData {
  const { summary, enhanced, monthlyInsights, patterns } = input;

  const totalIncome = num(enhanced?.total_income) ?? num(summary?.total_income) ?? 0;
  const totalExpenses =
    num(enhanced?.total_expenses) ?? num(summary?.total_expenses) ?? 0;
  const cashFlow = num(enhanced?.cash_flow) ?? totalIncome - totalExpenses;
  const savingsRate =
    num(enhanced?.savings_rate) ??
    (totalIncome > 0 ? (cashFlow / totalIncome) * 100 : 0);
  const expenseRatio =
    num(enhanced?.expense_ratio) ??
    (totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0);

  return {
    expense_ratio: expenseRatio,
    savings_rate: savingsRate,
    cash_flow: cashFlow,
    total_expenses: totalExpenses,
    transactionCount: summary?.transaction_count ?? 0,
    topCategory:
      summary?.top_category ?? patterns[0]?.category ?? 'Sin datos',
    spendingTrend: summary?.spending_trend ?? 'stable',
    monthlyInsights: monthlyInsights.map((m) => ({
      total_spent: Number(m.total_spent) || 0,
      savings_rate: Number(m.savings_rate) || 0,
    })),
  };
}

/** Convierte a número finito o devuelve undefined (para el fallback ??). */
function num(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
