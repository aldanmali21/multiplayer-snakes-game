---
status: superseded by ADR-0002
---
# Central WebSocket server on a free-tier host

Players connect over the internet to one central server that runs the Match rules and is the authority on movement, collisions and Fruit. We rejected local Wi-Fi/Bluetooth peer-to-peer (players must be anywhere) and InfinityFree (shared PHP hosting has no WebSockets or long-running processes). The server sleeps when idle on free tiers, so an uptime pinger keeps it awake; SQLite holds only non-critical data such as a leaderboard because free disks can reset.
