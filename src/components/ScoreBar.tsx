import React from 'react';
import { View } from 'react-native';
import type { MatchState } from '../game/rules';
import type { Theme } from '../theme/theme';
import { Text } from './ui';

type Props = {
  state: MatchState;
  theme: Theme;
  myId?: string;
  /** Which players to show (by join order). Defaults to all. */
  only?: number[];
  vertical?: boolean;
};

/** Frosted-glass score chips with each snake's colour on top. */
export function ScoreBar({ state, theme, myId, only, vertical }: Props) {
  const idx = only ?? state.snakes.map((_, i) => i);
  return (
    <View style={vertical ? { gap: 10 } : { flexDirection: 'row', gap: 8 }}>
      {idx.filter((i) => state.snakes[i]).map((i) => {
        const s = state.snakes[i];
        const color = theme.snakes[s.species % theme.snakes.length].head;
        const pct = Math.min(1, s.score / state.config.targetScore);
        return (
          <View
            key={s.id}
            style={{
              flex: vertical ? undefined : 1, minWidth: 64, paddingTop: 10, paddingBottom: 12, paddingHorizontal: 6, borderRadius: 14,
              backgroundColor: theme.card, borderWidth: 1, borderColor: s.id === myId ? color : theme.cardBorder,
              overflow: 'hidden', alignItems: 'center', opacity: s.alive ? 1 : 0.4,
            }}
          >
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: color }} />
            <Text style={{ color, fontSize: 30, fontWeight: '600', lineHeight: 34, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 }}>{s.score}</Text>
            <Text numberOfLines={1} style={{ color: theme.text, fontSize: 12, opacity: 0.85 }}>
              {s.id === myId ? 'You' : s.name}{s.alive ? '' : ' ✕'}
            </Text>
            <View style={{ position: 'absolute', left: 0, bottom: 0, height: 3, width: `${pct * 100}%`, backgroundColor: color }} />
          </View>
        );
      })}
    </View>
  );
}
