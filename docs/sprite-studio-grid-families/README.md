# Crawler and orbital core — first review

Original native procedural studies, added only to sprite-studio-sleek-copy. Existing humanoids, preferred outfit silhouettes and raw legacy machine presets remain on their existing paths.

Select Machine → Grid Crawler, Grid Crawler ripple, or Orbital Core. Roles: cartographer/salvager and analyst/relay. Palette, weathering, part editing, margin fit, save/reopen and atlas export use the existing editor. Regenerate unedited preserves edited cells.

The crawler has six persistent LF/LM/LR/RF/RM/RR chains and explicit four-view definitions. Analytic two-bone legs keep 22/24 lengths. Tripod uses 60% duty; ripple 5/6 duty. Body-relative stance cancels constant world velocity; the exported stride is 10/duty. A field consumer must apply that stride at the chosen playback rate. The current game is not connected to these sheets.

The orbital core has two independent ring planes, matched material IDs across front/back halves, full-turn closed spin channels and a fixed ground projection anchor during hover. Ring damage follows the material segment. Ring tilt and core arrangement are authored; this is a projected 2D model, not a physical 3D orbit simulation.

`crawler-and-orbital.gif`: four directions, 12 frames, 140 ms/frame, nearest-neighbor 2x. `recipes.json`: fitted reproducible starting rigs. Recreate PNG frames using `cd frontend && node tools/make-grid-review.mjs`. Convert frames with Pillow into GIF at the above timing.

Limits: initial art review prototypes, not exact Palinode/Oracle reproductions or approved canon characters. Front/back leg overlap remains a readability review item. Attack, charge, hurt, malfunction and shutdown are restrained placeholder gestures for editor coverage, not full approved battle sequences. No collision/COM stability certification, runtime adapter or Android performance claim. Hover ground anchor, source size and tile footprint remain distinct.
