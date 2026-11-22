import {
  createMatch,
  eliminate,
  step,
  turn as applyTurn,
  type Dir,
  type MatchState,
} from '../game/rules';
import { COUNTDOWN_SECONDS, type MatchView } from '../game/useLocalMatch';
import {
  MAX_ROOM_PLAYERS,
  REJOIN_GRACE_MS,
  normaliseCode,
  type ClientMsg,
  type Phase,
  type RoomPlayer,
  type ServerMsg,
} from './protocol';

/** One connected phone, as seen by the Host. The TCP layer provides these. */
export type Conn = { send(msg: ServerMsg): void; close(): void };

export const HOST_ID = 'host';

type Member = {
  id: string;
  name: string;
  conn: Conn | null;
  dropTimer?: ReturnType<typeof setTimeout>;
};

export type HostSnapshot = {
  code: string;
  phase: Phase;
  players: RoomPlayer[];
  view: MatchView | null;
};

type Options = {
  hostName: string;
  code: string;
  onUpdate: (snapshot: HostSnapshot) => void;
  seed?: number;
};

/**
 * The Host's brain: owns the Room, runs the Match and tells everyone what happened.
 * It knows nothing about sockets, which keeps it testable.
 */
export class HostCore {
  private members: Member[];
  private phase: Phase = 'lobby';
  private match: MatchState | null = null;
  private countdown = 0;
  private timer?: ReturnType<typeof setInterval>;
  private closed = false;

  constructor(private opts: Options) {
    this.members = [{ id: HOST_ID, name: opts.hostName, conn: null }];
    this.publish();
  }

  get code() {
    return this.opts.code;
  }

  /** How many seats are taken, and whether new people may still join. */
  get open() {
    return this.phase === 'lobby' && this.members.length < MAX_ROOM_PLAYERS;
  }

  get playerCount() {
    return this.members.length;
  }

  snapshot(): HostSnapshot {
    return {
      code: this.opts.code,
      phase: this.phase,
      players: this.roomPlayers(),
      view: this.match ? { state: this.match, countdown: this.countdown } : null,
    };
  }

  // ---- messages from phones -------------------------------------------------

  handle(conn: Conn, msg: ClientMsg) {
    if (this.closed) return;
    switch (msg.t) {
      case 'hello':
        return this.hello(conn, msg);
      case 'turn': {
        const m = this.memberOf(conn);
        if (m) this.turn(m.id, msg.dir);
        return;
      }
      case 'leave': {
        const m = this.memberOf(conn);
        if (m) this.remove(m, true);
        conn.close();
        return;
      }
    }
  }

  disconnected(conn: Conn) {
    if (this.closed) return;
    const m = this.memberOf(conn);
    if (!m) return;
    if (this.phase === 'lobby' || this.phase === 'over') {
      this.remove(m, false);
      return;
    }
    // Mid-match: the snake keeps going straight while the phone has a chance to come back.
    m.conn = null;
    m.dropTimer = setTimeout(() => {
      m.dropTimer = undefined;
      if (m.conn) return;
      this.remove(m, true);
    }, REJOIN_GRACE_MS);
    this.broadcastRoom();
    this.publish();
  }

  // ---- actions from the Host's own screen ----------------------------------

  turn(id: string, dir: Dir) {
    if (!this.match) return;
    this.match = applyTurn(this.match, id, dir);
  }

  start() {
    if (this.phase !== 'lobby' || this.closed) return;
    const players = this.members.map((m) => ({ id: m.id, name: m.name }));
    this.match = createMatch(players, {}, this.opts.seed);
    this.phase = 'countdown';
    this.countdown = COUNTDOWN_SECONDS;
    this.broadcastRoom();
    this.broadcastTick();
    this.publish();
    this.timer = setInterval(() => this.countdownTick(), 1000);
  }

  /** Return everyone to the lobby after a match. */
  playAgain() {
    if (this.phase !== 'over' || this.closed) return;
    this.members = this.members.filter((m) => m.id === HOST_ID || m.conn);
    this.match = null;
    this.phase = 'lobby';
    this.broadcastRoom();
    this.publish();
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.stopTimer();
    for (const m of this.members) {
      if (m.dropTimer) clearTimeout(m.dropTimer);
      m.conn?.send({ t: 'closed' });
      m.conn?.close();
    }
  }

