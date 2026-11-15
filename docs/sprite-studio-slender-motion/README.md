# Slender custodian locomotion checkpoint

Keeper and Surveyor now expose idle and a twelve-frame four-cardinal walk at 9 FPS in the isolated creator copy. The new `slender-v1` controller uses its own 18/19-unit leg dimensions, 14-unit stance span, 62% stance duty, 3.5-unit swing clearance and restrained body compression. Surveyor retains the physical-right hand probe with reduced loaded-arm swing. The floor anchor and one-tile footprint stay fixed. Armour, ring, cowl, rooted growth and authored views are retained.

`slender-walk.gif` shows both roles in all four directions. `slender-travel.gif` shows stride-matched rightward movement over three cycles; actor position resets at the demonstration boundary. GIF timing approximates 9 FPS with eight 110ms exposures and one 120ms exposure per nine frames; native/export timing remains exactly 1000/9 ms per frame.

Use updated presets in a separate project to obtain the new clips. Saved idle-only recipes are not replaced automatically. The controller is opt-in through locomotion metadata; evaluator input is not mutated. Walk cloth material closes at the loop boundary without changing the existing idle recipe. Custom holds still require phase-matched runtime travel.

Local native suite: PASS, 29 groups, including 1,320 original renderer pixel comparisons, 600 additional slender support samples, 192 slender leg/sole cases, eight exact slender walk loop comparisons, twelve distinct rendered frames per view, identity/anchor/save checks, and existing Industrial Echo rear-cloth and other-family regression checks. Build passes. See `native-checks.json`.

Local Playwright was attempted using system Chromium; launch is blocked by the host's Unix socket restriction. The committed browser suite exercises both slender presets, actual walk selection, and downloaded save/reopen. CI result must be checked separately; local native success does not establish browser/mobile acceptance.

This is locomotion authoring, not completed battle animation or engine integration. Role-specific battle actions, turning/acceleration, target-device performance and owner visual acceptance remain pending. Previous heavy checkpoint d8a21aa has independently verified successful native and browser CI run 43735995310.

Reproduce from `frontend`: `npm ci`, `npm run test:studio`, `npm run build`. Generate frames with `node tools/make-slender-walk-review.mjs OUTPUT` and `node tools/make-slender-travel-review.mjs OUTPUT`; encode at 9 FPS. Do not crop exported assets away from their recorded anchors.
