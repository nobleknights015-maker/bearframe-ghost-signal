# World variety: six original design studies

Update: the two heavy presets now have a separate tested walk prototype. See `../animation-research-2026-11-15/README.md` and `../sprite-studio-heavy-motion/`. The frozen recipes/previews below remain the original standing-design checkpoint; slender units still have idle only.

Separate options on sprite-studio-sleek-copy. The original game/main, engine branch, Industrial Echo (including owner-requested rear cloth coverage), existing crawler/orbital core, and legacy machine presets are preserved. These are procedural examples of bodies and jobs that can populate the world, not new canon individuals or copies of the reference sheet.

| Preset | Silhouette/equipment | Available clips |
|---|---|---|
| Ancient Bulwark | Broad layered shoulders, tapered trunk/shins, large fingers/boots, physical-left shield, core and broken halo | Standing idle only |
| Ancient Breaker | Same heavy family with enlarged physical-right cannon forearm and lens | Standing idle only |
| Slender Keeper | Narrow torso/limbs, cowl, scarf, long waist panels, archive port and halo | Standing idle only |
| Slender Surveyor | Exposed sensor head, antenna and physical-right probe | Standing idle only |
| Suspended Archivist | Spire, lantern/cage/spike, utility arms and hanging banners | Idle and exploration hover; battle idle only |
| Asymmetric Relay | Offset optic housing, unequal utility chains, second array and slimmer lantern | Idle and exploration hover; battle idle only |

Each has four explicitly authored views, a stable ground anchor, footprint, palette/weather controls and editable native parts. Moss roots are mounted to solid shoulders or halo braces. Lanterns have support rods and spikes attach to the lower cage. Physical left/right equipment is retained in the back and profile views. No modern Bearframe chest/ear-display package or emblem is imposed on every ancient unit.

`world-varieties.js` builds fresh independent data. `worldSpec` separates family, role and review stage. Optional `rig.clips` controls which clips new machine projects expose; legacy rigs without this property keep their existing full sets. Invalid/duplicate clip names, unavailable animation types, invalid frame counts or playback rates are rejected. A saved project preserves resolved rig parts and existing edited-cell behavior. Hover changes the body, not its ground-registration anchor. Engine/runtime integration is still pending.

Tests cover 256 native renders/bounds cases, role/identity/view and supported-clip checks, save/anchor/clip roundtrips, invalid clip rejection and growth connectivity samples. Existing baseline suites remain. Numeric tests do not establish artistic quality, physical COM stability, final field scale or game-ready animation. Grounded walking and all new battle actions remain unimplemented rather than being exposed as placeholder motion. The slender and heavy biped rig studies will need their own approved grounded animation work before field traversal.

Preview: defenders.png and slender-custodians.png are standing designs. suspended-units.gif has eight hover frames at165ms. Four directions left-to-right: down/up/right/left. Per-unit empty-margin crops and integer nearest-neighbour enlargement are for visual inspection, not a physical scale comparison. recipes.json retains the fitted source geometry/anchors; no artwork was cropped from user references.

Reproduce PNG frames and recipes: `node frontend/tools/make-world-variety-review.mjs docs/sprite-studio-world-varieties`. Encode the third page with Pillow at the timing above.
