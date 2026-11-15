# Aeon Circuit — Connected World, Interactions, Menus and Combat Implementation Blueprint
**Research:** 2026-11-15. **Status:** owner-requested engineering research, not implemented features.
**Applies to:** `ghost-signal-engine` only. **Do not change:** original Ghost Signal UI, Missions 01/02, Sprite Studio, or legacy saves.
**Canon:** Revision 4.10 checked privately. This public blueprint contains NO restricted story revelations. Ancient Sleeper/Echo/Ghost Grid systems are NOT modern Bearframes; no invented universal core upgrades or duplicated modern Foundry permissions.

## Architectural decision
Build ONE persistent campaign over MANY author-defined 32x32 maps, rendered by the existing Ghost Signal `Game`. The geography is an explicitly validated graph of portals; areas load on demand; only their persistent state *deltas* go to the RPG journal. Keep smooth FOUR-cardinal movement, feet-anchored sprite depth, independent collision/occlusion/sound/security metadata, integer pixel scaling, existing Ghost Signal industrial-CRT UI.

World topology prototype (noncanonical):
```
Staging -- Surface -- Junction -- Security Wing -- Archive -- Relay
              \       /    \                   /       |
               Workshop      Maintenance Duct --        |
                  \_____________________________________  (shortcuts as authored)
```
The required first proof is TWO real walkable maps with explicit portal + reverse spawn + rollback + save/reload. Extend later to 6-9 maps with a shortcut, two routes, one hazard/puzzle, a noncombat alternative and return-to-start. Don't build a giant decorative world before the inter-map transaction succeeds.

## Map import / entity contract
- Author in Tiled orthogonal maps using native 32x32; import `.tmj` to versioned compact runtime data. Tiled's `.world` helps organize the authoring view but is NOT a runtime streaming system.
- Stable IDs: `mapId`, `spawnId`, `portalId`, `objectId`, `questId`, `eventId`. Explicit reverse portals and spawn facing. Validate all IDs, destination safety, tile ranges, collider shapes and tileset references.
- Layers: ground, wall/decals, under/above actors, lighting; independent collision/occlusion/noise/cover/hazard masks.
- A map's baseline content is immutable; saved per-map deltas track collected caches, switch/door state, defeated threats, opened shortcuts, and discovered records. Evict image buffers, NEVER world state.
- Portals: discover → validate → freeze field/AI → stage destination and its collision/assets → atomically commit location + old/new map deltas → reset camera/facing → reveal and resume. Full rollback on bad loading/save.

## Single typed interaction/event system
Player grammar: notice → approach → face/select target → inspect/preview → choose → resolve → feedback → remember.
Object types: readable, Echo/NPC dialogue, switch, container, door/portal, environmental hazard, checkpoint, visible encounter, security terminal.
Conditions (allowlist): `all`, `any`, `not`, `flagEquals`, `questStage`, `hasItem`, `actorPresent`, `knowledgeContains`.
Effects (allowlist): `setFlag`, `setEntityState`, `advanceQuest`, `addItem`, `removeItem`, `discoverRecord`, `unlockPortal`, `setSecurityState`, `startDialogue`, `startBattle`, `transitionMap`.
NO JSON `eval`, arbitrary executable scripting, or missing action handlers quietly ignored.
One-shot event IDs commit exactly once. Separate once/visit/repeatable/resettable lifetimes. Permanent effects are atomic before animation/audio; reentrant touch or app kill cannot duplicate rewards.

## Canonical worldbuilding constraints
Every room: original FUNCTION; transport, power, ventilation/drainage logic; physical HISTORY and decay; current ecology; player's reason to care. Overgrowth must have an anchor; old electrical systems a power source. Ghost Grid follows old protocols but isn't automatically evil; Echo testimony and verified records are different evidence. Do not reveal privately protected mystery as 'lore UI.' Avoid random inhabited cities on an abandoned-planet exploration arc. Distinguish legacy, Echo, contemporary Bearframe and Directorate visual construction.

## Real JRPG menu
Keep Ghost Signal UI and style. One navigation/focus stack supports touch, keyboard and physical gamepad with consistent Confirm/Back.
- Status: correct art, HP/EP/level/effective stats/status.
- Party: active roster, order, valid swaps.
- Equipment: member → slot → compatible gear → effective stat delta → confirm/cancel; old gear returned, item counts conserved.
- Items: filters → usable item → recipient → confirm; no cost until valid committed choice.
- Techniques/Skills: learned abilities and field-vs-battle restrictions.
- Quest/Records: objectives, evidence, testimony and hypotheses as separate knowledge states; conditional dialogue.
- Map: visited rooms, known entrances, activated shortcuts; never expose unrevealed maps.
- Saves/Settings: integrity-backed RPG slots, visible last safe location, input/text speed accessibility.
Dialogs must trap focus, restore previous selected item on close, never activate field movement under a modal. Touch targets are measured in CSS/device space, not assumed from 32x32 game art.

