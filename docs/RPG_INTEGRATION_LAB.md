# Ghost Signal Engine — first research-driven RPG integration lab

**Branch:** \`ghost-signal-engine\` only.
**Design references:** [Deep JRPG study](JRPG_DEEP_SYSTEMS_STUDY_20261114.md) and [development standard](JRPG_DEVELOPMENT_STANDARD.md).
**State:** Noncanonical playable-source integration laboratory, not a campaign, production-quality battle system, or release-ready Android game.

## What was built

The opt-in browser route \`/index.html?rpg-lab=1\` creates a small test sector using the **actual Ghost Signal \`Game\` class** and its existing tile renderer, 32x32 grid, smooth cardinal movement, collision, lighting, camera, scanner, hiding, drone patrol/sight/chase AI and interactions. It deliberately does not modify the two original mission registrations, original HTML/CSS/UI files or standalone \`/studio/\` tool.

Its layout includes staging floor, connected corridor, security region, salvage item, archive terminal, a checkpoint pad, hiding alcove and security relay. The authored area policy defaults to normal and changes to stealth only in the security region. The relay offers a non-combat solution. A real sentry detection invokes \`hybrid-session\` and \`rpg-combat\`, snapshots exploration, pauses the original field, displays an additive Ghost Signal-styled command overlay, resolves attacks and returns to the exact field coordinates. A victorious battle records XP and scrap once, disables the threat, and makes the encounter persistent. Fleeing restores exploration with a short re-engagement cooldown; defeat uses explicit temporary test-party recovery.

The tactical prototype fields two units with **different test roles**: Sleeper can use PULSE (5 EP) and Echo can use REPAIR (5 EP). Both can attack, defend and use repair kits; guard mitigates the sentry's telegraphed strike against the displayed target. Player-selected ally targeting is implemented for Echo's repair skill and consumable repair kits. A target-selection screen displays each living party member's current HP; resource consumption happens only after the player confirms a recipient. This is an intentionally small prototype to expose balance/UX issues. It is **not yet** PSIV-style simultaneous command planning, positional tactics, skill catalog, or final balance.

\`M\` or the added RPG button opens seven field-record panels (status, party, equipment, items, skills, quests, save) using Ghost Signal's existing \`panel\`, \`menu-btn\`, case-list, type hierarchy and palette. The original pause SAVE action is routed to the new RPG test journal only **when the opt-in lab is running**.

## Persistence isolation

Test sector uses a dedicated two-record journal \`bearframe_ghost_signal_rpg_lab_v1:A/B\`. It saves exploration party/inventory/quest flags, field snapshot and current security-unit state (positions, patrol/alert/status), never the original mission save, progress or settings keys. It refuses battle-phase saves. Original \`Game\` checkpoint writes in the test sector are redirected to a no-op in-memory adapter; only the explicit lab journal persists RPG state. The original Ghost Signal game remains unchanged when the query parameter is absent.

In addition, the lab wraps Ghost Signal's existing checkpoint and restore calls: an in-session energy-depletion restore rolls back RPG party, inventory and quest data to the matching field checkpoint rather than duplicating an item collected afterward. This checkpoint rollback is source-integrated but still needs live browser failure/recovery acceptance.

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

**Verified GitHub Actions Chromium CI:** commit `d2b8f13` [run 43627895700](https://github.com/nobleknights015-maker/bearframe-ghost-signal/actions/runs/43627895700) passed the full 43-test Node suite and real browser scenario: keyboard movement into stealth security, actual sentry detection, turn-based victory, exactly-once XP/salvage, battle-to-field restoration, persistence across reload, a directly invoked (harness-only) relay interaction alternate resolution, original Mission 01 start and Sprite Studio entry. A subsequent [run 43628142809](https://github.com/nobleknights015-maker/bearframe-ghost-signal/actions/runs/43628142809) on commit `856d4bd` passed **43 Node tests plus the full Chromium scenario explicitly selecting Echo's repair recipient and verifying that choosing an ally consumes EP only on confirmation**, before victory/reward persistence and original-game checks. A physical Moto G (2025) has not been tested. User-paid art is not bundled; the lab currently renders the **existing Ghost Signal Wraith procedural sprite**, which is a temporary visual reference, not the canonical Sleeper artwork.

## Verification boundaries and known gaps

- **Verified in this session:** 28 existing local module tests in a partial checkout; 15 direct isolated map/security checks against fetched GitHub source; JavaScript source syntax checks. The current branch comparison has been used to ensure original UI file paths were not modified.
- **Executed in GitHub's full checkout:** 43 Node tests plus Chromium browser scenarios for sentry detection, battle victory, item/XP/save continuity, direct relay interaction bypass, and explicit ally repair-recipient selection. These run from source in GitHub Actions.
- **Not verified:** human-played complete mission or full physical traversal to relay, complete original Missions 01/02 playthrough, desktop-vs-mobile rendered screenshots, Android Gradle compilation, installed APK, 4GB RAM/FPS, gamepad on real controller, save/process-kill soak, signed updates.
- **Incomplete:** battle-command planning and macros, final enemy policies/AI balance, actor-specific mechanics enforced in the battle rule layer, full content authoring APIs, equipment UI operations, canonical player sprite binding, cross-version migration, native SAF export.

## Next mandatory gates

1. Observe and fix complete Node/Chromium CI results. Exercise actual walking -> detection -> fight -> rewards -> reload without fixture teleporting.
2. Verify terminal/item/relay/alcove and non-combat bypass, then record browser screenshots.
3. Implement unit-specific skill catalogs and authored enemy intent, replacing the temporary lowest-HP selector with informed tactical choices.
4. Compare simultaneous planned rounds vs existing sequential actions and establish baseline tactical encounter duration and balance.
5. Expand UI to transactional item/equipment menus, equipment compatibility and full save slot presentation.
6. Build/debug test the Android package and run physical landscape + gamepad + 30-minute recovery soak.

**Release gate:** Not complete, not production-ready. Do not merge into original \`main\` or freeze a production APK until full acceptance.
