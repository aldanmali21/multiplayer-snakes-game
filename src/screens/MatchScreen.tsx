import React, { useEffect, useMemo, useRef } from 'react';
import { PanResponder, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import type { Dir } from '../game/rules';
import type { MatchView } from '../game/useLocalMatch';
import type { Theme } from '../theme/theme';
import { BoardView } from '../components/BoardView';
import { ScoreBar } from '../components/ScoreBar';
import { Button, Screen } from '../components/ui';

const SWIPE_PX = 16;

type Props = {
  theme: Theme;
  view: MatchView | null;
  myId: string;
  onTurn: (dir: Dir) => void;
  onLeave: () => void;
  banner?: string;
};

export function MatchScreen({ theme, view, myId, onTurn, onLeave, banner }: Props) {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
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

  const boardSize = Math.min(width - 32 - 8, height - insets.top - insets.bottom - 220);

  return (
    <Screen theme={theme}>
      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12, paddingHorizontal: 16, gap: 14 }} {...pan.panHandlers}>
        {view ? <ScoreBar state={view.state} theme={theme} myId={myId} /> : null}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {view ? <BoardView state={view.state} theme={theme} size={boardSize} myId={myId} /> : null}
          {view && view.countdown > 0 ? (
            <View pointerEvents="none" style={{ position: 'absolute', alignItems: 'center' }}>
              <Text style={{ color: theme.text, fontSize: 96, fontWeight: '900', textShadowColor: theme.accent, textShadowRadius: 24 }}>
                {view.countdown}
              </Text>
              <Text style={{ color: theme.textDim, fontSize: 15 }}>Swipe to steer</Text>
            </View>
          ) : null}
        </View>
        {me && !me.alive && view?.state.status === 'running' ? (
          <Text style={{ color: theme.danger, textAlign: 'center', fontWeight: '800', fontSize: 16 }}>You crashed. Watching the rest…</Text>
        ) : banner ? (
          <Text style={{ color: theme.textDim, textAlign: 'center' }}>{banner}</Text>
        ) : null}
        <Button theme={theme} kind="ghost" label="Leave" onPress={onLeave} />
      </View>
    </Screen>
  );
}
