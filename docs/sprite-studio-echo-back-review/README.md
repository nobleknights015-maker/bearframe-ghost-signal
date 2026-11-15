# Industrial Echo back-view arm direction

Only the up-view arm/tool motion changes. Physical limb positions already reversed between down/up, but walk swing, right-arm action offsets and malfunction offsets retained the down-view signs. These now reverse for up, including the maintenance claw's local horizontal offset. Existing arm visibility above rear cloth is retained; other three views and body/legs remain unchanged.

Both roles and all seven actions are checked across eight frames (112 cases): each up-view upper/forearm angle is the negative of the corresponding down-view angle. Saved pre-fix claw placement receives the same correction on regeneration. Existing pixel comparisons protect 336 non-back Echo frames.

Preview columns: front reference, previous back, corrected back. Survey top, Maintenance bottom. Eight frames at 140 ms, nearest-neighbour 3x. Reproduce with `node frontend/tools/make-echo-back-review.mjs`, then encode frames using Pillow. This verifies the directional motion correction, not final art or runtime approval.
