# Private Aeon campaign — static release preflight

This is the **owner-only, offline** source-and-art acceptance gate for
*Aeon Circuit: The Silent Wake*. It does not contain or copy the private
screenplay, source dialogue, maps, sprite ZIPs or licensed graphics into
public GitHub.

## Install approved content first

Keep a private rights-authorized checkout of the same
`ghost-signal-engine` commit as the target APK. Install the exact v5
42-character package using
`frontend/character-tools/import_v5_art.py` (see
`docs/AEON_V5_PRIVATE_ART_INSTALL.md`), and import the **approved**
screenplay using
`frontend/narrative-tools/import_campaign.py`. The owner-approved 32px
Tiled maps, cutscene/choice trigger bindings and enemy/reward combat
staging must also be installed into the ignored
`frontend/public/assets/aeon/story/opening-world-review-candidate.json`.

Do not infer scene triggers, NPC identities, enemy stats, map routes,
battle order or narrative outcomes from reference portraits or lore
alone. The attached lore images are **not** substitutes for the
author-approved v5 native 9×4 world and 6×9 battle atlases.

## Check a private staged package

From the repository root on the machine that holds the owner-only
content:

```bash
node frontend/narrative-tools/preflight_private_campaign.mjs \
  frontend/public/assets/aeon --review
node frontend/narrative-tools/preflight_private_campaign.mjs \
  frontend/public/assets/aeon --release
```

Review profile validates the installed source, atlas geometry, PNG
chunk integrity, authored characters, 32px map graph and currently
staged choices, without insisting every future chapter is present.

Release profile additionally requires **every source-authored scene**
to have an explicit playable trigger (opening, entity, rectangle or
arrival), every area reachable in the authored portal graph, all
encounters staged with approved stats and sprite art, and every
mandatory battle source reference valid. No story IDs, dialogue,
names or map labels are printed; the report contains aggregate counts
and issue categories only. Any error returns a nonzero exit status.
Some story beats may need explicit scene trigger staging even when
their screenplay lines are complete.

This is **static data acceptance**, not a whole-game release
certification. Passing it cannot replace real-world art review, scene
walkthroughs, cutscene timing, Ghost Signal stealth and enemy AI
testing, accessible gamepad/touch input, APK lifecycle tests,
stable signing/save backup, or physical Moto G (2025) testing.

Public Node and Chromium CI use synthetic data only and cannot
truthfully claim approved campaign content is installed. Private
release artifacts must never be copied into public CI artifacts or a
public GitHub repository.
