// Bearframe Machine Rig — generic skeletal, multi-part pixel-art rasteriser for machines of any size or shape
// (humanoid titans, quadrupeds, hexapods, flyers, drones, bosses, structures). No dependencies beyond sprite-rig's outline.
//
// rig = { w, h, tiles:[tw,th], colors:{bone,dark,under,glow,accent,cloth,moss,rust,brass}, weather:{rust,moss,wear},
//         views:{ down:[parts], up:[parts], right:[parts] (left = mirrored right unless given) },
//         anims:{ walk:{ partId:{ rot:[amp,phase,mult], x:[..], y:[..], lift:[amp,phase], rotTo, xTo, yTo, jit,
//                                 glow:[amp,phase,mult], glowTo, flick, spin, spinJit } } } }
// part = { id, p:parentId, s:shape, x, y (pivot position in the parent's local frame), w, h, ox, oy (pivot inside the part),
//          r (rest rotation, degrees), z, c (colour role), g (glow role), dk (far-side shading), ...shape options }
// Shapes: plate, taper, disc, ring, cable, banner, glass.
// Every part is rasterised per OUTPUT pixel through its inverse transform with no anti-aliasing, so rotated parts stay
// crisp and bevels, seams, rivets, vents, rust, chips and moss are generated at the target resolution.
import { outline } from './sprite-rig.js';

const TAU = Math.PI * 2;
const h2 = (x, y, s = 0) => { const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); };
const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const tones = c => [mix(c, [255, 255, 255], .45), c, mix(c, [0, 0, 0], .28), mix(c, [0, 0, 0], .55)];
const seeds = new Map();
const seedOf = id => { let s = seeds.get(id); if (s === undefined) { s = 0; for (const ch of id) s = (s * 31 + ch.charCodeAt(0)) % 997; seeds.set(id, s); } return s; };
export const SHAPES = ['plate', 'taper', 'disc', 'ring', 'cable', 'banner', 'glass', 'tex'];
export const COLOR_ROLES = ['bone', 'dark', 'under', 'glow', 'accent', 'cloth', 'moss', 'rust', 'brass'];
export const DEFAULT_COLORS = { bone: '#b9b2a4', dark: '#3a3f47', under: '#14161b', glow: '#3fd8e6', accent: '#d9772b', cloth: '#8a3b33', moss: '#5d7a2e', rust: '#8a4a26', brass: '#a58b4a' };

function evalPart(rig, p, type, i, n) {
  const ch = (rig.anims[type] || {})[p.id] || {}, t = n > 0 ? i / n : 0, tl = n > 1 ? i / (n - 1) : 1, ez = tl * tl * (3 - 2 * tl), sd = seedOf(p.id);
  const osc = k => { const a = ch[k]; return a ? a[0] * Math.sin(TAU * ((a[2] ?? 1) * t + (a[1] || 0))) : 0; };
  const jit = (k, s) => ch.jit ? (h2(i * 7 + s, sd) - .5) * 2 * ch.jit * k : 0;
  let rot = (p.r || 0) + osc('rot') + (ch.rotTo || 0) * ez + jit(1, 1), x = p.x + osc('x') + (ch.xTo || 0) * ez + jit(.2, 2), y = p.y + osc('y') + (ch.yTo || 0) * ez + jit(.2, 3);
  if (ch.lift) y -= ch.lift[0] * Math.max(0, Math.sin(TAU * (t + (ch.lift[1] || 0))));
  if (p.rm != null) { const dv = rot - (p.r || 0); y -= p.rm > 0 ? Math.max(0, dv) * p.rm : Math.abs(dv) * -p.rm; rot = p.r || 0; } // front/back views: swing becomes lift
  const glow = Math.max(0, Math.min(1, .6 + osc('glow') + (ch.glowTo || 0) * ez - (ch.flick && h2(i, 3, sd) > .5 ? ch.flick : 0)));
  const spin = TAU * 3 / (p.seg || 12) * (ch.spin || 0) * t + (ch.spinJit ? (h2(i, 5, sd) - .5) * ch.spinJit : 0);
  return { rot, x, y, glow, spin, sway: TAU * t + sd, tt: t };
}

