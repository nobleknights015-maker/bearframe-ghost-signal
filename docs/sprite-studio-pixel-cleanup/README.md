# Humanoid pixel finish and narrower front/back side-head modules

This optional finish applies to the isolated native Sprite Studio copy. Original main and the engine branch are unchanged.

New humanoid projects and character recipes default to Clean pixel finish and Narrow front/back side modules. Old projects without these fields retain their previous look; choose the new controls to apply the finish to their unedited frames. Legacy and Wide remain selectable. Classic rendering ignores both controls and retains its original pixels.

Front/back Sleek modules are 2 design pixels wide instead of 3, with the inner edge still attached to the helmet. Their height remains 6. Profile-facing discs keep their original geometry. The change reduces the protrusion without removing the side displays.

Clean finish uses calmer armor highlight/shadow ramps and leaves thin polygon corner tips at the plate's base color instead of alternating bright/dark edge specks. It is a selective surface change, not a global pixel-deletion filter: it preserves the body alpha silhouette, pose geometry, feet, small display lights and deliberate weathering. It does not claim every possible asset or animation is fully polished.

`head-comparison.png` enlarges the four facing views. `before-after.gif` shows Vale and Penney walking in four directions before and after. The comparison renders the pinned pre-change checkpoint `fdea3ffef7fb2e7e5baa9e829b2448fbae25a7fa` and current production modules. Original character reference artwork is not cropped or republished.

Reproduce native comparison PNGs:

```
node frontend/tools/make-cleanup-review.mjs docs/sprite-studio-pixel-cleanup
```

This writes six walk PNGs and the head comparison. The checked-in GIF combines the walk frames with 125 ms frame durations and nearest-color quantization for preview. Runtime exports remain RGBA PNG sheets plus metadata.

Validation adds two-resolution checks for narrower front/back modules, pixel-identical profile views when only module width changes, identical body alpha when only finish changes, and Classic compatibility with either control setting. Existing Classic baseline, cape/body, fixed leg length, sole contact, ring, save/edit protection and export checks remain. The legacy cape/body comparison explicitly selects Legacy/Wide to validate the retained old look; new finish behavior has separate checks. Browser checks exercise both controls and reopen a downloaded project carrying their values.

The source checkpoint and validation status are recorded in `verification.json`. Numeric checks do not substitute for owner visual approval.
