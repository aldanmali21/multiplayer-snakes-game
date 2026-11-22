import React from 'react';
import { View } from 'react-native';
import { DEFAULT_SETTINGS, type MatchSettings } from '../game/rules';
import { useBoardSize } from '../board/useBoardSize';
import { HOST_ID } from '../net/hostCore';
import { useClient, useHost } from '../net/hooks';
import type { Theme } from '../theme/theme';
import { Button, Screen, Text } from '../components/ui';
import { MatchScreen } from './MatchScreen';
import { ResultsScreen } from './ResultsScreen';
import { RoomScreen } from './RoomScreen';

function Message({ theme, title, body, onBack }: { theme: Theme; title: string; body?: string; onBack?: () => void }) {
  return (
    <Screen theme={theme}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 32, gap: 16 }}>
        <Text style={{ color: theme.text, fontSize: 26, fontWeight: '900', textAlign: 'center' }}>{title}</Text>
        {body ? <Text style={{ color: theme.textDim, fontSize: 16, textAlign: 'center' }}>{body}</Text> : null}
        {onBack ? <Button theme={theme} label="Back" onPress={onBack} /> : null}
      </View>
    </Screen>
  );
}

type Prefs = { species: number; settings: MatchSettings };

export function HostFlow({ theme, name, prefs, onPrefs, onExit }: { theme: Theme; name: string; prefs: Prefs; onPrefs: (p: Partial<Prefs>) => void; onExit: () => void }) {
  const { snap, host, error } = useHost(name, prefs);
  const board = useBoardSize();
  if (error) return <Message theme={theme} title="Couldn't open a room" body={error} onBack={onExit} />;
  if (!snap || !host) return <Message theme={theme} title="Opening room…" />;
  const core = host.core;

  if (snap.phase === 'lobby') {
    return (
      <RoomScreen
        theme={theme}
        code={snap.code}
        ip={host.ip}
        players={snap.players}
        myId={HOST_ID}
        isHost
        settings={snap.settings}
        onPick={(s) => core.pick(HOST_ID, s) && onPrefs({ species: s })}
        onSettings={(s) => {
          core.setSettings(s);
          onPrefs({ settings: s });
        }}
        onStart={() => core.start(board)}
        onLeave={onExit}
      />
    );
  }
  if (snap.phase === 'over' && snap.view) {
    return <ResultsScreen theme={theme} state={snap.view.state} myId={HOST_ID} againLabel="Back to room" onAgain={() => core.playAgain()} onHome={onExit} />;
  }
  return (
    <MatchScreen
      theme={theme}
      view={snap.view}
      myId={HOST_ID}
      onTurn={(d) => core.turn(HOST_ID, d)}
      onPause={() => core.pause(HOST_ID)}
      onResume={() => core.resume(HOST_ID)}
      onLeave={onExit}
      banner="Leaving ends the match for everyone"
      roomCode={snap.code}
    />
  );
}

export function ClientFlow({ theme, name, species, address, code, onExit }: { theme: Theme; name: string; species: number; address: string; code: string; onExit: () => void }) {
  const { snap, client, myId } = useClient(address, code, name, species);

  if (snap.status === 'connecting') return <Message theme={theme} title="Joining…" body={`Connecting to ${address}`} onBack={onExit} />;
  if (snap.status === 'failed') {
    return <Message theme={theme} title="Couldn't reach the host" body="Check that you are on the same Wi-Fi (or the host's hotspot) and that the address and code are right." onBack={onExit} />;
  }
  if (snap.status === 'rejected') {
    const body = snap.reason === 'full' ? 'This room already has 4 players.' : snap.reason === 'in-progress' ? 'A match is already running. Try again when it ends.' : 'That room code is wrong.';
    return <Message theme={theme} title="Can't join this room" body={body} onBack={onExit} />;
  }
  if (snap.status === 'closed') return <Message theme={theme} title="The host ended the room" onBack={onExit} />;

  const phase = snap.room?.phase ?? 'lobby';
  const banner = snap.status === 'reconnecting' ? 'Connection lost. Trying to get back in…' : undefined;
  if (phase === 'lobby' || !snap.view) {
    return (
      <RoomScreen
        theme={theme}
        code={snap.room?.code ?? code}
        players={snap.room?.players ?? []}
        myId={myId}
        isHost={false}
        settings={snap.room?.settings ?? DEFAULT_SETTINGS}
        onPick={(s) => client.current?.pick(s)}
        onLeave={onExit}
        banner={banner}
      />
    );
  }
  if (phase === 'over') {
    return <ResultsScreen theme={theme} state={snap.view.state} myId={myId} onHome={onExit} note="Waiting for the host to start another match…" />;
  }
  return (
    <MatchScreen
      theme={theme}
      view={snap.view}
      myId={myId}
      onTurn={(d) => client.current?.turn(d)}
      onPause={() => client.current?.pause()}
      onResume={() => client.current?.resume()}
      onLeave={onExit}
      banner={banner}
      roomCode={snap.room?.code}
    />
  );
}
