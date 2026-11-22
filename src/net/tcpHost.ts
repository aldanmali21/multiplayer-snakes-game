import TcpSocket from 'react-native-tcp-socket';
import { createUdp } from './udp';
import { HostCore, type HostSnapshot } from './hostCore';
import { attachSocket } from './hostWire';
import type { SocketLike } from './clientCore';
import { DISCOVERY_PORT, GAME_PORT, encode, randomCode, type Beacon } from './protocol';
import { broadcastTargets, getLocalIp } from './lan';

export type RunningHost = {
  core: HostCore;
  ip: string | null;
  stop: () => void;
};

/** Opens the TCP port, advertises the room over UDP and wires sockets into a HostCore. */
export async function startHost(
  hostName: string,
  onUpdate: (s: HostSnapshot) => void,
  onError: (message: string) => void,
): Promise<RunningHost> {
  const ip = await getLocalIp();
  const core = new HostCore({ hostName, code: randomCode(), onUpdate });

  const server = TcpSocket.createServer((socket) => attachSocket(core, socket as unknown as SocketLike));
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
