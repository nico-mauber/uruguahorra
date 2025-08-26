import React, { createContext, useContext, ReactNode, useState } from 'react';
import { useColorScheme } from 'react-native';
import { colors } from './colors';

type ThemeColors = typeof colors.light;
type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  // Convenience methods for psychological color usage
  getExpenseColor: () => string;
  getSavingsColor: () => string;
  getContextualBackground: (type: 'expense' | 'savings' | 'neutral') => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  const toggleTheme = () => {
    setThemeMode((current) => {
      switch (current) {
        case 'light':
          return 'dark';
        case 'dark':
          return 'system';
        case 'system':
          return 'light';
        default:
          return 'light';
      }
    });
  };

  const isDark =
    themeMode === 'dark' ||
    (themeMode === 'system' && systemColorScheme === 'dark');

  const themeColors = isDark ? colors.dark : colors.light;

  // Convenience methods for psychological color usage
  const getExpenseColor = () =>
    isDark ? colors.dark.expense.primary : colors.light.expense.primary;

  const getSavingsColor = () =>
    isDark ? colors.dark.savings.primary : colors.light.savings.primary;

  const getContextualBackground = (type: 'expense' | 'savings' | 'neutral') => {
    if (isDark) {
      switch (type) {
        case 'expense':
          return colors.dark.expense.background;
        case 'savings':
          return colors.dark.savings.background;
        default:
          return colors.dark.neutral.light;
      }
    } else {
      switch (type) {
        case 'expense':
          return colors.light.expense.background;
        case 'savings':
          return colors.light.savings.background;
        default:
          return colors.light.neutral.light;
      }
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        colors: themeColors,
        isDark,
        themeMode,
        toggleTheme,
        setThemeMode,
        getExpenseColor,
        getSavingsColor,
        getContextualBackground,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
