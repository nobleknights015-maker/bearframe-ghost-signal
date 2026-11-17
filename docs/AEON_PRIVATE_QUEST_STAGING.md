# Owner-private campaign quest staging (source-driven)

The original Ghost Signal game, UI assets, save keys, and character generator are unchanged.

The campaign field-record **QUESTS** tab can now project authored quest titles and
objectives directly from the owner's installed `story/campaign.json` only when
**durable declared screenplay flags** authorize their visibility. It cannot
invent a quest, show an unstarted quest, apply rewards, resolve dialogue, or
alter saved state. Any pre-existing `world.quests` entries remain present.

## Automatically verified bindings

A quest is eligible when both of its source fields, `start_trigger` and
`completion_flags`, are exact identifiers present in
`flagSchema.gameplay_flags`. A quest appears as ACTIVE once the first flag is
true, and COMPLETE once the second flag is true. Completion takes precedence
over start to support resumed/branching saves.

Free-text requirements, compound expressions, screenplay descriptions and
other ambiguous values are **not interpreted** as flags.

## Owner-authored overrides for otherwise unstaged quests

The optional owner-private `opening-world-review-candidate.json` can contain:

```json
{
  "questBindings": [
    {
      "questId": "SyntheticQuest",
      "startFlag": "synthetic_quest_started",
      "completeFlag": "synthetic_quest_done"
    }
  ]
}
```

Both flags must already be declared in the owner-approved story flag schema.
Specify only fields that require a source-authored override; any omitted field
falls back to the original source field, provided it is a declared flag.
An unknown quest, duplicate binding, reserved identifier or undeclared flag is
rejected. No standalone quest script, new executable code, or public story data
is imported.

## Acceptance gates

The offline private preflight `--review` validates any present quest bindings
without failing legitimate future, still-unstaged source quests. The stricter
`--release` requires all source quests to have explicit or verified start and
completion flags, reporting only numeric totals via `quests` and
`stagedQuests` and `UNSTAGED_SOURCE_QUESTS`. Public CI uses entirely
synthetic quest records. Local owner validation must be run before any production
release. This is **quest journal projection**, not full quest gameplay.
