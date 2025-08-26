import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useTheme } from '@theme';
import { spacing, borderRadius, elevation } from '@theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'expense' | 'savings' | 'neutral';
  padding?: 'none' | 'small' | 'medium' | 'large';
  elevation?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  onPress?: () => void;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 'medium',
  elevation: elevationProp = 'md',
  onPress,
  interactive = false,
  style,
  ...props
}) => {
  const { colors, isDark, getContextualBackground } = useTheme();

  // Get background color based on variant (psychological color psychology)
  const getBackgroundColor = () => {
    switch (variant) {
      case 'expense':
        return getContextualBackground('expense');
      case 'savings':
        return getContextualBackground('savings');
      case 'neutral':
        return getContextualBackground('neutral');
      case 'outlined':
        return colors.surface;
      case 'elevated':
      default:
        return colors.surface;
    }
  };

  // Get border color for outlined variant
  const getBorderColor = () => {
    switch (variant) {
      case 'expense':
        return colors.expense.primary;
      case 'savings':
        return colors.savings.primary;
      case 'outlined':
        return colors.border.primary;
      default:
        return 'transparent';
    }
  };

  // Get elevation based on variant and interactivity
  const getCardElevation = () => {
    if (variant === 'outlined') return elevation.none;

    const elevationVariant = interactive ? 'lg' : elevationProp;
    return elevation[elevationVariant];
  };

  // Dynamic padding based on size
  const getPaddingStyles = () => {
    switch (padding) {
      case 'none':
        return { padding: 0 };
      case 'small':
        return { padding: spacing.md };
      case 'medium':
        return { padding: spacing.lg };
      case 'large':
        return { padding: spacing.xl };
      default:
        return { padding: spacing.lg };
    }
  };

  const cardStyles = [
    styles.base,
    getPaddingStyles(),
    {
      backgroundColor: getBackgroundColor(),
      borderColor: getBorderColor(),
      borderWidth:
        variant === 'outlined' || variant === 'expense' || variant === 'savings'
          ? 1
          : 0,
      ...getCardElevation(),
      // Dark mode specific adjustments
      ...(isDark &&
        variant === 'elevated' && {
          borderWidth: 1,
          borderColor: colors.border.primary,
        }),
    },
    style,
  ];

  // If interactive, wrap with touchable behavior
  if (onPress || interactive) {
    return (
      <View
        style={[cardStyles, interactive && styles.interactive]}
        onTouchStart={onPress}
        {...props}
      >
        {children}
      </View>
    );
  }

  return (
    <View style={cardStyles} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.xl, // 16px for psychological softness
    overflow: 'hidden', // Ensures content respects border radius
  },
  interactive: {
    // Adds subtle visual feedback for interactive cards
    transform: [{ scale: 1 }], // Prepares for animation
  },
});
