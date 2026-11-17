# Ghost Signal Expanded — dedicated Android test host

This APK launches the original standalone **Bearframe: Ghost Signal**, not Aeon Circuit, an engine editor, or engine-lab. It packs frontend/public into Android WebView assets during the Gradle build. The original HTML Canvas title, HUD, missions M01-M06, scanner, and saves are not replaced.

- Package ID: `labs.bearframe.ghostsignal.expanded` (does **not** overwrite the original engine app).
- Version: 0.2.4-expansion-dev, debug only, NOT a production signed release.
- Portrait locked out: landscape activity + insets-safe WebView, original 480×270 scaled game.
- `WebViewAssetLoader` supplies a stable local HTTPS-like origin for module imports and browser-local saves.
- Private, licensed, paid asset packs are NOT included in public CI unless explicitly cleared for redistribution. SVG/JS procedural art in the public game is packaged.
- Android updates of a GitHub Actions debug build may not preserve signature identity across separate runners. Back up saves before uninstalling. Do not assume original browser saves migrate into the app.
- Offline gameplay is packaged, but original Google Fonts remain network dependent and fall back to system fonts without connectivity.

Build: Java 17, Android SDK 35, Gradle 8.10.2, `gradle -p android :app:assembleDebug`.

Verification: GitHub Actions runs static source-payload comparison against the assembled APK, followed by emulator launch, landscape, home/resume/restart checks if the emulator is available. A green run does not substitute for actual Moto G (2025) hardware QA, full game playthrough or final lore/art review.
