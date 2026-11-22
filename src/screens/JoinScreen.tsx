import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FoundRoom } from '../net/client';
import { isIpv4 } from '../net/lan';
import { normaliseCode } from '../net/protocol';
import type { Theme } from '../theme/theme';
import { Button, Card, Screen } from '../components/ui';

type Props = {
  theme: Theme;
  rooms: FoundRoom[];
  onJoin: (address: string, code: string) => void;
  onBack: () => void;
};

export function JoinScreen({ theme, rooms, onJoin, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [ip, setIp] = useState('');
  const [code, setCode] = useState('');
  const canJoin = isIpv4(ip) && normaliseCode(code).length === 4;
  const input = { color: theme.text, fontSize: 20, fontWeight: '700' as const, paddingVertical: 6 };

  return (
    <Screen theme={theme}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24, paddingHorizontal: 24, gap: 18 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ color: theme.text, fontSize: 30, fontWeight: '900' }}>Join a room</Text>
        <Card theme={theme}>
          <Text style={{ color: theme.textDim, fontSize: 13, fontWeight: '700' }}>ROOMS NEARBY</Text>
          {rooms.length === 0 ? (
            <Text style={{ color: theme.textDim }}>Looking for rooms on this network…</Text>
          ) : (
            rooms.map((r) => (
              <Pressable
                key={r.address}
                disabled={!r.open}
                onPress={() => onJoin(r.address, r.code)}
                style={({ pressed }) => ({
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder,
                  opacity: r.open ? (pressed ? 0.7 : 1) : 0.4,
                })}
              >
                <View>
                  <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>{r.hostName}</Text>
                  <Text style={{ color: theme.textDim, fontSize: 13 }}>{r.open ? `${r.players}/4 players` : 'Full or already playing'}</Text>
                </View>
                <Text style={{ color: theme.accent, fontSize: 20, fontWeight: '900', letterSpacing: 3 }}>{r.code}</Text>
              </Pressable>
            ))
          )}
        </Card>
        <Card theme={theme}>
          <Text style={{ color: theme.textDim, fontSize: 13, fontWeight: '700' }}>OR ENTER IT YOURSELF</Text>
          <TextInput value={ip} onChangeText={setIp} placeholder="Host address, e.g. 192.168.1.5" placeholderTextColor={theme.textDim} keyboardType="numbers-and-punctuation" autoCorrect={false} style={input} />
          <TextInput value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="Room code" placeholderTextColor={theme.textDim} autoCapitalize="characters" autoCorrect={false} maxLength={4} style={input} />
          <Button theme={theme} label="Join" disabled={!canJoin} onPress={() => onJoin(ip.trim(), normaliseCode(code))} />
        </Card>
        <Button theme={theme} kind="ghost" label="Back" onPress={onBack} />
      </ScrollView>
    </Screen>
  );
}
