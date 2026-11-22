import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { createMatch, step, turn, type Dir, type MatchSettings, type MatchState, type PlayerInfo } from './rules';

import { COUNTDOWN_SECONDS, type MatchView } from './matchView';

export { COUNTDOWN_SECONDS, type MatchView };

/**
 * Runs a whole match on this phone (single player). `runId` restarts it.
 * `board` is the grid size picked for this screen, read when a run starts.
 */
export function useLocalMatch(players: PlayerInfo[], settings: MatchSettings, runId: number, board?: { width: number; height: number }) {
  const boardRef = useRef(board);
  boardRef.current = board;
  const [view, setView] = useState<MatchView | null>(null);
  const ref = useRef<MatchState | null>(null);
  const timers = useRef<{ countdown?: ReturnType<typeof setInterval>; tick?: ReturnType<typeof setInterval> }>({});
  const phase = useRef<'countdown' | 'running' | 'paused' | 'over'>('countdown');

  const stop = useCallback(() => {
    if (timers.current.countdown) clearInterval(timers.current.countdown);
    if (timers.current.tick) clearInterval(timers.current.tick);
    timers.current = {};
  }, []);

  const run = useCallback(() => {
    stop();
    phase.current = 'countdown';
    let countdown = COUNTDOWN_SECONDS;
    setView({ state: ref.current!, countdown });
    timers.current.countdown = setInterval(() => {
      countdown -= 1;
      if (countdown > 0) {
        setView({ state: ref.current!, countdown });
        return;
      }
      stop();
      phase.current = 'running';
      setView({ state: ref.current!, countdown: 0 });
      timers.current.tick = setInterval(() => {
        ref.current = step(ref.current!);
        setView({ state: ref.current, countdown: 0 });
        if (ref.current.status === 'over') {
          phase.current = 'over';
          stop();
        }
      }, ref.current!.config.tickMs);
    }, 1000);
  }, [stop]);

  useEffect(() => {
    ref.current = createMatch(players, { ...settings, ...boardRef.current });
    run();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const pause = useCallback(() => {
    if (phase.current !== 'running' && phase.current !== 'countdown') return;
    stop();
    phase.current = 'paused';
    setView({ state: ref.current!, countdown: 0, pausedBy: players[0].name });
  }, [players, stop]);

  const resume = useCallback(() => {
    if (phase.current === 'paused') run();
  }, [run]);

  // Pause automatically when the app goes to the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') pause();
    });
    return () => sub.remove();
  }, [pause]);

  const sendTurn = useCallback(
    (dir: Dir) => {
      if (ref.current && phase.current === 'running') ref.current = turn(ref.current, players[0].id, dir);
    },
    [players],
  );

  return { view, sendTurn, pause, resume };
}
