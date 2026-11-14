# Back-arm depth and garment profile correction

Baseline for review: `ded6e05b78263c07f2b0cde653f95e4e984cf387` on the isolated generator copy. Original main and the separate engine branch remain unchanged.

The Industrial Echo back view previously placed the arms at depth 3, behind the backpack at 4 and mantle at 5. Back-view upper arms, forearms and tools now have explicit layers above those rear garments. The family evaluator also applies this order to previously saved family definitions when their unedited frames are regenerated. Physical left/right identities and all non-back poses remain unchanged.

Humanoid profile garments previously shared a shoulder-to-hem rear wedge. Research/support/formal coats and split-panel garments now have a fitted torso section, a waistband and separate front/rear panels rooted at the waist. Research hem variants retain their lengths. The engineer apron and explorer pouch/strap are positioned at the front of the profile body. The near arm is painted over these garments; independent scarves/hoods retain their outer layer. The separate Cloak option still produces actual shoulder-hung capes, including the existing command and Watchtower outfits.

Front and back humanoid garment views are preserved pixel-for-pixel. This is an authored profile/occlusion repair, not a change to skeleton proportions, feet, movement timing or source-image deformation. Standard and refined chassis both repaint their native near-arm geometry over affected profile outfits.

`echo-before-after.gif` compares Survey and Maintenance back views. `outfit-before-after.gif` compares Vale's coat and Brix's apron in four walking directions. PNG contact companions show one sample. These original native renders are review artifacts, not final owner art approval.

Validation adds:

- Pixel-exact front/back garment comparisons for all 13 recipes at two resolutions over six walking frames.
- Pixel-exact preservation of the Echo's down/left/right views across both roles and seven actions.
- Full back-arm coverage comparison against isolated arm geometry across both roles and eight walking frames.
- Profile forearm and hand samples compared against the same character without its outfit over both profile directions and six frames.

The previous Classic, Sleek, cape, ring, reach, fitting, atlas, edit persistence and browser export tests remain. `verification.json` records the final source checkpoint and CI results.

To reproduce PNG review frames:

```
node frontend/tools/make-layer-review.mjs docs/sprite-studio-layers
```

The checked-in GIFs use 125 ms frames. Existing saved baked cells remain protected; use **Regenerate unedited** to apply renderer fixes without replacing manual pixel edits. This change does not implement the remaining crawler or floating families or their game runtime adapter.