function shadePlate(p, u, v, w, h, e, K, M, T, pal, W, sd, taper) {
  let hw = w / 2; const cu = u - w / 2;
  if (taper != null) { hw = (w / 2) * (1 - (1 - taper) * v / h); if (Math.abs(cu) > hw) return null; }
  const dl = cu + hw, dr = hw - cu, dt = v, db = h - v;
  if (taper == null) { const ch = Math.min(2, w / 4, h / 4); if (dl + dt < ch || dr + dt < ch || dl + db < ch || dr + db < ch) return null; }
  const d = Math.min(dl, dr, dt, db), pu = Math.floor(u * K), pv = Math.floor(v * K), n = h2(pu, pv, sd);
  let nx = 0, ny = 0; if (d === dl) nx = -1; else if (d === dr) nx = 1; else if (d === dt) ny = -1; else ny = 1;
  const lit = (M.c * nx - M.s * ny) * -.6 + (M.s * nx + M.c * ny) * -.8 > 0;
  if (d < e) { if (W.wear && h2(pu >> 1, pv >> 1, sd + 3) < W.wear * .28) return null; return lit ? T[0] : T[3]; }
  let col = T[1];
  if (K >= 1.5 && d < 2 * e) col = lit ? T[1] : T[2];
  else if (cu / hw + (v / h) * 2 - 1 > .9) col = T[2];
  if (h >= 9) { const sv = v - h * .5; if (Math.abs(sv) < e * .5) col = T[3]; else if (K >= 1.5 && sv >= e * .5 && sv < e * 1.5) col = T[0]; }
  if (w >= 16 && Math.abs(cu) < e * .5) col = T[3];
  if (w >= 8 && h >= 6 && Math.abs(dt - 2) < e * .5 && (Math.abs(dl - 2) < e * .5 || Math.abs(dr - 2) < e * .5)) col = T[3];
  if (w >= 10 && h >= 12 && v > h * .64 && v < h * .86 && Math.abs(cu) < hw * .5 && pv % 3 === 0) col = T[3];
  if (W.rust) { const b = h2(Math.floor(u / 3), Math.floor(v / 3), sd + 9); if (b > 1 - W.rust * .26) col = n > .5 ? pal.rust[1] : pal.rust[2]; else if (b > 1 - W.rust * .42 && n > .55) col = pal.rust[2]; }
  if (W.wear && n < W.wear * .06) col = T[3];
  if (W.moss && p.m && v < h2(Math.floor(u * K / 2), 0, sd + 5) * W.moss * p.m * 5) col = n > .4 ? pal.moss[1] : pal.moss[2];
  return col;
}
function shadeDisc(p, u, v, w, h, e, K, M, T, pal, L) {
  const rx = w / 2, ry = h / 2, x = (u - rx) / rx, y = (v - ry) / ry, q = x * x + y * y; if (q >= 1) return null;
  const mr = Math.min(rx, ry), d = (1 - Math.sqrt(q)) * mr;
  if (p.g) {
    const G = pal[p.g]; if (mr * K >= 3) { if (d < e) return pal.dark[3]; if (d < 2 * e) return pal.dark[1]; }
    return q < .14 * (.4 + L) ? G[0] : q < .55 * (.4 + L) ? G[1] : L > .25 ? G[2] : G[3];
  }
  if (d < e) return (M.c * x - M.s * y) * -.6 + (M.s * x + M.c * y) * -.8 > 0 ? T[0] : T[3];
  return q < .18 ? T[3] : x + y > .5 ? T[2] : T[1];
}
function shadeRing(p, u, v, w, h, e, K, T, pal, L, st, W, sd) {
  const rx = w / 2, ry = h / 2, x = (u - rx) / rx, y = (v - ry) / ry, q = x * x + y * y; if (q >= 1) return null;
  const th = p.th || 3, irx = Math.max(.5, rx - th), iry = Math.max(.5, ry - th * Math.max(.35, ry / rx)), xi = (u - rx) / irx, yi = (v - ry) / iry, qi = xi * xi + yi * yi;
  if (qi < 1 || (p.half === 'back' && v >= ry) || (p.half === 'front' && v < ry)) return null;
  const seg = p.seg || 12; let a = (Math.atan2(y, x) + st.spin) / TAU; a -= Math.floor(a); const si = Math.floor(a * seg), f = a * seg - si;
  if (h2(si, 7, sd) < (p.broken || 0) * (W.wear ? 1 : 0)) return null;
  if (f < .07 || f > .93) return pal.under[1];
  const so = 1 - Math.sqrt(q), band = so / (so + Math.sqrt(qi) - 1 + 1e-6), flat = ry < rx * .6, back = flat && v < ry;
  if (p.g && si % 3 === 0 && f > .25 && f < .75 && band > .28 && band < .72) return L > .6 ? pal[p.g][0] : L > .25 ? pal[p.g][1] : pal[p.g][3];
  let col = back ? (band > .6 ? T[3] : T[2]) : band > .65 ? T[0] : band < .15 ? T[2] : T[1];
  const pu = Math.floor(u * K), pv = Math.floor(v * K);
  if (W.rust && h2(si, Math.floor(band * 3), sd + 2) > 1 - W.rust * .4) col = h2(pu, pv, sd) > .5 ? pal.rust[1] : pal.rust[2];
  if (W.moss && p.m && !back && band > .55 && h2(pu >> 1, pv >> 1, sd + 4) < W.moss * .4 * p.m) col = h2(pu, pv, sd) > .4 ? pal.moss[1] : pal.moss[2];
  return col;
}
function shadeCable(p, u, v, w, h, K, T, pal, st, sd) {
  if (v < 0 || v >= h) return null; const n = p.n || 6, i = Math.floor(u / w * n);
  for (let j = i - 1; j <= i + 1; j++) {
    if (j < 0 || j >= n) continue; const len = h * (.35 + .65 * h2(j, 1, sd)); if (v > len) continue;
    const us = (j + .2 + .6 * h2(j, 2, sd)) * w / n + Math.sin(v * .22 + st.sway + j) * (p.amp ?? 1.2) * (v / h);
    if (Math.floor(u * K) === Math.floor(us * K)) return p.g && v > len - 1.3 ? pal[p.g][1] : Math.floor(v * K) % 4 ? T[1] : T[2];
  }
  return null;
}
function shadeBanner(p, u, v, w, h, e, K, T, pal, st, W, sd) {
  if (v < 0 || v >= h) return null; const uu = u - Math.sin(v * .25 + st.sway) * (p.amp ?? 1) * (v / h); if (uu < 0 || uu >= w) return null;
  const col = Math.floor(uu * K), pv = Math.floor(v * K); if (v > h * (.7 + .3 * h2(col >> 1, 3, sd))) return null;
  if (W.wear && v > h * .3 && h2(col >> 1, pv >> 1, sd) < W.wear * .08) return null;
  if (p.g) { const cx = Math.abs(uu - w / 2), cy = Math.abs(v - h * .4), dd = cx + cy; if (dd < w * .3 && dd > w * .16) return pal[p.g][1]; if (dd < e) return pal[p.g][1]; }
  const f = Math.sin(uu * 1.3 + st.sway * .7 + v * .12);
  return v < e ? T[0] : f > .5 ? T[3] : f < -.6 ? T[0] : uu > w * .7 ? T[2] : T[1];
}
function shadeGlass(p, u, v, w, h, e, K, pal, L, st, sd) {
  if (u < 0 || u >= w || v < 0 || v >= h) return null; const G = pal[p.g || 'glow'], B = pal.brass;
  if (Math.min(u, w - u) < e) return B[2]; if (v < e || h - v < e) return B[3]; if ((v / h * 5) % 1 < .1) return B[1];
  const cp = Math.floor(u * K), ds = Math.abs(v - st.tt * h), lv = L + (ds < 2 ? .5 : 0) + (h2(cp, Math.floor(v * K / 2) + Math.floor(st.tt * 8), sd) > .8 ? .3 : 0);
  return cp % 3 === 0 ? (lv > .7 ? G[0] : G[1]) : lv > .95 ? G[0] : lv > .45 ? G[1] : lv > .12 ? G[2] : G[3];
}

