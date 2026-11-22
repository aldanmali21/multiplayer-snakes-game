import type { Dir } from '../game/rules';

/** Width of each side column in the landscape match layout. */
export const SIDE_COLUMN = 150;
/** Height taken by the buttons, scores and labels above the board in portrait. */
export const PORTRAIT_CHROME = 180;
/** Wood frame thickness as a fraction of one cell. */
const FRAME_PER_CELL = 0.4;

type Size = { width: number; height: number };
type Insets = { top: number; bottom: number; left: number; right: number };

/**
 * Rough width/height ratio of the lawn area on this phone, used to pick the
 * board's shape when a match starts. Full screen means landscape with no bars.
 */
export function playAreaAspect(win: Size, insets: Insets, fullscreen: boolean): number {
  const short = Math.min(win.width, win.height);
  const long = Math.max(win.width, win.height);
  if (fullscreen) {
    const w = long - 2 * (SIDE_COLUMN + 12) - 16;
    const h = short - 16;
    return w > 0 && h > 0 ? w / h : 1;
  }
  const w = short - 20;
  const h = long - insets.top - insets.bottom - PORTRAIT_CHROME;
  return w > 0 && h > 0 ? w / h : 1;
}

export type BoardFit = {
  /** Size of one cell in px. */
  cell: number;
  /** Wood frame thickness in px. */
  frame: number;
  /** Board size in px including the frame, before any rotation. */
  width: number;
  height: number;
  /** True when the board is turned a quarter turn clockwise to fit better. */
  rotated: boolean;
};

function fitCell(areaW: number, areaH: number, cols: number, rows: number) {
  const k = 2 * FRAME_PER_CELL;
  return Math.max(1, Math.min(areaW / (cols + k), areaH / (rows + k)));
}

/**
 * Fit a cols x rows board into an area as large as possible. When the board's
 * shape doesn't match the area (say a landscape board on a portrait phone),
 * it is turned a quarter turn so it still fills the screen.
 */
export function fitBoard(areaW: number, areaH: number, cols: number, rows: number): BoardFit {
  const straight = fitCell(areaW, areaH, cols, rows);
  const turned = fitCell(areaW, areaH, rows, cols);
  const rotated = cols !== rows && turned > straight * 1.05;
  const cell = Math.floor((rotated ? turned : straight) * 4) / 4;
  const frame = Math.max(5, Math.round(cell * FRAME_PER_CELL));
  return { cell, frame, width: cell * cols + frame * 2, height: cell * rows + frame * 2, rotated };
}

/**
 * Turn a swipe on the screen into a direction on the board. When the board is
 * turned clockwise, the board's "up" points right on the screen.
 */
export function screenToBoard(dir: Dir, rotated: boolean): Dir {
  if (!rotated) return dir;
  const map: Record<Dir, Dir> = { right: 'up', down: 'right', left: 'down', up: 'left' };
  return map[dir];
}
