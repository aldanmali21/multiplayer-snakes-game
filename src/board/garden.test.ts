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