// Textured part: pixels cut from reference artwork (rig.tex[id] = { w, h, d }, one char per pixel indexing rig.texPal).
const texCache = new WeakMap();
function shadeTex(rig, p, u, v, L) {
  const t = rig.tex && rig.tex[p.t]; if (!t) return null; const i = t.d.charCodeAt(Math.floor(v) * t.w + Math.floor(u)) - 48; if (!(i > 0)) return null;
  let pc = texCache.get(rig); if (!pc) { pc = { pal: rig.texPal.map(hex), glow: new Set(rig.texGlow || []) }; texCache.set(rig, pc); }
  let c = pc.pal[i - 1]; if (!c) return null;
  if (pc.glow.has(i)) c = L > .8 ? mix(c, [255, 255, 255], .3) : L < .35 ? mix(c, [0, 0, 0], .3) : c;
  return p.dk ? mix(c, [0, 0, 0], .38) : c;
}
// Renders one frame. Returns pivot markers [{id,x,y}] in frame pixels (for rig overlays / part picking).
export function renderRig(ctx, rig, dir, type, i, n, fw, fh, opts = {}) {
  let view = rig.views[dir], flip = false;
  if (!view) { if (dir === 'left' && rig.views.right) { view = rig.views.right; flip = true; } else if (dir === 'right' && rig.views.left) { view = rig.views.left; flip = true; } else view = rig.views.right || rig.views.down || Object.values(rig.views)[0]; }
  else if ((rig.flipViews || []).includes(dir)) flip = true;
  const K = Math.min(fw / rig.w, fh / rig.h), offX = Math.round((fw - rig.w * K) / 2), offY = Math.round(fh - rig.h * K), e = 1 / K;
  const pal = {}, palD = {}; for (const k in DEFAULT_COLORS) { const t = tones(hex((rig.colors || {})[k] || DEFAULT_COLORS[k])); pal[k] = t; palD[k] = [t[1], t[2], t[3], mix(t[3], [0, 0, 0], .3)]; }
  const wz = rig.weather || {}, byId = new Map(view.map(p => [p.id, p])), Ms = new Map();
  const world = p => {
    let M = Ms.get(p.id); if (M) return M; const st = evalPart(rig, p, type, i, n), par = p.p && byId.get(p.p) && p.p !== p.id ? world(byId.get(p.p)) : null;
    const a = (par ? par.a : 0) + st.rot * Math.PI / 180, tx = par ? par.tx + par.c * st.x - par.s * st.y : st.x, ty = par ? par.ty + par.s * st.x + par.c * st.y : st.y;
    M = { a, c: Math.cos(a), s: Math.sin(a), tx, ty, st }; Ms.set(p.id, M); return M;
  };
  const marks = () => view.map(p => { const M = world(p), x = M.tx * K + offX; return { id: p.id, x: flip ? fw - x : x, y: M.ty * K + offY }; });
  if (opts.pivotsOnly) return marks();
  const img = new ImageData(fw, fh), D = img.data;
  const order = view.map((p, k) => [p, k]).sort((A, B) => ((A[0].z || 0) - (B[0].z || 0)) || A[1] - B[1]);
  for (const [p] of order) {
    const M = world(p), w = p.w, h = p.h, ox = p.ox ?? w / 2, oy = p.oy ?? 0, mg = p.s === 'cable' || p.s === 'banner' ? 3 : 0, sd = seedOf(p.sd || p.id);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [lx, ly] of [[-ox - mg, -oy], [w - ox + mg, -oy], [-ox - mg, h - oy], [w - ox + mg, h - oy]]) { const X = M.tx + M.c * lx - M.s * ly, Y = M.ty + M.s * lx + M.c * ly; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); }
    const pxa = Math.max(0, Math.floor(x0 * K) + offX), pxb = Math.min(fw - 1, Math.ceil(x1 * K) + offX), pya = Math.max(0, Math.floor(y0 * K) + offY), pyb = Math.min(fh - 1, Math.ceil(y1 * K) + offY);
    const T = (p.dk ? palD : pal)[p.c || 'bone'], P2 = p.dk ? palD : pal, L = M.st.glow, wx = p.wx ?? 1, W = { rust: (wz.rust || 0) * wx, moss: (wz.moss || 0) * wx, wear: (wz.wear || 0) * wx };
    for (let py = pya; py <= pyb; py++) for (let px = pxa; px <= pxb; px++) {
      const dx = (px + .5 - offX) / K - M.tx, dy = (py + .5 - offY) / K - M.ty, u = M.c * dx + M.s * dy + ox, v = -M.s * dx + M.c * dy + oy; let col = null;
      if (p.s === 'cable') col = shadeCable(p, u, v, w, h, K, T, P2, M.st, sd);
      else if (p.s === 'banner') col = shadeBanner(p, u, v, w, h, e, K, T, P2, M.st, W, sd);
      else if (u < 0 || u >= w || v < 0 || v >= h) continue;
      else if (p.s === 'tex') col = shadeTex(rig, p, u, v, L);
      else if (p.s === 'disc') col = shadeDisc(p, u, v, w, h, e, K, M, T, P2, L);
      else if (p.s === 'ring') col = shadeRing(p, u, v, w, h, e, K, T, P2, L, M.st, W, sd);
      else if (p.s === 'glass') col = shadeGlass(p, u, v, w, h, e, K, P2, L, M.st, sd);
      else col = shadePlate(p, u, v, w, h, e, K, M, T, P2, W, sd, p.s === 'taper' ? (p.t ?? .1) : null);
      if (col) { const o = (py * fw + px) * 4; D[o] = col[0]; D[o + 1] = col[1]; D[o + 2] = col[2]; D[o + 3] = 255; }
    }
  }
  const cv = document.createElement('canvas'); cv.width = fw; cv.height = fh; const c = cv.getContext('2d'); c.putImageData(img, 0, 0);
  if (opts.outline !== false) outline(c, fw, fh, opts.outlineColor || '#06070a');
  ctx.save(); if (flip) { ctx.translate(fw, 0); ctx.scale(-1, 1); } ctx.drawImage(cv, 0, 0); ctx.restore();
  return marks();
}
