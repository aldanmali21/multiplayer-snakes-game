import TcpSocket from 'react-native-tcp-socket';
import { createUdp } from './udp';
import { DISCOVERY_PORT, type Beacon } from './protocol';
import type { Connect } from './clientCore';

export { RoomClient, type ClientSnapshot, type ClientStatus } from './clientCore';

/** Real TCP connection on the phone. */
export const tcpConnect: Connect = (host, port, onConnect) =>
  TcpSocket.createConnection({ host, port, connectTimeout: 5000 }, onConnect);

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
