# Ghost Signal Engine — first research-driven RPG integration lab

**Branch:** \`ghost-signal-engine\` only.
**Design references:** [Deep JRPG study](JRPG_DEEP_SYSTEMS_STUDY_20261114.md) and [development standard](JRPG_DEVELOPMENT_STANDARD.md).
**State:** Noncanonical playable-source integration laboratory, not a campaign, production-quality battle system, or release-ready Android game.

## What was built

The opt-in browser route \`/index.html?rpg-lab=1\` creates a small test sector using the **actual Ghost Signal \`Game\` class** and its existing tile renderer, 32x32 grid, smooth cardinal movement, collision, lighting, camera, scanner, hiding, drone patrol/sight/chase AI and interactions. It deliberately does not modify the two original mission registrations, original HTML/CSS/UI files or standalone \`/studio/\` tool.

Its layout includes staging floor, connected corridor, security region, salvage item, archive terminal, a checkpoint pad, hiding alcove and security relay. The authored area policy defaults to normal and changes to stealth only in the security region. The relay offers a non-combat solution. A real sentry detection invokes \`hybrid-session\` and \`rpg-combat\`, snapshots exploration, pauses the original field, displays an additive Ghost Signal-styled command overlay, resolves attacks and returns to the exact field coordinates. A victorious battle records XP and scrap once, disables the threat, and makes the encounter persistent. Fleeing restores exploration with a short re-engagement cooldown; defeat uses explicit temporary test-party recovery.

The tactical prototype fields two units with **different test roles**: Sleeper can use PULSE (5 EP) and Echo can use REPAIR (5 EP). Both can attack, defend and use repair kits; guard mitigates the sentry's telegraphed strike against the displayed target. Player-selected ally targeting is implemented for Echo's repair skill and consumable repair kits. A target-selection screen displays each living party member's current HP; resource consumption happens only after the player confirms a recipient. This is an intentionally small prototype to expose balance/UX issues. It is **not yet** PSIV-style simultaneous command planning, positional tactics, a complete skill catalog, or final balance. The underlying combat rules now enforce each actor's authored skills, not merely the UI buttons.

\`M\` or the added RPG button opens seven field-record panels (status, party, equipment, items, skills, quests, save) using Ghost Signal's existing \`panel\`, \`menu-btn\`, case-list, type hierarchy and palette. The Equipment tab supports actual chassis-restricted weapon changes. The Item tab supports targeted field healing; the RPG journal commits inventory/HP transactions and rolls back if a write fails. Equipment contributes real combat attack/speed bonuses while persisted base character stats remain unchanged. The original pause SAVE action is routed to the new RPG test journal only **when the opt-in lab is running**.

## Authored tactical sentry — charge, guard and disruption

The optional security-sector encounter now has a readable two-step `charged-strike` enemy policy, rather than repetitive weakest-party attacks. A sentry spends one turn **locking its heavy strike to a named character**, and the battle panel shows that name and counterplay. If the party does nothing, the next enemy action is a higher-damage heavy strike. A properly timed GUARD halves it. Sleeper's energy-consuming PULSE can cancel the heavy charge, but the sentry still performs a normal attack instead of losing the entire turn. This creates a tradeoff between conserving EP, defensive timing and damage tempo.

This feature is enforced by immutable, UI-independent rules in `frontend/public/js/engine/rpg-combat.js`; it is authored in the lab enemy data and visible through `enemyForecast` in the **existing Ghost Signal-styled battle overlay**, not an unrelated combat screen. Legacy or non-charging enemies continue using their original simple attack policy. Three new Node tests cover charge/guard mitigation, disruption and forged-action rejection; [successful CI run 43665816034](https://github.com/nobleknights015-maker/bearframe-ghost-signal/actions/runs/43665816034) verifies **54 Node tests passing and the existing four Chromium integration suites** at commit `38041a2`. The complete five-suite Chromium run [43665912438](https://github.com/nobleknights015-maker/bearframe-ghost-signal/actions/runs/43665912438) is now **verified green: 54/54 Node tests and five browser suites passed**, including `frontend/tests/browser-rpg-lab-tactics.mjs` (real input-driven charge warning, chosen GUARD halves the strike, retained HP after fleeing and reloading).

## Persistence isolation

Test sector uses a dedicated two-record journal \`bearframe_ghost_signal_rpg_lab_v1:A/B\`. It saves exploration party/inventory/quest flags, field snapshot and current security-unit state (positions, patrol/alert/status), never the original mission save, progress or settings keys. It refuses battle-phase saves. Original \`Game\` checkpoint writes in the test sector are redirected to a no-op in-memory adapter; only the explicit lab journal persists RPG state. The original Ghost Signal game remains unchanged when the query parameter is absent.

In addition, the lab wraps Ghost Signal's existing checkpoint and restore calls: an in-session energy-depletion restore rolls back RPG party, inventory and quest data to the matching field checkpoint rather than duplicating an item collected afterward. Checkpoint recovery is now wired to the **asynchronous Game.applySnap boundary** and writes the corrected RPG journal after the field snapshot is restored. The recovery behavior passed the dedicated real Chromium energy-depletion/reload suite in [run 43630377813](https://github.com/nobleknights015-maker/bearframe-ghost-signal/actions/runs/43630377813): restored RPG inventory/field state survives a reload with no resurrected items.

The initial debug Android build targets this lab through \`BuildConfig.DEBUG\`. A release-mode build continues to load the original index without the lab parameter. Both still use existing WebView HTML5 Canvas rendering and platform controls.

## How to exercise

From the repository root:

\`\`\`sh
PORT=3000 HOST=127.0.0.1 node frontend/serve.js
# Visit http://127.0.0.1:3000/index.html?rpg-lab=1
\`\`\`

Enter the security perimeter with cardinal movement. You can evade the sentry, hide in the alcove, scan it to disrupt, switch off the relay, or deliberately attract detection and fight. After interacting with salvage/relay or resolving combat, open the RPG field record and save; reload the page to test persistence. Visit the URL without \`?rpg-lab=1\` to confirm original Ghost Signal Missions 01/02 remain available.

To run new source-based tests:

\`\`\`sh
node --test frontend/tests/*.test.mjs
\`\`\`

For real browser integration:

\`\`\`sh
cd frontend
npm install --no-save playwright@1.56.1
npx playwright install chromium
cd ..
PORT=3000 HOST=127.0.0.1 node frontend/serve.js &
GS_BASE_URL=http://127.0.0.1:3000 node frontend/tests/browser-rpg-lab.mjs
\`\`\`

**Verified GitHub Actions Chromium CI:** commit `d2b8f13` [run 43627895700](https://github.com/nobleknights015-maker/bearframe-ghost-signal/actions/runs/43627895700) passed the full 43-test Node suite and real browser scenario: keyboard movement into stealth security, actual sentry detection, turn-based victory, exactly-once XP/salvage, battle-to-field restoration, persistence across reload, a directly invoked (harness-only) relay interaction alternate resolution, original Mission 01 start and Sprite Studio entry. A subsequent [run 43628142809](https://github.com/nobleknights015-maker/bearframe-ghost-signal/actions/runs/43628142809) on commit `856d4bd` passed **43 Node tests plus the full Chromium scenario explicitly selecting Echo's repair recipient and verifying that choosing an ally consumes EP only on confirmation**, before victory/reward persistence and original-game checks. The real navigation-to-relay/withdrawal route passed [run 43629327045](https://github.com/nobleknights015-maker/bearframe-ghost-signal/actions/runs/43629327045). Equipment selection, chassis incompatibility, battle-stat effects, flee and save/reload passed [run 43629869236](https://github.com/nobleknights015-maker/bearframe-ghost-signal/actions/runs/43629869236) together with **49 Node tests** and three Chromium suites. A physical Moto G (2025) has not been tested. User-paid art is not bundled; the lab currently renders the **existing Ghost Signal Wraith procedural sprite**, which is a temporary visual reference, not the canonical Sleeper artwork.

## Verification boundaries and known gaps

- **Verified in this session:** 28 existing local module tests in a partial checkout; 15 direct isolated map/security checks against fetched GitHub source; JavaScript source syntax checks. The current branch comparison has been used to ensure original UI file paths were not modified.
- **Executed in GitHub's full checkout:** 49 Node tests plus real Chromium end-to-end scenarios for sentry detection, tactical win, exactly-once XP/items, field healing, live traversal to optional relay, flee/no-reward state, chassis-locked equipment and combat-stat bonuses, save/reload and the original Ghost Signal + Sprite Studio. See the linked runs above.
- **Not verified:** human-played complete missions, original Missions 01/02 full playthrough, mobile-vs-desktop visual comparison, Android APK installation or emulator gameplay, 4GB RAM/FPS, real physical gamepad, long session/process-kill durability, production signing. **Android debug compilation itself is verified**. Browser navigation to relay **is** tested; that does not imply human QA.
- **Incomplete:** battle-command planning/macros, richer enemy intent and skills, multiple linked areas, complete equipment catalog/loot economy and NPC authoring, canonical sprite sheet binding, full shipping save migration, native SAF export, physical Android acceptance. Basic character-specific skills, equipment UI and legacy lab save metadata migration are now integrated, not pending.

## Next mandatory gates

1. Add a real defeat-recovery browser test (beyond currently tested flee) and stress repeated checkpoint, heal, equipment and save/reload transitions.
2. Verify complete original Missions 01/02 and Sprite Studio interactions, controller navigation and touch targeting, with screenshots and the approved UI lock.
3. Implement authored enemy intent, additional meaningful role abilities and test player-command planning versus the existing sequential tactical prototype.
4. Author a second connected RPG field area, meaningful quest/puzzle state and reversible/reward-safe transitions.
5. Download the successfully assembled debug APK artifact from [Android run 43630442334](https://github.com/nobleknights015-maker/bearframe-ghost-signal/actions/runs/43630442334); verify install/launch and WebView gameplay on emulator, then on the target Moto G. Compile success does not prove run correctness.
6. Run physical Moto G landscape, controller, 4GB performance, resume/kill/relaunch and 30-minute save soak before release.

**Release gate:** Not complete, not production-ready. Do not merge into original \`main\` or freeze a production APK until full acceptance.
