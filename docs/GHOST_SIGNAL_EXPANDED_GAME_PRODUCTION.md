# Ghost Signal: expanded game production / canon gate

Status: **isolated candidate, not approved lore or production release**. This document contains no private screenplay and no licensed art. The original **Bearframe: Ghost Signal** is a separate game from **Aeon Circuit: The Silent Wake**.

## Source and safety boundaries

- Source baseline: public repository main; original missions M01 and M02 and the standalone Sprite Studio remain the reference implementation.
- Expansion branch: `feature/ghost-signal-expanded-m03-surface-20261117`. Review via draft PR; never silently merge.
- Protected game behavior: Wraith, 480×270 logical canvas, 32×32 grid, four-direction movement, original Ghost Signal industrial HUD, stealth and scanner systems, case file, title, settings, and local save keys.
- Save keys are **not renamed**. Old Mission 01/02 saves and progress records must remain loadable. M03 is an additive entry in the existing mission registry.
- Do not check in the owner's screenplay, unreleased character references, licensed tilesets, paid/attribution-restricted FX, archive ZIP contents, or artwork without documented rights and approval.
- The generator is an art-production tool, **not** a reason to replace a human-approved sprite. Generated previews are drafts until reviewed.

## Canon and narrative constraints (Rev. 4.10 reference)

- Wraith, WTR-07, acts as Watchtower field support, under Sentinel's security coordination.
- Mira commands her **independent Exploration Department** and owns survey boundaries, risk decisions, and expedition extraction; she is not subordinate to Sentinel or the siblings.
- Nova handles mapping/cartography; Kai handles field research and environmental outreach.
- Sentinel is an independent Watchtower commander. His motto is "Different department. Same objective."
- The individual met below remains an **unclassified person**, not automatically an Echo, Ghost Grid entity, Nullframe, enemy, or artifact. The original vault ending choices remain intact.
- Archived echoes/traces are recordings, not independent persons. The unknown signal's origin, the facility's builders, and uncertain timestamps remain **unresolved**.
- A working security system is not proof of centralized Ghost Grid affiliation. Modern survey gear and ancient infrastructure must remain visually and technically distinct.
- Story events added by this branch are **provisional connective fiction** pending owner review; do not overwrite the Canon Lore Bible with them.

## Implemented first expansion slice: M03 Return to the Surface

M03 shifts pacing to fieldwork rather than cloning M01's stealth template. It contains a larger, distinctly surfaced map with different deterministic 32px tiles, a daylight lighting policy, and no drone/detection UI. Wraith meets Mira, Nova and Kai, documents physical evidence, collects a modern field coupler, scans a carrier, restores *surface-only telemetry*, then offers one of two risk recommendations to Mira. Mira decides whether to hold the current boundary or authorize strictly supervised, surface-only mapping.

The phase does **not** claim a resolution of the underlying mystery. M03 finishes with the case open. Other chapters are still proposals rather than implemented content.

## Asset integration (safe, non-destructive)

The public project includes Sprite Studio. The separate active engine branch documents a callable generator in `docs/CHARACTER_GENERATOR_PIPELINE.md`; its generator scripts are **not** automatically duplicated into this original game. They can produce a Ghost Signal-compatible 12-column humanoid sheet (walk 0–5, idle 6–9, scanner 10–11; four rows down/up/right/left; 32×56 per frame).

M03 supports optional Sprite Studio assets through `mission3.actorAssets`, keyed by the NPC entity ID:

```js
actorAssets: {
  mira: { src: 'assets/characters/gs_mira_expedition.png' },
  nova: { src: 'assets/characters/gs_nova_expedition.png' },
  kai: { src: 'assets/characters/gs_kai_expedition.png' },
}
```

Those paths are **examples** for a local, privately staged build; no files at those paths are included by this branch. Loaded images are accepted only from local `assets/characters/*.png` paths with minimum dimensions 384×224. A fallback original procedural 32×56 android remains whenever the PNG is absent, invalid, or not approved. The actor renderer leaves original Wraith and vault-resident art unchanged. Approved appearances must be referenced from the owner's canonical character sheets, not inferred from these procedural fallbacks.

For owner's purchased and free ZIP packs:
1. Review each pack's actual license, attribution and redistribution limits.
2. Stage files **outside the public source** until rights to repository distribution are confirmed.
3. Select one consistent environmental palette and native 32px tile scale. Adapt larger or differently scaled art by hand, preserving true pixel placement; never blur/upscale indiscriminately.
4. Prepare local manifest maps for outpost structures, field machinery, sky/terrain breaks, environmental animations and UI FX. Keep source credits/license ledger in the private art package.
5. Test in browser and Android against real exported art; only then replace the procedural fallbacks in an approved asset-only PR.

Do not use paid packs as unreviewed placeholder bundles or assume a generic NPC represents a canon portrait.

## Follow-up after the M04 rescue slice

M04 now includes a second weathered surface environment, a missing surveyor, a real path-following escort, field regulator repair, search evidence, and two extraction methods. Wraith does not commandeer Exploration's rescue operation. Later missions listed below remain proposals, not implemented.

## Next expansion targets (proposed only)

1. **Missing Survey**: investigate an overdue field team with search-and-rescue, environmental threats and multiple routes, **not** another long alarm corridor.
2. **Broken Relay**: real-time equipment operation, hazards, a restrained action set piece and non-lethal options.
3. **Watchtower Anomaly**: witness accounts, evidence comparison, interviews, and contradictory reports; no invented omniscient faction exposition.
4. **Open regional exploration**: distinct site categories (surface ruins, field hub, transit, vault approaches) with meaningful optional discovery and a clear investigation journal.
5. **Integrated finishing work**: controller support, phone-safe HUD, save/migration soak, screenshots, reviewed NPC and machine animation exports, soundscape, optimized lighting, Android QA.

Do not mark the game complete until playthrough and installed-device QA pass; green Node tests alone are not enough.

## Automated acceptance

- `node --test frontend/tests/ghost-signal-expansion.test.mjs`: mission registry, map traversal, gated objectives, both recommendations, save/UI/source contracts.
- `node --check`: modified JS module parse checks.
- `npm run build --prefix frontend`: static bundle integrity.
- `node --test frontend/tests/ghost-signal-browser.test.mjs` after Playwright installation: real Chromium boots original M01 then unlocked M03, renders canvas, checks outdoor state and records a landscape screenshot.
- Pending before merge: full M01/M02 browser replay, physical Moto G Android tests, actual private asset staging, on-device long save/reload test, user visual and story approval.
