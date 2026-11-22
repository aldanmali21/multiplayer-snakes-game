import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchState } from '../game/rules';
import type { Theme } from '../theme/theme';
import { Button, Card, Screen } from '../components/ui';

type Props = {
  theme: Theme;
  state: MatchState;
  myId: string;
  onAgain?: () => void;
  againLabel?: string;
  onHome: () => void;
  note?: string;
};

export function ResultsScreen({ theme, state, myId, onAgain, againLabel = 'Play again', onHome, note }: Props) {
  const insets = useSafeAreaInsets();
  const won = state.winners.includes(myId);
  const solo = state.snakes.length === 1;
  const headline = solo ? (won ? 'You made it!' : 'Game over') : won ? (state.winners.length > 1 ? "It's a tie, you share the win!" : 'You win!') : 'Match over';
  const winnerNames = state.snakes.filter((s) => state.winners.includes(s.id)).map((s) => s.name);
  const ranked = [...state.snakes].sort((a, b) => b.score - a.score);

  return (
    <Screen theme={theme}>
      <View style={{ flex: 1, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24, paddingHorizontal: 24, gap: 20, justifyContent: 'center' }}>
        <Text style={{ color: won ? theme.accent : theme.text, fontSize: 38, fontWeight: '900', textAlign: 'center' }}>{headline}</Text>
        {!solo && winnerNames.length ? (
          <Text style={{ color: theme.textDim, textAlign: 'center', fontSize: 16 }}>Winner: {winnerNames.join(' & ')}</Text>
        ) : null}
        <Card theme={theme}>
          {ranked.map((s) => {
            const i = state.snakes.findIndex((x) => x.id === s.id);
            const color = theme.snakes[i % theme.snakes.length].head;
            return (
              <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color, fontWeight: '800', fontSize: 17 }}>{s.name}{s.id === myId ? ' (you)' : ''}</Text>
                <Text style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>{s.score} / {state.config.targetScore}</Text>
              </View>
            );
          })}
        </Card>
        {note ? <Text style={{ color: theme.textDim, textAlign: 'center' }}>{note}</Text> : null}
        {onAgain ? <Button theme={theme} label={againLabel} onPress={onAgain} /> : null}
        <Button theme={theme} kind="ghost" label="Home" onPress={onHome} />
      </View>
    </Screen>
  );
}
