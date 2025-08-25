import React from 'react';
import { View, Text } from 'react-native';
import { useSquadGamification } from '@/hooks/useSquadGamification';
import { useTheme } from '@/theme';

interface XpIndicatorProps {
  baseXp: number;
  showBonus?: boolean;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Componente que muestra XP con indicador de bonus de squad
 */
export const XpIndicator: React.FC<XpIndicatorProps> = ({
  baseXp,
  showBonus = true,
  size = 'medium',
}) => {
  const { hasSquadBonus, getXpMultiplier } = useSquadGamification();
  const { theme } = useTheme();

  const multiplier = getXpMultiplier();
  const totalXp = Math.round(baseXp * multiplier);
  const bonusXp = totalXp - baseXp;

  const sizeStyles = {
    small: {
      container: { gap: 2 },
      baseText: { fontSize: 12, fontWeight: '500' as const },
      bonusText: { fontSize: 10, fontWeight: '400' as const },
      badgeText: { fontSize: 8, fontWeight: '600' as const },
    },
    medium: {
      container: { gap: 4 },
      baseText: { fontSize: 14, fontWeight: '600' as const },
      bonusText: { fontSize: 12, fontWeight: '500' as const },
      badgeText: { fontSize: 10, fontWeight: '700' as const },
    },
    large: {
      container: { gap: 6 },
      baseText: { fontSize: 18, fontWeight: '700' as const },
      bonusText: { fontSize: 14, fontWeight: '600' as const },
      badgeText: { fontSize: 12, fontWeight: '800' as const },
    },
  };

  const styles = sizeStyles[size];

  return (
    <View
      style={[{ flexDirection: 'row', alignItems: 'center' }, styles.container]}
    >
      <Text style={[{ color: theme.primary }, styles.baseText]}>
        {totalXp} XP
      </Text>

      {showBonus && hasSquadBonus && bonusXp > 0 && (
        <>
          <View
            style={{
              backgroundColor: theme.success,
              paddingHorizontal: 4,
              paddingVertical: 2,
              borderRadius: 8,
            }}
          >
            <Text style={[{ color: 'white' }, styles.badgeText]}>
              +{bonusXp}
            </Text>
          </View>

          <Text style={[{ color: theme.success }, styles.bonusText]}>
            Squad Bonus
          </Text>
        </>
      )}
    </View>
  );
};

export default XpIndicator;
