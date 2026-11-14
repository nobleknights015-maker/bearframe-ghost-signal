# Ghost Signal Engine: preserved base and hybrid JRPG development

**Owner direction — 2026-11-14:** Use the existing playable **Ghost Signal** HTML5 Canvas engine as the foundation for the main Bearframe RPG. Keep its real-time stealth system as a supported exploration mode for selected abandoned ruins, ancient facilities and security zones. Preserve its original game.

## Repository / branch safety

| Ref | Role | Change policy |
|---|---|---|
| `main` | Original Ghost Signal game + standalone Sprite Studio | Leave working game intact; may receive updates from its existing origin workflow |
| `baseline/ghost-signal-20261114` | Exact source snapshot at `f6f8f09b7d6c452f158a67473ac35c2fb374da6f` | **Never modify or move this ref** |
| `ghost-signal-engine` | **Ghost Signal Engine** — active development copy from the original playable foundation | **All new hybrid engine changes go here only** |
| `engine/hybrid-stealth-jrpg-20261114` | Retained initial development branch for history | Superseded: do not add new commits |
| `nobleknights015-maker/bearframe-rpg-engine` | Earlier, independent RPG implementation | Preserve as source for evaluated/tested modules; do not overwrite |

The preserved baseline and **Ghost Signal Engine** development copy are branches in **one** repository, not two standalone repositories. If a separate repository is later created, transfer the development branch and verify full source/history before redirecting the work. Do not merge experimental engine changes into `main` automatically.

## Non-negotiable functional contracts

1. Keep working Ghost Signal Missions 01/02 and the independent `/studio/` Sprite Studio functional.
2. Continue **four-direction smooth** free movement (up, down, left, right) with native 32×32 tiles, responsive landscape scaling, camera and collision. Never force eight-direction sprites.
3. Normal JRPG exploration is default in most maps; **data-driven** ruins/facility security zones enable the working Ghost Signal stealth feature set: patrol/investigate/chase/search AI, vision/LOS/detection, hiding, scanning, distraction/noise, alarms, lighting/hazards, trace puzzles and checkpoint restore.
4. Crossing stealth boundaries must preserve player location, party, inventory, equipment, quest state and save continuity.
5. On detection, area data chooses response (alert/chase/escape or **optional** transition to turn-based combat). Detection does **not** force every encounter into combat.
6. Add proper modular JRPG combat, party/equipment/inventory/progression, event/menu UI and compatible new save namespaces without changing the original `bearframe_ghost_signal_*` keys.
7. Preserve existing free procedural art while privately integrating owner-controlled art; do not distribute original third-party packs in public source.
8. Reuse tested Android/WebView/save/controller/party systems from the older RPG engine only after compatibility testing; never claim browser tests prove real phone operation.

## Verified source baseline vs unverified extension

The original game source has real-time exploration, 32px maps, collision, lighting, dynamic camera, security drones, AI and functional browser-local snapshots. Its source includes Missions 01/02, a static server, original WebAudio SFX and Sprite Studio. `memory/PRD.md` and `test_reports/` describe browser feature tests. Physical Android acceptance, owner-art runtime binding, JRPG party/battle integration and production-grade cross-version saves **remain incomplete**. Avoid claiming the hybrid game is finished until implemented and independently tested.

## Immediate engineering sequence

1. Add non-destructive regression tests to exercise original missions, movement, stealth AI, save keys and standalone Sprite Studio.
2. Isolate a data-driven area policy and state handoff, without replacing Ghost Signal's main runtime or save keys.
3. Add a modular JRPG combat transition and restore-to-exploration contract.
4. Integrate additional JRPG subsystems and menus, controller support, owner-art pipeline and Android WebView persistence.
5. Run automated browser and installed Android tests plus physical Moto G-class 4GB acceptance, including a long save/reload soak.

Tracked requirement: [Stealth integration #1](https://github.com/nobleknights015-maker/bearframe-ghost-signal/issues/1).
