# Source-owned physical doorway prompts for optional interiors

Original Ghost Signal doors, field renderer and save namespaces remain unchanged.
The private Aeon world can attach two optional prompt strings to a validated
reciprocal portal object:

- `portalLabel`: an uppercase, 1–48 character prompt shown when travel is
  authorized, such as `ENTER SHELTER` or `RETURN TO SURFACE`
- `portalLockedLabel`: a distinct optional gated state, such as
  `SHELTER SEALED`

Both accept only uppercase ASCII letters, numbers, spaces, slash, dash and
underscore; no markup, control characters, story source text or URLs.
When omitted, the preexisting `SEALED BULKHEAD` / `OPEN BULKHEAD` /
`OPEN HATCH` messages are identical. The original Interact input,
reciprocal source travel, flag gates, journal writes and collision are
unchanged.

This is a public **code contract**, not a promise that an owner-proposed
bunker annex has become canon. The owner-private v5 review ZIP contains
the actual noncanonical example locations and vendor-licensed PNGs, not
this public repository. The optional 29+3-area review must be installed
privately, and its independent layout digest requires a new review save.

Passing unit, browser, and emulator tests does not approve the visual
composition or substitute for physical Moto G QA.
