import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RoomPlayer } from '../net/protocol';
import { HOTSPOT_IP } from '../net/lan';
import type { Theme } from '../theme/theme';
import { Button, Card, Screen, Text } from '../components/ui';

type Props = {
  theme: Theme;
  code: string;
  /** Host only: the address others can type to find this room. */
  ip?: string | null;
  players: RoomPlayer[];
  myId: string;
  isHost: boolean;
  onStart?: () => void;
  onLeave: () => void;
  banner?: string;
};

export function RoomScreen({ theme, code, ip, players, myId, isHost, onStart, onLeave, banner }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Screen theme={theme}>
      <View style={{ flex: 1, paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24, paddingHorizontal: 24, gap: 18 }}>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={{ color: theme.textDim, fontSize: 13, fontWeight: '700', letterSpacing: 2 }}>ROOM CODE</Text>
          <Text style={{ color: theme.accent, fontSize: 64, fontWeight: '900', letterSpacing: 10, textShadowColor: theme.accent, textShadowRadius: 18 }}>{code}</Text>
          {isHost ? (
            <Text style={{ color: theme.textDim, textAlign: 'center', fontSize: 14 }}>
              {ip ? `Others on this network can pick your room, or type ${ip}` : `Sharing your hotspot? Others can type ${HOTSPOT_IP}`}
            </Text>
          ) : null}
        </View>

        <Card theme={theme}>
          <Text style={{ color: theme.textDim, fontSize: 13, fontWeight: '700' }}>PLAYERS ({players.length}/4)</Text>
          {players.map((p, i) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: p.connected ? 1 : 0.4 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: theme.snakes[i % theme.snakes.length].head }} />
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700', flex: 1 }}>
                {p.name}{p.id === myId ? ' (you)' : ''}
              </Text>
              {p.isHost ? <Text style={{ color: theme.textDim, fontSize: 12, fontWeight: '800' }}>HOST</Text> : null}
            </View>
          ))}
        </Card>

        {banner ? <Text style={{ color: theme.danger, textAlign: 'center' }}>{banner}</Text> : null}
        <View style={{ marginTop: 'auto', gap: 12 }}>
          {isHost ? (
            <Button theme={theme} label={players.length > 1 ? 'Start match' : 'Start alone'} onPress={onStart!} />
          ) : (
            <Text style={{ color: theme.textDim, textAlign: 'center', fontSize: 15 }}>Waiting for the host to start…</Text>
          )}
          <Button theme={theme} kind="ghost" label="Leave room" onPress={onLeave} />
        </View>
      </View>
    </Screen>
  );
}
