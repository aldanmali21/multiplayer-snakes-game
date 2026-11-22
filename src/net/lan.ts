import * as Network from 'expo-network';

/** Best guess at this phone's address on the local network, or null if it can't be read. */
export async function getLocalIp(): Promise<string | null> {
  try {
    const ip = await Network.getIpAddressAsync();
    return ip && ip !== '0.0.0.0' ? ip : null;
  } catch {
    return null;
  }
}

/** Typical address of a phone that is sharing its own hotspot. */
export const HOTSPOT_IP = '192.168.43.1';

/** Broadcast addresses to try. Android hotspots use a few different subnets. */
export function broadcastTargets(ip: string | null): string[] {
  const targets = new Set(['255.255.255.255', '192.168.43.255', '192.168.49.255', '172.20.10.255']);
  const m = ip?.match(/^(\d+)\.(\d+)\.(\d+)\.\d+$/);
  if (m) targets.add(`${m[1]}.${m[2]}.${m[3]}.255`);
  return [...targets];
}

export const isIpv4 = (s: string) =>
  /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(s.trim()) &&
  s.trim().split('.').every((n) => Number(n) <= 255);
