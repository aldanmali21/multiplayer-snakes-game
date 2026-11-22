import { describe, expect, it } from 'vitest';
import {
  createMatch,
  eliminate,
  step,
  turn,
  DEFAULT_CONFIG,
  type MatchState,
  type Snake,
  type Vec,
} from './rules';

const players = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Player ${i}` }));

/** Build a match and then override snakes/fruit for a precise scenario. */
function scenario(
  snakes: Array<Partial<Snake> & { id: string; body: Vec[] }>,
  fruits: Vec[] = [],
  config = {},
): MatchState {
  const base = createMatch(players(snakes.length), { ...config }, 1);
  return {
    ...base,
    fruits,
    snakes: snakes.map((s, i) => ({
      ...base.snakes[i],
      dir: 'right',
      queue: [],
      alive: true,
      score: 0,
      ...s,
    })),
  };
}

const snake = (state: MatchState, id: string) => state.snakes.find((s) => s.id === id)!;

describe('createMatch', () => {
  it('gives each player a length-3 snake in its own corner', () => {
    const m = createMatch(players(4), {}, 42);
    expect(m.snakes).toHaveLength(4);
    for (const s of m.snakes) {
      expect(s.body).toHaveLength(DEFAULT_CONFIG.startLength);
      expect(s.alive).toBe(true);
      expect(s.score).toBe(0);
    }
    const heads = m.snakes.map((s) => s.body[0]);
    const quadrants = heads.map((h) => `${h.x < 10 ? 'L' : 'R'}${h.y < 10 ? 'T' : 'B'}`);
    expect(new Set(quadrants).size).toBe(4);
  });

  it('places one fruit per player on free cells', () => {
    const m = createMatch(players(3), {}, 7);
    expect(m.fruits).toHaveLength(3);
    const occupied = new Set(m.snakes.flatMap((s) => s.body.map((c) => `${c.x},${c.y}`)));
    for (const f of m.fruits) expect(occupied.has(`${f.x},${f.y}`)).toBe(false);
  });

  it('rejects more than 4 or fewer than 1 players', () => {
    expect(() => createMatch(players(0), {}, 1)).toThrow();
    expect(() => createMatch(players(5), {}, 1)).toThrow();
  });

  it('does not crash into anything during the first ticks with 4 players and no input', () => {
    let m = createMatch(players(4), {}, 3);
    m = { ...m, fruits: [] };
    for (let i = 0; i < 5; i++) m = step(m);
    expect(m.snakes.every((s) => s.alive)).toBe(true);
  });
});

describe('movement and turning', () => {
  it('moves the head one cell in its direction and keeps length', () => {
    const m = scenario([{ id: 'p0', body: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }] }]);
    const next = step(m);
    expect(snake(next, 'p0').body).toEqual([{ x: 6, y: 5 }, { x: 5, y: 5 }, { x: 4, y: 5 }]);
  });

  it('applies a turn on the next tick', () => {
    let m = scenario([{ id: 'p0', body: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }] }]);
    m = turn(m, 'p0', 'up');
    m = step(m);
    expect(snake(m, 'p0').body[0]).toEqual({ x: 5, y: 4 });
  });

  it('ignores reversing straight into itself', () => {
    let m = scenario([{ id: 'p0', body: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }] }]);
    m = turn(m, 'p0', 'left');
    m = step(m);
    expect(snake(m, 'p0').body[0]).toEqual({ x: 6, y: 5 });
    expect(snake(m, 'p0').alive).toBe(true);
  });

  it('buffers two quick turns across two ticks', () => {
    let m = scenario([{ id: 'p0', body: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }] }]);
    m = turn(m, 'p0', 'up');
    m = turn(m, 'p0', 'left');
    m = step(m);
    m = step(m);
    expect(snake(m, 'p0').body[0]).toEqual({ x: 4, y: 4 });
  });

  it('ignores turns from dead or unknown snakes', () => {
    const m = scenario([{ id: 'p0', body: [{ x: 5, y: 5 }], alive: false }]);
    expect(turn(m, 'p0', 'up')).toBe(m);
    expect(turn(m, 'nobody', 'up')).toBe(m);
  });
});

describe('fruit and growth', () => {
  it('grows by one and scores when the head reaches fruit', () => {
    const m = scenario(
      [{ id: 'p0', body: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }] }],
      [{ x: 6, y: 5 }],
    );
    const next = step(m);
    const s = snake(next, 'p0');
    expect(s.score).toBe(1);
    expect(s.body).toHaveLength(4);
    expect(next.fruits).toHaveLength(1);
    expect(next.fruits[0]).not.toEqual({ x: 6, y: 5 });
  });

  it('keeps the fruit count equal to the number of players', () => {
    let m = createMatch(players(2), {}, 11);
    for (let i = 0; i < 30; i++) m = step(m);
    expect(m.fruits).toHaveLength(2);
  });

  it('never spawns fruit on a snake', () => {
    let m = createMatch(players(1), { width: 6, height: 6 }, 5);
    for (let i = 0; i < 200 && m.status === 'running'; i++) {
      const occupied = new Set(m.snakes.flatMap((s) => s.body.map((c) => `${c.x},${c.y}`)));
      for (const f of m.fruits) expect(occupied.has(`${f.x},${f.y}`)).toBe(false);
      const head = m.snakes[0].body[0];
      // simple circling to stay alive on a small board
      const dir = head.x === 4 && head.y < 4 ? 'down' : head.y === 4 && head.x > 1 ? 'left' : head.x === 1 && head.y > 1 ? 'up' : 'right';
      m = step(turn(m, 'p0', dir));
    }
  });
});

describe('deaths', () => {
  it('dies on hitting a wall and its body disappears', () => {
    const m = scenario([
      { id: 'p0', body: [{ x: 19, y: 5 }, { x: 18, y: 5 }, { x: 17, y: 5 }] },
      { id: 'p1', body: [{ x: 5, y: 15 }, { x: 4, y: 15 }, { x: 3, y: 15 }] },
    ]);
    const next = step(m);
    expect(snake(next, 'p0').alive).toBe(false);
    expect(snake(next, 'p0').body).toEqual([]);
    expect(snake(next, 'p1').alive).toBe(true);
  });

  it('dies on hitting its own body', () => {
    const body = [
      { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }, { x: 6, y: 4 },
    ];
    const m = scenario([{ id: 'p0', body, dir: 'up' }, { id: 'p1', body: [{ x: 1, y: 15 }] }]);
    const next = step(turn(m, 'p0', 'right'));
    expect(snake(next, 'p0').alive).toBe(false);
  });

  it('may move into the cell its own tail is leaving', () => {
    const body = [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }];
    const m = scenario([{ id: 'p0', body, dir: 'up' }]);
    const next = step(turn(m, 'p0', 'right'));
    expect(snake(next, 'p0').alive).toBe(true);
  });

  it('dies on hitting another snake body; the other survives', () => {
    const m = scenario([
      { id: 'p0', body: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }] },
      { id: 'p1', body: [{ x: 7, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }, { x: 6, y: 4 }], dir: 'right' },
    ]);
    const next = step(m);
    expect(snake(next, 'p0').alive).toBe(false);
    expect(snake(next, 'p1').alive).toBe(true);
  });

  it('kills both snakes when heads meet on the same cell', () => {
    const m = scenario([
      { id: 'p0', body: [{ x: 5, y: 5 }, { x: 4, y: 5 }], dir: 'right' },
      { id: 'p1', body: [{ x: 7, y: 5 }, { x: 8, y: 5 }], dir: 'left' },
      { id: 'p2', body: [{ x: 1, y: 15 }, { x: 0, y: 15 }], dir: 'right' },
    ]);
    const next = step(m);
    expect(snake(next, 'p0').alive).toBe(false);
    expect(snake(next, 'p1').alive).toBe(false);
    expect(snake(next, 'p2').alive).toBe(true);
  });

  it('kills both snakes when heads swap places', () => {
    const m = scenario([
      { id: 'p0', body: [{ x: 5, y: 5 }, { x: 4, y: 5 }], dir: 'right' },
      { id: 'p1', body: [{ x: 6, y: 5 }, { x: 7, y: 5 }], dir: 'left' },
      { id: 'p2', body: [{ x: 1, y: 15 }, { x: 0, y: 15 }], dir: 'right' },
    ]);
    const next = step(m);
    expect(snake(next, 'p0').alive).toBe(false);
    expect(snake(next, 'p1').alive).toBe(false);
  });

  it('does not let a dying snake eat fruit', () => {
    const m = scenario(
      [
        { id: 'p0', body: [{ x: 5, y: 5 }, { x: 4, y: 5 }], dir: 'right' },
        { id: 'p1', body: [{ x: 7, y: 5 }, { x: 8, y: 5 }], dir: 'left' },
        { id: 'p2', body: [{ x: 1, y: 15 }, { x: 0, y: 15 }], dir: 'right' },
      ],
      [{ x: 6, y: 5 }],
    );
    const next = step(m);
    expect(next.fruits).toContainEqual({ x: 6, y: 5 });
    expect(snake(next, 'p0').score).toBe(0);
  });

  it('eliminate() kills a snake (used for dropped connections)', () => {
    const m = scenario([
      { id: 'p0', body: [{ x: 5, y: 5 }] },
      { id: 'p1', body: [{ x: 5, y: 15 }] },
    ]);
    const next = eliminate(m, 'p0');
    expect(snake(next, 'p0').alive).toBe(false);
    expect(snake(next, 'p0').body).toEqual([]);
  });
});

describe('winning', () => {
  it('ends the match when a snake reaches the target score', () => {
    const m = scenario(
      [
        { id: 'p0', body: [{ x: 5, y: 5 }, { x: 4, y: 5 }], score: 19 },
        { id: 'p1', body: [{ x: 5, y: 15 }, { x: 4, y: 15 }], score: 3 },
      ],
      [{ x: 6, y: 5 }, { x: 0, y: 0 }],
    );
    const next = step(m);
    expect(next.status).toBe('over');
    expect(next.winners).toEqual(['p0']);
  });

  it('shares the win when two snakes reach the target on the same tick', () => {
    const m = scenario(
      [
        { id: 'p0', body: [{ x: 5, y: 5 }, { x: 4, y: 5 }], score: 19 },
        { id: 'p1', body: [{ x: 5, y: 15 }, { x: 4, y: 15 }], score: 19 },
      ],
      [{ x: 6, y: 5 }, { x: 6, y: 15 }],
    );
    const next = step(m);
    expect(next.status).toBe('over');
    expect(next.winners.sort()).toEqual(['p0', 'p1']);
  });

  it('gives the win to the longest snake when everyone dies', () => {
    let m = scenario([
      { id: 'p0', body: [{ x: 19, y: 5 }, { x: 18, y: 5 }, { x: 17, y: 5 }], score: 4 },
      { id: 'p1', body: [{ x: 5, y: 15 }, { x: 4, y: 15 }], score: 2 },
    ]);
    m = step(m);
    expect(m.status).toBe('running');
    m = eliminate(m, 'p1');
    expect(m.status).toBe('over');
    expect(m.winners).toEqual(['p0']);
  });

  it('shares the win between equally long snakes when everyone dies', () => {
    const m = scenario([
      { id: 'p0', body: [{ x: 19, y: 5 }, { x: 18, y: 5 }], score: 2 },
      { id: 'p1', body: [{ x: 19, y: 15 }, { x: 18, y: 15 }], score: 2 },
    ]);
    const next = step(m);
    expect(next.status).toBe('over');
    expect(next.winners.sort()).toEqual(['p0', 'p1']);
  });

  it('has no winner when a solo player dies before the target', () => {
    const m = scenario([{ id: 'p0', body: [{ x: 19, y: 5 }, { x: 18, y: 5 }], score: 7 }]);
    const next = step(m);
    expect(next.status).toBe('over');
    expect(next.winners).toEqual([]);
  });

  it('keeps going while one snake is left alive below the target', () => {
    const m = scenario([
      { id: 'p0', body: [{ x: 19, y: 5 }, { x: 18, y: 5 }], score: 9 },
      { id: 'p1', body: [{ x: 5, y: 15 }, { x: 4, y: 15 }], score: 1 },
    ]);
    const next = step(m);
    expect(next.status).toBe('running');
  });

  it('does nothing once the match is over', () => {
    const m = { ...scenario([{ id: 'p0', body: [{ x: 5, y: 5 }] }]), status: 'over' as const };
    expect(step(m)).toBe(m);
  });

  it('respects a custom target score', () => {
    const m = scenario(
      [{ id: 'p0', body: [{ x: 5, y: 5 }, { x: 4, y: 5 }], score: 2 }],
      [{ x: 6, y: 5 }],
      { targetScore: 3 },
    );
    expect(step(m).status).toBe('over');
  });
});

describe('determinism', () => {
  it('produces identical matches from the same seed and inputs', () => {
    const run = () => {
      let m = createMatch(players(2), {}, 99);
      for (let i = 0; i < 40; i++) {
        if (i === 10) m = turn(m, 'p0', 'down');
        m = step(m);
      }
      return m;
    };
    expect(run()).toEqual(run());
  });
});

describe('easy-mode settings', () => {
  it('wraps around instead of dying when walls are off', () => {
    let m = scenario([{ id: 'p0', body: [{ x: 19, y: 5 }, { x: 18, y: 5 }, { x: 17, y: 5 }] }], [], { walls: false });
    m = step(m);
    expect(snake(m, 'p0').alive).toBe(true);
    expect(snake(m, 'p0').body[0]).toEqual({ x: 0, y: 5 });
    m = step(turn(m, 'p0', 'up'));
    m = scenario([{ id: 'p0', body: [{ x: 4, y: 0 }, { x: 4, y: 1 }], dir: 'up' }], [], { walls: false });
    expect(snake(step(m), 'p0').body[0]).toEqual({ x: 4, y: 19 });
  });

  it('can eat fruit on the far side after wrapping', () => {
    const m = scenario([{ id: 'p0', body: [{ x: 0, y: 3 }, { x: 1, y: 3 }], dir: 'left' }], [{ x: 19, y: 3 }], { walls: false });
    const next = step(m);
    expect(snake(next, 'p0').score).toBe(1);
  });

  it('lets snakes pass through each other when collisions are off', () => {
    const m = scenario(
      [
        { id: 'p0', body: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }] },
        { id: 'p1', body: [{ x: 7, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }, { x: 6, y: 4 }], dir: 'right' },
      ],
      [],
      { snakeCollisions: false },
    );
    const next = step(m);
    expect(snake(next, 'p0').alive).toBe(true);
    expect(snake(next, 'p1').alive).toBe(true);
  });

  it('lets heads meet without dying when collisions are off', () => {
    const m = scenario(
      [
        { id: 'p0', body: [{ x: 5, y: 5 }, { x: 4, y: 5 }], dir: 'right' },
        { id: 'p1', body: [{ x: 7, y: 5 }, { x: 8, y: 5 }], dir: 'left' },
      ],
      [],
      { snakeCollisions: false },
    );
    const next = step(m);
    expect(next.snakes.every((s) => s.alive)).toBe(true);
  });

  it('still kills a snake that bites itself when collisions are off', () => {
    const body = [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }, { x: 6, y: 4 }];
    const m = scenario([{ id: 'p0', body, dir: 'up' }], [], { snakeCollisions: false, walls: false });
    expect(snake(step(turn(m, 'p0', 'right')), 'p0').alive).toBe(false);
  });

  it('still kills on walls when only collisions are off', () => {
    const m = scenario([{ id: 'p0', body: [{ x: 19, y: 5 }, { x: 18, y: 5 }] }], [], { snakeCollisions: false });
    expect(snake(step(m), 'p0').alive).toBe(false);
  });
});

describe('species', () => {
  it('uses the species each player chose, defaulting to join order', () => {
    const m = createMatch([{ id: 'a', name: 'A', species: 6 }, { id: 'b', name: 'B' }], {}, 1);
    expect(m.snakes.map((s) => s.species)).toEqual([6, 1]);
  });
});
