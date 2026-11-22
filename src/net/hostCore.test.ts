import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HostCore, HOST_ID, type Conn, type HostSnapshot } from './hostCore';
import { LineBuffer, REJOIN_GRACE_MS, encode, normaliseCode, randomCode, type ServerMsg } from './protocol';

class FakeConn implements Conn {
  sent: ServerMsg[] = [];
  closed = false;
  send(m: ServerMsg) { this.sent.push(m); }
  close() { this.closed = true; }
  last<T extends ServerMsg['t']>(t: T) {
    return [...this.sent].reverse().find((m) => m.t === t) as Extract<ServerMsg, { t: T }> | undefined;
  }
}

let snap: HostSnapshot;
const make = () => new HostCore({ hostName: 'Hosty', code: 'ABCD', onUpdate: (s) => (snap = s), seed: 1 });
const join = (core: HostCore, id: string, name = id, code = 'ABCD') => {
  const c = new FakeConn();
  core.handle(c, { t: 'hello', id, name, code });
  return c;
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('joining', () => {
  it('lists the host alone at first', () => {
    make();
    expect(snap.players).toEqual([{ id: HOST_ID, name: 'Hosty', isHost: true, connected: true, species: 0 }]);
    expect(snap.phase).toBe('lobby');
  });

  it('welcomes a joiner and tells everyone', () => {
    const core = make();
    const a = join(core, 'a', 'Ann');
    const b = join(core, 'b', 'Bob');
    expect(a.last('welcome')).toEqual({ t: 'welcome', id: 'a' });
    expect(b.last('room')!.players.map((p) => p.name)).toEqual(['Hosty', 'Ann', 'Bob']);
    expect(a.last('room')!.players).toHaveLength(3);
    expect(snap.players).toHaveLength(3);
  });

  it('accepts the code in any case', () => {
    const core = make();
    const a = join(core, 'a', 'Ann', ' abcd ');
    expect(a.last('welcome')).toBeDefined();
  });

  it('rejects a wrong code', () => {
    const core = make();
    const a = join(core, 'a', 'Ann', 'ZZZZ');
    expect(a.last('reject')).toEqual({ t: 'reject', reason: 'bad-code' });
    expect(a.closed).toBe(true);
    expect(snap.players).toHaveLength(1);
  });

  it('rejects the fifth player', () => {
    const core = make();
    join(core, 'a'); join(core, 'b'); join(core, 'c');
    const d = join(core, 'd');
    expect(d.last('reject')).toEqual({ t: 'reject', reason: 'full' });
    expect(core.open).toBe(false);
  });

  it('gives duplicate names a number', () => {
    const core = make();
    join(core, 'a', 'Sam');
    join(core, 'b', 'Sam');
    expect(snap.players.map((p) => p.name)).toEqual(['Hosty', 'Sam', 'Sam 2']);
  });

  it('removes someone who disconnects in the lobby', () => {
    const core = make();
    const a = join(core, 'a');
    core.disconnected(a);
    expect(snap.players).toHaveLength(1);
  });

  it('removes someone who leaves in the lobby', () => {
    const core = make();
    const a = join(core, 'a');
    core.handle(a, { t: 'leave' });
    expect(snap.players).toHaveLength(1);
    expect(a.closed).toBe(true);
  });
});

describe('running a match', () => {
  it('counts down, runs ticks and sends state to joiners', () => {
    const core = make();
    const a = join(core, 'a', 'Ann');
    core.start();
    expect(snap.phase).toBe('countdown');
    expect(a.last('room')!.phase).toBe('countdown');
    expect(a.last('tick')!.countdown).toBe(3);

    vi.advanceTimersByTime(3000);
    expect(snap.phase).toBe('running');
    const t0 = a.last('tick')!.state.tick;
    vi.advanceTimersByTime(500);
    expect(a.last('tick')!.state.tick).toBeGreaterThan(t0);
    expect(a.last('tick')!.state.snakes.map((s) => s.id)).toEqual([HOST_ID, 'a']);
  });

  it('blocks new joiners once the match has started', () => {
    const core = make();
    join(core, 'a');
    core.start();
    const late = join(core, 'z');
    expect(late.last('reject')).toEqual({ t: 'reject', reason: 'in-progress' });
    expect(core.open).toBe(false);
  });

  it('steers snakes from phone turns', () => {
    const core = make();
    const a = join(core, 'a');
    core.start();
    vi.advanceTimersByTime(3000);
    core.handle(a, { t: 'turn', dir: 'down' });
    vi.advanceTimersByTime(130);
    const snake = a.last('tick')!.state.snakes.find((s) => s.id === 'a')!;
    expect(snake.dir).toBe('down');
  });

  it('ignores turns from strangers and unknown sockets', () => {
    const core = make();
    join(core, 'a');
    core.start();
    vi.advanceTimersByTime(3000);
    expect(() => core.handle(new FakeConn(), { t: 'turn', dir: 'up' })).not.toThrow();
  });

  it('finishes the match, then play again returns everyone to the lobby', () => {
    const core = make();
    const a = join(core, 'a');
    core.start();
    vi.advanceTimersByTime(3000 + 20_000); // both snakes run into walls
    expect(snap.phase).toBe('over');
    expect(a.last('room')!.phase).toBe('over');
    core.playAgain();
    expect(snap.phase).toBe('lobby');
    expect(a.last('room')!.phase).toBe('lobby');
    expect(snap.players).toHaveLength(2);
    expect(core.open).toBe(true);
  });

  it('playAgain drops phones that are no longer connected', () => {
    const core = make();
    const a = join(core, 'a');
    core.start();
    vi.advanceTimersByTime(3000);
    core.disconnected(a);
    vi.advanceTimersByTime(REJOIN_GRACE_MS + 20_000);
    expect(snap.phase).toBe('over');
    core.playAgain();
    expect(snap.players.map((p) => p.id)).toEqual([HOST_ID]);
  });
});

describe('dropped connections', () => {
  it('keeps the snake moving and lets the phone rejoin within the grace period', () => {
    const core = make();
    const a = join(core, 'a');
    core.start();
    vi.advanceTimersByTime(3000);
    core.disconnected(a);
    expect(snap.players.find((p) => p.id === 'a')!.connected).toBe(false);

    vi.advanceTimersByTime(REJOIN_GRACE_MS - 5000);
    const back = new FakeConn();
    core.handle(back, { t: 'hello', id: 'a', name: 'Ann', code: 'ABCD' });
    expect(back.last('welcome')).toBeDefined();
    expect(back.last('tick')).toBeDefined();
    expect(snap.players.find((p) => p.id === 'a')!.connected).toBe(true);

    vi.advanceTimersByTime(REJOIN_GRACE_MS * 2);
    // Still tracked; its timer was cancelled (snake may have crashed into a wall by now, that is normal).
    expect(snap.players.find((p) => p.id === 'a')!.connected).toBe(true);
  });

  it('kills the snake when the phone does not come back in time', () => {
    const core = make();
    const a = join(core, 'a');
    core.start();
    vi.advanceTimersByTime(3000);
    core.disconnected(a);
    vi.advanceTimersByTime(REJOIN_GRACE_MS + 10);
    const state = snap.view!.state;
    expect(state.snakes.find((s) => s.id === 'a')!.alive).toBe(false);
  });

  it('replaces a stale connection when the same phone says hello again', () => {
    const core = make();
    const old = join(core, 'a');
    const fresh = new FakeConn();
    core.handle(fresh, { t: 'hello', id: 'a', name: 'Ann', code: 'ABCD' });
    expect(old.closed).toBe(true);
    expect(snap.players).toHaveLength(2);
    core.disconnected(old); // late close event from the old socket must not remove the new one
    expect(snap.players).toHaveLength(2);
  });

  it('kills a snake at once when its player leaves mid-match', () => {
    const core = make();
    const a = join(core, 'a');
    core.start();
    vi.advanceTimersByTime(3000);
    core.handle(a, { t: 'leave' });
    expect(snap.view!.state.snakes.find((s) => s.id === 'a')!.alive).toBe(false);
  });

  it('ends the match for everyone when the host closes the room', () => {
    const core = make();
    const a = join(core, 'a');
    core.start();
    core.close();
    expect(a.last('closed')).toBeDefined();
    expect(a.closed).toBe(true);
    const before = a.sent.length;
    vi.advanceTimersByTime(5000);
    expect(a.sent.length).toBe(before);
  });
});

describe('protocol helpers', () => {
  it('reassembles messages split across chunks and skips garbage', () => {
    const lb = new LineBuffer();
    const full = encode({ t: 'leave' }) + encode({ t: 'turn', dir: 'up' });
    expect(lb.push(full.slice(0, 5))).toEqual([]);
    expect(lb.push(full.slice(5) + 'not json\n')).toEqual([{ t: 'leave' }, { t: 'turn', dir: 'up' }]);
  });

  it('makes four-letter codes without confusing characters', () => {
    for (let i = 0; i < 200; i++) expect(randomCode()).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
    expect(normaliseCode(' ab12 ')).toBe('AB12');
  });
});

describe('choosing snakes', () => {
  it('gives each joiner a different snake, honouring their favourite when free', () => {
    const core = make();
    const a = new FakeConn();
    core.handle(a, { t: 'hello', id: 'a', name: 'Ann', code: 'ABCD', species: 5 });
    const b = new FakeConn();
    core.handle(b, { t: 'hello', id: 'b', name: 'Bob', code: 'ABCD', species: 5 }); // taken by Ann
    const species = snap.players.map((p) => p.species);
    expect(species[1]).toBe(5);
    expect(new Set(species).size).toBe(3);
  });

  it('lets a player switch to a free snake and refuses a taken one', () => {
    const core = make();
    const a = join(core, 'a');
    join(core, 'b');
    const bSpecies = snap.players.find((p) => p.id === 'b')!.species;
    core.handle(a, { t: 'pick', species: 7 });
    expect(snap.players.find((p) => p.id === 'a')!.species).toBe(7);
    core.handle(a, { t: 'pick', species: bSpecies });
    expect(snap.players.find((p) => p.id === 'a')!.species).toBe(7);
    expect(core.pick(HOST_ID, 7)).toBe(false);
    expect(core.pick(HOST_ID, 4)).toBe(true);
    expect(a.last('room')!.players.find((p) => p.id === HOST_ID)!.species).toBe(4);
  });

  it('ignores invalid snake numbers', () => {
    const core = make();
    const a = join(core, 'a');
    const before = snap.players[1].species;
    core.handle(a, { t: 'pick', species: 99 });
    core.handle(a, { t: 'pick', species: -1 });
    expect(snap.players[1].species).toBe(before);
  });

  it('cannot change snakes during a match', () => {
    const core = make();
    const a = join(core, 'a');
    core.start();
    core.handle(a, { t: 'pick', species: 7 });
    expect(snap.players[1].species).not.toBe(7);
  });

  it('uses the chosen snakes in the match', () => {
    const core = make();
    const a = join(core, 'a');
    core.handle(a, { t: 'pick', species: 6 });
    core.pick(HOST_ID, 3);
    core.start();
    expect(snap.view!.state.snakes.map((s) => s.species)).toEqual([3, 6]);
  });
});

describe('settings', () => {
  it('sends the host settings to phones and uses them in the match', () => {
    const core = make();
    const a = join(core, 'a');
    expect(a.last('room')!.settings).toEqual({ walls: true, snakeCollisions: true });
    core.setSettings({ walls: false });
    expect(a.last('room')!.settings).toEqual({ walls: false, snakeCollisions: true });
    core.setSettings({ snakeCollisions: false });
    core.start();
    expect(snap.view!.state.config.walls).toBe(false);
    expect(snap.view!.state.config.snakeCollisions).toBe(false);
  });

  it('cannot change settings mid-match', () => {
    const core = make();
    core.start();
    core.setSettings({ walls: false });
    expect(snap.settings.walls).toBe(true);
  });
});

describe('pausing', () => {
  it('any player can pause and resume for everyone', () => {
    const core = make();
    const a = join(core, 'a', 'Ann');
    core.start();
    vi.advanceTimersByTime(3000);
    vi.advanceTimersByTime(500);
    core.handle(a, { t: 'pause' });
    expect(snap.phase).toBe('paused');
    expect(snap.view!.pausedBy).toBe('Ann');
    expect(a.last('tick')!.pausedBy).toBe('Ann');
    const frozen = snap.view!.state.tick;
    vi.advanceTimersByTime(5000);
    expect(snap.view!.state.tick).toBe(frozen);
    // Turns are ignored while paused.
    core.handle(a, { t: 'turn', dir: 'down' });
    expect(snap.view!.state.snakes[1].queue).toEqual([]);

    core.resume(HOST_ID);
    expect(snap.phase).toBe('countdown');
    expect(snap.view!.pausedBy).toBeUndefined();
    vi.advanceTimersByTime(3000);
    expect(snap.phase).toBe('running');
    vi.advanceTimersByTime(300);
    expect(snap.view!.state.tick).toBeGreaterThan(frozen);
  });

  it('cannot pause in the lobby or resume when not paused', () => {
    const core = make();
    core.pause(HOST_ID);
    expect(snap.phase).toBe('lobby');
    core.start();
    vi.advanceTimersByTime(3000);
    core.resume(HOST_ID);
    expect(snap.phase).toBe('running');
  });

  it('a phone that drops while paused keeps its seat for the grace period', () => {
    const core = make();
    const a = join(core, 'a');
    core.start();
    vi.advanceTimersByTime(3000);
    core.pause(HOST_ID);
    core.disconnected(a);
    expect(snap.players).toHaveLength(2);
    const back = new FakeConn();
    core.handle(back, { t: 'hello', id: 'a', name: 'a', code: 'ABCD' });
    expect(back.last('tick')!.pausedBy).toBe('Hosty');
  });
});
