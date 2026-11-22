import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Theme } from '../theme/theme';
import { Button, Card, Screen } from '../components/ui';

type Props = {
  theme: Theme;
  name: string;
  onSaveName: (n: string) => void;
  onSolo: () => void;
  onHost: () => void;
  onJoin: () => void;
};

export function HomeScreen({ theme, name, onSaveName, onSolo, onHost, onJoin }: Props) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(name);
  const ready = draft.trim().length > 0;
  const commit = () => ready && onSaveName(draft.trim().slice(0, 12));

  return (
    <Screen theme={theme}>
      <View style={{ flex: 1, paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24, paddingHorizontal: 24, gap: 28 }}>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text style={{ color: theme.accent, fontSize: 56, fontWeight: '900', letterSpacing: 6, textShadowColor: theme.accent, textShadowRadius: 20 }}>SNAKES</Text>
          <Text style={{ color: theme.textDim, fontSize: 15 }}>Eat. Grow. Outlast your friends.</Text>
        </View>
        <Card theme={theme}>
          <Text style={{ color: theme.textDim, fontSize: 13, fontWeight: '700' }}>YOUR NAME</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={commit}
            onSubmitEditing={commit}
            maxLength={12}
            placeholder="Enter a nickname"
            placeholderTextColor={theme.textDim}
            style={{ color: theme.text, fontSize: 20, fontWeight: '700', paddingVertical: 6 }}
          />
        </Card>
        <View style={{ gap: 12 }}>
          <Button theme={theme} label="Play alone" disabled={!ready} onPress={() => { commit(); onSolo(); }} />
          <Button theme={theme} kind="ghost" label="Host a room" disabled={!ready} onPress={() => { commit(); onHost(); }} />
          <Button theme={theme} kind="ghost" label="Join a room" disabled={!ready} onPress={() => { commit(); onJoin(); }} />
        </View>
        <Text style={{ color: theme.textDim, textAlign: 'center', fontSize: 13, marginTop: 'auto' }}>
          Multiplayer works offline: everyone joins the same Wi-Fi, or the host's hotspot.
        </Text>
      </View>
    </Screen>
  );
}
