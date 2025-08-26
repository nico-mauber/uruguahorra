import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
  Animated,
} from 'react-native';
import { useTheme } from '@theme';
import {
  typography,
  touchTargets,
  spacing,
  borderRadius,
  elevation,
  opacity,
} from '@theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?:
    | 'primary'
    | 'secondary'
    | 'expense'
    | 'savings'
    | 'outline'
    | 'ghost';
  size?: 'small' | 'medium' | 'large' | 'critical';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  disabled,
  style,
  ...props
}) => {
  const { colors, getExpenseColor, getSavingsColor } = useTheme();

  // Animation state
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  // Handle press in/out for micro-interactions
  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.96, // Slight press down effect
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // Get variant-specific styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
          textColor: colors.text.inverse,
          elevation: elevation.md,
        };
      case 'secondary':
        return {
          backgroundColor: colors.neutral.light,
          borderColor: colors.neutral.primary,
          textColor: colors.text.primary,
          elevation: elevation.sm,
        };
      case 'expense':
        return {
          backgroundColor: getExpenseColor(),
          borderColor: getExpenseColor(),
          textColor: colors.text.inverse,
          elevation: elevation.md,
        };
      case 'savings':
        return {
          backgroundColor: getSavingsColor(),
          borderColor: getSavingsColor(),
          textColor: colors.text.inverse,
          elevation: elevation.md,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: colors.primary,
          textColor: colors.primary,
          elevation: elevation.none,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          textColor: colors.text.secondary,
          elevation: elevation.none,
        };
      default:
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
          textColor: colors.text.inverse,
          elevation: elevation.md,
        };
    }
  };

  // Get size-specific dimensions
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          minHeight: touchTargets.minimum,
          typography: typography.button.small,
        };
      case 'medium':
        return {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          minHeight: touchTargets.preferred,
          typography: typography.button.medium,
        };
      case 'large':
        return {
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.lg,
          minHeight: touchTargets.critical,
          typography: typography.button.large,
        };
      case 'critical':
        return {
          paddingHorizontal: spacing['2xl'],
          paddingVertical: spacing.xl,
          minHeight: touchTargets.critical + 8,
          typography: typography.button.large,
        };
      default:
        return {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          minHeight: touchTargets.preferred,
          typography: typography.button.medium,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const buttonStyles = [
    styles.base,
    {
      backgroundColor: variantStyles.backgroundColor,
      borderColor: variantStyles.borderColor,
      borderWidth: variant === 'outline' ? 2 : 0,
      paddingHorizontal: sizeStyles.paddingHorizontal,
      paddingVertical: sizeStyles.paddingVertical,
      minHeight: sizeStyles.minHeight,
      opacity: disabled || loading ? opacity.disabled : opacity.full,
      ...(fullWidth && { alignSelf: 'stretch' as const }),
      ...variantStyles.elevation,
    },
    style,
  ];

  const textStyles = [
    styles.text,
    {
      color: variantStyles.textColor,
      ...sizeStyles.typography,
    },
  ];

  const content = (
    <>
      {icon && iconPosition === 'left' && !loading && <>{icon}</>}
      {loading ? (
        <ActivityIndicator
          color={variantStyles.textColor}
          size={size === 'small' ? 'small' : 'small'}
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
      {icon && iconPosition === 'right' && !loading && <>{icon}</>}
    </>
  );

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        style={buttonStyles}
        disabled={disabled || loading}
        activeOpacity={opacity.pressed}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...props}
      >
        {content}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    gap: spacing.sm, // Space between icon and text
  },
  text: {
    textAlign: 'center',
  },
});
