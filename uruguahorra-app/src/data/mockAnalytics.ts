/**
 * 📊 MOCK ANALYTICS DATA GENERATOR
 * Generates realistic mock data for analytics when SQL functions are not available
 * Replaces hardcoded values with dynamic, context-aware data
 */

import type {
  SpendingPattern,
  MonthlyInsight,
  PsychologicalInsight,
  SpendingForecast,
} from '@/services/analytics.service';
import {
  PSYCHOLOGICAL_INSIGHTS_CONFIG,
  TREND_ANALYSIS,
} from '@/config/analytics.config';

// ==================== CATEGORY DATA ====================
export const MOCK_CATEGORIES = {
  // Essential categories with realistic spending patterns
  FOOD: {
    name: 'Comida',
    avgMonthlySpend: 450,
    frequency: 12,
    volatility: 0.15, // 15% variance
    trend: 'up' as const,
  },
  TRANSPORT: {
    name: 'Transporte',
    avgMonthlySpend: 200,
    frequency: 8,
    volatility: 0.1,
    trend: 'stable' as const,
  },
  ENTERTAINMENT: {
    name: 'Entretenimiento',
    avgMonthlySpend: 150,
    frequency: 5,
    volatility: 0.25,
    trend: 'down' as const,
  },
  UTILITIES: {
    name: 'Servicios',
    avgMonthlySpend: 300,
    frequency: 4,
    volatility: 0.05,
    trend: 'stable' as const,
  },
  SHOPPING: {
    name: 'Compras',
    avgMonthlySpend: 180,
    frequency: 6,
    volatility: 0.3,
    trend: 'up' as const,
  },
  HEALTH: {
    name: 'Salud',
    avgMonthlySpend: 120,
    frequency: 3,
    volatility: 0.2,
    trend: 'stable' as const,
  },
} as const;

// ==================== RANDOM GENERATORS ====================
const randomBetween = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

