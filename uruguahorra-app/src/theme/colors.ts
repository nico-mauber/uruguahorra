/**
 * UX Psychologically-Optimized Color System
 * Based on Loss Aversion, Mental Accounting & Social Proof principles
 */
export const colors = {
  light: {
    // Confianza y Estabilidad (Trust & Stability)
    primary: '#339AF0',
    primaryDark: '#1C7ED6',
    primaryLight: '#74C0FC',

    // Loss Aversion Psychology - Gastos (Expenses)
    expense: {
      primary: '#FF6B6B', // Alerta suave, no agresivo
      secondary: '#FF8E8E', // Transiciones
      background: '#FFF5F5', // Contexto suave
      light: '#FFE0E0',
    },

    // Positive Reinforcement - Ahorros (Savings)
    savings: {
      primary: '#51CF66', // Crecimiento, vida
      secondary: '#8CE99A', // Celebración
      background: '#F3FFF3', // Ambiente positivo
      light: '#D3F9D8',
    },

    // Neutral Information (Balance)
    neutral: {
      primary: '#6C757D', // Información sin emoción
      secondary: '#ADB5BD',
      light: '#F8F9FA',
    },

    // Backgrounds & Surfaces
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceSecondary: '#F8F9FA',
    card: '#FFFFFF',

    // Text Hierarchy
    text: {
      primary: '#212529', // Máxima legibilidad
      secondary: '#6C757D', // Información contextual
      tertiary: '#ADB5BD', // Metadata
      inverse: '#FFFFFF',
    },

    // Borders & Dividers
    border: {
      primary: '#DEE2E6',
      secondary: '#E9ECEF',
      focus: '#339AF0',
    },

    // Semantic Colors (Consistent with psychology)
    success: '#51CF66',
    warning: '#FFB84D',
    error: '#FF6B6B',
    info: '#339AF0',

    // Gamification Colors
    achievement: '#FFD43B',
    streak: '#FF6B35',
    xp: '#6C5CE7',
    level: '#A29BFE',
  },

  dark: {
    // Adapted for Dark Mode (20% less saturation)
    primary: '#4DABF7',
    primaryDark: '#339AF0',
    primaryLight: '#91D5FF',

    // Loss Aversion Psychology - Gastos (Dark Mode)
    expense: {
      primary: '#FF7979', // Menos saturado
      secondary: '#FF9F9F',
      background: '#2C1A1A', // Muy sutil
      light: '#3D2020',
    },

    // Positive Reinforcement - Ahorros (Dark Mode)
    savings: {
      primary: '#6BCF7F', // Menos saturado
      secondary: '#81C784',
      background: '#1A2E1A', // Muy sutil
      light: '#203020',
    },

    // Neutral Information (Dark Mode)
    neutral: {
      primary: '#ADB5BD',
      secondary: '#6C757D',
      light: '#343A40',
    },

    // Backgrounds & Surfaces (True black → Smart gray)
    background: '#1A1A1A', // No negro puro
    surface: '#212529',
    surfaceSecondary: '#2D3A3A',
    card: '#212529',

    // Text Hierarchy (Dark Mode)
    text: {
      primary: '#E0E0E0', // No blanco puro
      secondary: '#ADB5BD',
      tertiary: '#6C757D',
      inverse: '#212529',
    },

    // Borders & Dividers (Subtle for dark mode)
    border: {
      primary: '#495057',
      secondary: '#343A40',
      focus: '#4DABF7',
    },

    // Semantic Colors (Dark Mode Adapted)
    success: '#6BCF7F',
    warning: '#FFCC70',
    error: '#FF7979',
    info: '#4DABF7',

    // Gamification Colors (Dark Mode)
    achievement: '#FFE066',
    streak: '#FF8A65',
    xp: '#8B7ED8',
    level: '#B39DDB',
  },
};

// Color Psychology Utilities
export const getExpenseColor = (isDark: boolean) =>
  isDark ? colors.dark.expense.primary : colors.light.expense.primary;

export const getSavingsColor = (isDark: boolean) =>
  isDark ? colors.dark.savings.primary : colors.light.savings.primary;

export const getContextualBackground = (
  type: 'expense' | 'savings' | 'neutral',
  isDark: boolean
) => {
  if (isDark) {
    switch (type) {
      case 'expense':
        return colors.dark.expense.background;
      case 'savings':
        return colors.dark.savings.background;
      default:
        return colors.dark.neutral.light;
    }
  } else {
    switch (type) {
      case 'expense':
        return colors.light.expense.background;
      case 'savings':
        return colors.light.savings.background;
      default:
        return colors.light.neutral.light;
    }
  }
};
