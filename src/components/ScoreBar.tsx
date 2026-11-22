import React from 'react';
import { Text, View } from 'react-native';
import type { MatchState } from '../game/rules';
import type { Theme } from '../theme/theme';

export function ScoreBar({ state, theme, myId, vertical }: { state: MatchState; theme: Theme; myId?: string; vertical?: boolean }) {
  return (
    <View style={vertical ? { gap: 8 } : { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
      {state.snakes.map((s, i) => {
        const color = theme.snakes[i % theme.snakes.length].head;
        const pct = Math.min(1, s.score / state.config.targetScore);
        return (
          <View
            key={s.id}
            style={{
              minWidth: 78, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
              backgroundColor: theme.card, borderWidth: 1, borderColor: s.id === myId ? color : theme.cardBorder,
              opacity: s.alive ? 1 : 0.45,
            }}
          >
            <Text numberOfLines={1} style={{ color, fontWeight: '700', fontSize: 12, maxWidth: 96 }}>
              {s.name}{s.id === myId ? ' (you)' : ''}{s.alive ? '' : ' ✕'}
            </Text>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
              {s.score}<Text style={{ color: theme.textDim, fontSize: 12 }}> / {state.config.targetScore}</Text>
            </Text>
            <View style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 2 }}>
              <View style={{ height: 3, borderRadius: 2, width: `${pct * 100}%`, backgroundColor: color }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}
