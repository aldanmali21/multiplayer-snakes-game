/**
 * All colours live here. The screens and the board only read from a Theme, so
 * changing the look of the game means adding or editing one object below.
 */
export type SnakeColors = { head: string; body: string; glow: string };

export type Theme = {
  name: string;
  background: [string, string];
  boardBackground: string;
  boardAlt: string;
  wall: string;
  fruit: string;
  fruitLeaf: string;
  text: string;
  textDim: string;
  accent: string;
  accentText: string;
  card: string;
  cardBorder: string;
  danger: string;
  snakes: [SnakeColors, SnakeColors, SnakeColors, SnakeColors];
};

export const neonNight: Theme = {
  name: 'Neon Night',
  background: ['#0B0F1A', '#151B33'],
  boardBackground: '#0F1426',
  boardAlt: '#121830',
  wall: '#3B82F6',
  fruit: '#FF4D6D',
  fruitLeaf: '#4ADE80',
  text: '#F8FAFC',
  textDim: '#94A3B8',
  accent: '#22D3EE',
  accentText: '#06202A',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.12)',
  danger: '#F87171',
  snakes: [
    { head: '#34D399', body: '#10B981', glow: '#34D399' },
    { head: '#FBBF24', body: '#F59E0B', glow: '#FBBF24' },
    { head: '#A78BFA', body: '#8B5CF6', glow: '#A78BFA' },
    { head: '#F472B6', body: '#EC4899', glow: '#F472B6' },
  ],
};

export const themes: Record<string, Theme> = { neonNight };
export const defaultTheme = neonNight;
