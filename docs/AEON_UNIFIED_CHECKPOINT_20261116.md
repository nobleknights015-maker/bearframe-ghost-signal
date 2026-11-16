# Aeon unified-engine checkpoint

This checkpoint extends the existing Ghost Signal Engine. `aeon.html` is an additive entry point; the original `index.html`, missions, UI/CSS sources, Sprite Studio and original save namespaces remain protected. The public APK's production entry point has not switched.

## Integrated route

From the development launcher, choose **AEON UNIFIED ENGINE**. With the owner-only v5 assets installed, this opens New Game / Continue, the four immutable portrait identities, connected field travel, one-time interactions, the annex patrol, side-view combat, complete action playback, results, party/equipment/items/skills/quest records, area record, formation and isolated save/continue. No debug query parameters are needed for this route.

The two connected rooms are explicitly **noncanonical integration fixtures**. They are not the approved opening or a replacement campaign. The fixture roster has two units; the campaign state supports three active units and one reserve without inventing additional recruits.

## State and compatibility

- One per-starter dual-record journal owns world flags/events, inventory, quests, party identity, formation, RPG stats, current field and area snapshots.
- Interactions and portals commit once, and roll back on failed storage. Restored doorway positions accept deliberate outward travel without idle arrival bouncing. Victory rewards and completion flags are saved together before their presentation can be interrupted.
- Original RPG/v5 labs retain their own namespaces and routes. New Game asks before replacing an existing unified character record.
- Campaign formation selects only active units for battle; reserve HP/EP and identity metadata survive victory, defeat and withdrawal. Older four-slot integrations remain compatible.
- Equipment restrictions and combat calculations are retained. Explicit authored normal-area encounters can use `beginHybridEncounter`; stealth detection retains its separate policy gate. Multiple-hostile target selection is supported when an encounter supplies several living enemies; the current fixture still contains one sentry.

## Presentation and input

The route reuses the original Ghost Signal UI components and palette. The original locked HTML/CSS/UI files are unchanged. World art retains the four-direction/eight-exposure adapter and the selected A/B/C/D identity. The unified patrol uses the same v5 Old Sentry identity in the field and battle; its 96×96 world sheet draws at native size through an optional renderer hook, preserving the original drone drawing everywhere else. Authored release timing, strike recoil, target reactions, shutdown and victory clips finish before the next command or field return. Formations fit 64/96/128 source sheets inside the locked 416×116 stage; dense two-row cells fit proportionally to 37 logical pixels to keep labels visible. This containment is not owner visual approval.

Keyboard, touch and controller use the same menus. Picker cancellation and controller Back are supported. The D-pad retains its initiating pointer; blur/native pause clear held input. Native Android adds cutout/system-bar insets, immersive restoration and a pause event for RPG saves. Native compilation and physical-device acceptance are separate checks.

## Private campaign

`frontend/narrative-tools/import_campaign.py` verifies the owner's source manifest and writes ignored `assets/aeon/story/campaign.json`. It preserves screenplay/insertion chronology and authored CSV/JSON records. `narrative-runtime.js` provides guarded scene/line/choice transactions and explicit save migration. Natural-language quest rewards, encounters and scene instructions are retained as source data, not guessed executable behavior. Full authored map staging, branch bindings, campaign encounters and start-to-credits play remain outstanding.

## Verification and remaining gates

- Local Node suite: 116 passing tests, including a mounted-runtime connected travel/interaction/save/reload test using actual Game snapshot methods and a minimal host. This is not browser or device proof.
- All 88 installed world/battle PNG files match the supplied art archive byte-for-byte; private art/story are excluded from public git.
- Chromium acceptance includes the original game/labs plus a new four-starter unified route suite with keyboard traversal, patrol battle, results, area map, formation, rewards and Continue. The first CI run caught stale intent text during presentation; the readout now updates immediately while input stays locked. Current CI results are recorded on PR #4.
- Local Chromium execution is blocked by a socket restriction. Local Android compilation/emulation is unavailable because Gradle/SDK/adb are absent. Neither is represented as passing.
- Production release still requires authored campaign staging, full menu/combat/story acceptance, private-art visual review, a private offline APK, emulator gameplay/lifecycle checks and physical Moto G testing.
