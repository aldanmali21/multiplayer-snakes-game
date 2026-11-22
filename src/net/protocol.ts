import type { Dir, MatchState } from '../game/rules';

/** TCP port the Host listens on, and UDP port used to announce rooms. */
export const GAME_PORT = 47474;
export const DISCOVERY_PORT = 47475;
export const MAX_ROOM_PLAYERS = 4;
export const REJOIN_GRACE_MS = 10_000;

export type Phase = 'lobby' | 'countdown' | 'running' | 'over';

export type RoomPlayer = { id: string; name: string; connected: boolean; isHost: boolean };

export type ClientMsg =
  | { t: 'hello'; id: string; name: string; code: string }
  | { t: 'turn'; dir: Dir }
  | { t: 'leave' };

export type RejectReason = 'full' | 'in-progress' | 'bad-code';

export type ServerMsg =
  | { t: 'welcome'; id: string }
  | { t: 'reject'; reason: RejectReason }
  | { t: 'room'; code: string; phase: Phase; players: RoomPlayer[] }
  | { t: 'tick'; countdown: number; state: MatchState }
  | { t: 'closed' };

/** UDP announcement the Host broadcasts so nearby phones can list rooms. */
export type Beacon = { t: 'beacon'; code: string; hostName: string; players: number; port: number; open: boolean };

export const encode = (m: ClientMsg | ServerMsg | Beacon): string => JSON.stringify(m) + '\n';

/** Collects bytes from a socket and yields complete newline-separated JSON messages. */
export class LineBuffer {
  private rest = '';

  push(chunk: string): unknown[] {
    this.rest += chunk;
    const out: unknown[] = [];
    let i: number;
    while ((i = this.rest.indexOf('\n')) >= 0) {
      const line = this.rest.slice(0, i).trim();
      this.rest = this.rest.slice(i + 1);
      if (!line) continue;
      try {
        out.push(JSON.parse(line));
      } catch {
        // Ignore garbage from other apps that happen to talk to our port.
      }
    }
    if (this.rest.length > 1_000_000) this.rest = '';
    return out;
  }
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomCode(random: () => number = Math.random): string {
  return Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]).join('');
}

export const normaliseCode = (s: string) => s.trim().toUpperCase();
