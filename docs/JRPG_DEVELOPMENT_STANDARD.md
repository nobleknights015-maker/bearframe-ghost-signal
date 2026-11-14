# Bearframe Ghost Signal Engine — Research-Driven Development Standard

**Authority:** Owner instruction, 2026-11-14. Applies to all engine development on `ghost-signal-engine` and each hourly continuation. This is an engineering rulebook, **not** a claim that these features are finished.

**Complete research:** [JRPG Deep Systems Study](JRPG_DEEP_SYSTEMS_STUDY_20261114.md)  
**Atlas Warehouse archived reference:** [Full public study](https://github.com/nobleknights015-maker/Atlas-Warehouse/blob/main/warehouse/studies/ghost-signal-jrpg-deep-systems-study-2026-11-14.md)  
**Atlas Warehouse index:** [Records](https://github.com/nobleknights015-maker/Atlas-Warehouse/blob/main/warehouse/INDEX.json)

## Standing owner directive: permanent max-mode engineering

Owner reaffirmed on November 14, 2026: perform the maximum **verifiable and safe engineering work** available every continuation round, not review-only status cycles. This directive remains in effect until the owner explicitly changes it.

- Start from the latest actual `ghost-signal-engine` source and live CI evidence (issue #2 and individual job logs). Do not re-implement or re-research systems already verified.
- Deliver integrated playable source changes, deterministic automated tests and CI evidence in the same round where feasible. Fix observed failures before unrelated feature work. Don't claim unobserved results.
- If the local environment cannot clone GitHub, use the connected repository actions and existing `ubuntu-24.04` GitHub Actions workflows; change approach, not the owner-approved baseline.
- Make real Player/World/Party/Stealth/Quest/Saves interactions rather than counting standalone modules as progress.
- Keep original Ghost Signal missions, UI, Sprite Studio, legacy saves and the frozen baseline untouched. Only additive RPG engineering on the development branch is authorized.
- Do not conflate browser success, APK assembly success, Android emulator success and physical Moto G acceptance. Each is a separate gate.
- End each run with concrete commits, files changed, actual tests completed, outstanding blockers and the next vertical-slice dependency.

## Mandatory checks before starting any feature

Write down, at minimum:

1. **Player decision** — What interesting decision or skill does this feature introduce? Why isn't Attack/Move/Use always optimal?
2. **Connected systems** — Which exploration, combat, party, quest or stealth state changes? How does the surrounding world notice?
3. **Feedback and usability** — How is it taught and displayed within the **original** Ghost Signal UI and four-direction 480×270 landscape presentation, including touch, keyboard and controller?
4. **Continuity** — What must be saved, loaded, restored after defeat/flee and reloaded after Android process death? How do retries avoid duplicated rewards/items?
5. **Verification** — Name the precise deterministic unit/integration tests, browser/visual evidence and (when relevant) physical Moto G 4GB acceptance.
6. **References and provenance** — Cite an applicable deep-study section, prior tested module or exact repo evidence; state clearly when a source is a hypothesis or recommendation rather than a verified fact.

**Reject/hold** a feature if these have no defensible answers. Do not introduce a module simply because other JRPGs commonly contain it.

## Design choices to preserve in implementation

- **World:** Ghost Signal HTML5 Canvas runtime owns camera, collision, 32×32 native world grid, smooth four-cardinal motion, interactions and state; do not introduce a second competing field core.
- **Stealth:** Preserve patrol/investigate/chase/search, sensors, hiding, noise, scans, alarms, hazards and checkpoint logic. Data-driven, location-specific stealth zones. Detection does **not** always trigger battle.
- **Encounters:** Author visible threats with readable intention/counterplay, environmental context, retreat policy and a consequence. Avoid default random battles or grind gates.
- **Combat:** Prototype party-wide command planning, distinct Techniques/limited Skills, deterministic event resolution, target validation, statuses, meaningful guard/repair/items, authored enemy policies, optional macros and combos. Compare the prototype against sequential turns before deciding. Current `rpg-combat.js` is only an early prototype.
- **Party progression:** Distinct roles and compact meaningful skills, inventory conservation, meaningful equipment deltas, upgrade compatibility by ancient/modern lineage. Sleeper is **not** a modern Bearframe and its core is not trivially upgradable.
- **Dungeons and quests:** Design map, event triggers, NPC states, environmental mechanics, route choices, hints and quest outcomes together; make one-shot effects idempotent.
- **UI:** Original `index.html`, `css/game.css`, `ui.js` and Sprite Studio are locked as the visual foundation. New views extend existing fonts, palette, proportions, panels, focus behavior and controls. Never apply a generic JRPG skin.
- **Saves:** Keep original Ghost Signal keys untouched; versioned, checksummed RPG state contains location, facing, party, equipment, inventory, event/quest/puzzle/security states and coherent encounter progress. Test rollback, app kill and no reward duplication.
- **Platform:** Android WebView host requires actual APK build, physical device testing, landscape/safe-area, input/audiosuspend, offline licensed fonts and 30+ minute memory/save soak before release claims.

## Development sequence (vertical slice first)

**Gate A — Baseline:** Execute complete existing unit suite and original Missions 01/02 + Sprite Studio smoke and visual tests; preserve their baseline files and save keys.

**Gate B — Field slice:** Actual Ghost Signal renderer, one data-authored RPG test area, one interactable, four-way smooth movement, safe room, checkpoint and one context-specific stealth zone. No campaign/lore invention.

**Gate C — Tactical slice:** One enemy with a telegraphed action and actual counterplay; two differentiated party units; battle entry/return at exact world position; test meaningful non-Attack choices and resource impacts.

**Gate D — Expedition slice:** Two connected areas, an optional detour and shortcut, one hazard/puzzle, authored fight and avoidance option, consequences in quest/world flags. Full save/load after each transition.

**Gate E — Usability:** Status/party/equipment/items/skills/quests/battle command panels in Ghost Signal's current UI grammar; touch-only, keyboard-only, controller-only and hot-swapping smoke tests.

**Gate F — Device:** Real debug APK compile/install; Moto G (2025) movement, UI, controller, 4GB performance, thermal, resume/kill/relaunch, corruption/upgrade and extended save soak. Release keys remain owner-controlled.

No claim of full JRPG readiness until Gates A–F are actually verified with links to logs/screenshots or reproducible commands.

## Explicit anti-patterns to stop early

- Attack repeatedly is optimal in almost every battle.
- Enemies just attack the party member with lowest proportional HP.
- Battle takes longer only because foes have more HP.
- The world forgets a disabled relay, opened door, recruited Frame, alert state or unique reward.
- Ancient Sleeper equipment acts like universally compatible modern Foundry modules.
- Quest list and room layout are built independently.
- Mechanics offer no visible feedback or no save correctness contract.
- Source-only/node-only tests are presented as proof of physical Android success.
- New menu styling deviates from Ghost Signal's approved industrial CRT language.
- Generic component count is treated as progress without a cohesive playable test sector.

## Every development checkpoint must report

**Source HEAD before and after; modified paths; tests actually executed; which design gates gained evidence; failures or unknowns; original game/UI/stealth/save/Sprite Studio regression status; next vertical-slice task.** Do not claim a test or build succeeded based solely on an unobserved Actions workflow.

When a detailed architecture decision changes, update this standard and the source study with rationale and evidence; never silently replace owner-approved constraints.
