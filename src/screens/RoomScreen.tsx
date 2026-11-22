import React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchSettings } from '../game/rules';
import type { RoomPlayer } from '../net/protocol';
import { HOTSPOT_IP } from '../net/lan';
import type { Theme } from '../theme/theme';
import { Button, Card, Screen, Text } from '../components/ui';
import { SnakePicker, speciesName } from '../components/SnakePicker';
import { SettingsCard } from '../components/SettingsCard';

type Props = {
  theme: Theme;
  code: string;
  /** Host only: the address others can type to find this room. */
  ip?: string | null;
  players: RoomPlayer[];
  myId: string;
  isHost: boolean;
  settings: MatchSettings;
  onPick: (species: number) => void;
  /** Host only. */
  onSettings?: (s: MatchSettings) => void;
  onStart?: () => void;
  onLeave: () => void;
  banner?: string;
};

export function RoomScreen({ theme, code, ip, players, myId, isHost, settings, onPick, onSettings, onStart, onLeave, banner }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const me = players.find((p) => p.id === myId);
  const takenBy: Record<number, string> = {};
  for (const p of players) if (p.id !== myId) takenBy[p.species] = p.name;

  return (
    <Screen theme={theme}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 24, gap: 16, alignItems: 'stretch' }}>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text style={{ color: theme.textDim, fontSize: 13, fontWeight: '600', letterSpacing: 2 }}>ROOM CODE</Text>
          <Text style={{ color: theme.accent, fontSize: 58, fontWeight: '900', letterSpacing: 10, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 12 }}>{code}</Text>
          {isHost ? (
            <Text style={{ color: theme.textDim, textAlign: 'center', fontSize: 14 }}>
              {ip ? `Others on this network can pick your room, or type ${ip}` : `Sharing your hotspot? Others can type ${HOTSPOT_IP}`}
            </Text>
          ) : null}
        </View>

        <Card theme={theme}>
          <Text style={{ color: theme.textDim, fontSize: 13, fontWeight: '600', letterSpacing: 1 }}>PLAYERS ({players.length}/4)</Text>
          {players.map((p) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: p.connected ? 1 : 0.4 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: theme.snakes[p.species % theme.snakes.length].head }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600' }}>
                  {p.name}{p.id === myId ? ' (you)' : ''}
                </Text>
                <Text style={{ color: theme.textDim, fontSize: 12 }}>{speciesName(p.species)}</Text>
              </View>
              {p.isHost ? <Text style={{ color: theme.textDim, fontSize: 12, fontWeight: '600' }}>HOST</Text> : null}
            </View>
          ))}
        </Card>

        <Card theme={theme} style={{ alignItems: 'center' }}>
          <Text style={{ color: theme.textDim, fontSize: 13, fontWeight: '600', letterSpacing: 1, alignSelf: 'stretch' }}>PICK YOUR SNAKE</Text>
          <SnakePicker theme={theme} selected={me?.species ?? -1} takenBy={takenBy} onPick={onPick} width={Math.min(width, 620) - 88} />
        </Card>

        <SettingsCard theme={theme} settings={settings} onChange={isHost ? onSettings : undefined} title={isHost ? 'RULES (YOU DECIDE)' : 'RULES (SET BY THE HOST)'} />

        {banner ? <Text style={{ color: theme.danger, textAlign: 'center' }}>{banner}</Text> : null}
        <View style={{ gap: 12 }}>
          {isHost ? (
            <Button theme={theme} label={players.length > 1 ? 'Start match' : 'Start alone'} onPress={onStart!} />
          ) : (
            <Text style={{ color: theme.textDim, textAlign: 'center', fontSize: 15 }}>Waiting for the host to start…</Text>
          )}
          <Button theme={theme} kind="ghost" label="Leave room" onPress={onLeave} />
        </View>
      </ScrollView>
    </Screen>
  );
}
