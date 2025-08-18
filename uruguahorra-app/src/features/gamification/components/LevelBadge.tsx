import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getLevelColor, getLevelTier } from '../utils/constants';

interface LevelBadgeProps {
  level: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  style?: any;
}

const SIZES = {
  small: {
    container: 40,
    fontSize: 12,
    iconSize: 16,
    labelFontSize: 10,
  },
  medium: {
    container: 60,
    fontSize: 16,
    iconSize: 24,
    labelFontSize: 12,
  },
  large: {
    container: 80,
    fontSize: 20,
    iconSize: 32,
    labelFontSize: 14,
  },
};

const TIER_ICONS = {
  bronze: 'medal-outline' as const,
  silver: 'ribbon-outline' as const,
  gold: 'trophy-outline' as const,
  diamond: 'diamond-outline' as const,
};

export const LevelBadge: React.FC<LevelBadgeProps> = ({
  level,
  size = 'medium',
  showLabel = false,
  style,
}) => {
  const tier = getLevelTier(level);
  const color = getLevelColor(level);
  const sizeConfig = SIZES[size];
  const icon = TIER_ICONS[tier];

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.badge,
          {
            width: sizeConfig.container,
            height: sizeConfig.container,
            backgroundColor: `${color}20`, // 20% opacity background
            borderColor: color,
          },
        ]}
      >
        <Ionicons 
          name={icon} 
          size={sizeConfig.iconSize} 
          color={color} 
          style={styles.icon}
        />
        <Text
          style={[
            styles.levelText,
            {
              fontSize: sizeConfig.fontSize,
              color: color,
            },
          ]}
        >
          {level}
        </Text>
      </View>
      
      {showLabel && (
        <Text
          style={[
            styles.label,
            {
              fontSize: sizeConfig.labelFontSize,
            },
          ]}
        >
          Nivel {level}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  badge: {
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    position: 'relative',
  },
  icon: {
    position: 'absolute',
    top: 4,
  },
  levelText: {
    fontWeight: 'bold',
    marginTop: 2,
  },
  label: {
    marginTop: 4,
    color: '#666',
    textAlign: 'center',
  },
});

export default LevelBadge;