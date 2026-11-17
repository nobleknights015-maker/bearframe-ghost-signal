# Campaign encounter source integrity

The owner screenplay defines multiple encounter **kinds**. Combat staging may
only convert an encounter into a side-view battle when the exact source ID
exists and its declared kind is `battle` or `boss` (synthetic historical
test fixtures without kind metadata remain supported). Its staged `mapId`
must match the source encounter's exact area.

This prevents an authored puzzle, stealth sequence, NPC conversation, repair,
escort, or moral choice from becoming an accidental generic battle. No
random encounters or enemy placements are generated.

The source encounter may authorize one exact `set_flag` on victory, and only
when that ID is present in the approved `flagSchema.gameplay_flags`. The
existing campaign journal now records this flag in the same corruption-checked
dual-slot write as battle victory, XP, inventory loot, HP, EP and encounter
outcome. Losing or withdrawing does **not** grant the milestone. Failed
storage writes grant **none** of these rewards, and continuing a saved victory
cannot claim them again.

The private source currently contains 61 authored encounters across 29 areas;
only 24 are explicitly tagged as `battle` or `boss`. A number of source
`set_flag` identifiers are not yet part of the approved gameplay flag
schema, so affected fights must be reviewed and the source schema reconciled
**privately** before being staged. The public repository contains only
contracts, tests, and general counts, never spoilers, story text, combat
placements, private art or finalized balance claims.

Synthetic Node, browser, campaign entry and Android debug workflow gates
remain required; successful CI is not a physical Moto G release sign-off.
