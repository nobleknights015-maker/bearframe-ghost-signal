# Campaign security: owner-authored live field bridge

This is an **opt-in campaign addition**, not a replacement for Ghost Signal
stealth missions, UI, enemy AI, or original save records.

An owner-private map may define `security.zones` in
`story/opening-world-review-candidate.json`. Every zone uses integer
pixel coordinates, dimensions within the map's native 32px tile grid,
a unique ID, `mode: "normal"|"stealth"`, and a supported consequence.
The bridge compiles each area once and fails closed on invalid zone metadata.

While playing an owner-authored stealth zone, the bridge reads the original
Ghost Signal game's **actual chase-and-visual-confirmation signal**. Merely
walking into a marked zone never creates an artificial detection. The
resulting optional `world.security` state is saved to the existing private
campaign journal **before** any security consequence is dispatched. Existing
party, quest, flag, equipment, and map records remain intact.

When an authored stealth zone requests an `encounter`, it must include an
encounter ID matching a real, approved entry in private combat staging for
the active area. Without that independent approval, detection becomes a
noncombat alarm instead. The existing campaign battle host remains the only
system that can start and durably save actual combat.

Only a new change in the saved detection state can launch an encounter.
Holding visual contact does not start repeated battles; continuing a save
with the same recorded detection does not replay it. Leaving a zone clears
its alarm. If saving fails, no alarm or combat consequence is dispatched.

The existing Ghost Signal HUD continues to present stealth feedback.
`checkpoint`, `escape`, and `chase` remain policy state outcomes in
this stage; they do **not** silently grant a checkpoint, move the player,
fabricate a chase unit, or mutate screenplay flags. Patrol placement and
source encounter authoring remain private, unapproved work until reviewed.

**Release is not established by these tests.** Public CI uses synthetic
zones, actors and maps only. On-device tests with owner-private staged maps
and combat assets remain necessary.
