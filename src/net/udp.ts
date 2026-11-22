import dgram from 'react-native-udp';

/** The slice of react-native-udp's socket we use (its bundled types omit the event methods). */
export type Udp = {
  on(event: 'message', cb: (data: string | { toString(enc: string): string }, rinfo: { address: string; port: number }) => void): void;
  on(event: 'error', cb: (e: unknown) => void): void;
  once(event: 'listening', cb: () => void): void;
  bind(port: number): void;
  send(msg: string, offset: undefined, length: undefined, port: number, address: string, cb: (e?: unknown) => void): void;
  setBroadcast(flag: boolean): void;
  close(): void;
};

export const createUdp = (): Udp => dgram.createSocket({ type: 'udp4' }) as unknown as Udp;
