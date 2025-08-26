import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QuickTransactionModal } from './QuickTransactionModal';
import { useTheme } from '@theme';
import {
  spacing,
  touchTargets,
  elevation,
  layout,
  animations,
  opacity,
} from '@theme';

interface PsychologicalFABProps {
  userId: string;
  onTransactionCreated?: (transaction: any) => void;
}

/**
 * PsychologicalFAB - Psychologically Optimized Floating Action Button
 *
 * Based on UX-DESIGN-SYSTEM-PROMPT principles:
 * 1. Thumb-friendly positioning (bottom right, 16px margin)
 * 2. 3-Tap Rule implementation
 * 3. Loss Aversion colors (expense = red, savings = green)
 * 4. Micro-interactions for dopamine triggers
 * 5. Progressive disclosure for complex actions
 */
export const PsychologicalFAB: React.FC<PsychologicalFABProps> = ({
  userId,
  onTransactionCreated,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState<'expense' | 'income' | null>(
    null
  );

  const { colors, getExpenseColor, getSavingsColor } = useTheme();

  // Psychological Animation Values
  const mainButtonScale = useRef(new Animated.Value(1)).current;
  const mainButtonRotation = useRef(new Animated.Value(0)).current;
  const expansionValue = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;

  // Micro-interaction: Button press feedback (dopamine trigger)
  const handleMainPress = () => {
    // Immediate tactile feedback
    Animated.sequence([
      Animated.timing(mainButtonScale, {
        toValue: 0.9,
        duration: animations.fast, // 100ms
        useNativeDriver: true,
      }),
      Animated.timing(mainButtonScale, {
        toValue: 1,
        duration: animations.fast,
        useNativeDriver: true,
      }),
    ]).start();

    // Toggle expansion
    if (isExpanded) {
      collapseMenu();
    } else {
      expandMenu();
    }
  };

  // Expand animation (delight)
  const expandMenu = () => {
    setIsExpanded(true);

    Animated.parallel([
      // Rotate main button (visual feedback)
      Animated.timing(mainButtonRotation, {
        toValue: 1,
        duration: animations.normal, // 250ms
        useNativeDriver: true,
      }),
      // Expand sub-buttons (staggered reveal)
      Animated.timing(expansionValue, {
        toValue: 1,
        duration: animations.normal,
        useNativeDriver: true,
      }),
      // Background overlay (focus)
      Animated.timing(backgroundOpacity, {
        toValue: 0.3,
        duration: animations.normal,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Collapse animation (clean exit)
  const collapseMenu = () => {
    Animated.parallel([
      Animated.timing(mainButtonRotation, {
        toValue: 0,
        duration: animations.normal,
        useNativeDriver: true,
      }),
      Animated.timing(expansionValue, {
        toValue: 0,
        duration: animations.normal,
        useNativeDriver: true,
      }),
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: animations.normal,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsExpanded(false);
    });
  };

  // Handle expense selection (Loss Aversion psychology)
  const handleExpensePress = () => {
    setSelectedType('expense');
    setShowModal(true);
    collapseMenu();
  };

  // Handle savings selection (Positive Reinforcement psychology)
  const handleSavingsPress = () => {
    setSelectedType('income');
    setShowModal(true);
    collapseMenu();
  };

  // Close modal handler
  const handleModalClose = () => {
    setShowModal(false);
    setSelectedType(null);
  };

  // Transaction creation success (dopamine trigger)
  const handleTransactionCreated = (transaction: any) => {
    handleModalClose();

    // Success animation
    Animated.sequence([
      Animated.timing(mainButtonScale, {
        toValue: 1.2,
        duration: animations.normal,
        useNativeDriver: true,
      }),
      Animated.timing(mainButtonScale, {
        toValue: 1,
        duration: animations.normal,
        useNativeDriver: true,
      }),
    ]).start();

    if (onTransactionCreated) {
      onTransactionCreated(transaction);
    }
  };

  // Animated styles
  const mainButtonAnimatedStyle = {
    transform: [
      { scale: mainButtonScale },
      {
        rotate: mainButtonRotation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '45deg'],
        }),
      },
    ],
  };

  const expansionStyle = {
    transform: [
      {
        scale: expansionValue,
      },
      {
        translateY: expansionValue.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
    ],
    opacity: expansionValue,
  };

  return (
    <>
      {/* Background Overlay (focus attention) */}
      {isExpanded && (
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: backgroundOpacity,
            },
          ]}
          pointerEvents={isExpanded ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={collapseMenu}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      {/* FAB Container */}
      <View style={styles.container}>
        {/* Expense Button (Loss Aversion - Red) */}
        {isExpanded && (
          <Animated.View style={[styles.subButton, expansionStyle]}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: getExpenseColor(),
                  ...elevation.lg,
                },
              ]}
              onPress={handleExpensePress}
              activeOpacity={opacity.pressed}
            >
              <Ionicons
                name="remove-circle"
                size={24}
                color={colors.text.inverse}
              />
            </TouchableOpacity>
            <Text
              style={[styles.subButtonLabel, { color: colors.text.primary }]}
            >
              Gasto
            </Text>
          </Animated.View>
        )}

        {/* Savings Button (Positive Reinforcement - Green) */}
        {isExpanded && (
          <Animated.View
            style={[
              styles.subButton,
              expansionStyle,
              { marginBottom: spacing.md },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: getSavingsColor(),
                  ...elevation.lg,
                },
              ]}
              onPress={handleSavingsPress}
              activeOpacity={opacity.pressed}
            >
              <Ionicons
                name="add-circle"
                size={24}
                color={colors.text.inverse}
              />
            </TouchableOpacity>
            <Text
              style={[styles.subButtonLabel, { color: colors.text.primary }]}
            >
              Ahorro
            </Text>
          </Animated.View>
        )}

        {/* Main FAB Button */}
        <Animated.View style={mainButtonAnimatedStyle}>
          <TouchableOpacity
            style={[
              styles.mainButton,
              {
                backgroundColor: colors.primary,
                ...elevation.xl,
              },
            ]}
            onPress={handleMainPress}
            activeOpacity={opacity.pressed}
          >
            <Ionicons
              name={isExpanded ? 'close' : 'add'}
              size={32}
              color={colors.text.inverse}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Quick Transaction Modal */}
      <QuickTransactionModal
        visible={showModal}
        onClose={handleModalClose}
        onTransactionCreated={handleTransactionCreated}
        userId={userId}
        initialType={selectedType}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 999,
  },

  container: {
    ...layout.fab, // bottom: 16px, right: 16px, etc.
    alignItems: 'center',
    zIndex: 1000,
  },

  mainButton: {
    width: touchTargets.fab, // 64px
    height: touchTargets.fab,
    borderRadius: touchTargets.fab / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  subButton: {
    alignItems: 'center',
    marginBottom: spacing.lg, // 16px spacing between buttons
  },

  actionButton: {
    width: touchTargets.critical, // 56px
    height: touchTargets.critical,
    borderRadius: touchTargets.critical / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  subButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.xs, // 4px
    textAlign: 'center',
  },
});

export default PsychologicalFAB;
