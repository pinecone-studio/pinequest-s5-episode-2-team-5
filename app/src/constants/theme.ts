export const colors = {
  bg: '#0f1b2d',
  panel: '#1a2b45',
  panelLight: '#243a5c',
  text: '#f2f6fc',
  muted: '#8fa3c0',
  accent: '#4ade80',
  warn: '#fbbf24',
  danger: '#f87171',
  floor: '#2b4a3a',
  floorAlt: '#2f5241',
  roof: '#5b3a29',
};

export const avatarColors = ['#f87171', '#60a5fa', '#fbbf24', '#a78bfa', '#34d399', '#f472b6', '#fb923c'];

export const XP_PER_LEVEL = 100;

export const levelOf = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1;
