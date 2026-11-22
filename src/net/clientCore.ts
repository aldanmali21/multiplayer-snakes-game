import type { Dir, MatchSettings } from '../game/rules';
import type { MatchView } from '../game/matchView';
import {
  GAME_PORT,
  LineBuffer,
  REJOIN_GRACE_MS,
  encode,
  inMatch,
  type ClientMsg,
  type Phase,
  type RejectReason,
  type RoomPlayer,
  type ServerMsg,
} from './protocol';

export type ClientStatus = 'connecting' | 'joined' | 'reconnecting' | 'rejected' | 'closed' | 'failed';

export type ClientSnapshot = {
  status: ClientStatus;
  reason?: RejectReason;
  room: { code: string; phase: Phase; players: RoomPlayer[]; settings: MatchSettings } | null;
  view: MatchView | null;
};

type Options = {
  host: string;
  code: string;
  name: string;
  /** Stable for this app session so a dropped phone can reclaim its snake. */
  id: string;
  /** Favourite snake; the Host gives a free one if it's taken. */
  species?: number;
  onUpdate: (s: ClientSnapshot) => void;
  connect: Connect;
  port?: number;
};

/** The bits of a TCP socket the client needs (react-native-tcp-socket and Node's net both fit). */
export type SocketLike = {
  write(data: string): unknown;
  destroy(): unknown;
  setEncoding(enc: 'utf8'): unknown;
  setNoDelay(on: boolean): unknown;
  on(event: 'data', cb: (data: string | { toString(enc: string): string }) => void): unknown;
  on(event: 'error', cb: (e: unknown) => void): unknown;
  on(event: 'close', cb: () => void): unknown;
};
export type Connect = (host: string, port: number, onConnect: () => void) => SocketLike;
type Socket = SocketLike;

export class RoomClient {
  private snap: ClientSnapshot = { status: 'connecting', room: null, view: null };
  private socket?: Socket;
  private stopped = false;
  private retryUntil = 0;
  private retryTimer?: ReturnType<typeof setTimeout>;

  constructor(private o: Options) {}

  connect() {
    this.open();
  }

  turn(dir: Dir) {
    this.send({ t: 'turn', dir });
  }

  pick(species: number) {
    this.send({ t: 'pick', species });
  }

  pause() {
    this.send({ t: 'pause' });
  }

  resume() {
    this.send({ t: 'resume' });
  }

  leave() {
    this.stopped = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.send({ t: 'leave' });
    setTimeout(() => this.socket?.destroy(), 100);
  }

  private send(msg: ClientMsg) {
    try {
      this.socket?.write(encode(msg));
    } catch {
      // closing; reconnect logic handles it
    }
  }

  private update(patch: Partial<ClientSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.o.onUpdate(this.snap);
  }

  private open() {
    const lines = new LineBuffer();
    let welcomed = false;
    const socket = this.o.connect(this.o.host, this.o.port ?? GAME_PORT, () => {
      socket.setNoDelay(true);
      socket.write(encode({ t: 'hello', id: this.o.id, name: this.o.name, code: this.o.code, species: this.o.species }));
    });
    this.socket = socket;
    socket.setEncoding('utf8');
    socket.on('data', (data) => {
      for (const raw of lines.push(typeof data === 'string' ? data : data.toString('utf8'))) {
        const msg = raw as ServerMsg;
        if (msg.t === 'welcome') {
          welcomed = true;
          this.retryUntil = 0;
          this.update({ status: 'joined' });
        } else this.onMessage(msg);
      }
    });
    socket.on('error', () => {});
    socket.on('close', () => {
      if (this.stopped || this.socket !== socket) return;
      if (this.snap.status === 'rejected' || this.snap.status === 'closed') return;
      if (welcomed && inMatch(this.snap.room?.phase)) {
        if (!this.retryUntil) this.retryUntil = Date.now() + REJOIN_GRACE_MS;
      }
      if (this.retryUntil && Date.now() < this.retryUntil) {
        this.update({ status: 'reconnecting' });
        this.retryTimer = setTimeout(() => this.open(), 1000);
      } else {
        this.update({ status: welcomed ? 'closed' : 'failed' });
      }
    });
  }

  private onMessage(msg: ServerMsg) {
    switch (msg.t) {
      case 'reject':
        this.update({ status: 'rejected', reason: msg.reason });
        break;
      case 'room':
        this.update({ room: { code: msg.code, phase: msg.phase, players: msg.players, settings: msg.settings } });
        break;
      case 'tick':
        this.update({ view: { state: msg.state, countdown: msg.countdown, pausedBy: msg.pausedBy } });
        break;
      case 'closed':
        this.stopped = true;
        this.update({ status: 'closed' });
        break;
    }
  }
}
