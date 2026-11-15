# AEON CIRCUIT: THE SILENT WAKE — Side-View Battle Art Integration Standard
**Approved by owner:** 2026-11-15. **Combat perspective:** SIDE-VIEW ONLY.
**Authority:** This defines production art and rendering format; the Director's Cut v2 governs actual story and encounter content. No spoilers in this public document.
**Implementation:** `frontend/public/js/engine/rpg-sideview-layout.js`, `rpg-sideview-scene.js`, `rpg-battle-art.js`, `rpg-lab.js`.
**Status:** The SIDE-VIEW battlefield canvas and test silhouettes are implemented as an opt-in QA renderer. Production sprites are NOT finished or integrated yet. Do not represent diagnostic silhouettes as final art.

## 1. Actual engine viewport and positioning
- Ghost Signal presentation is 480×270 logical pixels in landscape. Battle stage fits within its original industrial/CRT panel.
- Stage uses native **416×116 logical pixels**. No competing field engine, no perspective camera or first-person enemy POV.
- PARTY: screen-left, visually facing RIGHT.
- FOES: screen-right, visually facing LEFT (the importer horizontally mirrors authored right-facing sheets for enemies).
- Reserve lower panel space for full turn commands, HP/EP and incoming enemy intent.
- Up to **four active party members** and **six enemies** in stable, authored slots. Larger bosses may need a special formation later, not arbitrary scaling.
- Default stage anchor positions in pixels:
  - Party: (68,106), (119,116), (68,65), (119,76)
  - Enemy: (308,106), (363,116), (308,65), (363,76), (336,90), (392,92)
- **Foot anchor is (half cell width, cell bottom)**. Keep feet on that baseline in EVERY animation frame, unless a deliberately timed jump. No bounding-box jitter, drifting shadows, clipping or floating vines. May require per-class slot tuning after real assets arrive.

## 2. Battler delivery (native pixel art, PNG with alpha)
- One transparent battle sheet per *specific* actor/enemy; do NOT reuse field walk frames for combat.
- Suggested standard sheet cell **64×64 native pixels** for ordinary humanoid party actors; **96×96** for heavy/large machines; **128×128** for major bosses. These are **battle-frame sizes**, not exploration's 32×32 map tile size. Use only the size needed for silhouette readability; bosses are viewport-height capped during runtime until custom layouts exist.
- Default exported sheet layout: **6 columns × 9 animation rows** with no labels, borders, padding, merged frames or black backgrounds. This yields:
  - 64px cell = 384×576 PNG
  - 96px cell = 576×864 PNG
  - 128px cell = 768×1152 PNG
- Always use nearest-neighbor pixel edges. No generated blurry antialiasing, mixed resolutions, hidden gradient edges, or 1px disconnected garbage. Ensure correct transparent alpha, consistent body mass, perspective and mechanical joints.
- Sheets are **single right-facing true side profiles** (for enemies the engine flips the sheet), feet at bottom of each frame. Eye/visor/chest elements stay on the same character throughout.
- **Ancient Sleeper ≠ modern Bearframe**: Sleeper technology is distinctly older and incompatible with modern Foundry modules. Echo and Ghost Grid units show functional damage, overgrowth anchored to actual chassis parts and purposeful intermittent faults; never free-floating vines.
- Do not copy sprite assets or animation frames from Phantasy Star, Sea of Stars or other copyrighted games. Independently authored designs and reference studies only.

## 3. Fixed row convention and minimum named states
| Row (zero-based) | Animation | Frames | Typical fps | Motion notes |
|---|---|---|---|---|
| 0 | `idle` | 4 | 5 | Grounded mechanical breathing/energy cycle |
| 1 | `attack` | 6 | 12 | Anticipate → move/strike → contact → recover |
| 2 | `ranged` | 6 | 12 | Aim/fire/recoil/recover |
| 3 | `cast` | 6 | 10 | Build energy, release, recover; stage effects are separate |
| 4 | `guard` | 3 | 6 | Shield/brace remains recognizable |
| 5 | `hit` | 3 | 12 | Impact, controlled recoil, return |
| 6 | `down` | 6 | 7 | Mechanical collapse/disabled state |
| 7 | `victory` | 4 | 5 | Small, restrained victory/recovery |
| 8 | `charge` | 4 | 8 | For charge-capable actors/enemies; telegraph power buildup |

