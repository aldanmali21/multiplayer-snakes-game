/**
 * Pure game rules. No React, no networking, no timers: the Host calls `step`
 * once per tick and everything else is data in, data out.
 */

export type Dir = 'up' | 'down' | 'left' | 'right';
export type Vec = { x: number; y: number };

export type Config = {
  width: number;
  height: number;
  targetScore: number;
  startLength: number;
  /** Milliseconds between ticks (used by the Host's loop, not by the rules). */
  tickMs: number;
  /** true: touching a Wall kills. false: snakes wrap around to the opposite side. */
  walls: boolean;
  /** true: hitting another snake kills. false: snakes pass through each other. */
  snakeCollisions: boolean;
  /** How many apples are on the board at once. */
  apples: number;
};

/** The parts of the Config that players may change before a match. */
export type MatchSettings = Pick<Config, 'walls' | 'snakeCollisions' | 'apples' | 'targetScore'>;
export const DEFAULT_SETTINGS: MatchSettings = { walls: true, snakeCollisions: true, apples: 3, targetScore: 20 };
export const MIN_APPLES = 1;
export const MAX_APPLES = 10;
/** Target Score choices: 5 to 100 in steps of 5. */
export const MIN_TARGET = 5;
export const MAX_TARGET = 100;
export const TARGET_STEP = 5;

/** Cleans settings that came from storage or over the network. */
export function sanitizeSettings(s: Partial<MatchSettings> | undefined): MatchSettings {
  const apples = Math.round(Number(s?.apples ?? DEFAULT_SETTINGS.apples));
  const target = Math.round(Number(s?.targetScore ?? DEFAULT_SETTINGS.targetScore) / TARGET_STEP) * TARGET_STEP;
  return {
    walls: typeof s?.walls === 'boolean' ? s.walls : DEFAULT_SETTINGS.walls,
    snakeCollisions: typeof s?.snakeCollisions === 'boolean' ? s.snakeCollisions : DEFAULT_SETTINGS.snakeCollisions,
    apples: Number.isFinite(apples) ? Math.min(MAX_APPLES, Math.max(MIN_APPLES, apples)) : DEFAULT_SETTINGS.apples,
    targetScore: Number.isFinite(target) ? Math.min(MAX_TARGET, Math.max(MIN_TARGET, target)) : DEFAULT_SETTINGS.targetScore,
  };
}

/** Cells on the board's short side. The long side follows the screen's shape. */
export const BOARD_SHORT_SIDE = 18;
const BOARD_MAX_LONG_SIDE = 34;

/**
 * Picks a board that fills a play area of the given shape (width / height),
 * so the lawn uses the whole screen instead of sitting in a small square.
 */
export function boardSizeFor(aspect: number): { width: number; height: number } {
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const long = Math.max(BOARD_SHORT_SIDE, Math.min(BOARD_MAX_LONG_SIDE, Math.round(BOARD_SHORT_SIDE * Math.max(a, 1 / a))));
  return a >= 1 ? { width: long, height: BOARD_SHORT_SIDE } : { width: BOARD_SHORT_SIDE, height: long };
}

/** Number of snake species a player can choose from. */
export const SPECIES_COUNT = 8;

export const DEFAULT_CONFIG: Config = {
  width: 20,
  height: 20,
  targetScore: 20,
  startLength: 3,
  tickMs: 125,
  walls: true,
  snakeCollisions: true,
  apples: 3,
};

export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 4;

export type Snake = {
  id: string;
  name: string;
  /** Which of the SPECIES_COUNT snake looks this player chose. */
  species: number;
  /** Head first. Empty once the snake is dead. */
  body: Vec[];
  dir: Dir;
  /** Turns waiting for upcoming ticks. */
  queue: Dir[];
  alive: boolean;
  /** Growth Score: fruit eaten this match. */
  score: number;
  /** Length at the moment of death, used to pick a winner if everyone dies. */
  deathLength: number;
};

export type MatchState = {
  config: Config;
  snakes: Snake[];
  fruits: Vec[];
  /** Number of apples kept on the board. */
  fruitTarget: number;
  status: 'running' | 'over';
  winners: string[];
  tick: number;
  rng: number;
};

export type PlayerInfo = { id: string; name: string; species?: number };

const VECTORS: Record<Dir, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

const MAX_QUEUED_TURNS = 2;

/** mulberry32: tiny seeded generator so matches are reproducible in tests. */
function nextRandom(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

const key = (v: Vec) => `${v.x},${v.y}`;

type Start = { head: Vec; dir: Dir };

/** Corner starts in join order: top-left, bottom-right, top-right, bottom-left. All on different rows. */
function starts(c: Config): Start[] {
  return [
    { head: { x: 3, y: 2 }, dir: 'right' },
    { head: { x: c.width - 4, y: c.height - 3 }, dir: 'left' },
    { head: { x: c.width - 4, y: 4 }, dir: 'left' },
    { head: { x: 3, y: c.height - 5 }, dir: 'right' },
  ];
}

export function createMatch(
  players: PlayerInfo[],
  overrides: Partial<Config> = {},
  seed = Date.now(),
): MatchState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(`A match needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players`);
  }
  const config = { ...DEFAULT_CONFIG, ...overrides };
  const corners = starts(config);
  const snakes: Snake[] = players.map((p, i) => {
    const { head, dir } = corners[i];
    const back = VECTORS[OPPOSITE[dir]];
    const body = Array.from({ length: config.startLength }, (_, n) => ({
      x: head.x + back.x * n,
      y: head.y + back.y * n,
    }));
    return { id: p.id, name: p.name, species: p.species ?? i, body, dir, queue: [], alive: true, score: 0, deathLength: 0 };
  });
  const base: MatchState = {
    config,
    snakes,
    fruits: [],
    fruitTarget: Math.min(MAX_APPLES, Math.max(MIN_APPLES, Math.round(config.apples))),
    status: 'running',
    winners: [],
    tick: 0,
    rng: seed | 0,
  };
  return topUpFruit(base);
}

