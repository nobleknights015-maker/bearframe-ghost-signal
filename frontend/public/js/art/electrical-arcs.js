// M05-only surface-electrical hazard art. The shared Ghost Signal hazard
// timing, damage, collision and audio remain owned by Game.jetState/updateWorld.
// Never use this presentation for original M01/M02 steam vents.
const T = 32;
const PIX = (c, color, x, y, w, h) => { c.fillStyle = color; c.fillRect(x, y, w, h); };

export function isRelayElectricalArc(mission, entity) {
  return mission?.id === 'm5' && entity?.type === 'jet' &&
    (entity.id === 'arcA' || entity.id === 'arcB' || entity.id === 'arcC');
}

// State comes from the pre-existing jetState(): 0 = quiet, 1 = warning,
// 2 = actively damaging. Never derive a new timer or damage window here.
export function drawRelayElectricalArc(c, entity, state, time, lowFx = false) {
  const X = entity.tx * T, Y = entity.ty * T;
  const s = state === 2 ? 2 : state === 1 ? 1 : 0;
  // Surface relay power conduit, two grounded insulators and a recessed slot.
  PIX(c, '#14242d', X + 1, Y + 12, 30, 10);
  PIX(c, '#516975', X + 1, Y + 12, 30, 2);
  PIX(c, '#0b171d', X + 3, Y + 14, 26, 6);
  PIX(c, '#40535b', X + 3, Y + 20, 26, 2);
  for (const px of [3, 24]) {
    PIX(c, '#0b1118', X + px, Y + 10, 6, 14);
    PIX(c, '#6c8289', X + px + 1, Y + 11, 4, 3);
    PIX(c, '#293e4a', X + px + 1, Y + 15, 4, 6);
  }
  if (s === 0) {
    // Unpowered state has no bright discharge or flash.
    PIX(c, '#506971', X + 11, Y + 16, 10, 2);
    PIX(c, '#263b43', X + 12, Y + 18, 8, 1);
  } else if (s === 1) {
    // Amber warning pattern, permanently recognizable even with reduced FX.
    PIX(c, '#cda453', X + 11, Y + 15, 3, 3);
    PIX(c, '#f5d895', X + 15, Y + 15, 3, 3);
    PIX(c, '#cda453', X + 19, Y + 15, 3, 3);
    PIX(c, '#e0bb67', X + 10, Y + 23, 12, 2);
  } else {
    // Charged, bridged contacts. The white/cyan stepped path is a clearly
    // electrical silhouette at native 32x32 and never fills the whole screen.
    const path = [[7,17,4,2],[10,14,3,4],[12,16,4,2],[15,13,3,5],
      [17,16,4,2],[20,14,3,4],[22,16,4,2]];
    for (const [x,y,w,h] of path) PIX(c, '#28b8da', X + x, Y + y, w, h);
    for (const [x,y,w,h] of [[9,17,3,1],[12,16,3,1],[15,15,3,2],
      [19,16,3,1],[22,16,3,1]]) PIX(c, '#e5faff', X + x, Y + y, w, h);
    PIX(c, '#83ebfa', X + 6, Y + 16, 3, 3);
    PIX(c, '#83ebfa', X + 24, Y + 16, 3, 3);
    if (!lowFx) {
      // Sparse deterministic sparks: no fullscreen blink or photosensitive strobe.
      const shift = Math.floor(time * 8) % 3;
      PIX(c, '#b1f3ff', X + 11 + shift, Y + 9, 2, 2);
      PIX(c, '#78d3ed', X + 21 - shift, Y + 25, 2, 1);
    }
  }
  // Always visible rails: game-state cues don't depend solely on flicker.
  PIX(c, s === 2 ? '#77e7f8' : s === 1 ? '#e1bf75' : '#56737c', X + 4, Y + 6, 24, 2);
  PIX(c, '#111c23', X + 4, Y + 24, 24, 2);
  PIX(c, '#4a636c', X + 7, Y + 25, 18, 1);
}
