import React from 'react';
import { Pressable, Switch, View } from 'react-native';
import { MAX_APPLES, MAX_TARGET, MIN_APPLES, MIN_TARGET, TARGET_STEP, type MatchSettings } from '../game/rules';
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

function StepperRow({
  theme, label, hint, value, min, max, step = 1, badge, onChange,
}: { theme: Theme; label: string; hint: string; value: number; min: number; max: number; step?: number; badge: string; onChange?: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: theme.textDim, fontSize: 13 }}>{hint}</Text>
      </View>
      {onChange ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <StepButton theme={theme} label="−" disabled={value <= min} onPress={() => onChange(Math.max(min, value - step))} />
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600', minWidth: 34, textAlign: 'center' }}>{value}</Text>
          <StepButton theme={theme} label="+" disabled={value >= max} onPress={() => onChange(Math.min(max, value + step))} />
        </View>
      ) : (
        <Text style={{ color: theme.accent, fontWeight: '600' }}>{badge} {value}</Text>
      )}
    </View>
  );
}

/** Match settings: apple count, deadly walls and crashing into other snakes. */
export function SettingsCard({ theme, settings, onChange, solo, title = 'RULES' }: Props) {
  return (
    <Card theme={theme} style={{ alignSelf: 'stretch' }}>
      <Text style={{ color: theme.textDim, fontSize: 13, fontWeight: '600', letterSpacing: 1 }}>{title}</Text>
      <StepperRow
        theme={theme}
        label="Score to win"
        hint="First snake to eat this many apples wins"
        value={settings.targetScore}
        min={MIN_TARGET}
        max={MAX_TARGET}
        step={TARGET_STEP}
        badge="🏆"
        onChange={onChange && ((targetScore) => onChange({ ...settings, targetScore }))}
      />
      <StepperRow
        theme={theme}
        label="Apples on the lawn"
        hint="How many apples are out at once"
        value={settings.apples}
        min={MIN_APPLES}
        max={MAX_APPLES}
        badge="🍎"
        onChange={onChange && ((apples) => onChange({ ...settings, apples }))}
      />
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