/** Queue a direction change. Reversing or repeating the last direction is ignored. */
export function turn(state: MatchState, id: string, dir: Dir): MatchState {
  if (state.status !== 'running') return state;
  const i = state.snakes.findIndex((s) => s.id === id);
  if (i < 0) return state;
  const s = state.snakes[i];
  if (!s.alive || s.queue.length >= MAX_QUEUED_TURNS) return state;
  const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
  if (dir === last || dir === OPPOSITE[last]) return state;
  const snakes = state.snakes.slice();
  snakes[i] = { ...s, queue: [...s.queue, dir] };
  return { ...state, snakes };
}

/** Kill a snake outside the normal rules, e.g. its player dropped off the network. */
export function eliminate(state: MatchState, id: string): MatchState {
  const i = state.snakes.findIndex((s) => s.id === id);
  if (i < 0 || !state.snakes[i].alive) return state;
  const snakes = state.snakes.slice();
  snakes[i] = kill(snakes[i]);
  return settle({ ...state, snakes });
}

function kill(s: Snake): Snake {
  return { ...s, alive: false, deathLength: s.body.length, body: [], queue: [] };
}

/** Advance the match by one tick. */
export function step(state: MatchState): MatchState {
  if (state.status !== 'running') return state;
  const { width, height } = state.config;

  // 1. Everyone picks a direction and computes where the head would land.
  const moves = state.snakes.map((s) => {
    if (!s.alive) return { snake: s, head: null as Vec | null, grows: false, body: s.body };
    const dir = s.queue.length ? s.queue[0] : s.dir;
    const queue = s.queue.slice(1);
    const v = VECTORS[dir];
    let head = { x: s.body[0].x + v.x, y: s.body[0].y + v.y };
    if (!state.config.walls) head = { x: (head.x + width) % width, y: (head.y + height) % height };
    const grows = state.fruits.some((f) => f.x === head.x && f.y === head.y);
    const body = [head, ...(grows ? s.body : s.body.slice(0, -1))];
    return { snake: { ...s, dir, queue }, head, grows, body };
  });

  // 2. Collisions are judged against the bodies as they will be after the move.
  const { snakeCollisions } = state.config;
  const occupiedBy = new Map<string, Set<string>>();
  for (const m of moves) {
    m.body.forEach((c, idx) => {
      if (idx === 0) return;
      const k = key(c);
      if (!occupiedBy.has(k)) occupiedBy.set(k, new Set());
      occupiedBy.get(k)!.add(m.snake.id);
    });
  }
  const headCounts = new Map<string, number>();
  for (const m of moves) {
    if (m.head) headCounts.set(key(m.head), (headCounts.get(key(m.head)) ?? 0) + 1);
  }

  const eaten = new Set<string>();
  const snakes = moves.map((m) => {
    if (!m.head) return m.snake;
    const h = m.head;
    const owners = occupiedBy.get(key(h));
    const hitsBody = owners ? (snakeCollisions ? owners.size > 0 : owners.has(m.snake.id)) : false;
    const dead =
      h.x < 0 ||
      h.y < 0 ||
      h.x >= width ||
      h.y >= height ||
      hitsBody ||
      (snakeCollisions && (headCounts.get(key(h)) ?? 0) > 1);
    // Keep the direction it was heading when it hit, so the crash can be shown going the right way.
    if (dead) return kill({ ...state.snakes.find((s) => s.id === m.snake.id)!, dir: m.snake.dir });
    if (m.grows) eaten.add(key(h));
    return { ...m.snake, body: m.body, score: m.snake.score + (m.grows ? 1 : 0) };
  });

  const fruits = state.fruits.filter((f) => !eaten.has(key(f)));
  return settle(topUpFruit({ ...state, snakes, fruits, tick: state.tick + 1 }));
}

/** Decide whether the match is over and who won. */
function settle(state: MatchState): MatchState {
  if (state.status !== 'running') return state;
  const reached = state.snakes.filter((s) => s.alive && s.score >= state.config.targetScore);
  if (reached.length) {
    return { ...state, status: 'over', winners: reached.map((s) => s.id) };
  }
  if (state.snakes.some((s) => s.alive)) return state;
  // Everyone died: longest snake wins, but a lone player only wins by reaching the target.
  if (state.snakes.length === 1) return { ...state, status: 'over', winners: [] };
  const longest = Math.max(...state.snakes.map((s) => s.deathLength));
  return {
    ...state,
    status: 'over',
    winners: state.snakes.filter((s) => s.deathLength === longest).map((s) => s.id),
  };
}

function topUpFruit(state: MatchState): MatchState {
  let { rng } = state;
  const fruits = state.fruits.slice();
  const taken = new Set<string>([
    ...state.snakes.flatMap((s) => s.body.map(key)),
    ...fruits.map(key),
  ]);
  while (fruits.length < state.fruitTarget) {
    const free: Vec[] = [];
    for (let y = 0; y < state.config.height; y++) {
      for (let x = 0; x < state.config.width; x++) {
        if (!taken.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    if (!free.length) break;
    const [r, nextRng] = nextRandom(rng);
    rng = nextRng;
    const spot = free[Math.floor(r * free.length)];
    fruits.push(spot);
    taken.add(key(spot));
  }
  return { ...state, fruits, rng };
}