const randomChoice = <T>(array: readonly T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

const applyVolatility = (baseValue: number, volatility: number): number => {
  const variance = baseValue * volatility;
  return Math.max(0, baseValue + randomBetween(-variance, variance));
};

// ==================== USER-AWARE DATA GENERATION ====================
interface UserProfile {
  id: string;
  spendingLevel?: 'low' | 'medium' | 'high';
  categoryPreferences?: string[];
  riskProfile?: 'conservative' | 'moderate' | 'aggressive';
}

const getUserSeed = (userId: string): number => {
  // Create consistent seed from user ID for reproducible results
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

const seededRandom = (seed: number): number => {
  // Simple seeded random number generator
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

// ==================== SPENDING PATTERNS GENERATOR ====================
export const generateMockSpendingPatterns = (
  userId: string,
  days: number = 30
): SpendingPattern[] => {
  const seed = getUserSeed(userId);
  const patterns: SpendingPattern[] = [];

  Object.values(MOCK_CATEGORIES).forEach((category, index) => {
    const userSeed = seed + index;
    const random = () => seededRandom(userSeed + patterns.length);

    // Generate realistic amounts based on days requested
    const dailyAvg = category.avgMonthlySpend / 30;
    const totalAmount = applyVolatility(dailyAvg * days, category.volatility);

    // Calculate frequency (more days = more transactions)
    const monthlyFreq = category.frequency;
    const adjustedFreq = Math.round((monthlyFreq / 30) * days);

    // Determine average amount per transaction
    const avgAmount =
      adjustedFreq > 0 ? totalAmount / adjustedFreq : totalAmount;

    // Add some randomness to trends
    let trend = category.trend;
    if (random() > 0.8) {
      trend = randomChoice(['up', 'down', 'stable'] as const);
    }

    patterns.push({
      category: category.name,
      amount: Math.round(totalAmount),
      frequency: Math.max(1, adjustedFreq),
      trend,
      averageAmount: Math.round(avgAmount * 100) / 100,
    });
  });

  // Sort by amount descending
  return patterns.sort((a, b) => b.amount - a.amount);
};

// ==================== MONTHLY INSIGHTS GENERATOR ====================
export const generateMockMonthlyInsights = (
  userId: string,
  monthsBack: number = 6
): MonthlyInsight[] => {
  const seed = getUserSeed(userId);
  const insights: MonthlyInsight[] = [];
  const currentDate = new Date();

  for (let i = 0; i < monthsBack; i++) {
    const monthDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - i,
      1
    );
    const monthStr = monthDate.toISOString().slice(0, 7); // YYYY-MM format

    const monthSeed = seed + i;
    const random = () => seededRandom(monthSeed + insights.length);

    // Generate base spending amount with trend
    const baseSpending = 800;
    const trendFactor = 1 + i * 0.05; // Slight downward trend in past
    const monthlySpending = Math.round(
      applyVolatility(baseSpending * trendFactor, 0.2)
    );

    // Generate budget variance (-20% to +30%)
    const budgetVariance = Math.round(randomBetween(-20, 30));

    // Generate top categories based on spending patterns
    const categories = Object.values(MOCK_CATEGORIES);
    const topCategories = categories
      .map((cat) => ({
        category: cat.name,
        amount: Math.round(
          applyVolatility(cat.avgMonthlySpend, cat.volatility)
        ),
        percentage: 0, // Will calculate after
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    // Calculate percentages
    const totalCategorySpend = topCategories.reduce(
      (sum, cat) => sum + cat.amount,
      0
    );
    topCategories.forEach((cat) => {
      cat.percentage = Math.round((cat.amount / totalCategorySpend) * 100);
    });

    // Generate savings rate (0-25%)
    const savingsRate = Math.round(randomBetween(0, 25));

    // Generate streak days (0-30, with bias toward lower numbers)
    const streakDays = Math.floor(random() * random() * 30);

    insights.push({
      month: monthStr,
      totalSpent: monthlySpending,
      budgetVariance,
      topCategories,
      savingsRate,
      streakDays,
    });
  }

  return insights;
};

// ==================== PSYCHOLOGICAL INSIGHTS GENERATOR ====================
const INSIGHT_TEMPLATES = {
  loss_aversion: [
    {
      title: '🚨 Presupuesto excedido',
      description: 'Has gastado {variance}% más de tu presupuesto este mes',
      actionable:
        'Revisa tus gastos en {topCategory} y ajusta para los próximos días',
    },
    {
      title: '💸 Gasto impulsivo detectado',
      description:
        'Tus gastos en {topCategory} aumentaron {increase}% este mes',
      actionable: 'Define límites estrictos para gastos no planificados',
    },
  ],
  mental_accounting: [
    {
      title: '💡 Tu categoría principal: {topCategory}',
      description: 'Representa el {percentage}% de tus gastos',
      actionable: 'Considera si esta proporción refleja tus prioridades reales',
    },
    {
      title: '📊 Distribución de gastos',
      description: 'Gastas de forma desigual entre categorías esenciales',
      actionable: 'Usa un presupuesto único sin categorías mentales',
    },
  ],
  present_bias: [
    {
      title: '📊 Proyección mensual',
      description: 'A tu ritmo actual gastarás ${projected} este mes',
      actionable: 'Ajusta tus gastos diarios para alcanzar tu meta mensual',
    },
    {
      title: '⏰ Patrón de gastos inmediatos',
      description: 'Priorizas gastos inmediatos sobre ahorros a largo plazo',
      actionable: 'Automatiza tus ahorros antes de ver el dinero',
    },
  ],
  social_proof: [
    {
      title: '🎯 ¡Inicia tu racha!',
      description: 'Comienza una racha de cumplimiento de metas',
      actionable:
        'Usuarios constantes ahorran 40% más que usuarios esporádicos',
    },
    {
      title: '🏆 Vas mejor que otros',
      description: 'Tu control de gastos está por encima del promedio',
      actionable: 'Mantén este comportamiento positivo',
    },
  ],
} as const;

export const generateMockPsychologicalInsights = (
  userId: string,
  monthlyInsights?: MonthlyInsight[]
): PsychologicalInsight[] => {
  const seed = getUserSeed(userId);
  const insights: PsychologicalInsight[] = [];

  // Use actual insights data if available
  const latestMonth = monthlyInsights?.[0];
  const topCategory = latestMonth?.topCategories?.[0];

  // Generate 2-4 insights
  const insightCount = 2 + (seed % 3);

  Object.entries(INSIGHT_TEMPLATES).forEach(([type, templates], index) => {
    if (insights.length >= insightCount) return;

    const template = randomChoice(templates);
    const insightType = type as keyof typeof INSIGHT_TEMPLATES;

    // Generate contextual data
    const contextData = {
      variance: latestMonth?.budgetVariance?.toString() || '20',
      topCategory: topCategory?.category || 'Comida',
      percentage: topCategory?.percentage?.toString() || '56',
      increase: Math.round(randomBetween(10, 50)).toString(),
      projected: Math.round(randomBetween(1000, 1500)).toString(),
    };

    // Replace template variables
    const title = template.title.replace(
      /{(\w+)}/g,
      (_, key) => contextData[key as keyof typeof contextData] || ''
    );
    const description = template.description.replace(
      /{(\w+)}/g,
      (_, key) => contextData[key as keyof typeof contextData] || ''
    );
    const actionable = template.actionable.replace(
      /{(\w+)}/g,
      (_, key) => contextData[key as keyof typeof contextData] || ''
    );

    // Determine impact based on type and data
    let impact: 'high' | 'medium' | 'low' = 'medium';
    if (
      insightType === 'loss_aversion' &&
      latestMonth?.budgetVariance &&
      latestMonth.budgetVariance > 15
    ) {
      impact = 'high';
    } else if (insightType === 'social_proof') {
      impact = 'low';
    }

    insights.push({
      type: insightType,
      title,
      description,
      impact,
      actionable,
    });
  });

  return insights;
};

// ==================== SPENDING FORECAST GENERATOR ====================
export const generateMockSpendingForecast = (
  userId: string,
  days: number = 30,
  monthlyInsights?: MonthlyInsight[]
): SpendingForecast => {
  const seed = getUserSeed(userId);
  const random = () => seededRandom(seed);

  // Base prediction on recent spending if available
  const recentSpending = monthlyInsights?.[0]?.totalSpent || 800;
  const dailyAverage = recentSpending / 30;

  // Apply trend from recent data
  let trendMultiplier = 1.0;
  if (monthlyInsights && monthlyInsights.length >= 2) {
    const current = monthlyInsights[0].totalSpent;
    const previous = monthlyInsights[1].totalSpent;
    trendMultiplier = current / previous;
  }

  // Calculate predicted amount
  const baseAmount = dailyAverage * days * trendMultiplier;
  const predictedAmount = Math.round(applyVolatility(baseAmount, 0.15));

  // Generate confidence based on data quality
  const dataQuality = monthlyInsights?.length || 1;
  const baseConfidence = Math.min(0.5 + dataQuality * 0.1, 0.9);
  const confidence = Math.round((baseConfidence + random() * 0.2) * 100) / 100;

  // Determine trend
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (trendMultiplier > TREND_ANALYSIS.UP_TREND_THRESHOLD) {
    trend = 'up';
  } else if (trendMultiplier < TREND_ANALYSIS.DOWN_TREND_THRESHOLD) {
    trend = 'down';
  }

  // Days of historical data used
  const basedOnDays = Math.min(days * 2, 60); // Up to 60 days of historical data

  return {
    predicted_amount: predictedAmount,
    confidence,
    trend,
    based_on_days: basedOnDays,
  };
};

// ==================== COMPLETE MOCK DATA GENERATOR ====================
export const generateCompleteAnalyticsData = (userId: string) => {
  const monthlyInsights = generateMockMonthlyInsights(userId);
  const spendingPatterns = generateMockSpendingPatterns(userId);
  const psychologicalInsights = generateMockPsychologicalInsights(
    userId,
    monthlyInsights
  );
  const forecast = generateMockSpendingForecast(userId, 30, monthlyInsights);

  return {
    spendingPatterns,
    monthlyInsights,
    psychologicalInsights,
    forecast,
  };
};

// ==================== CATEGORY HELPERS ====================
export const getMockCategoryNames = (): string[] => {
  return Object.values(MOCK_CATEGORIES).map((cat) => cat.name);
};

export const getMockCategoryData = (categoryName: string) => {
  return Object.values(MOCK_CATEGORIES).find(
    (cat) => cat.name === categoryName
  );
};

// ==================== EXPORT TYPES ====================
export type MockCategoryType =
  (typeof MOCK_CATEGORIES)[keyof typeof MOCK_CATEGORIES];
export type UserProfileType = UserProfile;
