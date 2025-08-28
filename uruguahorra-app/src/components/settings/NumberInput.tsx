import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';

interface NumberInputProps {
  label: string;
  value: number;
  onChangeValue: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  step?: number;
  disabled?: boolean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChangeValue,
  min = 1,
  max = 999,
  suffix = '',
  step = 1,
  disabled = false,
}) => {
  const { colors } = useTheme();
  const [inputValue, setInputValue] = useState(value.toString());

  const handleTextChange = (text: string) => {
    setInputValue(text);

    const numValue = parseInt(text);
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      onChangeValue(numValue);
    }
  };

  const handleBlur = () => {
    // Restore to current valid value if input is invalid
    const numValue = parseInt(inputValue);
    if (isNaN(numValue) || numValue < min || numValue > max) {
      setInputValue(value.toString());
    }
  };

  const increment = () => {
    if (!disabled && value < max) {
      const newValue = Math.min(value + step, max);
      setInputValue(newValue.toString());
      onChangeValue(newValue);
    }
  };

  const decrement = () => {
    if (!disabled && value > min) {
      const newValue = Math.max(value - step, min);
      setInputValue(newValue.toString());
      onChangeValue(newValue);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text.primary }]}>
        {label}
      </Text>

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border.primary,
            },
            disabled && styles.disabled,
          ]}
          onPress={decrement}
          disabled={disabled || value <= min}
        >
          <Ionicons
            name="remove"
            size={20}
            color={
              disabled || value <= min
                ? colors.text.disabled
                : colors.text.secondary
            }
          />
        </TouchableOpacity>

        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text.primary,
                backgroundColor: colors.surface,
                borderColor: colors.border.primary,
              },
              disabled && styles.disabled,
            ]}
            value={inputValue}
            onChangeText={handleTextChange}
            onBlur={handleBlur}
            keyboardType="numeric"
            editable={!disabled}
            selectTextOnFocus
          />
          {suffix && (
            <Text style={[styles.suffix, { color: colors.text.secondary }]}>
              {suffix}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border.primary,
            },
            disabled && styles.disabled,
          ]}
          onPress={increment}
          disabled={disabled || value >= max}
        >
          <Ionicons
            name="add"
            size={20}
            color={
              disabled || value >= max
                ? colors.text.disabled
                : colors.text.secondary
            }
          />
        </TouchableOpacity>
      </View>

      <Text style={[styles.range, { color: colors.text.disabled }]}>
        Rango: {min} - {max} {suffix}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  suffix: {
    position: 'absolute',
    right: 12,
    fontSize: 14,
    pointerEvents: 'none',
  },
  range: {
    fontSize: 12,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
