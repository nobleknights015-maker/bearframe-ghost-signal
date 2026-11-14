// Bearframe Sprite Rig — reusable parametric humanoid-android pixel-art generator.
// No dependencies, no game code. Used by Bearframe Sprite Studio; usable from any Bearframe Labs project:
//   import { drawAndroid, poseFor, DEFAULT_CFG } from './sprite-rig.js';
//   drawAndroid(ctx, cfg, 'down', poseFor('walk', 2, 6), frameW, frameH);
// The rig is authored on a 32x56 design grid and rasterised at the TARGET resolution: edges, highlights,
// seams, rivets, cloth columns and the outline are drawn per output pixel, so larger canvases gain real
// pixel-level detail instead of being a scaled-up small sprite.
export const DIRS = ['down', 'up', 'right', 'left'];
export const DEFAULT_CFG = {
  head: 'visor', fins: true, modules: true, armor: 'plated', cloak: 'long', build: 0,
  pouches: true, harness: true, backpack: false, antenna: false, damage: 0,
  colors: { armor: '#d2ccd0', trim: '#3b3c47', under: '#121117', glow: '#ff3b30', cloak: '#8f1d2a', leather: '#44342c' },
};
export const PRESETS = {
  'Wraith (WTR-07)': DEFAULT_CFG,
  'Watchtower Sentinel-class': { ...DEFAULT_CFG, head: 'band', fins: false, armor: 'heavy', cloak: 'none', backpack: true, colors: { armor: '#c9cdd4', trim: '#30343c', under: '#111318', glow: '#ff3b30', cloak: '#5a5f6a', leather: '#2f3238' } },
  'Exploration Surveyor': { ...DEFAULT_CFG, head: 'mono', fins: false, armor: 'light', cloak: 'short', backpack: true, antenna: true, colors: { armor: '#d9c9a3', trim: '#4a4233', under: '#17140f', glow: '#39d0c8', cloak: '#2f6b5a', leather: '#5a4630' } },
  'Ancient Frame (weathered)': { ...DEFAULT_CFG, head: 'band', fins: false, modules: false, armor: 'light', cloak: 'none', harness: false, pouches: false, damage: 3, build: -1, colors: { armor: '#4f6b5c', trim: '#8a7f49', under: '#1d2a26', glow: '#bfe9ff', cloak: '#3d5448', leather: '#5a3220' } },
};

const hs = (x, s = 0) => { const n = Math.sin(x * 91.7 + s * 13.3) * 43758.5453; return n - Math.floor(n); };
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), t = f > 0 ? 255 : 0, a = Math.abs(f);
  const ch = s => Math.round(((n >> s) & 255) * (1 - a) + t * a).toString(16).padStart(2, '0');
  return '#' + ch(16) + ch(8) + ch(0);
}
function palette(c) {
  return { W: c.armor, Wh: shade(c.armor, .5), S: shade(c.armor, -.25), D: shade(c.armor, -.5), G: c.trim, Gd: shade(c.trim, -.4), K: c.under, R: c.glow, Rb: shade(c.glow, .5), Rd: shade(c.glow, -.5),
    C: c.cloak, Ch: shade(c.cloak, .22), Cd: shade(c.cloak, -.35), Cx: shade(c.cloak, -.6), B: c.leather, Bd: shade(c.leather, -.4) };
}

