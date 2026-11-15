# Industrial Echo rear-view depth correction

Supersedes the earlier all-arms-visible depth rule and its blanket coverage assertion. Flipping arm rotation signs did not repair occlusion. In up view, walking arm chains now switch between a near, passing and far draw plane using their separate swing phases. Forward reach on the physical-right arm uses the far plane. Neutral shoulders/forearms sit alongside the body rather than both being forced above rear cloth. Unedited saved rigs use the same evaluated rule.

No body/leg geometry, down/left/right renders, outfits or other unit families change. Physical limb/tool identity and the preceding directional sign fix are retained.

The replacement test renders complete sprites, isolated arm masks and isolated rear-body masks at the two quarter-cycle walk poses for both roles. It requires near-arm coverage and actual body occlusion of overlapping away-arm pixels. The targeted native result is 411 near-arm pixels, 294 occluded far-arm pixels, and 136 near-arm/body overlap pixels across those four cases. Those counts describe this recipe/resolution only, not every configurable rig.

The previous requirement that every back-arm pixel always remain visible was incorrect and has been removed. Other 336-direction pixel comparisons remain. Tests and native contact inspection do not substitute for owner visual approval.

Preview: front reference, previous back, depth-corrected back. Eight frames, 180 ms each, 3x nearest enlargement. Reproduce with `node frontend/tools/make-echo-depth-review.mjs` then Pillow GIF encoding. No game/runtime deployment claim.
