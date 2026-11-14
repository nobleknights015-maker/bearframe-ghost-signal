# Echo / Ghost Grid expansion — first implementation checkpoint

The isolated generator copy now includes shared fixed-length reach handling, rig graph validation, explicit margin fitting, registered paged atlas export, and one opt-in legacy industrial biped family. This begins the researched expansion; the crawler, orbital core, suspended spindle, and asymmetric relay families remain future work. The separate engine branch and original main are untouched.

## Implemented

- `solveTwoBone` clamps the effective endpoint to the reachable annulus, including targets at/near the root. Segment lengths and bend sign remain explicit. Valid normal humanoid poses retain their prior targets.
- Machine project creation/loading and advanced part Apply validate dimensions, positive part sizes, shapes, duplicate IDs, missing parents and cycles. Direct renderer recursion also detects multi-part parent cycles. This is graph validation, not a full semantic module/socket schema or a joint-angle constraint system.
- **Fit all animation margins** samples every frame/direction in both project sets using transformed part envelopes plus outline allowance. It expands the design canvas, translates roots and existing edited cells together, and preserves body scale and tile footprint. Fitting does not automatically alter old projects. It supports exact proportional canvases at half-step pixel scales (including native, 1.5× and 2×); a custom letterboxed aspect is rejected without mutation rather than silently rescaled. Even design margins keep native, 1.5× and 2× registration aligned. It guarantees the sampled supported frames, not every possible unsampled future pose.
- Registration anchors survive save/reopen and sheet export. New industrial units register at their ground plane; fitted old rigs retain their previous registration point translated into the new canvas. Transparent margins do not become collision footprint.
- **Export paged atlas ZIP** exports pages capped at 2048 pixels per dimension, explicit frame rectangles, clip indexes, durations and anchors. A frame larger than the page cap fails clearly. Existing strip/PNG/JSON and individual-frame exports remain available. Runtime support for this new format is not implemented in the separate engine branch by this checkpoint.
- **Industrial Echo (family prototype)** is an opt-in machine preset with four authored views, stable physical limb IDs, a hunched upper frame, lens cluster, backpack, pipes, tattered mantle and independent leg chains. Survey and Maintenance roles replace the right-hand tool while retaining the body and motion. It uses ancient industrial materials and has no Bearframe insignia or mandatory modern display package.
- Locomotion uses a 60% stance fraction, continuous body-relative foot path, fixed 12/13 segment lengths before view projection, full-size flat boots, and a 10-design-unit stride per cycle. This is an in-place sprite. A future runtime consumer must match phase to distance for world foot locking. Front/back project the sagittal bend; left/right preserve physical equipment identity.

## Preview and limits

`industrial-echo-walk.gif` shows Survey and Maintenance in all four directions. `industrial-echo-contact.png` shows a contact sample. These are original native procedural study sprites, not crops from the supplied artwork, exact Murmur replicas, named canonical characters, or final art approval.

The implementation preserves the old renderer path for rigs without `unitSpec`. Unsupported unit versions/families reject clearly. The prototype provides idle, walk, attack, charge, hurt, malfunction and defeat channels, but action quality and cloth/ring loop polish remain subject to review. The existing heavy/hexapod/archive motion channels and their known analytical seam findings are not replaced by this checkpoint. The industrial family has no ring module yet.

Current role compatibility is intentionally small: two vetted right-hand tools on one family. This is not the complete generic module catalogue described in the research. Joint angle limits, center-of-mass checks, collision avoidance, full arbitrary-proportion retargeting and Android runtime integration remain open.

## Verification

Existing Classic exact-pixel, Sleek, cape, ring, chassis, cleanup, save/edit protection and export checks remain. New tests cover reachable/unreachable limbs, invalid parent graphs, 224 family render cases, fitted envelopes across actual set frames, translated hand edits and saved registration, and pixel reconstruction from forced multi-page atlases. Browser tests select the industrial preset, change its role, fit margins, reopen its save and independently decode a real atlas ZIP's metadata and PNG dimensions.

The original five machine presets remain in the legacy comparison. The new family is tested independently because it has a new controller that the frozen original renderer does not implement. Numeric checks are not visual acceptance.

Reproduce the preview:

```
node frontend/tools/make-unit-review.mjs docs/sprite-studio-unit-expansion
```

The command writes eight walk PNGs. The checked-in GIF uses 125 ms per frame; production exports remain RGBA PNGs. Validation and source checkpoint are recorded in `verification.json`.

Research source: https://github.com/nobleknights015-maker/Atlas-Warehouse/tree/fb1f254aa6caa8da153d1374a5819e2eb8dfe47c/warehouse/studies/echo-grid-integration-2026-11-14
