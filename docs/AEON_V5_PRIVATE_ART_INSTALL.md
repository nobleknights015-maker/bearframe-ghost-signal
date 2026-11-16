# Aeon Circuit v5 — private art installation and live opt-in test

The engine-side character generator is merged in PR #3. The public development branch also contains `frontend/public/js/engine/aeon-v5-bridge.js`, an opt-in adapter for the owner-supplied 42-ID v5 art package. **The proprietary art files themselves are NOT committed to public GitHub.**

## Use the actual owner ZIPs (offline, on a rights-authorized build machine)

The installer accepts two exact source archives supplied by the owner:
- `Aeon_Circuit_Animated_Asset_Polish_v5.zip` — authoritative 42 characters, world and side-view battle atlases, per-frame animation timing, and manifest.
- `Aeon_Circuit_Four_Starter_Selection_Crops.zip` — character-selection portraits with exact A–D identities.

From the repository root:

```bash
python3 frontend/character-tools/import_v5_art.py \
  "/private/Aeon_Circuit_Animated_Asset_Polish_v5.zip" \
  "/private/Aeon_Circuit_Four_Starter_Selection_Crops.zip"
PORT=3000 HOST=127.0.0.1 node frontend/serve.js
```

Open `http://127.0.0.1:3000/index.html?rpg-lab=1&aeon-v5=1` in a landscape browser. Choose one of the four Sleepers, then walk in the original Ghost Signal test sector until the noncanonical Old Sentry triggers the existing tactical side-view encounter. The exact v5 player/Echo/Sentry artwork comes from the private manifest, not the procedural draft generator. Other v5 IDs remain available through the manifest for future authorized binding.

The installer **refuses to overwrite differing files** and checks every v5 world/battle atlas digest, dimensions, row order and timing against the original archive. All four starter portraits are bound to exactly matching IDs. Private assets land under `frontend/public/assets/aeon/`, which is excluded by `.gitignore`.

## Compatibility and acceptance

- **Movement:** engine remains four-directional on the original 32-pixel tile grid. Sleeper images are 32×56 native; the adapter uses all eight authored walk frames, remaps original v5 down/left/right/up rows to Ghost Signal down/up/right/left and preserves bottom-center feet without altering game collision or camera.
- **Battle:** existing turn-based rules remain unchanged. V5 sources supply 6×9 battle images, per-frame durations and authored release times; the presentation queues complete action/reaction poses. Field and battle actors resolve from the **same chosen A/B/C/D identity**. The example Echo test art is explicitly `echo_industrial_maintenance`, never an undocumented generic Echo substitute.
- **Saves:** v5 QA records use isolated per-starter namespaces; original Ghost Signal saves and the older RPG lab are untouched.
- **Mobile:** building an Android **debug** APK from a private source checkout with the imported image bytes packages the images via the existing Gradle assets step. The public CI APK cannot include these private assets. Release APK, Moto G hardware, memory/performance and user visual art approval are independent gates.
- **Approval:** the source v5 package labels its polish poses **visual-review candidates**. Green test results validate integration mechanics, not final art quality. Never auto-publish or mark those outputs canonical without owner signoff.

CI includes `frontend/tests/aeon-v5-bridge.test.mjs` and `frontend/tests/browser-aeon-v5.mjs` (browser runs with synthetic non-owner fixture images). The latter visits the real Game, selects Sleeper C, enters the side-view encounter, and asserts the canvas actually paints the test atlases. Actual private-art visual QA is intentionally left to the rights-authorized build.

This is a development integration path, not a replacement for the Director's Cut screenplay or the original Ghost Signal game.
