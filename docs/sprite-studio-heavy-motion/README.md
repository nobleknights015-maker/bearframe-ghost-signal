# Heavy defender locomotion review

Ancient Bulwark and Ancient Breaker now support idle and four-direction walking. The default walk has 12 frames at 8 FPS, a 66% stance duty factor, fixed 20/19 design-pixel physical leg segments, flat counter-rotated boots and a 30.303 design-pixel stride.

- `heavy-walk.gif`: all four directions, both variants.
- `heavy-travel.gif`: rightward travel against a fixed floor, three cycles; the position resets at the end. Green ticks mark stance contacts. Travel uses the exported stride.
- `recipes.json`: reproducible generator settings.

GIF delays alternate 120/130 ms to represent the default 1500 ms cycle within GIF timing granularity. Native export preserves its actual clip timing. Screenspace front/back motion is projected; the physical side-view leg solver preserves segment lengths.

Validation: 600 support/contact samples, 192 leg/sole checks and 16 exact loop endpoint comparisons, plus clip timing, export and save/reopen checks. See the animation research study for limitations and remaining battle animation work. No claim of runtime device validation or final art acceptance is made.
