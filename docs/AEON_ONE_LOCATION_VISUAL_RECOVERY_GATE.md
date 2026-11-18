# Aeon Circuit: one-location visual-quality recovery gate

This is for **Aeon Circuit: The Silent Wake**, the original Bearframe-universe JRPG on the existing Ghost Signal engine. **Not Ghost Signal Expanded.**

## Scope lock

- Do not add campaign maps or missions until one existing gameplay location is run, visually reviewed, and explicitly accepted by the owner.
- Preserve the original Ghost Signal engine, rendering, lighting, camera, movement, input, UI, saves, and Sprite Studio. No replacements or cross-game changes.
- The current A20 maintenance room is an **owner-private, noncanonical QA location**. It does not amend the approved Director's Cut story, quests, encounters, or map canon.
- Never commit purchased environment sprites, original story, approved character atlases, screenshots derived from private art, or private QA ZIPs into this publicly readable repository.

## Source-only structural regression

`frontend/narrative-tools/one_location_quality_gate.mjs` exports `verifyOneLocationQualityGate({map,lockedDoor,gatedDestination,requiredInteractive,artLayers})`.

It fails closed on malformed grids, non-native tile size, invalid spawn/gate/target coordinates, gated-region bypass, a door that does not open the route, unreachable walkable terrain after unlock, inaccessible pre-unlock interactions, incomplete door return geometry, or art layers whose native pixel dimensions do not match the map.

Run:

```sh
node --test frontend/tests/one-location-quality-gate.test.mjs
```

The included fixture is synthetic and contains **no owner assets or narrative content**. The private A20 QA revision can supply its map and source-layer dimensions locally without uploading any files or emitting story content.

## A complete review needs more than a passing structural gate

1. Build one authored environment with already licensed, native-resolution artwork and coherent collision.
2. Run the **actual existing Game engine** with a genuine Sleeper sprite, HUD, movement, dynamic lighting, scanner, interaction and collision. Capture an identified **gameplay browser frame**, not a static collage.
3. Test sealed door, authorized unlock, crossing in both directions, camera, walking, controls, pause and locally isolated save/restore.
4. Compare readability, art layering, proportions, geometry and visual cohesion against the original Ghost Signal standard. Rework the same location until its visual quality earns owner approval.
5. Confirm regular hosted browser deployment and Android emulator separately. Physical Moto G (2025), controller, production APK and full campaign acceptance remain independent gates.
6. Keep a dated private handoff with source SHA, PR state, test report, screenshots, asset provenance, unresolved issues and next steps.

**Passing this script is structural QA only** — never label it screenshot verification, owner visual acceptance, device testing, or a finished campaign.
