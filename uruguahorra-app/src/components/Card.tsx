import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useTheme } from '@theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 'medium',
  style,
  ...props
}) => {
  const { theme, isDark } = useTheme();

  const cardStyles = [
    styles.base,
    styles[`padding_${padding}`],
    {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: variant === 'outlined' ? 1 : 0,
      shadowColor: variant === 'elevated' && !isDark ? '#000' : 'transparent',
      shadowOffset:
        variant === 'elevated' ? { width: 0, height: 2 } : { width: 0, height: 0 },
      shadowOpacity: variant === 'elevated' && !isDark ? 0.1 : 0,
      shadowRadius: variant === 'elevated' ? 8 : 0,
      elevation: variant === 'elevated' && !isDark ? 4 : 0,
    },
    style,
  ];

  return (
    <View style={cardStyles} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
  },
  padding_none: {
    padding: 0,
  },
  padding_small: {
    padding: 12,
  },
  padding_medium: {
    padding: 16,
  },
  padding_large: {
    padding: 24,
  },
});