  // ---- internals --------------------------------------------------------------

  private hello(conn: Conn, msg: Extract<ClientMsg, { t: 'hello' }>) {
    if (normaliseCode(msg.code) !== this.opts.code) {
      conn.send({ t: 'reject', reason: 'bad-code' });
      conn.close();
      return;
    }
    const existing = this.members.find((m) => m.id === msg.id && m.id !== HOST_ID);
    if (existing) {
      // Same phone coming back (or reconnecting after a half-open socket).
      if (existing.dropTimer) clearTimeout(existing.dropTimer);
      existing.dropTimer = undefined;
      const old = existing.conn;
      existing.conn = conn;
      if (old && old !== conn) old.close();
      conn.send({ t: 'welcome', id: existing.id });
      this.broadcastRoom();
      if (this.match) conn.send({ t: 'tick', countdown: this.countdown, state: this.match });
      this.publish();
      return;
    }
    if (this.phase !== 'lobby') {
      conn.send({ t: 'reject', reason: 'in-progress' });
      conn.close();
      return;
    }
    if (this.members.length >= MAX_ROOM_PLAYERS) {
      conn.send({ t: 'reject', reason: 'full' });
      conn.close();
      return;
    }
    const name = this.uniqueName(msg.name.trim().slice(0, 12) || 'Player');
    this.members.push({ id: msg.id, name, conn });
    conn.send({ t: 'welcome', id: msg.id });
    this.broadcastRoom();
    this.publish();
  }

  private uniqueName(base: string) {
    const taken = new Set(this.members.map((m) => m.name.toLowerCase()));
    if (!taken.has(base.toLowerCase())) return base;
    for (let n = 2; ; n++) {
      const candidate = `${base.slice(0, 10)} ${n}`;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
  }

  private remove(m: Member, killSnake: boolean) {
    if (m.dropTimer) clearTimeout(m.dropTimer);
    const inMatch = this.phase === 'countdown' || this.phase === 'running';
    if (inMatch && killSnake && this.match) {
      // The snake must stay in the match record (it is a result), so only mark it dead.
      this.match = eliminate(this.match, m.id);
      m.conn = null;
      if (this.match.status === 'over') this.finish();
      else {
        this.broadcastTick();
        this.broadcastRoom();
      }
    } else if (!inMatch && this.phase !== 'over') {
      this.members = this.members.filter((x) => x !== m);
      this.broadcastRoom();
    } else {
      m.conn = null;
      this.broadcastRoom();
    }
    this.publish();
  }

  private countdownTick() {
    this.countdown -= 1;
    if (this.countdown > 0) {
      this.broadcastTick();
      this.publish();
      return;
    }
    this.countdown = 0;
    this.phase = 'running';
    this.stopTimer();
    this.broadcastRoom();
    this.broadcastTick();
    this.publish();
    this.timer = setInterval(() => this.gameTick(), this.match!.config.tickMs);
  }

  private gameTick() {
    if (!this.match) return;
    this.match = step(this.match);
    if (this.match.status === 'over') return this.finish();
    this.broadcastTick();
    this.publish();
  }

  private finish() {
    this.stopTimer();
    this.phase = 'over';
    this.broadcastTick();
    this.broadcastRoom();
    this.publish();
  }

  private stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private memberOf(conn: Conn) {
    return this.members.find((m) => m.conn === conn);
  }

  private roomPlayers(): RoomPlayer[] {
    return this.members.map((m) => ({
      id: m.id,
      name: m.name,
      isHost: m.id === HOST_ID,
      connected: m.id === HOST_ID || m.conn !== null,
    }));
  }

  private broadcast(msg: ServerMsg) {
    for (const m of this.members) m.conn?.send(msg);
  }

  private broadcastRoom() {
    this.broadcast({ t: 'room', code: this.opts.code, phase: this.phase, players: this.roomPlayers() });
  }

  private broadcastTick() {
    if (this.match) this.broadcast({ t: 'tick', countdown: this.countdown, state: this.match });
  }

  private publish() {
    this.opts.onUpdate(this.snapshot());
  }
}
