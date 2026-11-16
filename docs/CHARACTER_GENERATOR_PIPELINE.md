# Aeon Circuit — callable Bearframe character generator

**Development pipeline; all procedural outputs are DRAFTS until a human art review.** This adds a CLI and API over the **existing Sprite Studio** renderers, not a replacement Studio. The default original Ghost Signal game, Wraith art, browser editor, mission saves, and all existing presets remain unchanged.

## Source separation and reproducible checkout

Production integration target: ghost-signal-engine.
New work is isolated on feature/aeon-character-generator-api-20261115 pending CI and review.
The engine branch has an older set of Studio renderers, while the current advanced generator exists on sprite-studio-sleek-copy. This pipeline accepts either:
- Default: frontend/public/studio/lib, present in a clean checkout.
- Current advanced Studio: set BF_STUDIO_LIB to the full absolute path of the advanced branch's frontend/public/studio/lib.

The CI workflow checks out both branches into separate directories and uses the advanced Studio. It does **not** merge or overwrite the older editor source, and preserves the advanced branch's own presets, source, and saved projects.

From a clean checkout:

    npm install --prefix frontend/character-tools
    node frontend/character-tools/cli.mjs generate frontend/character-tools/requests/test_relay_01.json
    node frontend/character-tools/cli.mjs validate test_relay_01
    node frontend/character-tools/cli.mjs register test_relay_01 --development

For the current advanced renderer:

    git worktree add /tmp/aeon-studio-copy sprite-studio-sleek-copy
    export BF_STUDIO_LIB=/tmp/aeon-studio-copy/frontend/public/studio/lib
    node frontend/character-tools/cli.mjs generate frontend/character-tools/requests/test_relay_01.json

