import React, { useEffect, useMemo, useRef } from 'react';
import { PanResponder, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import type { Dir } from '../game/rules';
import type { MatchView } from '../game/useLocalMatch';
import type { Theme } from '../theme/theme';
import { BoardView } from '../components/BoardView';
import { GardenBoard } from '../board/GardenBoard';
import { ScoreBar } from '../components/ScoreBar';
import { Button, Screen, Text } from '../components/ui';
import { useFullscreen } from '../components/fullscreen';

const SWIPE_PX = 16;

type Props = {
  theme: Theme;
  view: MatchView | null;
  myId: string;
  onTurn: (dir: Dir) => void;
  onLeave: () => void;
  banner?: string;
  roomCode?: string;
};

function IconButton({ theme, label, onPress }: { theme: Theme; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
        backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder, opacity: pressed ? 0.7 : 1, alignItems: 'center',
      })}
    >
      <Text style={{ color: theme.text, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function MatchScreen({ theme, view, myId, onTurn, onLeave, banner, roomCode }: Props) {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { fullscreen, toggle } = useFullscreen();
  const landscape = width > height;
  const turnRef = useRef(onTurn);
  turnRef.current = onTurn;

  const pan = useMemo(() => {
    let lx = 0;
    let ly = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { lx = 0; ly = 0; },
      onPanResponderMove: (_e, g) => {
        const dx = g.dx - lx;
        const dy = g.dy - ly;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
        turnRef.current(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
        lx = g.dx;
        ly = g.dy;
      },
    });
  }, []);

  // Haptic feedback when I eat or die.
  const me = view?.state.snakes.find((s) => s.id === myId);
  const prevScore = useRef(0);
  const prevAlive = useRef(true);
  useEffect(() => {
    if (!me) return;
    if (me.score > prevScore.current) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (prevAlive.current && !me.alive) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    prevScore.current = me.score;
    prevAlive.current = me.alive;
  }, [me?.score, me?.alive]); // eslint-disable-line react-hooks/exhaustive-deps

  const pad = fullscreen ? 8 : 16;
  const boardSize = landscape
    ? Math.min(height - insets.top - insets.bottom - pad * 2 - 8, width - insets.left - insets.right - 2 * 170)
    : Math.min(width - 32 - 8, height - insets.top - insets.bottom - 220);

  const status =
    me && !me.alive && view?.state.status === 'running' ? (
      <Text style={{ color: theme.danger, textAlign: 'center', fontWeight: '800', fontSize: 15 }}>You crashed. Watching the rest…</Text>
    ) : banner ? (
      <Text style={{ color: theme.textDim, textAlign: 'center', fontSize: 13 }}>{banner}</Text>
    ) : null;

  const label = { color: theme.text, fontSize: 12, fontWeight: '500' as const, letterSpacing: 1, opacity: 0.85, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 };
  const target = view ? (
    <View style={{ flexDirection: landscape ? 'column' : 'row', justifyContent: 'space-between', gap: 4 }}>
      <Text style={label}>FIRST TO {view.state.config.targetScore} WINS</Text>
      {roomCode ? <Text style={label}>ROOM {roomCode}</Text> : null}
    </View>
  ) : null;

  const board = (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {view ? (
        theme.board === 'garden' ? (
          <GardenBoard state={view.state} size={boardSize} />
        ) : (
          <BoardView state={view.state} theme={theme} size={boardSize} myId={myId} />
        )
      ) : null}
      {view && view.countdown > 0 ? (
        <View pointerEvents="none" style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ color: theme.text, fontSize: 96, fontWeight: '900', textShadowColor: theme.accent, textShadowRadius: 24 }}>
            {view.countdown}
          </Text>
          <Text style={{ color: theme.textDim, fontSize: 15 }}>Swipe to steer</Text>
        </View>
      ) : null}
    </View>
  );

  if (landscape) {
    return (
      <Screen theme={theme}>
        <View
          {...pan.panHandlers}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: insets.top + pad, paddingBottom: insets.bottom + pad,
            paddingLeft: insets.left + pad, paddingRight: insets.right + pad, gap: 12,
          }}
        >
          <View style={{ width: 150, gap: 10 }}>
            {view ? <ScoreBar state={view.state} theme={theme} myId={myId} only={[0, 1]} vertical /> : null}
            {target}
          </View>
          {board}
          <View style={{ width: 150, gap: 10, alignItems: 'stretch' }}>
            {view ? <ScoreBar state={view.state} theme={theme} myId={myId} only={[2, 3]} vertical /> : null}
            <IconButton theme={theme} label={fullscreen ? 'Exit full screen' : 'Full screen'} onPress={toggle} />
            <IconButton theme={theme} label="Leave" onPress={onLeave} />
            {status}
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen theme={theme}>
      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12, paddingHorizontal: 16, gap: 14 }} {...pan.panHandlers}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <IconButton theme={theme} label="Full screen" onPress={toggle} />
        </View>
        {view ? <ScoreBar state={view.state} theme={theme} myId={myId} /> : null}
        {target}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{board}</View>
        {status}
        <Button theme={theme} kind="ghost" label="Leave" onPress={onLeave} />
      </View>
    </Screen>
  );
}
