import React from 'react';
import { Pressable, StyleSheet, Text as RNText, View, useWindowDimensions, type TextProps, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { defaultTheme, type Theme } from '../theme/theme';
import { HedgeBackground } from '../board/HedgeBackground';

/** Text in the theme's font. Custom fonts on Android pick weight by family name, so map it here. */
export function Text({ style, ...rest }: TextProps) {
  const fonts = defaultTheme.fonts;
  if (!fonts) return <RNText style={style} {...rest} />;
  const flat = StyleSheet.flatten(style) ?? {};
  const w = String(flat.fontWeight ?? '400');
  const fontFamily = w === '400' || w === 'normal' ? fonts.regular : w === '500' ? fonts.medium : fonts.bold;
  return <RNText style={[style, { fontFamily, fontWeight: 'normal' }]} {...rest} />;
}

export function Screen({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: ViewStyle }) {
  const { width, height } = useWindowDimensions();
  if (theme.backdrop === 'hedge') {
    return (
      <View style={[{ flex: 1, backgroundColor: theme.background[1] }, style]}>
        <HedgeBackground width={width} height={height} />
        {children}
      </View>
    );
  }
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
      style={({ pressed }) => ({ opacity: disabled ? 0.45 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <LinearGradient
        colors={primary ? theme.primary : [theme.card, theme.card]}
        style={{
          paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center',
          borderWidth: 1, borderColor: primary ? 'rgba(255,255,255,0.3)' : theme.cardBorder,
          shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: primary ? 6 : 0,
        }}
      >
        <Text style={{ color: primary ? theme.primaryText : theme.text, fontSize: 18, fontWeight: '600', letterSpacing: 0.4 }}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function Card({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          backgroundColor: theme.card, borderColor: theme.cardBorder, borderWidth: 1, borderRadius: 20, padding: 18, gap: 12,
          shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
