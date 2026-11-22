import type { MatchState } from './rules';

export const COUNTDOWN_SECONDS = 3;

/** What a screen needs to draw a match. `pausedBy` is set while the match is paused. */
export type MatchView = { state: MatchState; countdown: number; pausedBy?: string };
