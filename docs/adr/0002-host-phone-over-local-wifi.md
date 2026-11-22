---
status: accepted
---

# Host phone runs the Match over local Wi-Fi

The game works offline: one phone (the host) runs the Match rules and is the authority on movement, collisions and Fruit, and up to three other phones connect to it over a local Wi-Fi network or the host's hotspot using plain TCP sockets. This supersedes ADR-0001's central internet server: Bluetooth was rejected for low bandwidth and flaky multi-device support, and no server means no hosting, uptime pinger or internet dependency. Networks that isolate clients (some guest or public Wi-Fi) are unsupported; the host's hotspot is the fallback.
