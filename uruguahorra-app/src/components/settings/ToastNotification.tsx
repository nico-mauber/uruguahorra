import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';

const { width } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  visible: boolean;
  message: string;
  type: ToastType;
  duration?: number;
  onHide: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const ToastNotification: React.FC<ToastProps> = ({
  visible,
  message,
  type,
  duration = 4000,
  onHide,
  action,
}) => {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout>();

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: colors.success + 'E6',
          borderColor: colors.success,
          textColor: colors.surface,
          icon: 'checkmark-circle' as const,
          iconColor: colors.surface,
        };
      case 'error':
        return {
          backgroundColor: colors.error + 'E6',
          borderColor: colors.error,
          textColor: colors.surface,
          icon: 'close-circle' as const,
          iconColor: colors.surface,
        };
      case 'warning':
        return {
          backgroundColor: colors.warning + 'E6',
          borderColor: colors.warning,
          textColor: colors.text.primary,
          icon: 'warning' as const,
          iconColor: colors.text.primary,
        };
      case 'info':
        return {
          backgroundColor: colors.info + 'E6',
          borderColor: colors.info,
          textColor: colors.surface,
          icon: 'information-circle' as const,
          iconColor: colors.surface,
        };
    }
  };

  const config = getToastConfig();

  const show = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    if (duration > 0) {
      timeoutRef.current = setTimeout(() => {
        hide();
      }, duration);
    }
  };

  const hide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: -100,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  useEffect(() => {
    if (visible) {
      show();
    } else {
      hide();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: config.backgroundColor,
            borderColor: config.borderColor,
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <View style={styles.content}>
          <View style={styles.leftContent}>
            <Ionicons
              name={config.icon}
              size={20}
              color={config.iconColor}
              style={styles.icon}
            />
            <Text
              style={[
                styles.message,
                { color: config.textColor },
              ]}
              numberOfLines={2}
            >
              {message}
            </Text>
          </View>

          <View style={styles.rightContent}>
            {action && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { borderColor: config.textColor + '40' },
                ]}
                onPress={action.onPress}
              >
                <Text
                  style={[
                    styles.actionText,
                    { color: config.textColor },
                  ]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={hide}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={18}
                color={config.iconColor}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60, // Below status bar
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 2,
  },
});