Only the **idle row is currently mandatory** for the importer; missing other named rows temporarily fall back to idle. But for game-ready art **ALL applicable rows are required**. For six-column sheets, 2-, 3- and 4-frame rows leave unused cells fully transparent. Never repeat filled frames solely to fill the grid without a timing reason.

## 4. Manifest contract and files
Place independently owned files at `frontend/public/assets/battlers/<stable-character-id>.png` and register them in `frontend/public/js/engine/rpg-battle-art.js`, which is intentionally empty until the art team's work passes QA. Example:

```js
export const RPG_BATTLER_ART = Object.freeze({
  'party:sleeper': {
    src:'assets/battlers/sleeper.png',
    frameWidth:64,frameHeight:64,scale:1,
    animations:{
      idle:{row:0,frames:4,fps:5},
      attack:{row:1,frames:6,fps:12},
      ranged:{row:2,frames:6,fps:12},
      cast:{row:3,frames:6,fps:10},
      guard:{row:4,frames:3,fps:6},
      hit:{row:5,frames:3,fps:12},
      down:{row:6,frames:6,fps:7},
      victory:{row:7,frames:4,fps:5},
      charge:{row:8,frames:4,fps:8}
    }
  }
});
```

Manifest keys use `party:<combat-unit-id>` or `enemy:<combat-unit-id>`; e.g. test scene uses `party:sleeper`, `party:echo`, `enemy:sentry`. Each sheet path must be same-origin under `assets/battlers/`; external URLs and traversal are rejected. Runtime validates frame geometry and row definitions. Battle rendering falls back to unmistakably schematic diagnostic units if an asset is absent or invalid, so missing art does not break combat or falsely claim the unit is approved.

## 5. Attack/effect responsibilities
The ART TEAM supplies poses and separate effects (slash/projectile, guard shield, pulse, repair, hit, shutdown). The ENGINE:
- selects each authored row/column by animation time and current combat state;
- positions feet exactly on the corresponding slot;
- makes the hero lunge toward the foe and handles target flash, HP changes, guard and charging indicators;
- owns command UI, damage/resource math, battle turn order, world handoff and persistence.
- Future renderer evolution will sequence enemy and ally actions with strict timeline cues, asset-driven hit frames and synchronized sounds. Current simple visual cues are intentionally an initial integration shell, NOT complete cinematics.

## 6. Approval checklist and handoff
Asset team deliver for EACH character:
1. **Character ID**, canonical design or reference, chassis/lineage and size class.
2. Full transparent PNG sheet, with exact cell dimensions/grid.
3. Individual cropped preview of the idle row and 1×/2× GIF previews (transparent) for idle, attack, cast and hit.
4. Feet alignment test on every frame, no detached vines/parts, weapon/grip consistency, side profile view, readable native-pixel silhouette at 1×.
5. State/frames/fps data and any knowingly omitted rows.
6. Art source/license provenance and an audit note. Include a side-by-side QA screenshot from the engine once bound.
7. Never overwrite existing approved asset variants; version deliveries.

**Start with one ancient Sleeper battler, one Echo battler and one old Sentry enemy** from the QA encounter. They already exist in the engine and allow art to be checked without fake scene wiring. Then expand the catalog from the Director's Cut v2 encounter data without leaking private plot spoilers. No separate 4-direction field walking required for these battle sheets; battle combatants are all true side view.

## 7. Verification before declaring 'battle art working'
- `node --test frontend/tests/rpg-sideview.test.mjs`
- `node --test frontend/tests/*.test.mjs`
- `frontend/tests/browser-rpg-sideview.mjs` — actual walking into sentry encounter, canvas pixels, visible actors, action-triggered effect, guard math, field return.
- All existing five RPG browser suites plus the connected world must remain green.
- Real native Android QA on Moto G (2025) remains separate from Chromium/Android emulator evidence.

**Bottom line:** This document is the art team's exact integration target, not a claim that final sprite animations have already been supplied.
