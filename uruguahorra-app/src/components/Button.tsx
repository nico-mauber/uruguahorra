import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';
import { useTheme } from '@theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  const buttonStyles = [
    styles.base,
    styles[size],
    {
      backgroundColor:
        variant === 'primary'
          ? theme.primary
          : variant === 'secondary'
          ? theme.secondary
          : 'transparent',
      borderColor: variant === 'outline' ? theme.primary : 'transparent',
      borderWidth: variant === 'outline' ? 1 : 0,
      opacity: disabled || loading ? 0.6 : 1,
    },
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${size}`],
    {
      color:
        variant === 'outline'
          ? theme.primary
          : variant === 'primary'
          ? '#FFFFFF'
          : '#FFFFFF',
    },
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? theme.primary : '#FFFFFF'}
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  small: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  medium: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  large: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  text: {
    fontWeight: '600',
  },
  text_small: {
    fontSize: 14,
  },
  text_medium: {
    fontSize: 16,
  },
  text_large: {
    fontSize: 18,
  },
});