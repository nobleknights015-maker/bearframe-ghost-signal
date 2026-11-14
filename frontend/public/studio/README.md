# Bearframe Sprite Studio

Standalone 2D pixel-art asset tool for Bearframe Labs games (Ghost Signal, the main Bearframe RPG, anything else).
Plain HTML + JavaScript modules. No build step, no dependencies, no accounts, no network services.

## Run it

Any static file server works (ES modules need http, not file://):

    cd frontend/public && python3 -m http.server 8080     # then open http://localhost:8080/studio/
    # or: cd frontend && PORT=3000 HOST=0.0.0.0 yarn start  # then open http://localhost:3000/studio/

The Studio does not import or need Ghost Signal. Copy the `studio/` folder anywhere.

## What it does

- Three project types: humanoid android rig, machine rig (any shape or size), blank hand-drawn canvas.
- Two sprite sets per project: Exploration (four directions) and Battle (turn-based, larger frames).
- Procedural assist renders every frame from the rig at the frame size you choose. Detail (bevels, seams, rivets,
  vents, rust, chips, moss, cloth columns) is generated per output pixel, so a bigger canvas gets more real detail.
  Nothing is produced by scaling or smoothing a smaller sprite.
- Frame-by-frame pixel editor: pencil, eraser, fill, colour pick, undo, copy/paste, flip, 1px nudge, onion skin,
  grid, proportion and footprint guides. Hand-edited frames are flagged and survive "Regenerate unedited frames".
- Reference image: trace under the canvas at any opacity and click to sample colours.
- Import an existing PNG sheet (give the frame size) and edit it.
- Export: transparent PNG sheet + JSON metadata, or a ZIP of individual frames.
- Projects save as `.bfsprite.json` (rig, settings and every frame) and reopen for further editing.

## Machine rigs

A rig is plain JSON: per-view part lists plus per-animation motion channels.

    part    { id, p: parentId, s: shape, x, y, w, h, ox, oy, r, z, c: colourRole, g: glowRole, ... }
    shapes  plate | taper | disc | ring | cable | banner | glass
    motion  { rot:[amp,phase,mult], x:[..], y:[..], lift:[amp,phase], rotTo, xTo, yTo, jit,
              glow:[amp,phase,mult], glowTo, flick, spin, spinJit }

Each part moves independently and children follow their parent joint. Edit parts and motion in the "Rig parts"
panel. `left` is mirrored from `right` unless a `left` view is supplied.

## Sheet layout and metadata

One row per direction (`rows` in the JSON), animations left to right. Example metadata:

    { "frameWidth": 128, "frameHeight": 96, "anchor": {"x":64,"y":96}, "rows": ["down","up","right","left"],
      "footprintTiles": [4,2], "animations": { "walk": {"type":"walk","start":6,"count":8,"fps":10} } }

## Reusable libraries (`lib/`)

- `sprite-rig.js` — humanoid android generator: `drawAndroid(ctx, cfg, dir, poseFor(type,i,n), fw, fh)`.
- `machine-rig.js` — generic skeletal rasteriser: `renderRig(ctx, rig, dir, type, i, n, fw, fh)`.
- `machine-presets.js` — example rigs (heavy sentinel, hexapod, floating archive sentinel, micro-drone).
- `sprite-sheet.js` — project model, sheet build/import, resize, save/load, ZIP writer.

## Examples (`examples/`)

Editable projects that store the rig only; frames are generated when opened. Regenerate the example files with
`node studio/tools/make-examples.mjs` from `frontend/public`.

## Known limits

- No automatic image-to-sprite conversion: references guide tracing and colour picking only.
- Rig parts and motion are edited as JSON fields, not by dragging bones.
- Machine "turn" animations are not generated; turning is a direction change.
- The three large example machines are original interpretations that validate rig types and scale. They are a
  starting point for hand polish, not finished hero art.
