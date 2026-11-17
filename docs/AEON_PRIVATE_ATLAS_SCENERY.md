# Aeon: source-authored native scenery from the owner's real asset packs

## Intent and boundaries

The original owner-provided environment PNGs are **the source art**. The
engine must not replace wasteland/bunker/ruins with generated placeholder
art. This patch does not pretend that the current provisional 29-area
geometries are finalized, nor does it change the original Ghost Signal game.

A private map can specify `environmentDetails` with at most 256 reviewable
records per area. Each record crops a native 32-pixel-grid source rectangle
from a private, named, preloaded atlas:

```json
{
  "id": "weeds_by_old_wall",
  "atlas": "wasteland_terrain",
  "layer": "ground",
  "tx": 4, "ty": 6,
  "sx": 0, "sy": 96, "sw": 32, "sh": 32
}
```

The source art registry belongs in the owner's PRIVATE
`assets/aeon/environment/environment-art.json`:

```json
{
  "schema": "aeon.private-environment-art.v1",
  "tileSize": 32,
  "objects": {
    "wasteland_terrain": "assets/aeon/environment/atlases/wasteland_terrain.png"
  }
}
```

That shortened JSON example does **not** replace the complete manifest;
the existing `doorways` and `palettes` sections are also required.

## Three layers and safety

- `ground` paints real irregular terrain, grass, weeds and salvage decals
  into the baked field, before edge occlusion
- `background` dresses existing, already-blocked walls/landscape
- `foreground` overlays native sprite fragments above the character only
  on existing, already-blocked tiles

All crops use image natural width/height without scaling, interpolation,
invented extra pixels or external URLs. The compiled atlas registry only
allows `assets/aeon/environment/` private PNG paths and native 32-pixel
multiples, up to 2048px for original atlas images. Crops are within image
bounds and at most 192×192 native pixels each.

Source scenery cannot cover an authored NPC, door, source story trigger
or entry tile. Wall/foreground objects cannot cover walkable terrain.
All details are compiled once at mission creation and painted into the
baked map canvas, not regenerated every animation frame.

The original Ghost Signal procedural overhead effects render ONLY when
there is no approved private environment palette. Aeon wasteland/ruins
maps receive their real authored foreground art instead.

## Private review status

The 2026-11-17 owner-private 29-area visual review package adds 539
source atlas crops (278 floor, 174 background and 87 foreground) from
actual wasteland terrain, walls and salvage sheets. Source map collision,
entry points, reciprocal doors, quest/story triggers, character art and
save data were not modified.

This is the NEXT visual blockout, not an art-director-approved final
layout. It deliberately does not place fake solid-looking buildings on
traversable routes. Real bunkers, ruins and fully built rooms still need
collision-reviewed multi-tile structure assembly, proper door animations,
area-by-area visual composition, and physical Moto G device QA.

**Distribution:** The owner's licensed original PNGs, private screenplay
and complete private import ZIP must never be added to public GitHub.
Keep the vendor licenses within the private import.
