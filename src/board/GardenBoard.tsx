import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PixelRatio, View } from 'react-native';
import { Canvas, Picture, Skia, createPicture, type SkPicture } from '@shopify/react-native-skia';
import type { MatchState, Vec } from '../game/rules';
import { Ctx2D } from './ctx2d';
import { CRASH_SECONDS, drawGardenBoard, makeGrass, makeWood, type BoardTextures, type Crash } from './garden';

/** Largest lawn texture side in px, to keep memory in check on big boards. */
const MAX_TEXTURE = 2048;

type Props = { state: MatchState; cell: number; frame: number };

/**
 * Realistic lawn board, animated smoothly between game ticks. Runs at 60 fps
 * when the phone keeps up, and drops to 30 fps when frames take too long.
 */
export function GardenBoard({ state, cell, frame }: Props) {
  const cols = state.config.width;
  const rows = state.config.height;
  const lw = cell * cols;
  const lh = cell * rows;
  const tw = lw + frame * 2;
  const th = lh + frame * 2;

  const tex = useMemo<BoardTextures>(() => {
    const scale = Math.min(3, PixelRatio.get(), MAX_TEXTURE / Math.max(lw, lh));
    return { grass: makeGrass(Skia, Math.round(lw * scale), Math.round(lh * scale), cols, rows), wood: makeWood(Skia) };
  }, [lw, lh, cols, rows]);

  // Remember the previous tick so snakes can glide between cells.
  type Crashing = Omit<Crash, 'age'> & { at: number };
  const track = useRef<{ tick: number; prev: Vec[][]; at: number; cur: Vec[][]; gap: number; alive: boolean[]; crashes: Crashing[] }>({
    tick: -1, prev: [], at: 0, cur: [], gap: 0, alive: [], crashes: [],
  });
  const t = track.current;
  if (state.tick !== t.tick) {
    const now = Date.now();
    if (state.tick === t.tick + 1) {
      // A snake that was alive last tick and isn't now just crashed: replay it.
      state.snakes.forEach((sn, i) => {
        if (t.alive[i] && !sn.alive && t.cur[i]?.length) t.crashes.push({ body: t.cur[i], species: sn.species, dir: sn.dir, at: now });
      });
    } else {
      t.crashes = [];
    }
    t.alive = state.snakes.map((sn) => sn.alive);
    t.prev = t.tick === state.tick - 1 ? t.cur : state.snakes.map((s) => s.body);
    t.cur = state.snakes.map((s) => s.body);
    // On joined phones ticks arrive with network jitter; track the real gap so motion stays even.
    if (t.tick === state.tick - 1 && t.at) t.gap = t.gap ? t.gap * 0.8 + (now - t.at) * 0.2 : now - t.at;
    t.tick = state.tick;
    t.at = now;
  }

  const stateRef = useRef(state);
  stateRef.current = state;
  const [picture, setPicture] = useState<SkPicture | null>(null);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    let cost = 8; // smoothed ms to build one frame
    let ctx: Ctx2D | null = null;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      // 60 fps while snakes move and the phone keeps up; 30 otherwise (countdown, paused, slow phone).
      const busy = stateRef.current.status === 'running' || track.current.crashes.length > 0;
      const fps = busy && cost < 9 ? 60 : 30;
      if (now - last < 1000 / fps - 2) return;
      last = now;
      const began = Date.now();
      const s = stateRef.current;
      const tr = track.current;
      const span = Math.max(s.config.tickMs, Math.min(tr.gap || s.config.tickMs, s.config.tickMs * 1.6));
      const frac = s.status === 'running' ? Math.min(1, (Date.now() - tr.at) / span) : 1;
      const nowMs = Date.now();
      tr.crashes = tr.crashes.filter((k) => nowMs - k.at < CRASH_SECONDS * 1000);
      const crashes = tr.crashes.map(({ at, ...k }) => ({ ...k, age: (nowMs - at) / 1000 }));
      const pic = createPicture((canvas) => {
        if (ctx) ctx.canvas = canvas;
        else ctx = new Ctx2D(Skia, canvas);
        drawGardenBoard(ctx, tex, {
          cell,
          frame,
          cols,
          rows,
          fruits: s.fruits,
          snakes: s.snakes.map((sn, i) => ({ body: sn.body, prev: tr.prev[i], species: sn.species, alive: sn.alive })),
          crashes,
          frac,
          time: now / 1000,
        });
      }, Skia.XYWHRect(0, 0, tw, th));
      setPicture(pic);
      cost = cost * 0.9 + (Date.now() - began) * 0.1;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tex, cell, frame, cols, rows, tw, th]);

  return (
    <View
      style={{
        width: tw, height: th, borderRadius: frame * 1.6,
        shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 14,
      }}
    >
      <Canvas style={{ width: tw, height: th }}>{picture ? <Picture picture={picture} /> : null}</Canvas>
    </View>
  );
}
