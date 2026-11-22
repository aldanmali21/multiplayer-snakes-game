import { describe, expect, it } from 'vitest';
import { snakePoints } from './garden';

describe('snake drawing points', () => {
  it('glides between the last tick and this one', () => {
    const pts = snakePoints([{ x: 5, y: 5 }, { x: 4, y: 5 }], [{ x: 4, y: 5 }, { x: 3, y: 5 }], 0.5, 18, 18);
    expect(pts).toEqual([[5, 5.5], [4, 5.5]]);
  });

  it('keeps a snake in one piece as it wraps through an open wall', () => {
    // Head has just wrapped from x=17 to x=0 on an 18-wide board.
    const pts = snakePoints([{ x: 0, y: 3 }, { x: 17, y: 3 }, { x: 16, y: 3 }], [{ x: 17, y: 3 }, { x: 16, y: 3 }, { x: 15, y: 3 }], 0.5, 18, 18);
    // Head slides in from the left edge, body still trails off the right edge.
    expect(pts[0]).toEqual([0, 3.5]);
    for (let i = 1; i < pts.length; i++) expect(Math.abs(pts[i][0] - pts[i - 1][0])).toBeLessThanOrEqual(1);
  });
});

import { drawGardenBoard } from './garden';
import { Ctx2D } from './ctx2d';

/** A stand-in for Skia that counts every call the drawing code makes. */
function countingSkia() {
  let calls = 0;
  const any: any = new Proxy(function () {}, {
    get: (_t, k) => (k === 'then' ? undefined : any),
    apply: () => {
      calls++;
      return any;
    },
  });
  return { S: any, canvas: any, count: () => calls, reset: () => (calls = 0) };
}

describe('drawing cost', () => {
  const line = (len: number, y: number) => Array.from({ length: len }, (_, i) => ({ x: len - i, y }));
  const frame = (sk: ReturnType<typeof countingSkia>, len: number) => {
    sk.reset();
    drawGardenBoard(new Ctx2D(sk.S, sk.canvas), { grass: null, wood: null }, {
      cell: 20, frame: 8, cols: 40, rows: 20, frac: 0.5, time: 1,
      fruits: Array.from({ length: 10 }, (_, i) => ({ x: i, y: 19 })),
      snakes: [0, 1, 2, 3].map((s) => ({ body: line(len, 2 + s * 4), species: s * 2, alive: true })),
    });
    return sk.count();
  };

  it('stays small per cell of snake, so long snakes do not slow the game down', () => {
    const sk = countingSkia();
    frame(sk, 5); // warm the head and apple caches
    const short = frame(sk, 5);
    const long = frame(sk, 35);
    const perCell = (long - short) / (4 * 30);
    expect(perCell).toBeLessThan(80);
    expect(long).toBeLessThan(12000);
  });
});
