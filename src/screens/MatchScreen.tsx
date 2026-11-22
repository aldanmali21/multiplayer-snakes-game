import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import type { Dir } from '../game/rules';
import type { MatchView } from '../game/matchView';
import type { Theme } from '../theme/theme';
import { BoardView } from '../components/BoardView';
import { GardenBoard } from '../board/GardenBoard';
import { ScoreBar } from '../components/ScoreBar';
import { Button, Screen, Text } from '../components/ui';
import { useFullscreen } from '../components/fullscreen';
import { SIDE_COLUMN, fitBoard, screenToBoard } from '../board/layout';

const SWIPE_PX = 16;

type Props = {
  theme: Theme;
  view: MatchView | null;
  myId: string;
  onTurn: (dir: Dir) => void;
  onLeave: () => void;
  banner?: string;
  roomCode?: string;
  onPause?: () => void;
  onResume?: () => void;
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

export function MatchScreen({ theme, view, myId, onTurn, onLeave, banner, roomCode, onPause, onResume }: Props) {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { fullscreen, toggle } = useFullscreen();
  const landscape = width > height;
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const cols = view?.state.config.width ?? 18;
  const rows = view?.state.config.height ?? 18;
  const fit = area ? fitBoard(area.w, area.h, cols, rows) : null;
  const rotatedRef = useRef(false);
  rotatedRef.current = !!fit?.rotated;
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
        const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        turnRef.current(screenToBoard(dir, rotatedRef.current));
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

  const pad = fullscreen ? 8 : 10;
  const status =
    me && !me.alive && view?.state.status === 'running' ? (
      <Text style={{ color: theme.danger, textAlign: 'center', fontWeight: '800', fontSize: 15 }}>You crashed. Watching the rest…</Text>
    ) : banner ? (
      <Text style={{ color: theme.textDim, textAlign: 'center', fontSize: 13 }}>{banner}</Text>
    ) : null;

  const canPause = !!onPause && !!view && view.state.status === 'running' && !view.pausedBy;
  const pauseButton = canPause ? <IconButton theme={theme} label="❚❚ Pause" onPress={onPause!} /> : null;

  const label = { color: theme.text, fontSize: 12, fontWeight: '500' as const, letterSpacing: 1, opacity: 0.85, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 };
  const target = view ? (
    <View style={{ flexDirection: landscape ? 'column' : 'row', justifyContent: 'space-between', gap: 4 }}>
      <Text style={label}>FIRST TO {view.state.config.targetScore} WINS</Text>
      {roomCode ? <Text style={label}>ROOM {roomCode}</Text> : null}
    </View>
  ) : null;

  // The board footprint on screen (swapped when the board is turned).
  const footW = fit ? (fit.rotated ? fit.height : fit.width) : 0;
  const footH = fit ? (fit.rotated ? fit.width : fit.height) : 0;

  const board = (
    <View
      style={{ flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if (!area || Math.abs(area.w - w) > 1 || Math.abs(area.h - h) > 1) setArea({ w, h });
      }}
    >
      {view && fit ? (
        <View style={{ width: footW, height: footH }}>
          <View
            style={{
              position: 'absolute', width: fit.width, height: fit.height,
              left: (footW - fit.width) / 2, top: (footH - fit.height) / 2,
              transform: fit.rotated ? [{ rotate: '90deg' }] : [],
            }}
          >
            {theme.board === 'garden' ? (
              <GardenBoard state={view.state} cell={fit.cell} frame={fit.frame} />
            ) : (
              <BoardView state={view.state} theme={theme} size={fit.cell * cols} myId={myId} />
            )}
          </View>
          {view.pausedBy ? (
            <View
              style={{
                position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: 14,
                backgroundColor: 'rgba(8,20,6,0.62)', borderRadius: 16, padding: 20,
              }}
            >
              <Text style={{ color: theme.text, fontSize: 40, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 10 }}>Paused</Text>
              {roomCode ? <Text style={{ color: theme.textDim, fontSize: 15 }}>by {view.pausedBy}</Text> : null}
              {onResume ? <Button theme={theme} label="Resume" onPress={onResume} /> : null}
            </View>
          ) : null}
          {view.countdown > 0 ? (
            <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.text, fontSize: 96, fontWeight: '900', textShadowColor: theme.accent, textShadowRadius: 24 }}>
                {view.countdown}
              </Text>
              <Text style={{ color: theme.textDim, fontSize: 15 }}>Swipe to steer</Text>
            </View>
          ) : null}
          {status ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: fit.frame + 8, alignItems: 'center' }}>
              <View style={{ backgroundColor: 'rgba(8,20,6,0.7)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>{status}</View>
            </View>
          ) : null}
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
          <View style={{ width: SIDE_COLUMN, gap: 10 }}>
            {view ? <ScoreBar state={view.state} theme={theme} myId={myId} only={[0, 1]} vertical /> : null}
            {target}
          </View>
          {board}
          <View style={{ width: SIDE_COLUMN, gap: 10, alignItems: 'stretch' }}>
            {view ? <ScoreBar state={view.state} theme={theme} myId={myId} only={[2, 3]} vertical /> : null}
            {pauseButton}
            <IconButton theme={theme} label={fullscreen ? 'Exit full screen' : 'Full screen'} onPress={toggle} />
            <IconButton theme={theme} label="Leave" onPress={onLeave} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen theme={theme}>
      <View style={{ flex: 1, paddingTop: insets.top + pad, paddingBottom: insets.bottom + pad, paddingHorizontal: pad, gap: 10 }} {...pan.panHandlers}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton theme={theme} label="Leave" onPress={onLeave} />
          <View style={{ flex: 1 }} />
          {pauseButton}
          <IconButton theme={theme} label="Full screen" onPress={toggle} />
        </View>
        {view ? <ScoreBar state={view.state} theme={theme} myId={myId} /> : null}
        {target}
        {board}
      </View>
    </Screen>
  );
}
