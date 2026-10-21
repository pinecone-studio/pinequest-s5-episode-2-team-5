export const APP_NAME = 'ChemQuest';

export const Colors = {
  night: '#120C33',
  indigo900: '#1A1350',
  indigo800: '#241B66',
  indigo700: '#30258A',
  indigo600: '#4334B5',
  panel: '#221A5E',
  panelRaised: '#2B2275',
  border: '#3D3296',
  input: '#170F45',
  text: '#FFFFFF',
  textMuted: '#BDB6EA',
  textDim: '#8B84C4',
  lime: '#B5F23D',
  limeDark: '#6FA312',
  limeInk: '#1F3300',
  cyan: '#3DE0F5',
  cyanDark: '#0A9DB8',
  gold: '#FFC93C',
  goldDark: '#D98E04',
  goldInk: '#4A2C00',
  silver: '#D5DCEB',
  bronze: '#E59A62',
  danger: '#FF6B81',
  dangerDark: '#C92A4A',
  success: '#4ADE80',
  successDark: '#16A34A',
  locked: '#3A3470',
  lockedDark: '#2A2556',
  overlay: 'rgba(10, 6, 30, 0.72)',
} as const;

export const Fonts = {
  regular: 'Fredoka_400Regular',
  medium: 'Fredoka_500Medium',
  semibold: 'Fredoka_600SemiBold',
  bold: 'Fredoka_700Bold',
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** XP needed per level. Level 1 starts at 0 XP. */
export const XP_PER_LEVEL = 250;
