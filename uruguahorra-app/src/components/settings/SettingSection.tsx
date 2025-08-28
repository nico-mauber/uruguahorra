import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@components';
import { useTheme } from '@theme';

interface SettingSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: string;
}

export const SettingSection: React.FC<SettingSectionProps> = ({
  title,
  subtitle,
  children,
  icon,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          {icon} {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            {subtitle}
          </Text>
        )}
      </View>

      <Card style={styles.content}>{children}</Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    padding: 16,
  },
});
