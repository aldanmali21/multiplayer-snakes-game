/**
 * All colours and fonts live here. Screens only read from a Theme.
 */
export type SnakeColors = { head: string; body: string; glow: string };

export type Theme = {
  name: string;
  /** How the board is drawn: the realistic lawn or simple flat tiles. */
  board: 'garden' | 'flat';
  /** Behind every screen: the garden hedge or a plain gradient. */
  backdrop: 'hedge' | 'gradient';
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
  primary: [string, string];
  primaryText: string;
  card: string;
  cardBorder: string;
  danger: string;
  /** Font family per weight, or null for the system font. */
  fonts: { regular: string; medium: string; bold: string } | null;
  /** One entry per snake species (8). */
  snakes: SnakeColors[];
};

/** Approved look: realistic lawn, four real snake species, hedge background. */
export const gardenParty: Theme = {
  name: 'Garden Party',
  board: 'garden',
  backdrop: 'hedge',
  background: ['#1f3d17', '#10230c'],
  boardBackground: '#4d8a2b',
  boardAlt: '#4a8428',
  wall: '#6b4423',
  fruit: '#e2262d',
  fruitLeaf: '#4ade80',
  text: '#f1f6e6',
  textDim: 'rgba(241,246,230,0.75)',
  accent: '#ffd27a',
  accentText: '#2a1a05',
  primary: ['#e64a35', '#a92617'],
  primaryText: '#ffffff',
  card: 'rgba(255,255,255,0.12)',
  cardBorder: 'rgba(255,255,255,0.22)',
  danger: '#ff8a80',
  fonts: { regular: 'Fredoka_400Regular', medium: 'Fredoka_500Medium', bold: 'Fredoka_600SemiBold' },
  snakes: [
    { head: '#5cd04f', body: '#3fa83a', glow: '#3fa83a' }, // green python
    { head: '#f59a5c', body: '#ec7a35', glow: '#ec7a35' }, // corn snake
    { head: '#6b9cf0', body: '#3d7be0', glow: '#3d7be0' }, // blue racer
    { head: '#ef5a62', body: '#d9333c', glow: '#d9333c' }, // milk snake
    { head: '#d7b07c', body: '#b58d5c', glow: '#b58d5c' }, // rattlesnake
    { head: '#f6eed8', body: '#e6d6ad', glow: '#f1e7cf' }, // albino python
    { head: '#a3a9ae', body: '#61666b', glow: '#61666b' }, // black mamba
    { head: '#f2d35b', body: '#2f3d2a', glow: '#f2d35b' }, // garter snake
  ],
};

export const neonNight: Theme = {
  name: 'Neon Night',
  board: 'flat',
  backdrop: 'gradient',
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
  primary: ['#22D3EE', '#0EA5C6'],
  primaryText: '#06202A',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.12)',
  danger: '#F87171',
  fonts: null,
  snakes: [
    { head: '#34D399', body: '#10B981', glow: '#34D399' },
    { head: '#FBBF24', body: '#F59E0B', glow: '#FBBF24' },
    { head: '#A78BFA', body: '#8B5CF6', glow: '#A78BFA' },
    { head: '#F472B6', body: '#EC4899', glow: '#F472B6' },
    { head: '#FB923C', body: '#F97316', glow: '#FB923C' },
    { head: '#E2E8F0', body: '#CBD5E1', glow: '#E2E8F0' },
    { head: '#60A5FA', body: '#3B82F6', glow: '#60A5FA' },
    { head: '#FDE047', body: '#EAB308', glow: '#FDE047' },
  ],
};

export const themes: Record<string, Theme> = { gardenParty, neonNight };
export const defaultTheme = gardenParty;
