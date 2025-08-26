/**
 * Psychological Icon System
 * Based on Mental Accounting and Visual Recognition principles
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';

// Category Icons (Mental Accounting visualization)
export const categoryIcons = {
  // Gastos necesarios (verde suave para reducir ansiedad)
  housing: {
    emoji: '🏠',
    icon: 'home-outline' as const,
    color: '#51CF66',
    description: 'Vivienda',
  },
  food: {
    emoji: '🍔',
    icon: 'restaurant-outline' as const,
    color: '#51CF66',
    description: 'Comida',
  },
  transport: {
    emoji: '🚗',
    icon: 'car-outline' as const,
    color: '#51CF66',
    description: 'Transporte',
  },
  health: {
    emoji: '⚕️',
    icon: 'medical-outline' as const,
    color: '#51CF66',
    description: 'Salud',
  },
  utilities: {
    emoji: '⚡',
    icon: 'flash-outline' as const,
    color: '#51CF66',
    description: 'Servicios',
  },

  // Gastos deseables (amarillo para precaución)
  entertainment: {
    emoji: '🎬',
    icon: 'film-outline' as const,
    color: '#FFB84D',
    description: 'Entretenimiento',
  },
  shopping: {
    emoji: '🛍️',
    icon: 'bag-outline' as const,
    color: '#FFB84D',
    description: 'Compras',
  },
  dining_out: {
    emoji: '🍕',
    icon: 'pizza-outline' as const,
    color: '#FFB84D',
    description: 'Salir a comer',
  },
  travel: {
    emoji: '✈️',
    icon: 'airplane-outline' as const,
    color: '#FFB84D',
    description: 'Viajes',
  },
  hobbies: {
    emoji: '🎨',
    icon: 'color-palette-outline' as const,
    color: '#FFB84D',
    description: 'Hobbies',
  },

  // Gastos impulsivos (rojo para activar precaución)
  impulse: {
    emoji: '💸',
    icon: 'flash-outline' as const,
    color: '#FF6B6B',
    description: 'Compras impulsivas',
  },
  luxury: {
    emoji: '💎',
    icon: 'diamond-outline' as const,
    color: '#FF6B6B',
    description: 'Lujos',
  },
  subscriptions: {
    emoji: '📱',
    icon: 'phone-portrait-outline' as const,
    color: '#FF6B6B',
    description: 'Suscripciones',
  },

  // Ingresos (verde brillante para refuerzo positivo)
  salary: {
    emoji: '💰',
    icon: 'cash-outline' as const,
    color: '#51CF66',
    description: 'Salario',
  },
  freelance: {
    emoji: '💻',
    icon: 'laptop-outline' as const,
    color: '#51CF66',
    description: 'Freelance',
  },
  investment: {
    emoji: '📈',
    icon: 'trending-up-outline' as const,
    color: '#51CF66',
    description: 'Inversiones',
  },
  gift: {
    emoji: '🎁',
    icon: 'gift-outline' as const,
    color: '#51CF66',
    description: 'Regalos recibidos',
  },

  // Categoría por defecto
  other: {
    emoji: '❓',
    icon: 'help-circle-outline' as const,
    color: '#6C757D',
    description: 'Otros',
  },
} as const;

// Action Icons (Interaction feedback)
export const actionIcons = {
  // Primary actions (blue for trust)
  add: {
    icon: 'add-circle-outline' as const,
    color: '#339AF0',
    size: 24,
  },
  edit: {
    icon: 'create-outline' as const,
    color: '#339AF0',
    size: 20,
  },
  save: {
    icon: 'checkmark-circle-outline' as const,
    color: '#51CF66',
    size: 24,
  },

  // Destructive actions (red for warning)
  delete: {
    icon: 'trash-outline' as const,
    color: '#FF6B6B',
    size: 20,
  },
  remove: {
    icon: 'close-circle-outline' as const,
    color: '#FF6B6B',
    size: 20,
  },

  // Navigation (neutral)
  back: {
    icon: 'arrow-back-outline' as const,
    color: '#6C757D',
    size: 24,
  },
  forward: {
    icon: 'arrow-forward-outline' as const,
    color: '#6C757D',
    size: 24,
  },

  // Status indicators
  success: {
    icon: 'checkmark-circle' as const,
    color: '#51CF66',
    size: 24,
  },
  warning: {
    icon: 'warning' as const,
    color: '#FFB84D',
    size: 24,
  },
  error: {
    icon: 'close-circle' as const,
    color: '#FF6B6B',
    size: 24,
  },
  info: {
    icon: 'information-circle' as const,
    color: '#339AF0',
    size: 24,
  },
} as const;

// Gamification Icons (Achievement psychology)
export const gamificationIcons = {
  streak: {
    emoji: '🔥',
    icon: 'flame' as const,
    color: '#FF6B35',
    description: 'Racha',
  },
  achievement: {
    emoji: '🏆',
    icon: 'trophy' as const,
    color: '#FFD43B',
    description: 'Logro',
  },
  level: {
    emoji: '⭐',
    icon: 'star' as const,
    color: '#A29BFE',
    description: 'Nivel',
  },
  xp: {
    emoji: '⚡',
    icon: 'flash' as const,
    color: '#6C5CE7',
    description: 'Experiencia',
  },
  target: {
    emoji: '🎯',
    icon: 'radio-button-on' as const,
    color: '#51CF66',
    description: 'Objetivo',
  },
  crown: {
    emoji: '👑',
    icon: 'trophy' as const,
    color: '#FFD43B',
    description: 'Corona',
  },
} as const;

// Utility functions for icon usage
export const getIconConfig = (categoryKey: string) => {
  return (
    categoryIcons[categoryKey as keyof typeof categoryIcons] ||
    categoryIcons.other
  );
};

export const getActionIcon = (actionKey: string) => {
  return actionIcons[actionKey as keyof typeof actionIcons];
};

export const getGamificationIcon = (gamificationKey: string) => {
  return gamificationIcons[gamificationKey as keyof typeof gamificationIcons];
};

// Icon size presets (touch-friendly)
export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Psychological color mapping
export const getExpenseIntensityColor = (amount: number, maxAmount: number) => {
  const intensity = Math.min(amount / maxAmount, 1);

  if (intensity < 0.3) return '#51CF66'; // Green - safe spending
  if (intensity < 0.6) return '#FFB84D'; // Orange - caution
  if (intensity < 0.8) return '#FF8E8E'; // Light red - concern
  return '#FF6B6B'; // Red - high alert
};

export const getSavingsIntensityColor = (
  amount: number,
  goalAmount: number
) => {
  const progress = Math.min(amount / goalAmount, 1);

  if (progress < 0.25) return '#ADB5BD'; // Gray - just started
  if (progress < 0.5) return '#8CE99A'; // Light green - making progress
  if (progress < 0.75) return '#51CF66'; // Green - good progress
  return '#40C057'; // Darker green - excellent progress
};

// Type definitions for TypeScript
export type CategoryIconKey = keyof typeof categoryIcons;
export type ActionIconKey = keyof typeof actionIcons;
export type GamificationIconKey = keyof typeof gamificationIcons;
export type IconSizeKey = keyof typeof iconSizes;

// Icon component with psychological principles
interface PsychologicalIconProps {
  category?: CategoryIconKey;
  action?: ActionIconKey;
  gamification?: GamificationIconKey;
  size?: IconSizeKey | number;
  color?: string;
  useEmoji?: boolean;
}

export const PsychologicalIcon: React.FC<PsychologicalIconProps> = ({
  category,
  action,
  gamification,
  size = 'md',
  color,
  useEmoji = false,
}) => {
  let iconConfig;

  if (category) {
    iconConfig = getIconConfig(category);
  } else if (action) {
    iconConfig = getActionIcon(action);
  } else if (gamification) {
    iconConfig = getGamificationIcon(gamification);
  }

  if (!iconConfig) return null;

  const iconSize = typeof size === 'number' ? size : iconSizes[size];
  const iconColor = color || iconConfig.color;

  if (useEmoji && 'emoji' in iconConfig) {
    return <span style={{ fontSize: iconSize }}>{iconConfig.emoji}</span>;
  }

  return <Ionicons name={iconConfig.icon} size={iconSize} color={iconColor} />;
};
