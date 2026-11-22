import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PixelRatio, View } from 'react-native';
import { Canvas, Picture, Skia, createPicture, type SkPicture } from '@shopify/react-native-skia';
import type { MatchState, Vec } from '../game/rules';
import { Ctx2D } from './ctx2d';
import { drawGardenBoard, makeGrass, makeWood, type BoardTextures } from './garden';

const FPS = 30;

type Props = { state: MatchState; size: number };

/** Realistic lawn board, animated smoothly between game ticks. */
export function GardenBoard({ state, size }: Props) {
  const frame = Math.max(8, Math.round(size * 0.028));
  const lawn = size - frame * 2;
  const N = state.config.width;
  const total = size;

  const tex = useMemo<BoardTextures>(() => {
    const px = Math.round(lawn * Math.min(3, PixelRatio.get()));
    return { grass: makeGrass(Skia, px, N), wood: makeWood(Skia) };
  }, [lawn, N]);

  // Remember the previous tick so snakes can glide between cells.
  const track = useRef<{ tick: number; prev: Vec[][]; at: number; cur: Vec[][] }>({ tick: -1, prev: [], at: 0, cur: [] });
  const t = track.current;
  if (state.tick !== t.tick) {
    t.prev = t.tick === state.tick - 1 ? t.cur : state.snakes.map((s) => s.body);
    t.cur = state.snakes.map((s) => s.body);
    t.tick = state.tick;
    t.at = Date.now();
  }

  const stateRef = useRef(state);
  stateRef.current = state;
  const [picture, setPicture] = useState<SkPicture | null>(null);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 1000 / FPS - 2) return;
      last = now;
      const s = stateRef.current;
      const tr = track.current;
      const frac = s.status === 'running' ? Math.min(1, (Date.now() - tr.at) / s.config.tickMs) : 1;
      const pic = createPicture((canvas) => {
        drawGardenBoard(new Ctx2D(Skia, canvas), tex, {
          size: lawn,
          frame,
          N,
          fruits: s.fruits,
          snakes: s.snakes.map((sn, i) => ({ body: sn.body, prev: tr.prev[i], species: i, alive: sn.alive })),
          frac,
          time: now / 1000,
        });
      }, Skia.XYWHRect(0, 0, total, total));
      setPicture(pic);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tex, lawn, frame, N, total]);

  return (
    <View
      style={{
        width: total, height: total, borderRadius: frame * 1.6,
        shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 14,
      }}
    >
      <Canvas style={{ width: total, height: total }}>{picture ? <Picture picture={picture} /> : null}</Canvas>
    </View>
  );
}
