import { useCallback, useEffect, useState } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import { NavigationBar } from 'expo-navigation-bar';
import { setStatusBarHidden } from 'expo-status-bar';

/**
 * Full screen means landscape with the status and navigation bars hidden.
 * Normal mode is portrait with the bars visible.
 */
async function apply(on: boolean) {
  try {
    setStatusBarHidden(on, 'fade');
    NavigationBar.setHidden(on);
    await ScreenOrientation.lockAsync(
      on ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT_UP,
    );
  } catch {
    // Not fatal: the game still plays in whatever orientation the phone is in.
  }
}

/** Remembers the choice across matches during this app session. */
let remembered = false;

export function useFullscreen() {
  const [on, setOn] = useState(remembered);

  useEffect(() => {
    apply(on);
  }, [on]);

  // Always leave full screen when the match screen goes away.
  useEffect(() => () => void apply(false), []);

  const toggle = useCallback(() => {
    setOn((v) => {
      remembered = !v;
      return !v;
    });
  }, []);

  return { fullscreen: on, toggle };
}
