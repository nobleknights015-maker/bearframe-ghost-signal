# Six-role battle animation checkpoint

The isolated native creator now includes seven sixteen-exposure, one-shot actions for each of six world-unit designs: attack, charge, guard, hurt, malfunction, defeat and recover. Together these are 42 role/action clips across four cardinal views (168 directional clips, 2,688 action exposures). Holds are deliberate; these counts do not mean 2,688 independent paintings. Idle remains a separate looping clip. Walking and Industrial Echo's rear fabric are preserved.

| Role | Authored attack |
| --- | --- |
| Bulwark | Withdraw, brace, physical-left shield strike, settle |
| Breaker | Physical-right cannon aim/charge, emission, recoil, settle |
| Keeper | Two-handed field preparation, palm pulse, release |
| Surveyor | Physical-right probe reach, emission, retract |
| Archivist | Open manipulators, lantern focus/pulse, settle |
| Relay | Unequal manipulators acquire/extend, tip emission, retract |

These are creator behaviors and design candidates, not new canonical powers or approved story content. Each role also has its own dimensions, guard/charge poses, restrained authored fault, hit recoil and power-down posture. Grounded units collapse into a supported low crouch; suspended units lower their tip to the ground. Defeat holds the down pose with power off. Recover begins at the exact down pose, then returns to neutral. It does not resurrect anything in gameplay.

## Timing, effects and registration

Every action has explicit frame holds and inert event markers. The active attack marker is frame seven; local emission/contact FX are attached to the authored socket at frames seven/eight. Projectiles, target impacts, hitboxes, sound and damage remain responsibilities of the game consumer. Do not spawn a duplicate flash over the baked local effect. Charge and guard are standalone preparation/hold/release clips, both returning to neutral; they are not persistent charging states.

Two-bone support locks keep the grounded soles fixed while the body compresses/recoils. Biped arm chains use camera-specific sagittal projection. Physical-left shields and physical-right cannon/probe identity remain intact; the rear reach passes behind body/cloth. Suspended manipulators retain their unequal rest dimensions. Weapon orientation/socket offsets are authored independently of the carrying arm. The cannon muzzle extends beyond the fingers at the active pose.

`battle-export.js` adds frame-local, scaled socket points and event-to-socket bindings to sheet and paged-atlas exports. Hand-edited frames export null attachment points with `requiresReview`, because procedural rig coordinates cannot certify painted weapon positions. Four directions are enabled only for new battle-library recipes; legacy saved projects are not silently replaced. One-shot decorative materials use a frozen phase for stable exact seams. The original renderer path remains unchanged when those opt-in fields are absent.

## Reproduction and evidence

From `frontend`, run `npm ci`, `npm run test:studio` and `npm run build`. The native suite passes 29 groups, including 1,320 original renderer comparisons. Battle checks cover 2,688 frames, 2,560 foot contact cases, 288 endpoint comparisons, 2,688 socket cases and 48 attached effect frames, plus save/export/migration and edited-frame limits. See `native-checks.json`.

`tools/export-battle-pack.mjs OUTPUT.zip` bakes all six four-direction battle sets into bounded transparent atlases, timing/events/anchors/origins and source recipes. Each unit has 480 exposures including idle (2,880 total). A Pillow verifier independently recomposed all 2,880 atlas rectangles against source-canvas RGBA SHA256 values, checked binary alpha and verified the ZIP; see `export-checks.json`. Pack v1 is approximately 7.8 MB. Native world tiles are not resized by this art export.

`tools/make-battle-review.mjs OUTPUT` generates preview frames and four-view attack contact sheets. `six-unit-attacks.gif` shows attacks; `six-unit-battle-reel.mp4` shows all seven action categories with authored timing. Background/floor/labels are preview-only. Preview GIF timing rounds to centiseconds; native/export holds are authoritative.

Local Chromium launch is blocked by the host's Unix socket restriction. The committed repository browser suite exercises all six complete battle sets, one-shot endpoints, downloaded save/reopen and a real cannon atlas download with active timing and attachment data. Check CI for its current result. Neither numeric checks nor browser success establish final owner art approval, gameplay combat integration or physical Moto G performance. Older Industrial Echo/crawler/orbital combat paths are retained and are not reclassified as this new 42-clip library.
