/**
 * Spacing & Dimensions System
 * Based on touch-friendly design and psychological principles
 */

// Base spacing unit (8px system)
const BASE_UNIT = 8;

// Spacing Scale (Consistent visual rhythm)
export const spacing = {
  none: 0,
  xs: BASE_UNIT * 0.5, // 4px
  sm: BASE_UNIT * 1, // 8px
  md: BASE_UNIT * 1.5, // 12px
  lg: BASE_UNIT * 2, // 16px
  xl: BASE_UNIT * 3, // 24px
  '2xl': BASE_UNIT * 4, // 32px
  '3xl': BASE_UNIT * 6, // 48px
  '4xl': BASE_UNIT * 8, // 64px
  '5xl': BASE_UNIT * 12, // 96px
};

// Touch Targets (Based on UX guidelines)
export const touchTargets = {
  // Minimum viable (Apple HIG)
  minimum: 44,
  // Preferred (Material Design)
  preferred: 48,
  // Critical actions (Easy thumb reach)
  critical: 56,
  // FAB size
  fab: 64,
};

// Border Radius (Psychological softness)
export const borderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12, // Default for cards/buttons
  xl: 16, // Cards
  '2xl': 24,
  '3xl': 32,
  full: 9999, // Perfect circles
};

// Elevation/Shadow (Depth perception)
export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Screen dimensions and safe areas
export const dimensions = {
  // Standard margins
  screenMargin: spacing.lg, // 16px
  // Card spacing between items
  cardSpacing: spacing.md, // 12px
  // Section spacing
  sectionSpacing: spacing.xl, // 24px
  // Bottom safe area for FAB
  fabBottom: spacing.lg, // 16px
  // Header height
  headerHeight: 56,
  // Tab bar height
  tabHeight: 64,
};

// Layout presets
export const layout = {
  // Container with standard margins
  container: {
    paddingHorizontal: dimensions.screenMargin,
  },
  // Card container
  card: {
    margin: dimensions.cardSpacing,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  // Button layout
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    minHeight: touchTargets.preferred,
  },
  // Input field
  input: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    minHeight: touchTargets.preferred,
  },
  // FAB positioning
  fab: {
    position: 'absolute' as const,
    bottom: dimensions.fabBottom,
    right: dimensions.screenMargin,
    width: touchTargets.fab,
    height: touchTargets.fab,
    borderRadius: touchTargets.fab / 2,
  },
  // Modal layout
  modal: {
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
  },
};

// Animation durations (Performance targets)
export const animations = {
  // Micro-interactions
  fast: 100, // Button taps, toggles
  // Standard transitions
  normal: 250, // Screen transitions, modal open/close
  // Slow animations (attention-grabbing)
  slow: 500, // Success celebrations, progress updates
  // Very slow (background processes)
  verySlow: 800, // Confetti, achievement animations
};

// Animation easing curves
export const easing = {
  // Standard ease for most transitions
  standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  // Accelerate (out of screen)
  accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
  // Decelerate (into screen)
  decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  // Sharp (immediate attention)
  sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
  // Bounce (success feedback)
  bounce: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
};

// Opacity levels
export const opacity = {
  // Disabled states
  disabled: 0.4,
  // Secondary content
  secondary: 0.6,
  // Inactive states
  inactive: 0.7,
  // Hover states
  hover: 0.8,
  // Pressed states
  pressed: 0.9,
  // Full opacity
  full: 1.0,
};

// Z-index scale (Layering)
export const zIndex = {
  // Hidden content
  hide: -1,
  // Base content
  base: 0,
  // Slightly elevated (cards)
  elevated: 1,
  // Sticky elements
  sticky: 10,
  // Fixed elements (headers)
  fixed: 100,
  // Overlays (modals)
  overlay: 1000,
  // Tooltips
  tooltip: 1010,
  // Alerts/notifications
  alert: 1020,
  // Maximum (system overlays)
  max: 9999,
};

export type SpacingKey = keyof typeof spacing;
export type ElevationKey = keyof typeof elevation;
export type AnimationDuration = keyof typeof animations;