// ---- animation pose library (extend freely) ----
const WALK = { b: [0, 1, 0, 0, 1, 0], lL: [0, 3, 2, 0, 0, 0], lR: [0, 0, 0, 0, 3, 2], a: [0, -2, -1, 0, 2, 1], s: [0, 4, 2, 0, -4, -2] };
export const ANIM_TYPES = ['idle', 'walk', 'run', 'scan', 'attack', 'charge', 'hurt', 'malfunction', 'defeat', 'crouch'];
export function poseFor(anim, i, n) {
  const t = n > 1 ? i / n : 0, tl = n > 1 ? i / (n - 1) : 1;
  if (anim === 'attack') { const k = Math.sin(tl * Math.PI); return { b: 0, scan: k > .4 ? 1 : 0, flare: k > .9, hot: k > .4, lean: Math.round(k * 2), a: Math.round(-k * 3), ph: t * 6.28, amp: 2 }; }
  if (anim === 'charge') return { b: 2 + (i % 2), lL: 2, lR: 2, hot: 1, a: -1, ph: t * 12.56, amp: 2.2 };
  if (anim === 'malfunction') return { b: i % 3 === 0 ? 1 : 0, lean: [0, 1, -1, 0, 2, -1][i % 6], a: [0, 3, -2, 1, -3, 2][i % 6], hot: i % 2 === 0, ph: t * 6.28, amp: 1.5 };
  if (anim === 'defeat') return { b: Math.round(tl * 9), lL: Math.round(tl * 3), lR: Math.round(tl * 3), lean: Math.round(tl * 2), a: Math.round(tl * 3), hot: false, ph: 1, amp: .4 };
  if (anim === 'walk' || anim === 'run') { const p = Math.floor(t * 6) % 6; return { b: WALK.b[p], lL: WALK.lL[p], lR: WALK.lR[p], a: WALK.a[p] * (anim === 'run' ? 1.5 : 1), s: WALK.s[p], ph: t * 6.28, amp: anim === 'run' ? 2.4 : 1.7 }; }
  if (anim === 'scan') return { b: 0, scan: 1, hot: 1, flare: i % 2 === 0, ph: t * 6.28, amp: .8 };
  if (anim === 'hurt') return { b: 1 + (i % 2), a: i % 2 ? 2 : -2, hot: i % 2 === 0, ph: t * 6.28, amp: 2.2, lean: i % 2 ? 1 : -1 };
  if (anim === 'crouch') return { b: 4, lL: 3, lR: 3, ph: t * 6.28, amp: .6, hot: i % 2 === 1 };
  return { b: Math.sin(t * 6.28) > 0 ? 1 : 0, ph: t * 6.28, amp: .8, hot: Math.floor(t * 4) === 2 };
}

