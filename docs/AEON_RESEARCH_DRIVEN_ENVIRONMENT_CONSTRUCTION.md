# Aeon: research-driven map/environment construction contract

**Project lock:** This applies to the original Bearframe-universe JRPG **Aeon Circuit: The Silent Wake** running on the existing Ghost Signal engine. It does **not** authorize changes to Ghost Signal Expanded, the original Ghost Signal missions/UI, the approved Director's Cut, or the upgraded character generator.

The evidence-backed study is preserved in Atlas Warehouse:
https://github.com/nobleknights015-maker/Atlas-Warehouse/blob/main/warehouse/studies/aeon-environment-worldbuilding-and-a20-quality-gate-2026-11-17.md

## Production sequence (mandatory order)

1. **Place purpose.** State the room's original function, service/utility logic, intended working conditions, how it decayed, and what the player needs to accomplish. Do not invent approved story canon.
2. **Functional spatial program.** Define entry and return, main work circulation, equipment bay(s), controls, restricted areas, visible utilities, and service clearances. Draw the adjacency/circulation graph BEFORE decoration.
3. **Interaction topology.** Author actual terrain collision and the shortest valid open/closed gate traversal. Put required controls where the player can reach them pre-unlock; verify return route and no bypass. Use the existing engine's movement footprint, not abstract walkability alone.
4. **Architectural massing.** Build contiguous wall segments, corners, thresholds, door jambs, equipment plinths, visible utility relationships and differentiated work zones before furniture.
5. **Licensed art role map.** Inspect original authored tiles/objects; assign each asset to material, structure, utility, control, door or damage. Reuse real owner art with source proportions, native 32px grid, nearest-neighbor rendering, no mixed-scale placeholders.
6. **Environmental evidence.** Cluster wear at actual failures, use linked machinery/pipe/cable relationships and clear cause/consequence. Avoid randomly scattering decorative scrap or inventing narrative reveals.
7. **Layer and depth audit.** A physical doorway belongs *behind* the passing actor at foot contact; only its lintel/canopy should occlude. Massive decorative objects require corresponding obstacle footprints or safe nonblocking placement. Never overlay a full door sprite on the character in an open passage.
8. **Lighting and wayfinding.** Preserve original lighting/fog/camera/VFX; prioritize stable light and contrast around actual controls and doors before atmospheric effects. A screenshot alone cannot prove navigation.
9. **Runtime visual QA.** Capture genuine Game-renderer frames from multiple player/camera positions including entry, interactable, sealed/open door, far side, and return. Compare play-scale composition against Ghost Signal reference quality. Test controller, save, HUD and mobile as separate evidence gates.
10. **Quality lock.** Do not propagate the recipe to other areas until the owner expressly approves the first running location. Never label a QA fixture a canonical finished mission.

## Evidence discipline

Use the repo's source-only structural gate (`frontend/narrative-tools/one_location_quality_gate.mjs`) plus private visual/interaction tests. Store **only** code, general methods, structural evidence and test reports here; licensed environment sprites, portraits, full source packs, private narrative, and captured owner-art screenshots stay in the owner's PRIVATE deliverable.

A20 revision v8 (2026-11-17) is owner-private and noncanonical. Its source-based implementation uses six functional service zones, one relay landmark, 32px native environment sprites, unchanged 141-tile collision, and door state art split between background and canopy overlay so an open doorway cannot hide the walking Sleeper. A20 remains a **review candidate**, not visual signoff, campaign release or Android acceptance.

## References

- https://book.leveldesignbook.com/process/overview
- https://book.leveldesignbook.com/process/layout/flow/circulation
- https://book.leveldesignbook.com/process/blockout/wayfinding
- https://book.leveldesignbook.com/process/env-art
- https://book.leveldesignbook.com/process/env-art/storytelling
- https://book.leveldesignbook.com/process/lighting
- https://doc.mapeditor.org/en/latest/manual/terrain/
- https://docs.mapeditor.org/en/latest/manual/layers/
- https://www.gamedeveloper.com/design/gdc-2018-level-design-workshop-an-expert-roundtable-q-a