Run the tests after installing dependencies:

    node --test frontend/character-tools/tests/character-generator.test.mjs
    node --test frontend/tests/*.test.mjs

Output (may be changed with BF_CHARACTER_OUTPUT) is always per-ID in frontend/character-output/<id>/:
request.json, world.png/json, battle.png/json, portrait.png, source.bfsprite.json, manifest.json, preview.png.
All PNGs contain transparency and are independently validated. Source is editable in Sprite Studio; runtime PNGs are still drafts until owner review.

## JavaScript API

Import frontend/character-tools/character-api.mjs and call:

- generateCharacter(spec,{outputRoot}) — create the protected draft project. Refuses an existing directory.
- generateOverworldAnimations(id,{outputRoot}) — render 4-direction native world sheet.
- generateBattleAnimations(id,{outputRoot}) — render true engine-compatible 6x9 sheet, **not** the Studio's own column concatenation.
- importApprovedSpriteSheet(file,{characterId,role,approval,sheetMetadata},{outputRoot}) — import the actual owner-approved RGBA art; does not auto-trace the artwork.
- exportCharacter(id,{outputRoot}) — write identity-linked metadata, editable source project and review PNG.
- validateCharacter(id,{outputRoot}) — check file dimensions, alpha, metadata, frame counts, ID and anchor.
- registerCharacter(id,{outputRoot,development,reviewFile}) — copy exact reviewed pixels into a stable engine registry (test_* drafts only with development:true).

The programmatic API is safe to call from other engine tools. Each operation is explicit; it does not silently publish generated art or replace manually edited images. Imported and reviewer-approved world/battle sheets are immutable under procedural regeneration, even for non-starter IDs; to change an approved asset, version it and request another explicit approval.

## Example request and supported categories

See frontend/character-tools/requests/test_relay_01.json. An input has:

    {
      "id": "test_relay_01",
      "kind": "humanoid",
      "faction": "noncanonical-qa",
      "body": "ancient-sleeper-test",
      "preset": "Ancient Frame (weathered)",
      "seed": 15112026,
      "frameSizes": {"world":{"width":32,"height":56},"battle":{"width":64,"height":64}},
      "collisionTiles": [1,1],
      "damage": 2,
      "appearance": {"head":"mono"},
      "accessories": {"antenna":true}
    }

Kind "humanoid" uses existing drawAndroid/poseFor, including the extra clothing/body options available in the selected Studio branch. Kind "machine" uses the existing MACHINE_PRESETS/renderRig, preserving skeletal part motion, asymmetric limbs and genuine non-humanoid silhouettes. A machine may provide an explicit rig object instead of a preset; hand-authored quadrupeds and unusual bosses MUST provide an appropriate rig, rather than secretly inheriting a human walk.

The body field influences sensible default battle size only. Humanoids default 64x64; large machines 96x96; body "boss" defaults 128x128. Four-direction overworld frame size is independent of the fixed **32x32 map tile** and of the collisionTiles footprint. An overgrown heavy machine can be larger than one tile.

A preset name must exactly match an existing Studio preset. Do not invent visual traits or assume a portrait can be reconstructed from text. A supplied appearanceReference always stops procedural generation. Import the actual approved native pixels with importApprovedSpriteSheet; setting approvedSourceSheet does not authorize a procedural approximation. Seed-based palette variation runs only with variation:true on a noncanonical draft, so supplied canon colors remain unchanged.

The four approved starter IDs sleeper_A, sleeper_B, sleeper_C and sleeper_D are PROTECTED: procedural generation is rejected. Import their approved world, battle and portrait PNGs with the same ID and explicit review metadata. Do not use one starter's portrait for another starter.

## Fixed runtime contracts

Overworld rows are down/up/right/left. Columns contain idle (4 frames), walk (6), scan (2), malfunction (4); all start offsets, frame counts, FPS, foot anchor and tile footprint are in world.json. The field adapter frontend/public/js/engine/rpg-field-art.js renders any valid larger sheet at native resolution. For 32x56 humanoids only, bindGeneratedFieldSprite creates a **12-column Ghost Signal compatibility copy** ordered walk 0-5, idle 6-9, scanner 10-11 without mutating the actual character sheet.

Battle export contains EXACTLY 6 columns × 9 rows: idle / attack / ranged / cast / guard / hit / down / victory / charge. Unused cells remain transparent. The original side-view battle importer receives 1-6 frames, correct row number and FPS via RPG_GENERATED_BATTLERS and RPG_BATTLER_ART. Enemies flip left in the existing battle renderer; party sprites face right. All poses keep a bottom-center foot anchor.

Important quality boundary: older Studio actions do not each provide a distinct authored move. Where necessary the adapter maps available scan/crouch/hurt/defeat poses to target row names; this is a draft/fallback, not falsely labeled "nine independently polished battle moves." The advanced branch contains improved family-specific rigs. Visual review can reject any stiff action or bad silhouette before publication.

## Engine consumption and zero-regression design

Registration creates:

    frontend/public/assets/characters/<id>.png
    frontend/public/assets/battlers/<id>.png
    frontend/public/assets/portraits/<id>.png
    frontend/public/assets/character-registry.json
    frontend/public/js/engine/rpg-generated-registrations.js

The character registry stores ID -> portrait/world/battle/animation metadata. The battle registry is imported by the existing RPG_BATTLER_ART export. The native side-view scene already validates 6x9 geometry and loads this art without alternate combat math.

To inspect an **unapproved test** without changing the production roster:

    http://localhost:3000/index.html?rpg-lab=1&character-demo=test_relay_01

The opt-in RPG lab uses the real Ghost Signal Game field/camera and live RPG side-view scene, with the noncanonical test actor substituted by ID. Normal index.html continues using the untouched Wraith art and original mission keys. Other registered large actors can be rendered by drawRegisteredFieldCharacter with their own footprint; they do not get squeezed into Wraith's 32x56 compatibility contract.

The development CLI can register test_* locally for CI browser evidence. Canonical/production registration REQUIRES a human review JSON file with reviewer, characterId, approved:true, and assets containing SHA-256 hashes for portrait, world, and battle PNGs. The registration checks all three against validated files. Do not make that review file from an automated draft assertion. An optional request battleSide (party or enemy) is retained separately for every registered character; it never changes other registered roles. The original repo is public, so do not check in private character references, plot spoilers or restricted archives.

## GitHub workflow and acceptance

.github/workflows/aeon-character-generator.yml accepts a checked-in JSON request under frontend/character-tools/requests/. It installs the native renderer, generates PNGs, validates alpha/geometry, and runs generator tests plus existing engine tests. It locally registers test_relay_01, boots Ghost Signal, uses Chromium to verify field draw and battle animation via the actual renderer, tests the original route and Studio, and publishes a downloadable private-to-run build artifact for review. Uploading a draft artifact is **not publication/approval**.

For engine-chat use **after this code is merged into `ghost-signal-engine`**, create a NEW noncanonical request JSON under `frontend/character-tools/requests/<id>.json` and commit it to `ghost-signal-engine`. This branch's request-only push trigger automatically selects the changed JSON and produces a draft ZIP artifact. The engineer retrieves that artifact for visual review; generation NEVER auto-publishes it to the production registry. For requests already checked in, a dispatch can also be run when the workflow is available through GitHub Actions. Each request is public, so do not include private story information or unreleased reference art in it. The normal GitHub workflow must not be described as callable by an Actions dispatcher while it exists only on a non-default branch; the request-commit push path is the supported automatic invocation.

Accept production changes only after the GitHub workflow is green AND someone reviews preview.png + real browser field/battle screenshots. A green pixel/identity test cannot prove compelling art, weapon timing or mobile-device stability. Moto G physical-device performance and a signed Android build are separate release gates.
