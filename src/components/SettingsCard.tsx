import React from 'react';
import { Pressable, Switch, View } from 'react-native';
import { MAX_APPLES, MIN_APPLES, type MatchSettings } from '../game/rules';
import type { Theme } from '../theme/theme';
import { Card, Text } from './ui';

type Props = {
  theme: Theme;
  settings: MatchSettings;
  /** Leave out to show the settings read-only (players who aren't the host). */
  onChange?: (s: MatchSettings) => void;
  /** Hide the "other snakes" switch when playing alone. */
  solo?: boolean;
  title?: string;
};

function Row({ theme, label, hint, value, onChange }: { theme: Theme; label: string; hint: string; value: boolean; onChange?: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: theme.textDim, fontSize: 13 }}>{hint}</Text>
      </View>
      {onChange ? (
        <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.primary[0], false: 'rgba(255,255,255,0.25)' }} thumbColor="#ffffff" />
      ) : (
        <Text style={{ color: value ? theme.accent : theme.textDim, fontWeight: '600' }}>{value ? 'On' : 'Off'}</Text>
      )}
    </View>
  );
}

function StepButton({ theme, label, onPress, disabled }: { theme: Theme; label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
        backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder,
        opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: theme.text, fontSize: 20, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function ApplesRow({ theme, value, onChange }: { theme: Theme; value: number; onChange?: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>Apples on the lawn</Text>
        <Text style={{ color: theme.textDim, fontSize: 13 }}>How many apples are out at once</Text>
      </View>
      {onChange ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <StepButton theme={theme} label="−" disabled={value <= MIN_APPLES} onPress={() => onChange(Math.max(MIN_APPLES, value - 1))} />
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600', minWidth: 28, textAlign: 'center' }}>{value}</Text>
          <StepButton theme={theme} label="+" disabled={value >= MAX_APPLES} onPress={() => onChange(Math.min(MAX_APPLES, value + 1))} />
        </View>
      ) : (
        <Text style={{ color: theme.accent, fontWeight: '600' }}>🍎 {value}</Text>
      )}
    </View>
  );
}

/** Match settings: apple count, deadly walls and crashing into other snakes. */
export function SettingsCard({ theme, settings, onChange, solo, title = 'RULES' }: Props) {
  return (
    <Card theme={theme} style={{ alignSelf: 'stretch' }}>
      <Text style={{ color: theme.textDim, fontSize: 13, fontWeight: '600', letterSpacing: 1 }}>{title}</Text>
      <ApplesRow theme={theme} value={settings.apples} onChange={onChange && ((apples) => onChange({ ...settings, apples }))} />
      <Row
        theme={theme}
        label="Deadly walls"
        hint={settings.walls ? 'Hitting a wall ends your run' : 'Go through a wall and come out the other side'}
        value={settings.walls}
        onChange={onChange && ((walls) => onChange({ ...settings, walls }))}
      />
      {solo ? null : (
        <Row
          theme={theme}
          label="Crash into other snakes"
          hint={settings.snakeCollisions ? 'Hitting another snake ends your run' : 'Snakes slide through each other'}
          value={settings.snakeCollisions}
          onChange={onChange && ((snakeCollisions) => onChange({ ...settings, snakeCollisions }))}
        />
      )}
    </Card>
  );
}
