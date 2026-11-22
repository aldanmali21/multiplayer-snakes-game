# Offline multiplayer snake (Android APK)

Status: ready-for-agent

An Android game where 1 to 4 Players steer Snakes on a shared Board, eat Fruit to grow, and race to the Target Score. Phones play together offline over local Wi-Fi or the Host's hotspot. Terms follow `GLOSSARY.md`; the networking choice is ADR-0002.

## Platform and build
- React Native + Expo, using a development build (not Expo Go) because sockets and discovery need native modules.
- Android only, portrait. APK produced with EAS Build.
- No internet, no server, no database, no accounts.

## Rules
- Board: 20×20 grid enclosed by Walls. Snakes move one cell per tick at 8 ticks per second.
- Start: each Snake has length 3, starts in its own corner facing the centre, after a 3-second countdown.
- Fruit: one kind, +1 Growth Score and +1 length. The Board holds one Fruit per Player in the Match; a new one spawns on a free cell when one is eaten.
- Death: touching a Wall, its own body or another Snake's body. Two heads meeting on the same cell both die. A dead Snake's body disappears immediately.
- Winning: the first Snake to reach a Growth Score of 20 wins. Snakes reaching 20 on the same tick share the win. If every Snake dies first, the longest Snake at death wins (ties share).
- Single-player is the same rules with one Snake, run locally with no networking.
- The Target Score, Board size and tick rate are constants that are easy to tune.

## Rooms and networking
- The Host creates a Room and gets a short code. The Host's phone runs the Match and is the only authority on state.
- Other phones find the Host automatically on the local network; fallback is typing the Host's IP address and Room code, both shown on the Host's screen.
- Supported networks: a shared Wi-Fi router or the Host's own hotspot. Guest or public Wi-Fi that isolates clients is unsupported.
- Players send direction changes only; the Host broadcasts the full Board state each tick.
- 1 to 4 Players. Joining is only allowed while no Match is running. The Host presses Start.
- A non-Host Player who drops keeps moving straight for up to 10 seconds and can rejoin; after that their Snake dies.
- If the Host leaves or drops, the Match ends for everyone.

## Screens and controls
- Nickname entry on first launch, stored on the phone.
- Home: Play alone, Host a Room, Join a Room.
- Room: Player list, Room code and Host IP, Start (Host only).
- Match: Board, Growth Scores of all Players at the top, swipe to steer. Dead Players keep watching until the Match ends. Screen stays awake during a Match.
- Results: Winner(s), then Play Again returns everyone to the same Room.

## Testing
- Rules live in a plain TypeScript module with automated tests (movement, collisions, Fruit, growth, winning, ties).
- Networking and screens are checked by playing on real phones.

## Out of scope for v1
Online play, iOS, Bluetooth, Host handover, leaderboards, multiple Fruit types, sounds.
