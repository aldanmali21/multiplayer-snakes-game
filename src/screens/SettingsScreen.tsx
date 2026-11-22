import React from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchSettings } from '../game/rules';
import type { Theme } from '../theme/theme';
import { Button, Screen, Text } from '../components/ui';
import { SettingsCard } from '../components/SettingsCard';

export function SettingsScreen({ theme, settings, onChange, onDone }: { theme: Theme; settings: MatchSettings; onChange: (s: MatchSettings) => void; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Screen theme={theme}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24, paddingHorizontal: 24, gap: 18 }}>
        <Text style={{ color: theme.text, fontSize: 30, fontWeight: '600' }}>Settings</Text>
        <Text style={{ color: theme.textDim, fontSize: 14 }}>
          Turn these off for an easier game. They apply when you play alone and when you host a room. When you join someone else's room, the host's settings are used.
        </Text>
        <SettingsCard theme={theme} settings={settings} onChange={onChange} />
        <Button theme={theme} label="Done" onPress={onDone} />
      </ScrollView>
    </Screen>
  );
}
