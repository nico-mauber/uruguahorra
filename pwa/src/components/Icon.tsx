/**
 * Icon — subset SVG inline (CSP-safe, sin CDN). Equivale a los Ionicons del blueprint.
 * Fuente: docs/design-system §4 (TabBar/FAB usan iconos; nombres equivalentes).
 */

export type IconName =
  | 'home'
  | 'flag'
  | 'trophy'
  | 'analytics'
  | 'person'
  | 'add'
  | 'close'
  | 'receipt'
  | 'chevron-forward'
  | 'arrow-forward'
  | 'arrow-back'
  | 'warning'
  | 'people'
  | 'diamond'
  | 'notifications'
  | 'shield'
  | 'wallet'
  | 'chevron-up'
  | 'chevron-down';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  'aria-hidden'?: boolean;
}

// Paths minimalistas (stroke, 24x24, currentColor).
const PATHS: Record<IconName, string> = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  trophy: 'M8 4h8v4a4 4 0 0 1-8 0V4zM6 4H4v2a3 3 0 0 0 3 3M18 4h2v2a3 3 0 0 1-3 3M9 14v3h6v-3M8 21h8',
  analytics: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  add: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  receipt: 'M6 2h12v20l-3-2-3 2-3-2-3 2V2zM9 7h6M9 11h6M9 15h4',
  'chevron-forward': 'M9 6l6 6-6 6',
  'arrow-forward': 'M5 12h14M13 6l6 6-6 6',
  'arrow-back': 'M19 12H5M11 6l-6 6 6 6',
  warning: 'M12 3l10 18H2L12 3zM12 10v5M12 18h.01',
  people: 'M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM1 21a8 8 0 0 1 16 0M17 4a4 4 0 0 1 0 8M23 21a8 8 0 0 0-5-7',
  diamond: 'M6 3h12l4 6-10 12L2 9l4-6zM2 9h20M12 3l-4 6 4 12 4-12-4-6',
  notifications: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  wallet: 'M3 7h18v12H3V7zM3 7l2-4h12l2 4M16 13h.01',
  'chevron-up': 'M6 15l6-6 6 6',
  'chevron-down': 'M6 9l6 6 6-6',
};

export function Icon({
  name,
  size = 24,
  color = 'currentColor',
  ...rest
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={rest['aria-hidden'] ?? true}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
