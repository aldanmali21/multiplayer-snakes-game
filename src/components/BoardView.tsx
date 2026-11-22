import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import type { Dir, MatchState } from '../game/rules';
import type { Theme } from '../theme/theme';

type Props = { state: MatchState; theme: Theme; size: number; myId?: string };

const Grid = memo(function Grid({ w, h, cell, a, b }: { w: number; h: number; cell: number; a: string; b: string }) {
  const cells = useMemo(() => {
    const out: React.ReactElement[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        out.push(
          <View
            key={`${x},${y}`}
            style={{ position: 'absolute', left: x * cell, top: y * cell, width: cell, height: cell, backgroundColor: (x + y) % 2 ? a : b }}
          />,
        );
      }
    }
    return out;
  }, [w, h, cell, a, b]);
  return <>{cells}</>;
});

const EYES: Record<Dir, [number, number][]> = {
  up: [[0.3, 0.3], [0.7, 0.3]],
  down: [[0.3, 0.7], [0.7, 0.7]],
  left: [[0.3, 0.3], [0.3, 0.7]],
  right: [[0.7, 0.3], [0.7, 0.7]],
};

export function BoardView({ state, theme, size, myId }: Props) {
  const { width, height } = state.config;
  const cell = size / width;
  const gap = Math.max(1, cell * 0.08);
  const border = 4;

  return (
    <View
      style={{
        width: size + border * 2,
        height: cell * height + border * 2,
        borderRadius: 14,
        borderWidth: border,
        borderColor: theme.wall,
        overflow: 'hidden',
        backgroundColor: theme.boardBackground,
        shadowColor: theme.wall,
        shadowOpacity: 0.6,
        shadowRadius: 14,
        elevation: 12,
      }}
    >
      <Grid w={width} h={height} cell={cell} a={theme.boardAlt} b={theme.boardBackground} />

      {state.fruits.map((f) => (
        <View key={`f${f.x},${f.y}`} style={{ position: 'absolute', left: f.x * cell, top: f.y * cell, width: cell, height: cell }}>
          <View
            style={{
              position: 'absolute', left: cell * 0.12, top: cell * 0.2, width: cell * 0.76, height: cell * 0.76,
              borderRadius: cell, backgroundColor: theme.fruit, shadowColor: theme.fruit, shadowOpacity: 1, shadowRadius: 6, elevation: 6,
            }}
          />
          <View
            style={{
              position: 'absolute', left: cell * 0.5, top: cell * 0.02, width: cell * 0.3, height: cell * 0.2,
              borderRadius: cell, backgroundColor: theme.fruitLeaf, transform: [{ rotate: '-25deg' }],
            }}
          />
        </View>
      ))}

      {state.snakes.map((s, i) => {
        const colors = theme.snakes[i % theme.snakes.length];
        return s.body.map((c, idx) => {
          const isHead = idx === 0;
          const inset = isHead ? gap * 0.4 : gap;
          return (
            <View
              key={`${s.id}${idx}`}
              style={{
                position: 'absolute', left: c.x * cell + inset, top: c.y * cell + inset,
                width: cell - inset * 2, height: cell - inset * 2,
                borderRadius: isHead ? cell * 0.4 : cell * 0.3,
                backgroundColor: isHead ? colors.head : colors.body,
                opacity: isHead ? 1 : Math.max(0.55, 1 - idx * 0.015),
                ...(isHead ? { shadowColor: colors.glow, shadowOpacity: 0.9, shadowRadius: 8, elevation: 8 } : null),
                borderWidth: isHead && s.id === myId ? 1.5 : 0,
                borderColor: '#fff',
              }}
            >
              {isHead &&
                EYES[s.dir].map(([ex, ey], n) => (
                  <View
                    key={n}
                    style={{
                      position: 'absolute', left: ex * (cell - inset * 2) - cell * 0.09, top: ey * (cell - inset * 2) - cell * 0.09,
                      width: cell * 0.18, height: cell * 0.18, borderRadius: cell, backgroundColor: '#0B0F1A',
                    }}
                  />
                ))}
            </View>
          );
        });
      })}
    </View>
  );
}
