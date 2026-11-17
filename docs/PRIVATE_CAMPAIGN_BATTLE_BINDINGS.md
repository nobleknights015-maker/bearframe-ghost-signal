# Aeon Circuit — private opening-campaign combat bindings (review-only)

This is an **implementation contract**, not a replacement story, encounter script, level design, or final balance pass. The approved Director's Cut remains offline. `campaign-game.js` loads the existing ignored `assets/aeon/story/opening-world-review-candidate.json`. A production reviewer adds the optional `combat` field to that private layout file only after verifying the approved sources and artwork.

Without `worldSpec.combat`, the existing story/field preview still opens. Mandatory battles remain progression gates instead of being silently invented. Original Ghost Signal missions, UI/CSS, saves and the Aeon development lab are not modified.

## Required structure

Inside the private `opening-world-review-candidate.json` object:

```json
{
  "combat": {
    "schemaVersion": 1,
    "campaignRevision": 2,
    "layoutDigest": "COPY_THE_EXISTING_PRIVATE_LAYOUT_DIGEST",
    "partyByStarter": {
      "sleeper_A": [{"id":"sleeper","artId":"sleeper_A","lineage":"sleeper","name":"APPROVED_NAME","hp":30,"maxHp":30,"ep":10,"maxEp":10,"attack":10,"defense":3,"speed":10,"skills":["pulse","guard"]}],
      "sleeper_B": [{"id":"sleeper","artId":"sleeper_B","lineage":"sleeper","name":"APPROVED_NAME","hp":30,"maxHp":30,"ep":10,"maxEp":10,"attack":10,"defense":3,"speed":10,"skills":["pulse","guard"]}],
      "sleeper_C": [{"id":"sleeper","artId":"sleeper_C","lineage":"sleeper","name":"APPROVED_NAME","hp":30,"maxHp":30,"ep":10,"maxEp":10,"attack":10,"defense":3,"speed":10,"skills":["pulse","guard"]}],
      "sleeper_D": [{"id":"sleeper","artId":"sleeper_D","lineage":"sleeper","name":"APPROVED_NAME","hp":30,"maxHp":30,"ep":10,"maxEp":10,"attack":10,"defense":3,"speed":10,"skills":["pulse","guard"]}]
    },
    "encounters": [{
      "id": "EXACT_ID_FROM_PRIVATE_CAMPAIGN_JSON",
      "mapId": "EXACT_ID_FROM_PRIVATE_LAYOUT",
      "enemies": [{"id":"APPROVED_ENEMY_ID","artId":"EXISTING_MANIFEST_ASSET_ID","name":"APPROVED_NAME","hp":12,"maxHp":12,"attack":7,"defense":2,"speed":5}],
      "rewards": {"xp":0,"items":{}},
      "canFlee": true
    }]
  }
}
```

**The numbers and names in the example above are synthetic schema illustrations, NOT campaign-approved character stats, enemy rosters, rewards or battle order. Do not copy them into the real package without author review.** Existing `campaignRevision` and `layoutDigest` must match. Every `encounters[].id` must appear in `campaign.json`; every map ID must appear in the private map graph; every art ID must exist in the installed 42-character v5 library with complete 6×9 animation rows.

- The source-approved starter portrait identity is preserved across field and side-view art. Party rosters may contain 1–4 members; at most the first three are active, the fourth is reserve.
- `encounters[].trigger` is optional. When present, the exact private map object/area trigger can start the battle, optionally guarded by `requiresFlag`. A **combat-only** rectangle trigger may omit `sceneId`; it must still supply an exact, source-approved trigger name and match its staged encounter. An area `entryTrigger` may similarly start a source-approved encounter after durable travel. A legacy `mandatoryCombat` (or the new ordered `mandatoryCombats`) triggers only after staged dialogue is acknowledged and before its scene can complete.
- Battle actions use the existing deterministic hybrid engine (attack, Pulse, guard, repair, kit, flee and authored enemy behavior). No enemy stats, random encounters, rewards, placement or screenplay are inferred from prose.
- The campaign journal saves the first battle turn, each confirmed action and the final outcome. On interruption, Continue restores the same encounter instead of erasing the storyline or granting loot twice.
- A final victory atomically updates persistent party HP/EP, inventory, experience, encounter gate and any existing authored flags. Defeat uses the engine's established half-HP field recovery, and flee keeps the encounter available for a later attempt; neither grants victory loot.
- Original Ghost Signal and Aeon laboratory save namespaces are never touched. Story-only saves can migrate to a staged starter roster without erasing already completed scenes, maps, dialogue or inventory.

## Campaign-wide ordered combat gates

For a full approved screenplay with several mandatory fights, use an ordered
`mandatoryCombats` array at the top level of the **private** world layout.
This replaces (do not specify together with) the legacy singular
`mandatoryCombat` field. Example below is schema only, **not actual story**:

```json
{
  "mandatoryCombats": [
    {"sceneId":"APPROVED_SCENE_1","encounterId":"APPROVED_BATTLE_A","saveOutcomeRequired":"victory"},
    {"sceneId":"APPROVED_SCENE_1","encounterId":"APPROVED_BATTLE_B","saveOutcomeRequired":"victory"},
    {"sceneId":"APPROVED_SCENE_2","encounterId":"APPROVED_BATTLE_C","saveOutcomeRequired":"victory"}
  ]
}
```

Each encounter must exist in the authored private narrative's encounter table
**and** private combat-staging roster, with its actual approved map, enemies,
stats and art. The runtime processes the array in author-supplied order;
victories (not fled/defeated outcomes) are committed atomically to the existing
corruption-checked journal. Once an encounter is won it cannot award loot a
second time. A scene is held until **all** its own mandatory encounters have
saved victories. Reloading between battles resumes the pending encounter
without replaying earlier rewards or skipping narrative.

Older single-encounter story packages and saves remain supported. Missing,
duplicate, contradictory or invalid source identifiers cause a validation
failure instead of guessed encounters. This is the reusable engine capability;
it does not author or approve actual campaign encounters.

## Verification and release gate

Run `node --test frontend/tests/campaign-combat.test.mjs`, the focused Chromium `browser-campaign-combat.mjs`, existing campaign opening regression, and full Ghost Signal regression workflows. These use **synthetic** art, names, encounters and geometry. Actual private Director's Cut staging, approved visual assets, difficulty review and Moto G Android acceptance remain separate required release gates.
