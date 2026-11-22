import { useCallback, useEffect, useRef, useState } from 'react';
import { createMatch, step, turn, type Dir, type MatchState, type PlayerInfo } from './rules';

export const COUNTDOWN_SECONDS = 3;

export type MatchView = { state: MatchState; countdown: number };

/** Runs a whole match on this phone (single player). `runId` restarts it. */
export function useLocalMatch(players: PlayerInfo[], runId: number) {
  const [view, setView] = useState<MatchView | null>(null);
  const ref = useRef<MatchState | null>(null);

  useEffect(() => {
    const initial = createMatch(players);
    ref.current = initial;
    let countdown = COUNTDOWN_SECONDS;
    setView({ state: initial, countdown });
    let tickTimer: ReturnType<typeof setInterval> | undefined;

    const countdownTimer = setInterval(() => {
      countdown -= 1;
      if (countdown > 0) {
        setView({ state: ref.current!, countdown });
        return;
      }
      clearInterval(countdownTimer);
      setView({ state: ref.current!, countdown: 0 });
      tickTimer = setInterval(() => {
        ref.current = step(ref.current!);
        setView({ state: ref.current, countdown: 0 });
        if (ref.current.status === 'over') clearInterval(tickTimer);
      }, initial.config.tickMs);
    }, 1000);

    return () => {
      clearInterval(countdownTimer);
      if (tickTimer) clearInterval(tickTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const sendTurn = useCallback((dir: Dir) => {
    if (ref.current) ref.current = turn(ref.current, players[0].id, dir);
  }, [players]);

  return { view, sendTurn };
}
