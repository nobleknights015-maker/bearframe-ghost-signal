# Owner-private environment art integration

Aeon Circuit's campaign uses the owner's **real game art**, not stock generated
proxy doors or floor symbols. This engine feature is deliberately code-only
because the Ghost Signal repository is publicly readable.

## Prepared owner-only game import

The private importer prepared on 2026-11-17 is named
`Aeon_Private_29_Area_Real_Asset_Visual_Review_2026-11-17.zip`.
It contains the recovered private 29-area campaign, approved v5 starter/other
character sheets, the original private story, actual user-supplied
environment sprites, separate vendor license notices, and an updated
SHA-256 file manifest. **Do not commit or publish its contents to GitHub**.

To test it locally, extract its `frontend/public/assets/aeon/` tree into
the matching folder of a private checkout for this repository, preserving
paths. It installs `environment/environment-art.json`, original
closed/open door images, native 32x32 environment tiles, and 32x32
wasteland/post-apocalypse atlases. Build the Android app from this
private checkout only. The original Ghost Signal app/saves and Sprite
Studio do not need any private files to function.

The importer chooses a **provisional visual review palette** in all 29
existing campaign areas, and provisional physical door/hatch/airlock images
on their existing reciprocal connection points. No map geometry,
collision, story, quest, character art, encounter placement, source flags,
or layout digest is changed. This does NOT make the 29 provisional maps
final or owner-approved. The classifications need area-by-area visual QA.

## Private manifest/runtime contract

The loader accepts `aeon.private-environment-art.v1` only. Every image
reference must remain under `assets/aeon/environment/`, with native
dimensions (32px multiples) and no network/external URL. Authored fields:

- `environmentPalette` on a private map picks an existing manifest palette
  with native 32x32 `floor` and `wall` PNGs
- `portalStyle` on a source portal picks one of `bulkhead|hatch|exit`
- `portalArt` optionally selects a source door key, such as `airlock`,
  `blast`, `service`, `overgrown`, or `elevator`
- `requiresEnvironmentArt: true` on the private world refuses to launch
  without the real source sprites, rather than pretending a schematic
  placeholder is finished content

The original native 32px renderer swaps to the selected floor/wall textures
only on those explicit private maps, and draws actual closed/open PNGs
at native size on interactable field entrances. Existing interactions,
author-gated routes, persistent saves, and atomic travel remain the same.

## Rights and quality gate

The supplied Sci-Fi Station Mega Kit license allows personal/commercial
game use but not raw standalone resale/redistribution. The supplied
Post Apoc Shelter license allows game use and edits but bars pack
redistribution as well as AI/NFT/generative-AI uses; these pixels were
**not generated or used for training** and are only copied/cropped into
the owner-requested private game importer. The user should retain
these notices when packaging and review any other packs independently.

Passing Node/Chromium synthetic tests or the debug APK emulator does
not replace a visual walkthrough or physical Moto G device acceptance.
Real floor-wall autotiling, object layering, terrain blend transitions,
non-square door overlap/collision, and source-authored opening animation
polish remain explicit release work.
