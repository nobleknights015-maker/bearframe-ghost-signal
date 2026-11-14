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
## Implemented v2 (June 2026, tested iteration_2: 13/13)
- Wraith sheet 7 cols (walk 0-3, idle 4-5, scan 6), cloak sway, display pulse; green live trace + amber archived-echo sheets.
- Investigation: clue entities (clue/machine/signal), scan marks -> EXAMINE logs evidence; case file overlay (evidence + log archive, key C / CF / pause); carried M1->M2 via progress key.
- Stealth: multi-drone, detection meter, halt-and-stare, chase, search points, return to patrol, vision cones, HUD stealth readout, alcove hiding, steam jets, loose grating, sentry lens (scan disrupts).
- Trace echo: projector entities replay archived paths (M1 hall, M2 landing + gallery sensor-floor puzzle).
- Mission 02 Below the Silence (missions/mission2.js): landing, spine, pump room (manifold evidence gates valves), work closet (optional), trace gallery, record vault, unidentified individual (never classified), choice ending, evidence-dependent debrief.
- Saves: save v2 (case, ent done/scanned), v1 saves migrate; progress key unlocks M2.
## Backlog
P1: Mission 03 (the unlabelled record / the label), PWA/offline install, deduction board linking evidence. P2: more drone types, music layers, gamepad support.
