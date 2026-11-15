# Visible vine attachment fix and other-unit gallery

The crawler growth previously began outside its narrow mast, and the orbital growth began outside its core silhouette. A valid parent pointer did not establish visible attachment.

The corrected rigs put a solid moss root patch directly on the crawler deck or orbital upper shell. Each strand is a child of that patch and starts inside it. Existing saved pre-fix family rigs get the same correction when unedited frames regenerate. Unrelated body, ring, leg, outfit and motion geometry is preserved.

Tests isolate the roots and strands, keep all parent transforms, and flood-fill the alpha mask using eight-neighbour pixel adjacency at native resolution. All 896 tested views/actions/frames must form one connected component. Saved-recipe repair is compared to fresh generation. These tests establish attachment in the sampled raster output, not artistic approval.

Previews:
- attached-vines.gif: corrected crawler and orbital core, four directions.
- echo-and-heavy.gif: existing Industrial Echo Maintenance and Heavy Sentinel, walking.
- archive-and-drone.gif: existing suspended Archive Sentinel and Micro-drone, idle.

The other-unit gallery is a review of existing selectable prototypes, not newly completed chassis implementations. Raw legacy presets retain their old movement/material behavior. Review images crop only empty margins, use a common crop across all directions/frames for each unit, and integer nearest-neighbour magnification for legibility; they are not a physical scale comparison. Native sprite pixels are unchanged by presentation. All GIFs use 12 frames at 140 ms each. Generator source remains separate from the engine; no new runtime or device integration claim.

Reproduce: `node frontend/tools/make-grid-review.mjs docs/sprite-studio-vine-review` and `node frontend/tools/make-other-unit-review.mjs docs/sprite-studio-vine-review`, then encode the corresponding PNG sequences with Pillow.
