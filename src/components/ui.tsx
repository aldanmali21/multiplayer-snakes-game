import React from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Theme } from '../theme/theme';

export function Screen({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <LinearGradient colors={theme.background} style={[{ flex: 1 }, style]}>
      {children}
    </LinearGradient>
  );
}

export function Button({
  theme, label, onPress, kind = 'primary', disabled,
}: { theme: Theme; label: string; onPress: () => void; kind?: 'primary' | 'ghost'; disabled?: boolean }) {
  const primary = kind === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center',
        backgroundColor: primary ? theme.accent : theme.card,
        borderWidth: primary ? 0 : 1, borderColor: theme.cardBorder,
        opacity: disabled ? 0.4 : pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <Text style={{ color: primary ? theme.accentText : theme.text, fontSize: 17, fontWeight: '800', letterSpacing: 0.5 }}>{label}</Text>
    </Pressable>
  );
}

export function Card({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ backgroundColor: theme.card, borderColor: theme.cardBorder, borderWidth: 1, borderRadius: 20, padding: 18, gap: 12 }, style]}>
      {children}
    </View>
  );
}
