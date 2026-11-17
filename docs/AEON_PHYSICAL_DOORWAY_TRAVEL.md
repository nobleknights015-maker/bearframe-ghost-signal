# Private Aeon Circuit doorways — no automatic map teleportation

**Design direction:** Source areas must connect through physical objects and
believable entrances, not invisible trigger floors. The old 32×32 chevron
prototype is removed from this branch.

The campaign mission factory now converts each owner-private, reciprocal
portal into a visible **32×32 pixel** world entity rendered by the original
Ghost Signal object art path: industrial `bulkhead` (safe, current default),
`hatch`, or `exit` (lift/exit-looking doors). The approved scene geometry,
collision, source map graph, portraits, project art, and original Ghost Signal
UI are not replaced.

Existing portals may optionally carry `portalStyle` equal to `bulkhead`,
`hatch`, or `exit`. Any unknown style is rejected instead of silently
inventing final lore, place names, NPCs or door graphics. Unreviewed portals
default to the existing Ghost Signal industrial bulkhead artwork; the
private area author can later designate ruined gates, old hatches, elevators,
etc. and upgrade to approved licensed sprites.

**How it works:** The player walks up to the physical door, receives an
`OPEN BULKHEAD` or `SEALED BULKHEAD` prompt in the existing Ghost Signal
HUD and presses the normal Interact / controller action. Passing through
uses the established reciprocal field-travel transaction: exact source
area, original pixel-perfect player representation, saved journal checkpoint,
and rollback if navigation/storage fails. Walking on a portal tile now does
**nothing**. Story/quest prerequisites remain authoritative at interaction,
and a sealed entrance never secretly loads the destination.

The original field supports pixel art for bulkheads/hatches/exits already.
Their present visual style is **a gameplay wiring pass**, not approved
finished location-specific door art. Physical collision/door-opening animation,
sound variation, directional thresholds, and distinct lift cutscenes remain
later polish tasks, subject to author review and actual game device testing.
The synthetic browser QA now explicitly **walks to a door, presses Interact,
crosses, saves, and continues**, and checks a sealed route unlocks after
source dialogue. The original Ghost Signal demo is not altered.
