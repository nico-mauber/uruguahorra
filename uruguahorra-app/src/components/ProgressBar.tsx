import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import { useTheme } from '@theme';

interface ProgressBarProps {
  progress: number; // 0 to 100
  height?: number;
  showLabel?: boolean;
  color?: string;
  backgroundColor?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 8,
  showLabel = false,
  color,
  backgroundColor,
}) => {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: Math.min(100, Math.max(0, progress)),
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress, animatedValue]);

  const widthPercentage = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {showLabel && (
        <Text style={[styles.label, { color: colors.text.secondary }]}>
          {Math.round(progress)}%
        </Text>
      )}
      <View
        style={[
          styles.progressBackground,
          {
            height,
            backgroundColor: backgroundColor || colors.border.primary,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: widthPercentage,
              backgroundColor: color || colors.primary,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  progressBackground: {
    width: '100%',
    borderRadius: 100,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 100,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'right',
  },
});
