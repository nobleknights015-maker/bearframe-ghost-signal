# Ghost Signal — user-supplied art provenance and publication gates

This project has an **owner-provided** archive `Bearframe assets.zip` containing 25 nested art packs. Only two packs with clear redistribution grants are embedded in the **public** Ghost Signal source:

| Pack | License verified in uploaded ZIP | Used in |
|---|---|---|
| Top Down Lab, Luis Zuno / Ansimuz | `top_down_lab_2_files.zip/Top Down Lab files/public-license.txt`: personal/commercial use, edits and redistribution permitted; attribution appreciated | actual 32×32 machine panels and marked floor cells |
| Robot Warfare, mattwalkden | `Robot Warfare Asset Pack 24-11-21.zip/Robot Warfare Asset Pack 22-11-24/License.txt`: CC0 dedication | actual 32×32 outdoor wasteland/ruin/storm terrain |

`frontend/public/js/art/pack-textures.js` contains an indexed, compressed, **lossless copy** of 24 original native 32×32 tile cells from these licensed sources. No pixels were upscale-processed or AI-redrawn. Base logic paints real source terrain on M03–M05 and recognizable physical extraction/gate/service markers; the original Wraith and M01–M02 art are unaffected.

**Present but not committed to public source:** Starship Interior v4.1 / v4.0 (game use allowed; raw asset redistribution prohibited), Sci-Fi Station Mega Kit (game use allowed; asset redistribution prohibited), Sci-Fi Guns, Living World FX Urban (games allowed, standalone assets prohibited), Craftpix packs (license URL in archive), Tech Dungeon, Post Apoc Shelter, PostApoc Workshop and the massive non-licensed-in-archive environment PNG categories (`GROUNDS`, `WALLS`, `ELEVATION CLIFFS`, etc.).

These remain private and need license-specific staging for a finished game. Never upload the ZIPs or extracted standalone asset PNGs to a public repository to make CI easier. Do not present the entire owner catalog as already integrated.

## Verification
- `frontend/tests/ghost-signal-browser.test.mjs`: actual Chromium decompression, 24 texture cells, native 32×32 size, nontransparent pixel rendering.
- `android/ci/verify-apk-assets.sh`: expected source module byte-for-byte inside Android APK.
- `docs/GHOST_SIGNAL_EXPANDED_GAME_PRODUCTION.md`: narrative and further release gates.


## Visual rebuild review gate (v0.2.5)
The owner's actual M03 gameplay screenshots showed the v0.2.4 surface terrain was visually unacceptable despite green mechanics/CI: dense patchwork texture and oversized copied lab panels that did not read as a survey station. We must **not equate asset import with successful level design**.

Commit implements an authored environment renderer for M03–M06:
- Quiet region-driven ground, deliberate command/relay/ruins/maintenance/archive site zones, explicit approach routes, grounded modular props.
- The generic random floor fragments and full machine-covering copied tiles are disabled in M03–M06; original M01/M02 visuals unchanged.
- M03 starts within camera view of Mira's actual position and labels her visibly above her sprite.
- Automated authored-layout tests and browser screenshots are supporting QA, **not substitutes for the owner's visual approval**.

Additional purchased packs verified from user-provided archive:
- Starship Interior Pixel Tileset Pack v4.1: **32 native 32×32 map tiles, 8 repeatable floor tiles, 40 complete transparent 32×32 objects**. LICENSE.txt allows use in free/commercial games and edits, but prohibits reselling/redistributing standalone asset files.
- Sci-Fi Station Mega Kit v1.0: native floor and wall tiles, 32×64 vertical wall faces, real multi-tile door/airlock assemblies, command consoles, cargo and debris; license allows personal/commercial game use, prohibits standalone distribution of asset files.
- Apocalypse/post-apocalyptic shelter pack: native 32×32 tilesheets present in archive; no bundled reuse license located in nested ZIP, so require game-use confirmation before distributing it outside the private owner workflow.

**Implementation requirement**: stage licensed owner art into **compiled game scenes or game-only bundles**, not public folders full of extractable source sprites; preserve native dimensions, door placement, collision, and save/mission compatibility. Do not claim paid owner art is already in GitHub's APK just because the map renderer became quieter. Current public CI still ships only redistribution-permitted Top Down Lab and CC0 Robot Warfare textures.
