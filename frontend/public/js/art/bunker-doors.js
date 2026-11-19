// Expansion-only horizontal bulkheads. Collision and animation are still owned by Game.
export function isHorizontalBunkerDoor(mission, entity) {
  return mission?.id === 'm6' && entity?.type === 'door' &&
    (entity.id === 'observatoryDoor' || entity.id === 'lowerDoor');
}

export function drawHorizontalBunkerDoor(c, e) {
  const X = e.tx * 32, Y = e.ty * 32;
  const remaining = Math.round(32 * (1 - Math.max(0, Math.min(1, e.open || 0))));
  // The original vertical leaf turns through 90 degrees: span the real
  // east-west wall opening and retract along that wall, never into the route.
  const R = (color, x, y, w, h) => {
    if (w <= 0 || h <= 0) return;
    c.fillStyle = color; c.fillRect(X + y, Y + x, h, w);
  };
  R('#15170f', 8, 0, 16, 3); R('#15170f', 8, 29, 16, 3);
  if (remaining > 0) {
    R('#15170f', 9, 0, 14, remaining);
    R('#4b5038', 11, 0, 10, remaining - 1);
    R('#5a6044', 11, 0, 1, remaining - 1);
    for (let i = 4; i < remaining - 4; i += 8)
      R(i % 16 ? '#85752c' : '#2a2d20', 13, i, 6, 3);
  }
  R(e.open > .5 ? '#7dffb0' : '#b02a20', 14, 0, 4, 2);
}