## Tactical combat plan
CURRENTLY VERIFIED: sequential action battle, Sleeper Pulse, Echo Repair, equipment bonuses, guarded targeted sentry charged strike, Pulse disruption, item, flee, defeat, no duplicate rewards, field return.
RESEARCH PROPOSAL: feature-flagged PSIV-inspired **party command planning** adapter (all allies choose commands/targets → confirm → deterministic initiative resolution), COMPARED to current sequential mode rather than an immediate rewrite. Add only 1-2 meaningful statuses and one authored synergy at first. Each enemy behavior: telegraph, counterplay, target/fallback, world consequence. Prefer deliberately placed visible threats, including stealth bypass. Do not inflate HP to manufacture depth.
Measure rounds, tap burden on Moto G, item/EP expenditure, attack-only versus Guard/Pulse effectiveness, understandable warnings, stability when targets die mid-round. Keep battle source immutable; commit world/quest rewards once on terminal outcome.

## Required implementation sequence (highest first)
1. Branch HEAD/CI audit, protect UI/file hashes and save namespace.
2. Two Tiled-authored runtime maps, explicit bidirectional portal/spawn, origin-state rollback and browser walk/reload. NO competing renderer.
3. Versioned per-map state journal and allowlisted typed event transactions; one lever+door+unique cache+quest-stage test.
4. Six-to-nine-map noncanonical vertical slice with two routes, hazard, active security, shortcut and return; visual tiles from permission-cleared 32x32 supplied asset packs.
5. Contextual dialogue, actionable menus and knowledge journal sharing the event-state system; touch and gamepad focus acceptance.
6. Authored alternative enemy and optional command-planning prototype with side-by-side metrics; no premature untested macros.
7. Reproducible asset atlas/animation binding, 1x pixel art QA, Android emulator and real Moto G testing.

## Hard acceptance tests
1. A→B→A map traversal plus save/reload, correct facing and walkable landing.
2. Optional route and locked route both behave as designed with/without prerequisite.
3. Open door and loot cache; revisit/reload; NOTHING duplicates or resets.
4. Trigger relay; former security map reacts; quest and conditional dialogue agree.
5. Fight or bypass visible threat; different honest outcomes; no XP/scrap for flee/bypass.
6. Defeat/checkpoint and process-kill during portal transaction never corrupt location.
7. Keyboard-only, touch-only, gamepad-only and hot-swap across items, equipment, dialogue, save and battle.
8. Original Ghost Signal M1/M2, Sprite Studio, UI and legacy saves remain untouched.
9. Compiled APK and emulator evidence are distinct from physical Moto G performance/recovery and controller acceptance.

## Evidence / sources
- Tiled multiple-world maps: https://doc.mapeditor.org/en/stable/manual/worlds/
- Tiled JSON objects/properties: https://docs.mapeditor.org/en/stable/reference/json-map-format/
- Tiled object interactions: https://docs.mapeditor.org/en/stable/manual/objects/
- Tiled terrain and automapping: https://docs.mapeditor.org/en/stable/manual/terrain/
- Red Blob A* four-way Manhattan movement: https://www.redblobgames.com/pathfinding/a-star/introduction.html
- Sega official PSIV manual (command plans, macros, techniques, skills, combos): https://manuals.sega.com/genesismini/pdf/PHANTASY_STAR_IV.pdf
- Xbox UI navigation/focus: https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/112 and https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/113
- Yarn Spinner dialogue choices/conditions: https://yarnspinner.dev/features/
- Game Programming Patterns event queue: https://gameprogrammingpatterns.com/event-queue.html
- Android WebView offline assets and memory: https://developer.android.com/develop/ui/views/layout/webapps/load-local-content and https://developer.android.com/develop/ui/views/layout/webapps/manage-webview-memory
- W3C touch target sizing: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- Existing project JRPG study: [JRPG_DEEP_SYSTEMS_STUDY_20261114.md](JRPG_DEEP_SYSTEMS_STUDY_20261114.md).

**Classification:** This document is a design/engineering contract, NOT evidence that the world-map loader, proposed dialogue event engine or command-planning mode are already implemented. The long-form research companion was authored for the owner as a separate downloadable 11,500-word report on Nov 15, 2026.
