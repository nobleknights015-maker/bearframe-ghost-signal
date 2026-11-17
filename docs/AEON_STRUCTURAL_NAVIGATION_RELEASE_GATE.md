# Geometry release gate for owner-private Aeon structural maps

Real 32x32 PNG structures are useful only if they don't trap the player,
hide the story, or turn a source doorway into an unreachable decoration.

The engine exports a pure `auditCampaignGameplayReachability(world)`
that analyzes source collision, not screenshots or guessed visual routes.
It walks each validated 32-pixel map from its authored start and checks:

1. Every reciprocal map-exit tile can actually be reached.
2. Every authored interactive entity has a reachable same/adjacent tile,
   matching the original Ghost Signal Interact proximity target.
3. Every authored story trigger rectangle overlaps at least one reachable
   area where the player's feet can stand.

The check produces a reason and source ID for every inaccessible position.
It makes no modifications to the author's map or story data.

**Fail-closed mode:** In a PRIVATE world JSON set
`requiresNavigationQA: true`. The field factory will refuse a map package
with inaccessible gameplay positions. Without that opt-in, the legacy
Ghost Signal demo and earlier review fixtures remain exactly as before.

The private 29-area Structural Layout Review v3 has been audited against
these requirements separately. Five opening areas keep their original
geometry. Twenty-four provisional areas carry revised collision structures
and source-native atlas art; the resulting layoutDigest is different to
avoid loading an old gameplay position into a newly occupied tile.

This gate is necessary but not sufficient for a released map: it does not
certify balanced combat encounters, camera sightlines, good level composition,
animation, accessibility, or a physical Motorola device. The user-private
story and licensed sprite images stay out of public GitHub.
