# Source-art outdoor map backdrop (owner-private)

The current Ghost Signal Game uses a deep industrial/parallax background
under every level. That is appropriate for the original stealth mission,
but it looks wrong behind Aeon wastelands, broken outdoors and shelters.

**Change:** a private environment palette may opt into
`"backdrop": "terrain"`. The existing private palette's ORIGINAL native
32x32 `floor` PNG is tiled in a cached CanvasPattern behind the field
instead of the Ghost Signal deep-space/industrial art. The pattern moves
with the camera and is never smoothed or upscaled. It costs one repeat
fill per frame rather than creating synthetic pixel art.

- The original Ghost Signal game and any area without `backdrop` retain
  their existing unmodified visual/deep background.
- The importer validates that the only supported value is `terrain`.
  Unknown drawing modes and external URLs remain rejected.
- Original 32x32 pixel colors and alpha are preserved.
- Only the owner's private terrain import contains the copyrighted PNGs.

Owner-private Review v4.1 opts into this background for palettes
`wasteland_sand`, `wasteland_earth` and `postapoc_bunker` only.
No story, map collision, door flags, quests, characters, map topology,
or layout digest is changed from v4.

The renderer is validated by Node contract tests plus the campaign
synthetic Chromium flow. This does NOT guarantee all outdoor map
boundaries or cliff transitions are fully polished; field/map
composition and physical Moto G acceptance still need review.
