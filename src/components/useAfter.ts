import { useEffect, useState } from 'react';

/** How long the crash plays on the board before the results screen appears. */
export const RESULTS_DELAY_MS = 1300;

/** True once `on` has stayed true for `ms`; false again as soon as `on` is false. */
export function useAfter(on: boolean, ms = RESULTS_DELAY_MS) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!on) {
      setReady(false);
      return;
    }
    const t = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(t);
  }, [on, ms]);
  return on && ready;
}
