/**
 * Typography System - Psychological Hierarchy
 * Based on UX Design System cognitive hierarchy principles
 */

// Typography Hierarchy (Jerarquía Cognitiva)
export const typography = {
  // Money Amounts (Máxima Atención)
  money: {
    large: {
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
      letterSpacing: -0.5,
    },
    medium: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 36,
      letterSpacing: -0.3,
    },
    small: {
      fontSize: 24,
      fontWeight: '700' as const,
      lineHeight: 32,
      letterSpacing: -0.2,
    },
  },

  // Headlines (Títulos principales)
  headline: {
    large: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
      letterSpacing: -0.2,
    },
    medium: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
      letterSpacing: -0.1,
    },
    small: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 26,
    },
  },

  // Categorías (Reconocimiento Rápido)
  category: {
    large: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 26,
    },
    medium: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    small: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
  },

  // Body Text (Lectura Fluida)
  body: {
    large: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24, // 1.5 ratio for readability
    },
    medium: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20, // 1.4 ratio
    },
    small: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 18,
    },
  },

  // Caption (Metadata)
  caption: {
    large: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
    },
    medium: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
    },
    small: {
      fontSize: 10,
      fontWeight: '500' as const,
      lineHeight: 14,
    },
  },

  // Button Text (Interactive elements)
  button: {
    large: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
      letterSpacing: 0.5,
    },
    medium: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 22,
      letterSpacing: 0.3,
    },
    small: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
      letterSpacing: 0.2,
    },
  },

  // Labels (Form labels, categories)
  label: {
    large: {
      fontSize: 16,
      fontWeight: '500' as const,
      lineHeight: 22,
    },
    medium: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
    },
    small: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
    },
  },
};

// Font Families (consistent across platforms)
export const fontFamilies = {
  regular: 'System',
  medium: 'System',
  semiBold: 'System',
  bold: 'System',
  // For future custom fonts
  display: 'System',
  mono: 'monospace',
};

// Letter Spacing utilities
export const letterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
};

// Line Height utilities
export const lineHeight = {
  tight: 1.2,
  snug: 1.3,
  normal: 1.4,
  relaxed: 1.5,
  loose: 1.6,
};

// Text Style Presets (ready-to-use combinations)
export const textStyles = {
  // Primary money display
  moneyPrimary: {
    ...typography.money.large,
    textAlign: 'center' as const,
  },

  // Transaction amounts
  transactionAmount: {
    ...typography.money.small,
    textAlign: 'right' as const,
  },

  // Category names with emojis
  categoryWithEmoji: {
    ...typography.category.medium,
    textAlign: 'left' as const,
  },

  // Screen titles
  screenTitle: {
    ...typography.headline.large,
    textAlign: 'center' as const,
  },

  // Card titles
  cardTitle: {
    ...typography.headline.medium,
    textAlign: 'left' as const,
  },

  // Descriptions
  description: {
    ...typography.body.medium,
    textAlign: 'left' as const,
  },

  // Metadata (dates, times)
  metadata: {
    ...typography.caption.small,
    textAlign: 'left' as const,
  },

  // Button text
  buttonPrimary: {
    ...typography.button.medium,
    textAlign: 'center' as const,
  },

  // Form labels
  formLabel: {
    ...typography.label.medium,
    textAlign: 'left' as const,
  },
};

// Export type for TypeScript
export type TypographyVariant = keyof typeof typography;
export type TextStylePreset = keyof typeof textStyles;
