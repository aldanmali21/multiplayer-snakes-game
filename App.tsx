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
import { useLocalMatch } from './src/game/useLocalMatch';
import { useDiscovery } from './src/net/hooks';

const NAME_KEY = 'snakes.nickname';
const theme = defaultTheme;

type Route =
  | { name: 'home' }
  | { name: 'solo' }
  | { name: 'host' }
  | { name: 'browse' }
  | { name: 'client'; address: string; code: string };

function Browse({ onJoin, onBack }: { onJoin: (a: string, c: string) => void; onBack: () => void }) {
  const rooms = useDiscovery();
  return <JoinScreen theme={theme} rooms={rooms} onJoin={onJoin} onBack={onBack} />;
}

function SoloMatch({ name, onHome }: { name: string; onHome: () => void }) {
  const players = useMemo(() => [{ id: 'me', name }], [name]);
  const [runId, setRunId] = useState(0);
  const { view, sendTurn } = useLocalMatch(players, runId);

  if (view && view.state.status === 'over') {
    return <ResultsScreen theme={theme} state={view.state} myId="me" onAgain={() => setRunId((n) => n + 1)} onHome={onHome} />;
  }
  return <MatchScreen theme={theme} view={view} myId="me" onTurn={sendTurn} onLeave={onHome} />;
}

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [name, setName] = useState('');
  const [fontsLoaded, fontError] = useFonts({ Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold });

  useEffect(() => {
    AsyncStorage.getItem(NAME_KEY).then((v) => v && setName(v)).catch(() => {});
  }, []);

  const saveName = useCallback((n: string) => {
    setName(n);
    AsyncStorage.setItem(NAME_KEY, n).catch(() => {});
  }, []);

  const home = useCallback(() => setRoute({ name: 'home' }), []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route.name === 'home') return false;
      home();
      return true;
    });
    return () => sub.remove();
  }, [route, home]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {route.name === 'solo' ? (
        <SoloMatch name={name || 'Player'} onHome={home} />
      ) : route.name === 'host' ? (
        <HostFlow theme={theme} name={name || 'Host'} onExit={home} />
      ) : route.name === 'browse' ? (
        <Browse onBack={home} onJoin={(address, code) => setRoute({ name: 'client', address, code })} />
      ) : route.name === 'client' ? (
        <ClientFlow theme={theme} name={name || 'Player'} address={route.address} code={route.code} onExit={() => setRoute({ name: 'browse' })} />
      ) : (
        <HomeScreen
          theme={theme}
          name={name}
          onSaveName={saveName}
          onSolo={() => setRoute({ name: 'solo' })}
          onHost={() => setRoute({ name: 'host' })}
          onJoin={() => setRoute({ name: 'browse' })}
        />
      )}
    </SafeAreaProvider>
  );
}
