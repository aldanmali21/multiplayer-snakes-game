import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { boardSizeFor } from '../game/rules';
import { fullscreenRemembered } from '../components/fullscreen';
import { playAreaAspect } from './layout';

/** The grid size that fills this phone's screen in the layout the match will open in. */
export function useBoardSize() {
  const win = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return boardSizeFor(playAreaAspect(win, insets, fullscreenRemembered()));
}
