/// <reference types="node" />
/**
 * End to end over real TCP sockets on this machine: a Host and three phones
 * play a full match, using the same wiring code the app uses on Android.
 */
import net from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { HostCore, HOST_ID, type HostSnapshot } from './hostCore';
import { attachSocket } from './hostWire';
import { RoomClient, type ClientSnapshot, type Connect, type SocketLike } from './clientCore';

const connect: Connect = (host, port, onConnect) => net.createConnection({ host, port }, onConnect) as unknown as SocketLike;

const until = async (cond: () => boolean, ms = 8000) => {
  const end = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > end) throw new Error('timed out waiting');
    await new Promise((r) => setTimeout(r, 10));
  }
};

let cleanup: (() => void)[] = [];
afterEach(() => {
  cleanup.forEach((f) => f());
  cleanup = [];
});

async function startHost(code = 'GRDN') {
  let snap: HostSnapshot | null = null;
  const core = new HostCore({ hostName: 'Hosty', code, onUpdate: (s) => (snap = s), seed: 3 });
  const sockets = new Set<net.Socket>();
  const server = net.createServer((sock) => {
    sockets.add(sock);
    attachSocket(core, sock as unknown as SocketLike);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as net.AddressInfo).port;
  cleanup.push(() => {
    core.close();
    sockets.forEach((s) => s.destroy());
    server.close();
  });
  return { core, port, snap: () => snap!, sockets };
}

function joinAs(port: number, id: string, name: string, code = 'GRDN') {
  const box: { snap: ClientSnapshot } = { snap: { status: 'connecting', room: null, view: null } };
  const c = new RoomClient({ host: '127.0.0.1', port, code, name, id, onUpdate: (s) => (box.snap = s), connect });
  c.connect();
  cleanup.push(() => c.leave());
  return { client: c, box };
}

describe('multiplayer over real sockets', () => {
  it('four phones join, play a match to the end, and get a rematch', async () => {
    const host = await startHost();
    const phones = [joinAs(host.port, 'a', 'Ann'), joinAs(host.port, 'b', 'Bob'), joinAs(host.port, 'c', 'Cat')];
    await until(() => phones.every((p) => p.box.snap.status === 'joined' && p.box.snap.room?.players.length === 4));
    expect(host.snap().players.map((p) => p.name)).toEqual(['Hosty', 'Ann', 'Bob', 'Cat']);

    // A fifth phone is turned away.
    const late = joinAs(host.port, 'e', 'Eve');
    await until(() => late.box.snap.status === 'rejected');
    expect(late.box.snap.reason).toBe('full');

    host.core.start();
    await until(() => phones.every((p) => p.box.snap.room?.phase === 'running'));
    // Steering from a phone reaches the host's match.
    phones[0].client.turn('down');
    await until(() => host.snap().view!.state.snakes.find((s) => s.id === 'a')!.dir === 'down');
    // Everyone sees the same ticks.
    await until(() => (phones[2].box.snap.view?.state.tick ?? 0) >= 5);

    // Nobody steers further, so every snake eventually hits a wall.
    await until(() => phones.every((p) => p.box.snap.room?.phase === 'over'), 15000);
    const final = phones[1].box.snap.view!.state;
    expect(final.status).toBe('over');
    expect(final.winners.length).toBeGreaterThan(0);
    expect(final).toEqual(host.snap().view!.state);

    host.core.playAgain();
    await until(() => phones.every((p) => p.box.snap.room?.phase === 'lobby'));
    expect(host.snap().players).toHaveLength(4);
  }, 30000);

  it('a wrong room code is rejected', async () => {
    const host = await startHost();
    const p = joinAs(host.port, 'a', 'Ann', 'NOPE');
    await until(() => p.box.snap.status === 'rejected');
    expect(p.box.snap.reason).toBe('bad-code');
  });

  it('a phone whose connection drops mid-match reconnects and keeps its snake', async () => {
    const host = await startHost();
    const p = joinAs(host.port, 'a', 'Ann');
    await until(() => p.box.snap.status === 'joined');
    host.core.start();
    await until(() => p.box.snap.room?.phase === 'running');

    // Cut the phone's socket from the host side, as if Wi-Fi blipped.
    host.sockets.forEach((s) => s.destroy());
    await until(() => p.box.snap.status === 'reconnecting');
    await until(() => p.box.snap.status === 'joined', 5000);
    expect(host.snap().players.find((x) => x.id === 'a')!.connected).toBe(true);
    const tick = p.box.snap.view!.state.tick;
    await until(() => p.box.snap.view!.state.tick > tick);
  }, 15000);

  it('phones are told when the host closes the room', async () => {
    const host = await startHost();
    const p = joinAs(host.port, 'a', 'Ann');
    await until(() => p.box.snap.status === 'joined');
    host.core.close();
    await until(() => p.box.snap.status === 'closed');
    expect(host.snap().players[0].id).toBe(HOST_ID);
  });
});
