/**
 * Source-only, owner-art-safe Aeon one-location structural review gate.
 *
 * This validates geometry and native pixel-space art contracts. It does NOT
 * imply visual acceptance, running-frame browser QA, canonical campaign
 * release, collision at sub-tile precision, or physical Android acceptance.
 *
 * No map, dialogue, storyline or licensed texture is bundled here.
 */
export function verifyOneLocationQualityGate({
  map,
  lockedDoor,
  gatedDestination,
  requiredInteractive = [],
  artLayers = [],
  walkableValue = 2,
  requiredTileSize = 32
} = {}) {
  const problems = [];
  const problem = (code, detail) => problems.push({ code, detail });
  const whole = n => Number.isSafeInteger(n);
  const dimensionsOkay = whole(map?.w) && whole(map?.h) && map.w >= 3 && map.h >= 3 &&
    map.w <= 4096 && map.h <= 4096;
  if (!dimensionsOkay) problem('INVALID_MAP_SIZE', 'Map must have safe, finite width and height.');
  if (map?.tileSize !== requiredTileSize) problem('INVALID_TILE_SIZE', 'Authored tile size must match the native 32px source grid.');
  if (!dimensionsOkay || !Array.isArray(map.grid) || map.grid.length !== map.w * map.h ||
      map.grid.some(value => !whole(value))) {
    problem('INVALID_COLLISION_GRID', 'Collision grid must contain w*h integer tile states.');
  }
  const validMap = !problems.some(p => ['INVALID_MAP_SIZE', 'INVALID_COLLISION_GRID'].includes(p.code));
  const inside = ({tx, ty} = {}) => validMap && whole(tx) && whole(ty) &&
    tx >= 0 && tx < map.w && ty >= 0 && ty < map.h;
  const isFloor = p => inside(p) && map.grid[p.ty * map.w + p.tx] === walkableValue;
  const start = {
    tx: map?.start && whole(map.start.x) ? Math.floor(map.start.x / requiredTileSize) : NaN,
    ty: map?.start && whole(map.start.y) ? Math.floor(map.start.y / requiredTileSize) : NaN
  };
  if (!isFloor(start)) problem('INVALID_SPAWN', 'Spawn is not on traversable terrain.');
  if (!isFloor(lockedDoor)) problem('INVALID_LOCK', 'The gate is not on a traversable tile when opened.');
  if (!isFloor(gatedDestination)) problem('INVALID_DESTINATION', 'Gated destination is not on walkable terrain.');
  for (const entry of requiredInteractive) {
    if (!entry || !isFloor(entry)) {
      problem('UNREACHABLE_INTERACTIVE_GEOMETRY', `Interactive ${String(entry?.id ?? 'unknown')} is not on walkable terrain.`);
    }
  }
  for (const layer of artLayers) {
    if (!layer || typeof layer.id !== 'string' || !whole(layer.width) || !whole(layer.height) ||
        layer.width !== map?.w * requiredTileSize || layer.height !== map?.h * requiredTileSize ||
        layer.width % requiredTileSize || layer.height % requiredTileSize) {
      problem('ART_DIMENSION_MISMATCH', `Art layer ${String(layer?.id ?? 'unknown')} is not aligned with native map dimensions.`);
    }
  }
  let sealed = null, released = null, floorCount = null;
  if (validMap && isFloor(start) && isFloor(lockedDoor) && isFloor(gatedDestination)) {
    floorCount = map.grid.reduce((count, value) => count + Number(value === walkableValue), 0);
    const visit = sealDoor => {
      const discovered = new Set();
      const key = (tx, ty) => ty * map.w + tx;
      const queue = [start];
      discovered.add(key(start.tx, start.ty));
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const {tx, ty} = queue[cursor];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const at = {tx: tx + dx, ty: ty + dy};
          if (!isFloor(at) || sealDoor && at.tx === lockedDoor.tx && at.ty === lockedDoor.ty) continue;
          const next = key(at.tx, at.ty);
          if (!discovered.has(next)) { discovered.add(next); queue.push(at); }
        }
      }
      return discovered;
    };
    sealed = visit(true);
    released = visit(false);
    const target = gatedDestination.ty * map.w + gatedDestination.tx;
    if (sealed.has(target)) problem('GATE_BYPASS', 'Gated destination remains accessible while gate is sealed.');
    if (!released.has(target)) problem('GATE_STILL_BLOCKED', 'Releasing the gate does not grant destination access.');
    if (released.size !== floorCount) problem('DISCONNECTED_WALKABLE', `${floorCount - released.size} walkable tiles are unreachable after unlocking.`);
    for (const entry of requiredInteractive) {
      if (!isFloor(entry)) continue;
      const tile = entry.ty * map.w + entry.tx;
      if (!sealed.has(tile)) problem('INTERACTIVE_BEHIND_LOCK', `Interactive ${entry.id ?? 'unknown'} cannot be reached before unlocking.`);
    }
    const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dy]) => ({tx: lockedDoor.tx + dx, ty: lockedDoor.ty + dy}))
      .filter(isFloor);
    if (neighbors.length < 2) problem('GATE_NOT_CROSSABLE', 'A door needs two traversable approach tiles for a return route.');
    else if (!neighbors.some(n => sealed.has(n.ty * map.w + n.tx)) ||
             !neighbors.some(n => !sealed.has(n.ty * map.w + n.tx))) {
      problem('NO_RETURN_THROUGH_GATE', 'The gate does not join the locked and unlocked reachable regions.');
    }
  }
  return {
    pass: problems.length === 0,
    problems,
    counts: { walkable: floorCount, reachableWhenSealed: sealed?.size ?? null, reachableWhenReleased: released?.size ?? null },
    reviewStatus: 'structural-only-not-visual-or-device-acceptance'
  };
}
