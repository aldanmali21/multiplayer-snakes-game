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
};

export const DEFAULT_CONFIG: Config = {
  width: 20,
  height: 20,
  targetScore: 20,
  startLength: 3,
  tickMs: 125,
};

export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 4;

export type Snake = {
  id: string;
  name: string;
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
  /** Number of fruits kept on the board (one per player). */
  fruitTarget: number;
  status: 'running' | 'over';
  winners: string[];
  tick: number;
  rng: number;
};

export type PlayerInfo = { id: string; name: string };

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
    return { id: p.id, name: p.name, body, dir, queue: [], alive: true, score: 0, deathLength: 0 };
  });
  const base: MatchState = {
    config,
    snakes,
    fruits: [],
    fruitTarget: players.length,
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
    const head = { x: s.body[0].x + v.x, y: s.body[0].y + v.y };
    const grows = state.fruits.some((f) => f.x === head.x && f.y === head.y);
    const body = [head, ...(grows ? s.body : s.body.slice(0, -1))];
    return { snake: { ...s, dir, queue }, head, grows, body };
  });

  // 2. Collisions are judged against the bodies as they will be after the move.
  const occupied = new Map<string, number>();
  for (const m of moves) {
    m.body.forEach((c, idx) => {
      if (idx > 0) occupied.set(key(c), (occupied.get(key(c)) ?? 0) + 1);
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
    const dead =
      h.x < 0 ||
      h.y < 0 ||
      h.x >= width ||
      h.y >= height ||
      occupied.has(key(h)) ||
      (headCounts.get(key(h)) ?? 0) > 1;
    if (dead) return kill(state.snakes.find((s) => s.id === m.snake.id)!);
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
