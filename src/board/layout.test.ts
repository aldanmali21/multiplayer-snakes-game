import { describe, expect, it } from 'vitest';
import { boardSizeFor } from '../game/rules';
import { fitBoard, playAreaAspect, screenToBoard } from './layout';

const insets = { top: 24, bottom: 16, left: 0, right: 0 };

describe('board layout', () => {
  it('gives a tall board on a portrait phone and a wide one in full screen', () => {
    const portrait = boardSizeFor(playAreaAspect({ width: 390, height: 844 }, insets, false));
    expect(portrait.height).toBeGreaterThan(portrait.width);
    const full = boardSizeFor(playAreaAspect({ width: 390, height: 844 }, insets, true));
    expect(full.width).toBeGreaterThan(full.height);
  });

  it('fills most of the play area with a board shaped for it', () => {
    const area = { w: 370, h: 600 };
    const dims = boardSizeFor(area.w / area.h);
    const fit = fitBoard(area.w, area.h, dims.width, dims.height);
    expect(fit.rotated).toBe(false);
    expect(fit.width).toBeLessThanOrEqual(area.w);
    expect(fit.height).toBeLessThanOrEqual(area.h);
    expect((fit.width * fit.height) / (area.w * area.h)).toBeGreaterThan(0.85);
  });

  it('turns a wide board on a tall screen so it still fills it', () => {
    const fit = fitBoard(370, 600, 32, 18);
    expect(fit.rotated).toBe(true);
    // Rotated footprint is height x width.
    expect(fit.height).toBeLessThanOrEqual(370);
    expect(fit.width).toBeLessThanOrEqual(600);
    expect(fit.width).toBeGreaterThan(500);
  });

  it('keeps a square board straight', () => {
    expect(fitBoard(300, 500, 18, 18).rotated).toBe(false);
  });

  it('maps swipes onto a turned board', () => {
    expect(screenToBoard('up', false)).toBe('up');
    expect(screenToBoard('right', true)).toBe('up');
    expect(screenToBoard('down', true)).toBe('right');
    expect(screenToBoard('left', true)).toBe('down');
    expect(screenToBoard('up', true)).toBe('left');
  });
});
