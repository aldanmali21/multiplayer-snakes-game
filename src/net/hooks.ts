import { useEffect, useRef, useState } from 'react';
import type { HostSnapshot } from './hostCore';
import { startHost, type RunningHost } from './tcpHost';
import { RoomClient, discoverRooms, tcpConnect, type ClientSnapshot, type FoundRoom } from './client';

export function useHost(name: string) {
  const [snap, setSnap] = useState<HostSnapshot | null>(null);
  const [host, setHost] = useState<RunningHost | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let running: RunningHost | null = null;
    startHost(name, (s) => !cancelled && setSnap(s), (m) => !cancelled && setError(m))
      .then((h) => {
        if (cancelled) return h.stop();
        running = h;
        setHost(h);
        setSnap(h.core.snapshot());
      })
      .catch((e) => !cancelled && setError(String(e?.message ?? e)));
    return () => {
      cancelled = true;
      running?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { snap, host, error };
}

export function useClient(address: string, code: string, name: string) {
  const [snap, setSnap] = useState<ClientSnapshot>({ status: 'connecting', room: null, view: null });
  const clientRef = useRef<RoomClient | null>(null);
  const idRef = useRef(`p${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    const c = new RoomClient({ host: address, code, name, id: idRef.current, onUpdate: setSnap, connect: tcpConnect });
    clientRef.current = c;
    c.connect();
    return () => c.leave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { snap, client: clientRef, myId: idRef.current };
}

export function useDiscovery() {
  const [rooms, setRooms] = useState<FoundRoom[]>([]);
  useEffect(() => discoverRooms(setRooms), []);
  return rooms;
}
