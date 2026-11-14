# BEARFRAME: GHOST SIGNAL — PRD
## Problem statement
Playable HTML5 2D top-down sci-fi mystery/survival-horror mission (Mission 01: The Silent Facility) in the Bearframe universe, protagonist Wraith (WTR-07, Watchtower). Proposed future side story; lore must stay canon-safe (facility origin unresolved; trace is an anomaly, not a person; drone non-sentient).
## User choices
Drone contact drains energy (cooldown), zero energy restores checkpoint; scan disables drone at energy cost; generated WebAudio sound; D-pad left / actions right.
## Architecture
Static, dependency-free. /app/frontend (serve.js static server, `yarn start`), game in /app/frontend/public:
- js/main.js boot/menus/loop; js/game.js engine (collision, drone AI+BFS, ghost trace, lighting, scan, checkpoints)
- js/missions/{index,mission1}.js mission data+script (add missions here); js/art/{wraith,tiles}.js procedural pixel art
- js/engine/{input,audio,save}.js; js/ui.js; css/game.css. Saves: localStorage. No backend/DB used.
## Implemented (June 2026)
Title/continue/settings, 3 rooms, 3 terminals, flashlight, scan (reveal + stun), energy, induction-pad checkpoints, patrol/investigate/chase drone, 5s-delayed Ghost Signal trace (weights floor sensor, distracts drone), power cell + breaker order (II, III, I) puzzle, emergency exit ending with extra transmission, pause/objectives, touch controls.
## Backlog
P1: Mission 02 (beyond sector one), log archive in pause menu, PWA/offline install. P2: more drone types, music layers, gamepad support.
