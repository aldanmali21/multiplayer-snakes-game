import React from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchSettings } from '../game/rules';
import type { Theme } from '../theme/theme';
import { Button, Screen, Text } from '../components/ui';
import { SnakePicker } from '../components/SnakePicker';
import { SettingsCard } from '../components/SettingsCard';

type Props = {
  theme: Theme;
  species: number;
  settings: MatchSettings;
  onPick: (s: number) => void;
  onSettings: (s: MatchSettings) => void;
  onStart: () => void;
  onBack: () => void;
};

/** Before a solo game: pick a snake, the number of apples and the rules. */
export function SoloSetupScreen({ theme, species, settings, onPick, onSettings, onStart, onBack }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Screen theme={theme}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24, paddingHorizontal: 24, gap: 18, alignItems: 'center' }}>
        <Text style={{ color: theme.text, fontSize: 30, fontWeight: '600', alignSelf: 'stretch' }}>Play alone</Text>
        <Text style={{ color: theme.textDim, fontSize: 13, fontWeight: '600', letterSpacing: 1, alignSelf: 'stretch' }}>YOUR SNAKE</Text>
        <SnakePicker theme={theme} selected={species} onPick={onPick} />
        <SettingsCard theme={theme} settings={settings} onChange={onSettings} solo title="GAME SETTINGS" />
        <Button theme={theme} label="Start" onPress={onStart} />
        <Button theme={theme} label="Back" kind="ghost" onPress={onBack} />
      </ScrollView>
    </Screen>
  );
}
