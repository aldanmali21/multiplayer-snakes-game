import TcpSocket from 'react-native-tcp-socket';
import { createUdp } from './udp';
import { HostCore, type Conn, type HostSnapshot } from './hostCore';
import {
  DISCOVERY_PORT,
  GAME_PORT,
  LineBuffer,
  encode,
  randomCode,
  type Beacon,
  type ClientMsg,
} from './protocol';
import { broadcastTargets, getLocalIp } from './lan';

export type RunningHost = {
  core: HostCore;
  ip: string | null;
  stop: () => void;
};

const isClientMsg = (m: unknown): m is ClientMsg =>
  typeof m === 'object' && m !== null && typeof (m as { t?: unknown }).t === 'string';

/** Opens the TCP port, advertises the room over UDP and wires sockets into a HostCore. */
export async function startHost(
  hostName: string,
  onUpdate: (s: HostSnapshot) => void,
  onError: (message: string) => void,
): Promise<RunningHost> {
  const ip = await getLocalIp();
  const core = new HostCore({ hostName, code: randomCode(), onUpdate });

  const server = TcpSocket.createServer((socket) => {
    socket.setEncoding('utf8');
    socket.setNoDelay(true);
    const lines = new LineBuffer();
    const conn: Conn = {
      send: (msg) => {
        try {
          socket.write(encode(msg));
        } catch {
          // The close event will clean up.
        }
      },
      close: () => socket.destroy(),
    };
    socket.on('data', (data) => {
      for (const msg of lines.push(typeof data === 'string' ? data : data.toString('utf8'))) {
        if (isClientMsg(msg)) core.handle(conn, msg);
      }
    });
    socket.on('error', () => {});
    socket.on('close', () => core.disconnected(conn));
  });
  server.on('error', (e) => onError(`Could not open the room: ${e.message}`));
  server.listen({ port: GAME_PORT, host: '0.0.0.0', reuseAddress: true });

  // Announce the room so nearby phones can find it without typing anything.
  const udp = createUdp();
  let beaconTimer: ReturnType<typeof setInterval> | undefined;
  udp.once('listening', () => {
    try {
      udp.setBroadcast(true);
    } catch {
      // Discovery is a convenience; typing the IP still works.
    }
    const targets = broadcastTargets(ip);
    beaconTimer = setInterval(() => {
      const beacon: Beacon = {
        t: 'beacon',
        code: core.code,
        hostName,
        players: core.playerCount,
        port: GAME_PORT,
        open: core.open,
      };
      for (const target of targets) {
        try {
          udp.send(encode(beacon), undefined, undefined, DISCOVERY_PORT, target, () => {});
        } catch {
          // ignore
        }
      }
    }, 1000);
  });
  udp.on('error', () => {});
  udp.bind(0);

  return {
    core,
    ip,
    stop: () => {
      if (beaconTimer) clearInterval(beaconTimer);
      try { udp.close(); } catch { /* already closed */ }
      core.close();
      try { server.close(); } catch { /* already closed */ }
    },
  };
}
