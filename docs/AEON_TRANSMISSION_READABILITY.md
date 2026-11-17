# Campaign map-transmission visibility

The private Aeon Circuit review world consists of approved source maps with
reciprocal `portals` objects. Older blockout maps had functional transitions
but no obvious field affordance. This optional layer makes the authored
transmission points readable using a minimal **32x32 pixel** sign that sits
inside the existing walkable portal tile.

- Cool teal, paired chevrons: passage is unlocked.
- Weathered amber, paired chevrons: a source quest flag currently seals it.
- The glow is a static tile-level marker, never an invented item, NPC, door,
  destination, encounter, quest, or piece of unapproved location art.
- Positive (`requiresFlag`) and negative (`requiresNotFlag`) authored gates
  determine color with current durable private quest flags.
- The painter runs only when a new field is baked or when gate flags change;
  original underlying Ghost Signal map tiles are preserved and copied back
  before a new paint. There is no frame-by-frame canvas allocation.
- The original Ghost Signal title, mission art, menus, controls, original
  save namespace and character generator are never modified.

The transmission glyph is optional **review UI**, not a claim of final
approved environment artwork. Owners can replace the generated marker with
future licensed/native 32px portal art after visual approval.

Validation includes synthetic reciprocal source routes, locked/unlocked
state and source immutability, Android-compatible module loading, browser
startup and travel, and the existing original Ghost Signal CI gate. Physical
Moto G QA is a separate release gate.
