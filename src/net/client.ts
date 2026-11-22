import TcpSocket from 'react-native-tcp-socket';
import { createUdp } from './udp';
import type { Dir } from '../game/rules';
import type { MatchView } from '../game/useLocalMatch';
import {
  DISCOVERY_PORT,
  GAME_PORT,
  LineBuffer,
  REJOIN_GRACE_MS,
  encode,
  type Beacon,
  type Phase,
  type RejectReason,
  type RoomPlayer,
  type ServerMsg,
} from './protocol';

export type ClientStatus = 'connecting' | 'joined' | 'reconnecting' | 'rejected' | 'closed' | 'failed';

export type ClientSnapshot = {
  status: ClientStatus;
  reason?: RejectReason;
  room: { code: string; phase: Phase; players: RoomPlayer[] } | null;
  view: MatchView | null;
};

type Options = {
  host: string;
  code: string;
  name: string;
  /** Stable for this app session so a dropped phone can reclaim its snake. */
  id: string;
  onUpdate: (s: ClientSnapshot) => void;
};

type Socket = ReturnType<typeof TcpSocket.createConnection>;

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

  leave() {
    this.stopped = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.send({ t: 'leave' });
    setTimeout(() => this.socket?.destroy(), 100);
  }

  private send(msg: { t: 'turn'; dir: Dir } | { t: 'leave' }) {
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
    const socket = TcpSocket.createConnection({ host: this.o.host, port: GAME_PORT, connectTimeout: 5000 }, () => {
      socket.setNoDelay(true);
      socket.write(encode({ t: 'hello', id: this.o.id, name: this.o.name, code: this.o.code }));
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
      const inMatch = this.snap.room?.phase === 'countdown' || this.snap.room?.phase === 'running';
      if (welcomed && inMatch) {
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
        this.update({ room: { code: msg.code, phase: msg.phase, players: msg.players } });
        break;
      case 'tick':
        this.update({ view: { state: msg.state, countdown: msg.countdown } });
        break;
      case 'closed':
        this.stopped = true;
        this.update({ status: 'closed' });
        break;
    }
  }
}

export type FoundRoom = { address: string; code: string; hostName: string; players: number; open: boolean; seen: number };

/** Listens for rooms announced on the local network. Returns a function that stops listening. */
export function discoverRooms(onRooms: (rooms: FoundRoom[]) => void): () => void {
  const rooms = new Map<string, FoundRoom>();
  const socket = createUdp();
  const publish = () => {
    const now = Date.now();
    for (const [k, r] of rooms) if (now - r.seen > 4000) rooms.delete(k);
    onRooms([...rooms.values()].sort((a, b) => a.hostName.localeCompare(b.hostName)));
  };
  socket.on('message', (data, rinfo) => {
    try {
      const text = typeof data === 'string' ? data : data.toString('utf8');
      const b = JSON.parse(text.trim()) as Beacon;
      if (b.t !== 'beacon' || typeof b.code !== 'string') return;
      rooms.set(rinfo.address, {
        address: rinfo.address, code: b.code, hostName: String(b.hostName).slice(0, 12), players: b.players, open: b.open, seen: Date.now(),
      });
      publish();
    } catch {
      // not ours
    }
  });
  socket.on('error', () => {});
  socket.bind(DISCOVERY_PORT);
  const prune = setInterval(publish, 2000);
  return () => {
    clearInterval(prune);
    try { socket.close(); } catch { /* already closed */ }
  };
}
