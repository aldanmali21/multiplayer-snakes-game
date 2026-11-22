import type { Conn, HostCore } from './hostCore';
import { LineBuffer, encode, type ClientMsg } from './protocol';
import type { SocketLike } from './clientCore';

const isClientMsg = (m: unknown): m is ClientMsg =>
  typeof m === 'object' && m !== null && typeof (m as { t?: unknown }).t === 'string';

/** Connects one accepted TCP socket to the Host's brain. */
export function attachSocket(core: HostCore, socket: SocketLike) {
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
}
