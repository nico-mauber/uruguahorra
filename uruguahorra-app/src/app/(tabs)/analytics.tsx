import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AnalyticsDashboard } from '@components';
import { useTheme } from '@theme';

export default function AnalyticsScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AnalyticsDashboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
