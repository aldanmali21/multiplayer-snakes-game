import React from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Theme } from '../theme/theme';
import { Button, Screen, Text } from '../components/ui';
import { SnakePicker } from '../components/SnakePicker';

export function SnakeScreen({ theme, species, onPick, onDone }: { theme: Theme; species: number; onPick: (s: number) => void; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Screen theme={theme}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24, paddingHorizontal: 24, gap: 18, alignItems: 'center' }}>
        <Text style={{ color: theme.text, fontSize: 30, fontWeight: '600', alignSelf: 'stretch' }}>Choose your snake</Text>
        <Text style={{ color: theme.textDim, fontSize: 14, alignSelf: 'stretch' }}>
          Used when you play alone, and your first choice when you join a room. In a room, each snake can only be taken once.
        </Text>
        <SnakePicker theme={theme} selected={species} onPick={onPick} />
        <Button theme={theme} label="Done" onPress={onDone} />
      </ScrollView>
    </Screen>
  );
}
