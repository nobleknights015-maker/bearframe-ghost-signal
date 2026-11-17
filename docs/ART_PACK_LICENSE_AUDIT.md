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
