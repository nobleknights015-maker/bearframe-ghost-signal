# Optional chassis and Bearframe outfits

The isolated `sprite-studio-sleek-copy` generator now offers Standard, Lean Male, Lean Female and Broad chassis. Standard keeps the established renderer. Saved projects without a chassis field retain Standard.

The refined profiles use a narrower waist, tapered upper arms, forearms, thighs and shins, sloped shoulder plates, and articulated knees. They preserve the existing animation poses and sole baseline. Sagittal two-bone legs maintain lengths of 8 and 8.5 native units; front/back views project the depth bend instead of spreading knees sideways. Both profile boots have the same dimensions.

Outfit families: Bearframe uniform, command, research, explorer, engineer, community, visuals, support, and Watchtower. Optional helmet crests, goggles and swept fittings and friendly/calm/focused displays supplement the existing V visor. Chest and side-head displays remain visible. Existing scarves, hoods, drapery, damage, overgrowth and ring controls remain separate.

Recipes include generic male/female Bearframes and eleven reference-inspired characters: Nexus, Founder, Vera, Sentinel, Penney, Vale, Eira, Mira, Brix, Auren and Atlas. Coats, collars, lapels, veils, mantles, straps, apron/harness variants, ID tags and native emblems distinguish roles. Auren has a long research coat, Vale a shorter coat, Eira asymmetric hems; Brix has an apron and Atlas a harness. These are low-resolution procedural interpretations, not exact reproductions or approved final character sprites. Holographic cloth is rendered with opaque native pixel clusters.

## Review and validation

`body-options.gif` compares the old and new bodies in all four walking directions. `characters-1.gif` through `characters-3.gif` show all eleven named recipes. PNG companions show one contact pose. These previews were visually inspected for silhouette, side knee direction, boot size and outfit overlap; user art approval remains pending.

`npm run test:studio` exercises production canvas and UI modules. Added coverage renders 1,440 chassis cases across three profiles, two resolutions, four directions, ten existing animation types and six frames, checks fixed side leg lengths and walking sole contacts, and renders 624 character walking cases. Browser regression additionally exercises profile/outfit selection, preset selection, saving and reopening. Existing Classic exact-pixel regression, capes, wardrobe, rings, edited-frame persistence and export checks remain in the suite.

Reproduce contact sheets after a native review run:

```
STUDIO_REVIEW_OUT=/tmp/chassis node frontend/tests/studio-native.mjs
python frontend/tools/make-character-review.py /tmp/chassis docs/sprite-studio-chassis
```

Source modules: `android-chassis.js`, `android-catalog.js`, `android-outfits.js` under `frontend/public/studio/lib`. Original main and the separate engine branch are not modified.
