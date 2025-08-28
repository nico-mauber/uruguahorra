import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';

interface FeatureToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  icon?: string;
}

export const FeatureToggle: React.FC<FeatureToggleProps> = ({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  icon,
}) => {
  const { colors } = useTheme();

  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.disabled]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.leftContent}>
          {icon && (
            <Ionicons
              // @ts-expect-error - Ionicons type issue
              name={icon}
              size={20}
              color={disabled ? colors.text.disabled : colors.text.secondary}
              style={styles.icon}
            />
          )}
          <View style={styles.textContainer}>
            <Text style={[styles.label, { color: colors.text.primary }]}>
              {label}
            </Text>
            {description && (
              <Text
                style={[styles.description, { color: colors.text.secondary }]}
              >
                {description}
              </Text>
            )}
          </View>
        </View>

        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{
            false: colors.surface,
            true: colors.primary + '40',
          }}
          thumbColor={value ? colors.primary : colors.text.disabled}
          ios_backgroundColor={colors.surface}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    lineHeight: 18,
  },
  disabled: {
    opacity: 0.5,
  },
});
