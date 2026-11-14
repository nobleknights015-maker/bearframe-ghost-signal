# Ghost Signal Engine — integration checkpoint (14 November 2026)

## Safety and ownership
- **Working original**: \`main\` and frozen \`baseline/ghost-signal-20261114\` (baseline SHA \`f6f8f09b7d6c452f158a67473ac35c2fb374da6f\`). Do not edit either ref, or the superseded old hybrid branch.
- **Active engine copy**: \`ghost-signal-engine\`. Only this branch receives engine changes.
- Source-level byte-lock test pins original \`frontend/public/index.html\`, \`css/game.css\`, \`js/ui.js\` and Sprite Studio entry point. Existing Ghost Signal missions/stealth and save keys must continue unchanged.
- Source \`js/engine/input.js\` and \`js/main.js\` in development copy were **additively** extended for controller polling and existing-overlay navigation; the original renderer, CSS and UI layer have not been redesigned.

## Implemented and committed
1. \`area-policy.js\` — authored normal/stealth zone lookup and transition descriptors, no implicit combat.
2. \`encounter-handoff.js\` — deep-detached encounter snapshot and non-teleporting restoration.
3. \`rpg-combat.js\` — deterministic party/enemy turn order, attack, pulse, repair, item, guard, flee, outcome and reward patch. It is an early battle rules implementation, **not** a full skill/status/element subsystem.
4. \`hybrid-session.js\` — pure state handoff: zone entry, authored detection outcomes and battle-to-exploration restoration, preserving map coordinates, flags, party and inventory.
5. \`rpg-party.js\` — immutable party selection, equipment swaps, inventory accounting, leveling and derived combat stats.
6. \`rpg-menu-model.js\` — tab content for Status, Party, Equipment, Items, Skills, Quests and Save in the approved Ghost Signal information language; **views not yet mounted into the running game**.
7. \`rpg-save.js\` — versioned, checksummed, alternating records using new \`bearframe_ghost_signal_rpg_v1:A/B\` keys; original \`bearframe_ghost_signal_*_v1\` keys are untouched. Not yet hooked to a native persistence lifecycle.
8. \`gamepad.js\` and input/main adapters — standard gamepad D-pad/left stick, four cardinal directions, edge-triggered buttons, keyboard/touch priority, focus navigation for original menus.
9. \`android/\` — Java WebViewAssetLoader host with stable HTTPS-like local origin, landscape activity, DOM storage enabled, original static game assets copied at build time. \`.github/workflows/android-debug.yml\` adds a development APK build job, not a production release.

## Verification obtained
- Local Node.js 22 tests for encounter handoff, hybrid session, combat, roster/equipment, gamepad adapter, input priority, save journal and menu model passed during this development session (28 test cases for these local modules; test count excludes original UI lock tests not executable in the partial local checkout).
- GitHub files and tests committed to active branch. \`.github/workflows/ghost-signal-engine-tests.yml\` uses \`node --test frontend/tests/*.test.mjs\`. Exact baseline source SHA checks were added. **No actual GitHub CI pass was observed via the accessible status interface.**
- Physical Android device, Gradle compilation, browser visual regression, gamepad menu-flow test and production signing remain **unverified**.

## Next concrete engineering sequence
1. Run all Node and browser regression tests against a complete branch checkout; fix any mismatch and confirm Ghost Signal Missions 01/02 and Sprite Studio without regressions.
2. Mount the RPG menu panels with the exact existing Ghost Signal CSS/menu/dialog components, and add a new RPG entrypoint rather than modifying original missions. Do not replace original UI.
3. Connect the hybrid session adapter to an explicitly enabled RPG exploration map, using Ghost Signal's real collision/camera/stealth actors instead of maintaining a second movement core. Preserve four-direction smooth movement and native 32x32 tiles.
4. Evaluate the preserved \`bearframe-rpg-engine/framework/party-combat.js\` for advanced skills, seeded RNG, status effects and round validation. Its Rhino/native-Canvas Android pipeline is architecturally incompatible with this HTML5 app and should **not** overwrite Ghost Signal's JS engine. Reuse compatible rules only behind tested adapters; avoid competing active battle cores.
5. Implement round-trip RPG save/load during exploration and battle, rollback/corruption/upgrade tests, native Android app-private persistence plus optional user export. Ensure original Ghost Signal browser data is not migrated implicitly.
6. Run \`gradle -p android :app:assembleDebug\`, inspect CI artifact, load on a real Moto G (2025) 4GB device, and test controller, 30+ minute soak, save/reload after process death, orientation/safe areas, FPS/thermals, audio and licensed art.
7. Bundle appropriately licensed Silkscreen/VT323 fonts locally before offline UI parity is claimed; the original HTML currently references Google Fonts URLs. Never publish owner-paid third-party asset packs or signing secrets.
8. Only after physical acceptance and owner-held release-signing continuity, consider a release APK. Do not label the engine finished based on green unit tests.

## Current release gate
**NOT RELEASE-READY.** The data contracts are tested; live hybrid RPG exploration, user-facing battle/menu screens, Android APK build and device acceptance are incomplete. Keep the scheduled hourly completion automation active.
