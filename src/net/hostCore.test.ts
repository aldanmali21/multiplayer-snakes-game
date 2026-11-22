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
    expect(snap.players).toEqual([{ id: HOST_ID, name: 'Hosty', isHost: true, connected: true }]);
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