export function drawAndroid(ctx, cfg, dir, pose, fw, fh, opts = {}) {
  const cv = document.createElement('canvas'); cv.width = fw; cv.height = fh; const c = cv.getContext('2d');
  const K = Math.min(fw / 32, fh / 56), ox = Math.round((fw - 32 * K) / 2) + Math.round((pose.lean || 0) * K), oy = Math.round(fh - 56 * K);
  const P = palette(cfg.colors), hi = K >= 1.5;
  const X = x => ox + Math.round(x * K), Y = y => oy + Math.round(y * K);
  const r = (x, y, w, h, col) => { const x0 = X(x), y0 = Y(y), W = Math.max(1, X(x + w) - x0), H = Math.max(1, Y(y + h) - y0); if (w > 0 && h > 0) { c.fillStyle = col; c.fillRect(x0, y0, W, H); } };
  const pl = (x, y, w, h, dk) => { // shaded plate with pixel-true bevels; adds seams + rivets at higher resolutions
    if (w <= 0 || h <= 0) return; const x0 = X(x), y0 = Y(y), W = Math.max(1, X(x + w) - x0), H = Math.max(1, Y(y + h) - y0);
    c.fillStyle = dk ? P.S : P.W; c.fillRect(x0, y0, W, H); c.fillStyle = dk ? P.W : P.Wh; c.fillRect(x0, y0, W, 1); c.fillRect(x0, y0, 1, H);
    c.fillStyle = dk ? P.D : P.S; if (W > 1) c.fillRect(x0 + W - 1, y0 + 1, 1, H - 1); if (H > 1) c.fillRect(x0 + 1, y0 + H - 1, W - 1, 1);
    if (hi && W > 8 && H > 11) {
      c.fillStyle = dk ? P.D : P.S; c.fillRect(x0 + W - 2, y0 + 2, 1, H - 3); c.fillRect(x0 + 2, y0 + H - 2, W - 3, 1);
      c.fillStyle = P.D; c.fillRect(x0 + 2, y0 + (H >> 1), W - 4, 1); c.fillStyle = dk ? P.S : P.Wh; c.fillRect(x0 + 2, y0 + (H >> 1) + 1, W - 5, 1);
      c.fillStyle = P.G; c.fillRect(x0 + 2, y0 + 2, 1, 1); c.fillRect(x0 + W - 3, y0 + 2, 1, 1);
    }
  };
  const b = pose.b || 0, a = Math.round(pose.a || 0), ph = pose.ph || 0, amp = pose.amp || 1, hot = pose.hot, heavy = cfg.armor === 'heavy', light = cfg.armor === 'light';
  const lw = 5 + (heavy ? 1 : 0) + (cfg.build > 0 ? 1 : 0) - (cfg.build < 0 ? 1 : 0), pw = heavy ? 9 : light ? 5 : 7, glow = hot ? P.Rb : P.R;
  const cloakLen = cfg.cloak === 'long' ? 29 : cfg.cloak === 'short' ? 14 : 0;
  const cols = (x0, x1, fn) => { for (let px = X(x0); px < X(x1); px++) fn((px - ox) / K, px); }; // per output pixel column (cloth detail)
  const col1 = (px, y, len, color) => { const y0 = Y(y), H = Math.max(1, Math.round(len * K)); c.fillStyle = color; c.fillRect(px, y0, 1, H); };
  const wave = x => Math.sin(x * .8 + ph) * amp + Math.floor(hs(Math.round(x * 2)) * 3);
  const dmg = (x, y, w, h, seed) => { // deterministic wear: scratches, scorch, exposed understructure
    for (let i = 0; i < cfg.damage * 3; i++) { const dx = x + hs(seed, i) * (w - 1), dy = y + hs(seed + 7, i) * (h - 1); r(dx, dy, i % 3 ? 1 : 2, i % 3 ? 2 : 1, i % 4 === 0 ? P.K : P.D); }
    if (cfg.damage >= 2 && seed % 2 === 0) { r(x + w * .55, y + h * .35, Math.max(2, w * .35), Math.max(2, h * .4), P.K); r(x + w * .6, y + h * .4, 1, Math.max(1, h * .3), '#7a2b2b'); r(x + w * .75, y + h * .4, 1, Math.max(1, h * .2), '#2b5a6a'); }
    if (cfg.damage >= 3) { r(x, y + h - 2, w, 1, shade(cfg.colors.leather, -.1)); r(x + 1, y + 1, 2, 1, '#6b3a22'); }
  };
  const leg = (x, l, dk, wd = lw) => {
    pl(x, 34, wd, 7 - l, dk); r(x, 36, wd, 1, P.G); r(x, 41 - l, wd, 2, P.K); r(x + 1, 42 - l, wd - 2, 1, P.G); r(x + (wd >> 1), 41 - l, 1, 1, dk ? P.Rd : P.R);
    pl(x, 43 - l, wd, 7, dk); if (heavy) r(x + wd - 2, 45 - l, 1, 3, P.D); pl(x - 1, 50 - l, wd + 1, 3, dk); r(x - 1, 53 - l, wd + 1, 1, P.K);
    if (cfg.damage) dmg(x, 43 - l, wd, 6, x);
  };
  const helmet = (front) => {
    if (cfg.fins) { r(9, b, 1, 4, P.S); r(9, 3 + b, 2, 5, P.W); r(22, b, 1, 4, P.S); r(21, 3 + b, 2, 5, P.W); }
    if (cfg.modules) [8, 21].forEach((mx, i) => { r(mx, 7 + b, 3, 6, P.G); r(mx, 7 + b, 3, 1, P.Gd); r(mx + (i ? 1 : 0), 9 + b, 2, 3, glow); r(mx + 1, 10 + b, 1, 1, P.Rd); });
    if (cfg.antenna) { r(20, b - 2, 1, 6, P.G); r(20, b - 3, 1, 1, glow); }
    pl(11, 3 + b, 10, 12); r(11, 14 + b, 10, 1, P.D); c.clearRect(X(11), Y(3 + b), 1, 1); c.clearRect(X(21) - 1, Y(3 + b), 1, 1);
    if (!front) { r(15, 4 + b, 2, 8, P.G); r(12, 12 + b, 8, 1, P.S); return; }
    if (cfg.head === 'visor') {
      r(15, 3 + b, 2, 4, P.G); r(12, 8 + b, 8, 6, P.K); r(15, 7 + b, 2, 8, P.W); r(15, 7 + b, 1, 8, P.Wh);
      r(12, 9 + b, 3, 1, glow); r(13, 10 + b, 2, 1, P.R); r(14, 11 + b, 1, 1, P.Rd); r(17, 9 + b, 3, 1, glow); r(17, 10 + b, 2, 1, P.R); r(17, 11 + b, 1, 1, P.Rd);
    } else if (cfg.head === 'mono') { r(12, 7 + b, 8, 7, P.K); r(14, 8 + b, 4, 5, P.Gd); r(15, 9 + b, 2, 3, glow); r(15, 9 + b, 1, 1, P.Rb); r(12, 13 + b, 8, 1, P.G); }
    else { r(12, 8 + b, 8, 4, P.K); r(13, 9 + b, 6, 1, glow); r(13, 10 + b, 6, 1, P.Rd); r(15, 12 + b, 2, 3, P.S); }
    if (cfg.damage >= 2) { r(18, 4 + b, 1, 3, P.D); r(19, 6 + b, 1, 2, P.K); }
  };
  const pauldrons = () => { pl(11 - pw, 16 + b, pw, heavy ? 7 : 6); r(11 - pw, 21 + b + (heavy ? 1 : 0), pw, 1, P.D); pl(21, 16 + b, pw, heavy ? 7 : 6); r(21, 21 + b + (heavy ? 1 : 0), pw, 1, P.D); if (cfg.damage) { dmg(11 - pw, 16 + b, pw, 5, 3); dmg(21, 16 + b, pw, 5, 4); } };
  const arms = (strips) => {
    r(6, 22 + b, 3, 3, P.K); r(7, 23 + b, 1, 1, P.G); pl(5, 25 + b + a, 4, 7); r(5, 32 + b + a, 4, 3, P.K); r(6, 33 + b + a, 2, 1, P.G); if (strips) r(5, 27 + b + a, 1, 3, P.R);
    if (pose.scan) { r(23, 21 + b, 3, 3, P.K); pl(23, 14 + b, 4, 7); r(26, 16 + b, 1, 3, P.R); r(23, 11 + b, 4, 3, P.K); r(24, 9 + b, 2, 2, pose.flare ? P.Rb : P.R); if (pose.flare) { r(24, 7 + b, 2, 1, P.R); r(22, 9 + b, 1, 2, P.R); r(27, 9 + b, 1, 2, P.R); } }
    else { r(23, 22 + b, 3, 3, P.K); r(24, 23 + b, 1, 1, P.G); pl(23, 25 + b - a, 4, 7); r(23, 32 + b - a, 4, 3, P.K); r(24, 33 + b - a, 2, 1, P.G); if (strips) r(26, 27 + b - a, 1, 3, P.R); }
  };
  const lx = 16 - lw - 1, rx = 17;

  if (dir === 'down') {
    if (cloakLen) cols(5, 27, (x, px) => { const edge = x < 8 || x > 24; col1(px, 17 + b, cloakLen - 1 + wave(x), edge ? P.C : Math.sin(x * 1.3 + ph * .5) > .6 ? P.Cx : P.Cd); if (Math.abs(x - 6.5) < .5 || Math.abs(x - 25.5) < .5) col1(px, 19 + b, cloakLen - 7 + wave(x), P.Ch); });
    leg(lx, pose.lL || 0); leg(rx, pose.lR || 0); r(15, 34 + b, 2, 4, P.K);
    r(10, 17 + b, 12, 15, P.K); pl(10, 18 + b, 5, 5); pl(17, 18 + b, 5, 5); if (cfg.harness) { r(11, 17 + b, 1, 4, P.B); r(20, 17 + b, 1, 4, P.B); }
    r(14, 20 + b, 4, 4, hot ? P.R : P.Rd); r(15, 18 + b, 2, 7, glow); pl(12, 25 + b, 8, 2); r(13, 28 + b, 6, 2, P.S); r(11, 25 + b, 1, 3, P.R); r(20, 25 + b, 1, 3, P.R);
    if (heavy) { pl(9, 23 + b, 3, 6); pl(20, 23 + b, 3, 6); } if (cfg.damage) dmg(10, 18 + b, 12, 10, 1);
    r(9, 31 + b, 14, 3, P.B); r(9, 33 + b, 14, 1, P.Bd); r(15, 31 + b, 2, 3, P.S); if (cfg.pouches) { r(9, 33 + b, 3, 3, P.Bd); r(20, 33 + b, 3, 3, P.Bd); r(10, 34 + b, 1, 1, P.B); r(21, 34 + b, 1, 1, P.B); }
    arms(true); pauldrons();
    if (cloakLen) { r(10, 14 + b, 12, 3, P.C); r(10, 14 + b, 12, 1, P.Ch); r(11, 17 + b, 10, 1, P.Cd); } else r(13, 15 + b, 6, 2, P.G);
    helmet(true);
  } else if (dir === 'up') {
    leg(lx, pose.lL || 0); leg(rx, pose.lR || 0); arms(false);
    if (!cloakLen || cfg.cloak === 'short') { r(10, 17 + b, 12, 15, P.K); pl(11, 18 + b, 10, 8); r(15, 19 + b, 2, 11, P.G); r(9, 31 + b, 14, 3, P.B); if (cfg.damage) dmg(11, 18 + b, 10, 8, 2); }
    if (cfg.backpack) { r(11, 19 + b, 10, 10, P.Gd); pl(12, 20 + b, 8, 8, true); r(13, 22 + b, 6, 1, glow); }
    if (cloakLen) cols(7, 25, (x, px) => { const f = Math.sin(x * 1.1 + ph * .6); col1(px, 15 + b, cloakLen + 2 + wave(x), x < 8 || x > 24 ? P.Cd : f > .35 ? P.Cd : f < -.75 ? P.Ch : P.C); if (f > .8) col1(px, 22 + b, cloakLen - 9 + wave(x), P.Cx); });
    pauldrons(); if (cloakLen) { r(10, 14 + b, 12, 3, P.Cd); r(10, 14 + b, 12, 1, P.C); } else r(13, 15 + b, 6, 2, P.G);
    helmet(false);
  } else { // right-facing profile; 'left' is mirrored afterwards
    const s = pose.s || 0;
    if (cloakLen) cols(4, 15, (x, px) => { const top = 16 + b + Math.max(0, 9 - x) * 2, len = 17 + cloakLen + wave(x) - top - (s ? 1 : 0); if (len > 0) col1(px - (s && x < 8 ? 1 : 0), top, len, x < 6 ? P.C : Math.sin(x * 1.4 + ph * .5) > .5 ? P.Cx : P.Cd); });
    if (cfg.backpack) { r(8, 18 + b, 4, 10, P.Gd); pl(8, 19 + b, 3, 8, true); r(8, 22 + b, 1, 2, glow); }
    const sl = (x, l, dk) => { pl(x, 34, lw + 1, 7 - l, dk); r(x, 36, lw + 1, 1, P.G); r(x, 41 - l, lw + 1, 2, P.K); r(x + 3, 41 - l, 1, 1, dk ? P.Rd : P.R); pl(x + 1, 43 - l, lw, 7, dk); pl(x, 50 - l, lw + 3, 3, dk); r(x, 53 - l, lw + 3, 1, P.K); };
    if (s) { sl(13 - s, Math.abs(s) === 2 ? 2 : 0, true); sl(13 + s, 0, false); } else { const l = pose.lL || 0; sl(13, l, false); }
    r(12, 17 + b, 8, 15, P.K); r(11, 18 + b, 3, 8, P.G); r(11, 18 + b, 3, 1, P.Gd); pl(15, 18 + b, 5, 6); r(19, 20 + b, 1, 3, glow); pl(15, 25 + b, 4, 3); r(14, 25 + b, 1, 3, P.R);
    if (cfg.damage) dmg(15, 18 + b, 5, 9, 5);
    r(11, 31 + b, 10, 3, P.B); r(11, 33 + b, 10, 1, P.Bd); if (cfg.pouches) { r(12, 32 + b, 4, 4, P.Bd); r(13, 33 + b, 2, 1, P.B); }
    pl(12, 16 + b, pw, 6); r(12, 21 + b, pw, 1, P.D);
    if (pose.scan) { r(16, 22 + b, 3, 3, P.K); pl(18, 23 + b, 7, 4); r(20, 25 + b, 3, 1, P.R); r(25, 23 + b, 3, 4, P.K); r(28, 24 + b, 1, 2, pose.flare ? P.Rb : P.R); if (pose.flare) { r(29, 23 + b, 1, 1, P.R); r(29, 26 + b, 1, 1, P.R); r(30, 24 + b, 1, 2, P.R); } }
    else { r(14 + (a >> 1), 22 + b, 3, 3, P.K); pl(13 + a, 25 + b, 4, 7); r(13 + a, 27 + b, 1, 3, P.R); r(13 + a, 32 + b, 4, 3, P.K); r(14 + a, 33 + b, 2, 1, P.G); }
    if (cloakLen) { r(11, 14 + b, 10, 3, P.C); r(11, 14 + b, 10, 1, P.Ch); r(8, 15 + b, 4, 3, P.C); } else r(14, 15 + b, 5, 2, P.G);
    pl(11, 3 + b, 10, 12); r(15, 14 + b, 6, 1, P.D); c.clearRect(X(11), Y(3 + b), 1, 1); c.clearRect(X(21) - 1, Y(3 + b), 1, 1);
    if (cfg.head === 'visor') { r(17, 8 + b, 4, 6, P.K); r(18, 9 + b, 3, 1, glow); r(18, 10 + b, 2, 1, P.R); r(18, 11 + b, 1, 1, P.Rd); r(20, 12 + b, 1, 3, P.W); }
    else if (cfg.head === 'mono') { r(17, 7 + b, 4, 7, P.K); r(19, 9 + b, 2, 3, glow); r(20, 9 + b, 1, 1, P.Rb); } else { r(16, 8 + b, 5, 4, P.K); r(17, 9 + b, 4, 1, glow); r(17, 10 + b, 4, 1, P.Rd); }
    if (cfg.modules) { r(12, 6 + b, 5, 7, P.G); r(12, 6 + b, 5, 1, P.Gd); r(13, 7 + b, 3, 5, glow); r(14, 8 + b, 1, 3, P.Rd); }
    if (cfg.fins) { r(13, b, 1, 4, P.S); r(13, 3 + b, 2, 4, P.W); } if (cfg.antenna) { r(12, b - 2, 1, 6, P.G); r(12, b - 3, 1, 1, glow); }
  }
  if (opts.outline !== false) outline(c, fw, fh, opts.outlineColor || '#08070b');
  ctx.save(); if (dir === 'left') { ctx.translate(fw, 0); ctx.scale(-1, 1); } ctx.drawImage(cv, 0, 0); ctx.restore();
}

export function outline(c, w, h, col = '#08070b') {
  const img = c.getImageData(0, 0, w, h), d = img.data, src = new Uint8Array(w * h), n = parseInt(col.slice(1), 16);
  for (let i = 0; i < w * h; i++) src[i] = d[i * 4 + 3] > 0 ? 1 : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (src[i]) continue;
    if ((x > 0 && src[i - 1]) || (x < w - 1 && src[i + 1]) || (y > 0 && src[i - w]) || (y < h - 1 && src[i + w])) { d[i * 4] = n >> 16; d[i * 4 + 1] = (n >> 8) & 255; d[i * 4 + 2] = n & 255; d[i * 4 + 3] = 255; } }
  c.putImageData(img, 0, 0);
}
// Joint guide heights (fractions of frame height from the top) for consistent proportions across characters.
export const JOINTS = { head: 3 / 56, shoulder: 16 / 56, hip: 34 / 56, knee: 41 / 56, foot: 54 / 56 };
