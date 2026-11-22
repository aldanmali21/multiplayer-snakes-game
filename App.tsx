import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { defaultTheme } from './src/theme/theme';
import { HomeScreen } from './src/screens/HomeScreen';
import { MatchScreen } from './src/screens/MatchScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { JoinScreen } from './src/screens/JoinScreen';
import { ClientFlow, HostFlow } from './src/screens/Multiplayer';
import { SnakeScreen } from './src/screens/SnakeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SoloSetupScreen } from './src/screens/SoloSetupScreen';
import { useLocalMatch } from './src/game/useLocalMatch';
import { DEFAULT_SETTINGS, SPECIES_COUNT, sanitizeSettings, type MatchSettings } from './src/game/rules';
import { useDiscovery } from './src/net/hooks';
import { useBoardSize } from './src/board/useBoardSize';
import { useAfter } from './src/components/useAfter';

const NAME_KEY = 'snakes.nickname';
const PREFS_KEY = 'snakes.prefs';

type Prefs = { species: number; settings: MatchSettings };
const DEFAULT_PREFS: Prefs = { species: 0, settings: DEFAULT_SETTINGS };

function sanitizePrefs(raw: unknown): Prefs {
  const r = (raw ?? {}) as Partial<Prefs>;
  const species = Number.isInteger(r.species) && r.species! >= 0 && r.species! < SPECIES_COUNT ? r.species! : 0;
  return { species, settings: sanitizeSettings(r.settings) };
}
const theme = defaultTheme;

type Route =
  | { name: 'home' }
  | { name: 'soloSetup' }
  | { name: 'solo' }
  | { name: 'snake' }
  | { name: 'settings' }
  | { name: 'host' }
  | { name: 'browse' }
  | { name: 'client'; address: string; code: string };

function Browse({ onJoin, onBack }: { onJoin: (a: string, c: string) => void; onBack: () => void }) {
  const rooms = useDiscovery();
  return <JoinScreen theme={theme} rooms={rooms} onJoin={onJoin} onBack={onBack} />;
}

function SoloMatch({ name, prefs, onHome }: { name: string; prefs: Prefs; onHome: () => void }) {
  const players = useMemo(() => [{ id: 'me', name, species: prefs.species }], [name, prefs.species]);
  const [runId, setRunId] = useState(0);
  const board = useBoardSize();
  const { view, sendTurn, pause, resume } = useLocalMatch(players, prefs.settings, runId, board);

  const showResults = useAfter(view?.state.status === 'over');
  if (view && view.state.status === 'over' && showResults) {
    return <ResultsScreen theme={theme} state={view.state} myId="me" onAgain={() => setRunId((n) => n + 1)} onHome={onHome} />;
  }
  return <MatchScreen theme={theme} view={view} myId="me" onTurn={sendTurn} onLeave={onHome} onPause={pause} onResume={resume} />;
}

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [name, setName] = useState('');
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [fontsLoaded, fontError] = useFonts({ Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold });

  useEffect(() => {
    AsyncStorage.getItem(NAME_KEY).then((v) => v && setName(v)).catch(() => {});
    AsyncStorage.getItem(PREFS_KEY)
      .then((v) => v && setPrefsState(sanitizePrefs(JSON.parse(v))))
      .catch(() => {});
  }, []);

  const setPrefs = useCallback((p: Partial<Prefs>) => {
    setPrefsState((old) => {
      const next = sanitizePrefs({ ...old, ...p });
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const saveName = useCallback((n: string) => {
    setName(n);
    AsyncStorage.setItem(NAME_KEY, n).catch(() => {});
  }, []);

  const home = useCallback(() => setRoute({ name: 'home' }), []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route.name === 'home') return false;
      if (route.name === 'solo') setRoute({ name: 'soloSetup' });
      else home();
      return true;
    });
    return () => sub.remove();
  }, [route, home]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {route.name === 'solo' ? (
        <SoloMatch name={name || 'Player'} prefs={prefs} onHome={home} />
      ) : route.name === 'soloSetup' ? (
        <SoloSetupScreen
          theme={theme}
          species={prefs.species}
          settings={prefs.settings}
          onPick={(species) => setPrefs({ species })}
          onSettings={(settings) => setPrefs({ settings })}
          onStart={() => setRoute({ name: 'solo' })}
          onBack={home}
        />
      ) : route.name === 'snake' ? (
        <SnakeScreen theme={theme} species={prefs.species} onPick={(species) => setPrefs({ species })} onDone={home} />
      ) : route.name === 'settings' ? (
        <SettingsScreen theme={theme} settings={prefs.settings} onChange={(settings) => setPrefs({ settings })} onDone={home} />
      ) : route.name === 'host' ? (
        <HostFlow theme={theme} name={name || 'Host'} prefs={prefs} onPrefs={setPrefs} onExit={home} />
      ) : route.name === 'browse' ? (
        <Browse onBack={home} onJoin={(address, code) => setRoute({ name: 'client', address, code })} />
      ) : route.name === 'client' ? (
        <ClientFlow theme={theme} name={name || 'Player'} species={prefs.species} address={route.address} code={route.code} onExit={() => setRoute({ name: 'browse' })} />
      ) : (
        <HomeScreen
          theme={theme}
          name={name}
          species={prefs.species}
          onSaveName={saveName}
          onSolo={() => setRoute({ name: 'soloSetup' })}
          onChooseSnake={() => setRoute({ name: 'snake' })}
          onSettings={() => setRoute({ name: 'settings' })}
          onHost={() => setRoute({ name: 'host' })}
          onJoin={() => setRoute({ name: 'browse' })}
        />
      )}
    </SafeAreaProvider>
  );
}
