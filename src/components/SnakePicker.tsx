import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { SPECIES_COUNT } from '../game/rules';
import { SPECIES } from '../board/garden';
import { SnakePreview } from '../board/SnakePreview';
import type { Theme } from '../theme/theme';
import { Text } from './ui';

type Props = {
  theme: Theme;
  selected: number;
  /** Snakes other players already have, with who has them. */
  takenBy?: Record<number, string>;
  onPick: (species: number) => void;
  disabled?: boolean;
  /** Width available for the grid. */
  width?: number;
};

export const speciesName = (s: number) => SPECIES[s % SPECIES.length].name;

/** Grid of the 8 snakes. Taken ones are locked and show who has them. */
export function SnakePicker({ theme, selected, takenBy = {}, onPick, disabled, width }: Props) {
  const { width: screenW } = useWindowDimensions();
  const avail = Math.min(width ?? screenW - 48, 560);
  const cols = 4;
  const gap = 8;
  const tileW = Math.floor((avail - gap * (cols - 1)) / cols);
  const tileH = Math.round(tileW * 0.62);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, width: avail }}>
      {Array.from({ length: SPECIES_COUNT }, (_, s) => {
        const owner = takenBy[s];
        const mine = s === selected;
        const locked = owner !== undefined && !mine;
        const color = theme.snakes[s % theme.snakes.length].head;
        return (
          <Pressable
            key={s}
            disabled={disabled || locked || mine}
            onPress={() => onPick(s)}
            accessibilityLabel={`${speciesName(s)}${locked ? `, taken by ${owner}` : ''}`}
            style={({ pressed }) => ({
              width: tileW, borderRadius: 12, overflow: 'hidden',
              borderWidth: mine ? 3 : 1, borderColor: mine ? color : theme.cardBorder,
              opacity: locked ? 0.45 : pressed ? 0.8 : 1,
            })}
          >
            <SnakePreview species={s} width={tileW - (mine ? 6 : 2)} height={tileH} />
            <View style={{ backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 4, paddingHorizontal: 4 }}>
              <Text numberOfLines={1} style={{ color: theme.text, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>
                {speciesName(s)}
              </Text>
              {locked ? (
                <Text numberOfLines={1} style={{ color: theme.accent, fontSize: 10, textAlign: 'center' }}>🔒 {owner}</Text>
              ) : mine ? (
                <Text numberOfLines={1} style={{ color: color, fontSize: 10, textAlign: 'center' }}>Yours</Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
