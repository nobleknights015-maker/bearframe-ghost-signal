# Private authored narrative runtime

The offline importer `frontend/narrative-tools/import_campaign.py` installs an
owner-supplied content package into `frontend/public/assets/aeon/story/campaign.json`.
That entire asset directory is already ignored by git. The source screenplay,
dialogue, choice options, identifiers, area records and production specifications
must remain private. Public CI uses synthetic fixtures exclusively.

Run the importer with the extracted, unchanged source package directory. It
checks every source hash against the package manifest, preserves CSV records
verbatim, derives scene chronology from screenplay headings, and checks the
separate insertion table. It refuses to overwrite differing installed content.
The package's original editorial labels remain source data; the owner handoff
supplies approval and implementation direction.

The content-agnostic `narrative-runtime.js` exposes pure state transactions:

1. `createNarrativeState(content, savedState)` defaults newly introduced flags,
   enums and relationship values while preserving prior progression.
2. `nextNarrativeScene(content, state)` selects the next unresolved screenplay
   milestone. Numeric identifier sorting is never used.
3. `beginNarrativeScene(content, state, scene.id, {trigger: scene.trigger})`
   requires the expected milestone and actual supplied trigger.
4. `narrativeLines(content, state)` returns the active scene's currently
   conditioned dialogue in authored sequence. Acknowledge one line with
   `acknowledgeNarrativeLine` after showing it; effects execute once.
5. `applyNarrativeChoice` confirms exactly the contract's required number of
   distinct options. The explicit two-selection contract remains two selections.
6. `completeNarrativeScene` requires all visible dialogue and attached choices
   to be acknowledged, then applies scene and insertion flags once.

Only a pending optional insertion can be skipped with
`skipOptionalNarrativeScene`. Unknown expressions fail closed; source is never
passed to eval. Actions return private copies, so the caller must durably save
before publishing the new state. They do not write original Ghost Signal saves.

This implements data ingestion and narrative transactions. Natural-language
quest rewards, map placements, scene directions, camera shots and encounter
setups remain exact source instructions requiring production adapters. Do not
claim that importing them constructs maps or makes the campaign playable.
Ending branches and conditional campaign traversal require explicit authored
staging; chronology is an index, not proof that every scene runs unconditionally.

Verification covers source tampering, insertion order, exact CSV preservation,
state migration, conditioned dialogue, one-shot effects, multi-select choice
validation, immutable input states and unsupported expression rejection.
