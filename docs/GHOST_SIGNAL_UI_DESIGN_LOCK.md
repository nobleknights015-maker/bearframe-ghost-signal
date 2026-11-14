# Ghost Signal Engine — original UI design lock

**Owner approval, 14 November 2026.** The existing *BEARFRAME: GHOST SIGNAL* user interface, menus, HUD and overall presentation are the approved and preferred interface for the full Bearframe RPG. **They are not placeholders.** The new RPG must look and feel like Ghost Signal, including stealth and normal exploration as well as party combat.

## Canonical visual reference

The frozen original baseline is [`baseline/ghost-signal-20261114`](../..//tree/baseline/ghost-signal-20261114) at `f6f8f09b7d6c452f158a67473ac35c2fb374da6f`. Main UI source: `frontend/public/index.html`, `frontend/public/css/game.css`, `frontend/public/js/ui.js`, with menu wiring/viewport in `frontend/public/js/main.js`.

- Keep the established 480×270 logical canvas/scaling, sharp pixel presentation, CRT vignette/scanlines, fades and transitions. Maintain responsive phone landscape and proper touch targets without inventing a new look.
- Keep **Silkscreen** and **VT323** fonts and existing type hierarchy. Preserve CSS palette tokens `--red: #ff3b30`, `--silver: #dcd6d8`, `--gun: #15181c`, `--line: #3a3f47`, and `--phos: #7dffb0`.
- Keep Ghost Signal's squared buttons/panels, thin outlines, red side-accent buttons, compact industrial readouts, iconography, hover/focus feedback, sound/transition conventions, and existing HUD alignment.
- Keep the title screen, pause/settings screens, comms/dialogue, objective display, case-file tab interface, green CRT terminals, D-pad/action arrangement and stealth detection UI. No generic JRPG blue dialogue boxes or unrelated menu layout.

## Extension rule

Add **PARTY, STATUS, EQUIPMENT, ITEMS, SKILLS, QUESTS, SAVE/LOAD and TURN-BASED BATTLE COMMANDS** by creating consistent new Ghost Signal-style views and tab panels **using the existing CSS components and UI system**. Do not transplant an alternate visual theme from the old RPG engine. Its combat/party code can be reused behind an adapter while Ghost Signal provides the visible UI.

Use existing display hierarchy and typographic language for new stats like HP/energy, party portraits, attack/skill/item/defend/flee commands, and inventory entries; avoid hiding important RPG actions on touch or controller.

Stealth UI remains contextually visible where patrols/security are present. Standard exploration should not show misleading detection/stealth indicators when no stealth system is active; preserve original Ghost Signal behavior in its own missions.

## Non-regression acceptance

- [ ] Original Ghost Signal title, pause, settings, dialog, terminal, case file, HUD and stealth controls have the same appearance and flow in the frozen baseline versus the engine copy (aside from deliberate additive RPG navigation).
- [ ] Existing Ghost Signal Missions 01/02 and standalone Sprite Studio continue working; do not mutate their save keys.
- [ ] New party/inventory/equipment/skills/status/quest/battle screens use the same font, colors, panel/button grammar, pixel sizes and navigation conventions rather than a different JRPG skin.
- [ ] Keyboard, touchscreen and controller focus/selection remain coherent across normal, stealth, menu and battle states.
- [ ] Maintain 32×32 native world tiles, exactly four cardinal movement/animation directions, landscape scaling, accessibility and safe areas.
- [ ] Capture visual regression evidence for desktop landscape and Moto G (2025) 4GB Android; hardware and production release remain unverified until tested.

## Branch policy

Original Ghost Signal `main` and frozen `baseline/ghost-signal-20261114` remain untouched. Additive engine work goes only to branch `ghost-signal-engine`; old `bearframe-rpg-engine` is a reference for reusable **mechanics**, not alternate UI.