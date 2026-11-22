import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Theme } from '../theme/theme';
import { Button, Card, Screen, Text } from '../components/ui';
import { SnakePreview } from '../board/SnakePreview';
import { speciesName } from '../components/SnakePicker';

type Props = {
  theme: Theme;
  name: string;
  species: number;
  onSaveName: (n: string) => void;
  onSolo: () => void;
  onHost: () => void;
  onJoin: () => void;
  onChooseSnake: () => void;
  onSettings: () => void;
};

export function HomeScreen({ theme, name, species, onSaveName, onSolo, onHost, onJoin, onChooseSnake, onSettings }: Props) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(name);
  const ready = draft.trim().length > 0;
  const commit = () => ready && onSaveName(draft.trim().slice(0, 12));

  return (
    <Screen theme={theme}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 36, paddingBottom: insets.bottom + 24, paddingHorizontal: 24, gap: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text style={{ color: theme.accent, fontSize: 56, fontWeight: '900', letterSpacing: 6, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 14 }}>SNAKES</Text>
          <Text style={{ color: theme.textDim, fontSize: 15 }}>Eat. Grow. Outlast your friends.</Text>
        </View>
        <Card theme={theme}>
          <Text style={{ color: theme.textDim, fontSize: 13, fontWeight: '600', letterSpacing: 1 }}>YOUR NAME</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={commit}
            onSubmitEditing={commit}
            maxLength={12}
            placeholder="Enter a nickname"
            placeholderTextColor={theme.textDim}
            style={{ color: theme.text, fontSize: 20, fontFamily: theme.fonts?.bold, paddingVertical: 6 }}
          />
        </Card>
        <Pressable onPress={onChooseSnake} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })} accessibilityLabel="Choose your snake">
          <Card theme={theme} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 }}>
            <View style={{ borderRadius: 10, overflow: 'hidden' }}>
              <SnakePreview species={species} width={96} height={58} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.textDim, fontSize: 13, fontWeight: '600', letterSpacing: 1 }}>YOUR SNAKE</Text>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600' }}>{speciesName(species)}</Text>
            </View>
            <Text style={{ color: theme.accent, fontWeight: '600' }}>Change ›</Text>
          </Card>
        </Pressable>
        <View style={{ gap: 12 }}>
          <Button theme={theme} label="Play alone" disabled={!ready} onPress={() => { commit(); onSolo(); }} />
          <Button theme={theme} kind="ghost" label="Host a room" disabled={!ready} onPress={() => { commit(); onHost(); }} />
          <Button theme={theme} kind="ghost" label="Join a room" disabled={!ready} onPress={() => { commit(); onJoin(); }} />
          <Button theme={theme} kind="ghost" label="⚙  Settings" onPress={onSettings} />
        </View>
        <Text style={{ color: theme.textDim, textAlign: 'center', fontSize: 13, marginTop: 'auto' }}>
          Multiplayer works offline: everyone joins the same Wi-Fi, or the host's hotspot.
        </Text>
      </ScrollView>
    </Screen>
  );
}
