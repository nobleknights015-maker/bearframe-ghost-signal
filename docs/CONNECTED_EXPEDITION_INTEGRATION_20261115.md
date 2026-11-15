# Ghost Signal Engine — connected expedition integration acceptance
**Date:** 2026-11-15.
**Status:** Noncanonical playable test; not Director's Cut v2 chapter content or production release.

## Actually implemented
- Two standalone native-32px Tiled orthogonal maps at `frontend/public/maps/rpg-lab-staging.tmj` and `rpg-lab-annex.tmj`.
- The existing Ghost Signal `Game.start`, `Game.update`, collision/camera/lighting/tile renderer, real four-direction movement and keyboard/touch game input are used; **no competing renderer**.
- **Walk-through** east/west reciprocal doorways invoke the previously tested `createConnectedFieldTravel` transaction. Arrival uses destination-safe feet coordinates and facing. Input is suppressed during transition and re-entry requires leaving the portal tile, preventing infinite ping-pong.
- Fresh area and revisit state are saved as one connected expedition RPG journal at `bearframe_ghost_signal_connected_lab_v1`. This does NOT touch the original Ghost Signal mission save, settings or story progress.
- The staging switch and annex supply cache are **real interactable field entities** run through `world-events.js`, an immutable, allowlisted quest/flag/inventory event reducer. Both complete exactly once, persist after cross-map travel and reload, and appear in the separate expedition Field Record. Invalid action types and unsatisfied prerequisites never mutate saved progress.
- An additive Ghost Signal-style `MAP / RECORD` HUD button exposes expedition objective progress, kit count, and a manual save.
- Development-only `frontend/public/engine-lab.html` launcher offers **CONNECTED WORLD**, **JRPG COMBAT**, original Ghost Signal, and Sprite Studio. Android DEBUG opens this launcher, while Android RELEASE still opens untouched Ghost Signal.
- Existing `?rpg-lab=1` battle/stealth test continues running separately and retains its own save.

## Verified evidence
- [GitHub Actions browser run 43746503067](https://github.com/nobleknights015-maker/bearframe-ghost-signal/actions/runs/43746503067): **68 Node tests** and **six Chromium integration suites** passed, including actual A→B→A keyboard travel, field interaction at both ends, manual save, restart, source/world state, once-only reward and original save namespace isolation.
- [GitHub Actions run 43747890243](https://github.com/nobleknights015-maker/bearframe-ghost-signal/actions/runs/43747890243): **73 Node tests plus all six Chromium suites passed**, including Tiled mission tests, one-shot event reducer tests, touch launcher mode switching and PAUSE→QUIT navigation back to the dev launcher. A separate Android debug build from commit `0787c27` successfully assembled, launched and relaunched in an emulator: [run 43747041780](https://github.com/nobleknights015-maker/bearframe-ghost-signal/actions/runs/43747041780). It predates the latest event-rule refactor, so newer Android behavior requires a newer matching build.
- The original Ghost Signal HTML/CSS/UI/missions and Sprite Studio files are unchanged.

## Known gaps
- These two 8×6 test rooms are intentionally *not* the actual 29-area Director's Cut game map set. Artwork, atmospheric detailing, collision masks, scene/quest placement and first chapter sequences remain implementation tasks. Never copy unreleased Director's Cut spoiler content into the public repository.
- Field records are a minimum viable noncanonical test menu; **full** JRPG party management, dialogue stack, conditional doors and menu navigation still require real authoring and touch/keyboard/controller QA.
- Android debug build and emulator boot/launch are distinct from playing the connected expedition on a real Moto G (2025). Do not claim physical-device proof.
- Existing source tests of `createConnectedFieldTravel` cover destination loading, blocked arrival, save failure and checkpoint rollback; a browser-injected failure scenario and Android process-kill/reload still need acceptance.

## Next integrated batch
1. **Expand the live event system**: extend now-integrated immutable `world-events.js` with actual conditional door/hazard/quest effects and realistic authored map interactions; test cross-map revision, repeat prevention and failed-save rollback through the browser, not only Node tests.
2. **Full-size map authoring**: expand two connected rooms into materially different areas, authored entrance/exit, environmental choices, hazard, shortcut, and feedback.
3. **Playability**: common input focus, touch navigation of record/quest screens, release-safe debug launcher, Android emulator scenario and real target Moto G.
4. **Approved story**: securely map the Director's Cut v2 first chapter's area/quest/scene/encounter data to engine schemas *without publishing private spoiler content or changing authored beats*.

**Release state:** This proves the missing connected-map behavior, not a finished game.
