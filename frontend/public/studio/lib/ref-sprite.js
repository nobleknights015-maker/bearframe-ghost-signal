// Bearframe Reference-to-Sprite — turns reference artwork into an editable, rigged pixel-art sprite.
// Pure functions on RGBA arrays: no DOM, no network, no AI model, no dependencies beyond machine-rig's colour defaults.
// Pipeline: segment() -> buildPalette() -> pixelize() per view -> buildRig() (parts cut from the reference pixels, joints,
// idle/walk motion, and reconstruction of any view that has no reference). See studio/README.md for limits.
import { DEFAULT_COLORS } from './machine-rig.js';

const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const sv = c => { const mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]); return [mx ? (mx - mn) / mx : 0, mx / 255]; };
const lum = c => c[0] * .299 + c[1] * .587 + c[2] * .114;
export const isGlow = c => { const [s, v] = sv(c); return s > .5 && v > .62; };
export const toHex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const at = (s, x, y) => x < 0 || y < 0 || x >= s.w || y >= s.h ? 0 : s.idx[y * s.w + x];

// 4-connected component labelling. Returns labels (1..n) and areas (index 0 unused).
export function label(W, H, on) {
  const N = W * H, lab = new Int32Array(N), areas = [0], st = [];
  for (let i = 0; i < N; i++) {
    if (!on[i] || lab[i]) continue; const id = areas.length; let a = 0; lab[i] = id; st.push(i);
    while (st.length) {
      const p = st.pop(), x = p % W; a++;
      if (x > 0 && on[p - 1] && !lab[p - 1]) { lab[p - 1] = id; st.push(p - 1); }
      if (x < W - 1 && on[p + 1] && !lab[p + 1]) { lab[p + 1] = id; st.push(p + 1); }
      if (p >= W && on[p - W] && !lab[p - W]) { lab[p - W] = id; st.push(p - W); }
      if (p < N - W && on[p + W] && !lab[p + W]) { lab[p + W] = id; st.push(p + W); }
    }
    areas.push(a);
  }
  return { lab, areas };
}
// Square-window erode (all = true) / dilate (all = false) using an integral image.
function box(src, W, H, r, all) {
  const S = new Int32Array((W + 1) * (H + 1)), out = new Uint8Array(W * H), w1 = W + 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) S[(y + 1) * w1 + x + 1] = (src[y * W + x] ? 1 : 0) + S[y * w1 + x + 1] + S[(y + 1) * w1 + x] - S[y * w1 + x];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const x0 = Math.max(0, x - r), x1 = Math.min(W, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1), n = S[y1 * w1 + x1] - S[y0 * w1 + x1] - S[y1 * w1 + x0] + S[y0 * w1 + x0];
    out[y * W + x] = all ? n === (x1 - x0) * (y1 - y0) : n > 0;
  }
  return out;
}

// ---------- 1. subject / background separation ----------
// Uses the image's own alpha when present. Otherwise learns the background colours from the border of the crop and
// removes everything connected to the border that matches them (a gap-limited flood, so thin dark seams do not leak).
export function segment(px, W, H, opt = {}) {
  const N = W * H, mask = new Uint8Array(N); let tr = 0;
  for (let i = 0; i < N; i++) if (px[i * 4 + 3] < 128) tr++;
  if (tr > N * .02) { for (let i = 0; i < N; i++) mask[i] = px[i * 4 + 3] >= 128 ? 1 : 0; return keepBig(mask, W, H, opt.keep); }
  const tol = opt.tol ?? 28, R = Math.max(1, Math.round(tol / 8)), cnt = new Uint32Array(32768), bins = new Uint8Array(32768), b = Math.max(2, Math.round(Math.min(W, H) * .03));
  const bin = i => ((px[i * 4] >> 3) << 10) | ((px[i * 4 + 1] >> 3) << 5) | (px[i * 4 + 2] >> 3);
  // A colour is background when it is common on the crop border or shows up on 3+ sides (a subject touching one or two edges is not).
  const sides = new Uint8Array(32768); let ring = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < b || y < b || x >= W - b || y >= H - b) { const k = bin(y * W + x); cnt[k]++; ring++; sides[k] |= (x < b ? 1 : 0) | (x >= W - b ? 2 : 0) | (y < b ? 4 : 0) | (y >= H - b ? 8 : 0); }
  const pop = v => (v & 1) + ((v >> 1) & 1) + ((v >> 2) & 1) + ((v >> 3) & 1);
  for (let k = 0; k < 32768; k++) {
    if (cnt[k] < 2 || (cnt[k] < ring * .01 && pop(sides[k]) < 3)) continue; const r0 = k >> 10, g0 = (k >> 5) & 31, b0 = k & 31;
    for (let r = Math.max(0, r0 - R); r <= Math.min(31, r0 + R); r++) for (let g = Math.max(0, g0 - R); g <= Math.min(31, g0 + R); g++) for (let bb = Math.max(0, b0 - R); bb <= Math.min(31, b0 + R); bb++) bins[(r << 10) | (g << 5) | bb] = 1;
  }
  const like = new Uint8Array(N); for (let i = 0; i < N; i++) like[i] = bins[bin(i)];
  const gap = opt.gap ?? Math.max(1, Math.round(Math.min(W, H) / 160)), core = box(like, W, H, gap, true), cl = label(W, H, core), edge = new Set();
  for (let x = 0; x < W; x++) { edge.add(cl.lab[x]); edge.add(cl.lab[(H - 1) * W + x]); }
  for (let y = 0; y < H; y++) { edge.add(cl.lab[y * W]); edge.add(cl.lab[y * W + W - 1]); }
  edge.delete(0); const fl = new Uint8Array(N); for (let i = 0; i < N; i++) fl[i] = edge.has(cl.lab[i]) ? 1 : 0;
  const bg = box(fl, W, H, gap, false); for (let i = 0; i < N; i++) mask[i] = bg[i] && like[i] ? 0 : 1;
  return keepBig(mask, W, H, opt.keep);
}
function keepBig(mask, W, H, keep = .04) {
  const { lab, areas } = label(W, H, mask), mx = Math.max(...areas);
  for (let i = 0; i < W * H; i++) if (mask[i] && areas[lab[i]] < mx * keep) mask[i] = 0;
  return mask;
}
// Manual correction: set the colour-connected region under (x, y) to kept (val 1) or removed (val 0).
export function wand(px, W, H, mask, x, y, tol, val) {
  const o = (y * W + x) * 4, s = [px[o], px[o + 1], px[o + 2]], t2 = tol * tol, seen = new Uint8Array(W * H), st = [y * W + x]; seen[y * W + x] = 1;
  while (st.length) {
    const p = st.pop(), q = p * 4; if (d2([px[q], px[q + 1], px[q + 2]], s) > t2) continue; mask[p] = val; const xx = p % W;
    for (const n of [xx > 0 ? p - 1 : -1, xx < W - 1 ? p + 1 : -1, p - W, p + W]) if (n >= 0 && n < W * H && !seen[n]) { seen[n] = 1; st.push(n); }
  }
}

// ---------- 2. palette + pixel-art conversion ----------
export function buildPalette(sm, n) {
  if (!sm.length) return [[0, 0, 0]]; const cen = [sm[0].slice()], dist = new Float64Array(sm.length).fill(1e12);
  while (cen.length < Math.min(n, sm.length)) { const c = cen[cen.length - 1]; let bi = 0, bd = -1; for (let i = 0; i < sm.length; i++) { const d = d2(sm[i], c); if (d < dist[i]) dist[i] = d; if (dist[i] > bd) { bd = dist[i]; bi = i; } } if (bd < 12) break; cen.push(sm[bi].slice()); }
  for (let it = 0; it < 6; it++) {
    const sum = cen.map(() => [0, 0, 0, 0]);
    for (const p of sm) { let b = 0, bd = 1e12; for (let k = 0; k < cen.length; k++) { const d = d2(p, cen[k]); if (d < bd) { bd = d; b = k; } } const s = sum[b]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++; }
    sum.forEach((s, k) => { if (s[3]) cen[k] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
  }
  return cen.map(c => c.map(Math.round));
}
// Converts the masked subject to an indexed sprite (0 = transparent, i + 1 = pal[i]) at `scale` output px per source px.
// Each output pixel takes the DOMINANT palette colour of its source footprint (no blurry averaging); emissive colours
// get extra votes so small lights and displays survive the reduction.
export function pixelize(px, W, H, mask, scale, pal) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask[y * W + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, tw = Math.max(1, Math.round(bw * scale)), th = Math.max(1, Math.round(bh * scale)), memo = new Int16Array(32768).fill(-1), wt = pal.map(c => isGlow(c) ? 3 : 1);
  const near = o => { const k = ((px[o] >> 3) << 10) | ((px[o + 1] >> 3) << 5) | (px[o + 2] >> 3); if (memo[k] >= 0) return memo[k]; const c = [px[o], px[o + 1], px[o + 2]]; let b = 0, bd = 1e12; for (let i = 0; i < pal.length; i++) { const d = d2(c, pal[i]); if (d < bd) { bd = d; b = i; } } return (memo[k] = b); };
  const idx = new Uint8Array(tw * th), votes = new Float32Array(pal.length);
  for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
    const sx0 = x0 + Math.floor(tx * bw / tw), sx1 = Math.max(sx0 + 1, x0 + Math.floor((tx + 1) * bw / tw)), sy0 = y0 + Math.floor(ty * bh / th), sy1 = Math.max(sy0 + 1, y0 + Math.floor((ty + 1) * bh / th));
    votes.fill(0); let fg = 0;
    for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) if (mask[y * W + x]) { fg++; const k = near((y * W + x) * 4); votes[k] += wt[k]; }
    if (fg < (sx1 - sx0) * (sy1 - sy0) * .4) continue;
    let b = 0; for (let k = 1; k < pal.length; k++) if (votes[k] > votes[b]) b = k; idx[ty * tw + tx] = b + 1;
  }
  const s = { w: tw, h: th, idx }, out = idx.slice(); // despeckle: lone off-colour pixels take their most common neighbour
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const v = idx[y * tw + x]; if (!v || wt[v - 1] > 1) continue; const c = new Map(); let same = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const n = at(s, x + dx, y + dy); if (n === v) same++; else if (n) c.set(n, (c.get(n) || 0) + 1); }
    if (!same && c.size) out[y * tw + x] = [...c].sort((a, b2) => b2[1] - a[1])[0][0];
  }
  s.idx = out; return s;
}

// ---------- sprite helpers ----------
export const mirror = s => { const o = new Uint8Array(s.idx.length); for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) o[y * s.w + x] = s.idx[y * s.w + s.w - 1 - x]; return { w: s.w, h: s.h, idx: o }; };
const remap = (s, set, to) => ({ w: s.w, h: s.h, idx: s.idx.map(v => set.has(v) ? to : v) });
// Symmetric head-on view from one half of a side view (the leading or trailing end becomes the centre line).
function unfold(s, front) {
  const hw0 = Math.ceil(s.w / 2), hw = Math.max(1, Math.round(hw0 * .7)), W = hw * 2, o = new Uint8Array(W * s.h);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < hw; x++) { const h = Math.floor(x * hw0 / hw), v = s.idx[y * s.w + (front ? s.w - hw0 + h : hw0 - 1 - h)]; o[y * W + x] = v; o[y * W + W - 1 - x] = v; }
  return { w: W, h: s.h, idx: o };
}
function sliceLeft(s, f) { const w = Math.max(1, Math.round(s.w * f)), o = new Uint8Array(w * s.h); for (let y = 0; y < s.h; y++) for (let x = 0; x < w; x++) o[y * w + x] = s.idx[y * s.w + x]; return { w, h: s.h, idx: o }; }
function cut(s, inside) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (s.idx[y * s.w + x] && inside(x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null; const w = x1 - x0 + 1, h = y1 - y0 + 1, a = new Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = s.idx[(y + y0) * s.w + x + x0]; a[y * w + x] = String.fromCharCode(48 + (v && inside(x + x0, y + y0) ? v : 0)); }
  return { x0, y0, w, h, d: a.join('') };
}
function meanX(s, inside, ya, yb, dflt) { let sx = 0, n = 0; for (let y = ya; y <= yb; y++) for (let x = 0; x < s.w; x++) if (at(s, x, y) && inside(x, y)) { sx += x + .5; n++; } return n ? Math.round(sx / n) : dflt; }
const newView = (w, h) => ({ parts: [], tex: {}, idle: {}, walk: {}, w, h, info: '' });
function mk(V, id, c, ax, ay, z, par, extra) {
  if (!c) return null; if (!(extra && extra.t)) V.tex[id] = { w: c.w, h: c.h, d: c.d };
  const p = { id, p: par || null, s: 'tex', t: id, x: ax, y: ay, w: c.w, h: c.h, ox: ax - c.x0, oy: ay - c.y0, z, ...extra }; V.parts.push(p); return p;
}

// ---------- 3a. humanoid analysis ----------
function landmarks(s) {
  const { w, h } = s, R = f => Math.min(h - 1, Math.round(f * h)), ext = [];
  for (let y = 0; y < h; y++) { let a = -1, b = -1; for (let x = 0; x < w; x++) if (s.idx[y * w + x]) { if (a < 0) a = x; b = x; } ext.push([a, b]); }
  let sx = 0, n = 0; for (let y = R(.18); y < R(.5); y++) if (ext[y][0] >= 0) { sx += (ext[y][0] + ext[y][1] + 1) / 2; n++; }
  const cx = n ? Math.round(sx / n) : w >> 1;
  let neck = R(.15), best = 1e9; for (let y = R(.08); y <= R(.26); y++) { const d = ext[y][1] - ext[y][0]; if (ext[y][0] >= 0 && d < best) { best = d; neck = y; } }
  let crotch = R(.53), gapFound = false; for (let y = R(.44); y < R(.68); y++) if (!at(s, cx, y) && !at(s, cx, y + 1) && ext[y][0] >= 0 && ext[y][0] < cx && ext[y][1] > cx) { crotch = y; gapFound = true; break; }
  const y0 = R(.3), y1 = Math.max(y0 + 1, crotch - 1), need = (y1 - y0) * .35; let mn = w, mx = 0, shoulder = 0;
  for (let y = y0; y < y1; y++) if (ext[y][0] >= 0) { mn = Math.min(mn, ext[y][0]); mx = Math.max(mx, ext[y][1]); }
  for (let y = neck; y < R(.4); y++) shoulder = Math.max(shoulder, ext[y][1] - ext[y][0] + 1);
  const colT = x => { let t = 0; for (let y = y0; y < y1; y++) if (!at(s, x, y)) t++; return t; };
  const edge = (dir, lim) => { for (let x = cx + dir * 2; dir < 0 ? x > lim : x < lim; x += dir) if (colT(x) >= need) return [x, true]; return [Math.round(cx + dir * .6 * Math.abs(lim - cx)), false]; };
  const [bl, gl] = edge(-1, mn), [br, gr] = edge(1, mx), top = new Uint8Array(w * h); for (let i = 0; i < neck * w; i++) top[i] = s.idx[i] ? 1 : 0;
  const tl = label(w, h, top); let hid = 0; tl.areas.forEach((a, i) => { if (a > tl.areas[hid]) hid = i; });
  const lim = crotch + Math.round(.1 * h);
  const own = (x, y) => y < neck ? (tl.lab[y * w + x] === hid ? 'head' : x < cx ? 'armL' : 'armR') : (x < bl || x > br) && y <= lim ? (x < cx ? 'armL' : 'armR') : y >= crotch ? (x < cx ? 'legL' : 'legR') : 'body';
  return { cx, neck, crotch, bl, br, own, shoulder, info: `head ${Math.round(neck / h * 100)}% of height, legs ${Math.round((h - crotch) / h * 100)}%, shoulder width ${Math.round(shoulder / h * 100)}% of height; leg split ${gapFound ? 'measured' : 'estimated'}, arms ${gl && gr ? 'measured' : 'estimated'}` };
}
function humanoidFront(k, s) {
  const L = landmarks(s), { cx, neck, crotch, own } = L, h = s.h, V = newView(s.w, h), id = n => k + '_' + n, lift = Math.max(1, Math.round(h * .035)), bob = Math.max(.6, h * .012);
  mk(V, id('body'), cut(s, (x, y) => own(x, y) === 'body'), cx, crotch, 5);
  mk(V, id('head'), cut(s, (x, y) => own(x, y) === 'head'), cx, neck, 7, id('body'));
  for (const side of ['L', 'R']) {
    const an = 'arm' + side, ln = 'leg' + side, ac = cut(s, (x, y) => own(x, y) === an), lgIn = (x, y) => own(x, y) === ln || (y >= crotch - 2 && y < crotch && own(x, y) === 'body' && (side === 'L' ? x < cx : x >= cx));
    if (ac) mk(V, id(an), ac, meanX(s, (x, y) => own(x, y) === an, ac.y0, ac.y0 + 3, cx), ac.y0 + 2, 6, id('body'));
    mk(V, id(ln), cut(s, lgIn), meanX(s, (x, y) => own(x, y) === ln, crotch, crotch + 2, cx), crotch, 3);
    const ph = side === 'L' ? 0 : .5; V.walk[id(ln)] = { lift: [lift, ph] }; V.walk[id(an)] = { y: [bob, ph + .5, 1] };
  }
  V.idle[id('body')] = { y: [bob * .8, 0, 1] }; V.walk[id('body')] = { y: [bob, 0, 2] }; V.info = L.info; V.L = L; return V;
}
function humanoidSide(k, s) {
  const L = landmarks(s), { neck } = L, h = s.h, hip = Math.round(h * .55), V = newView(s.w, h), id = n => k + '_' + n, bob = Math.max(.6, h * .012);
  const isHead = (x, y) => y < neck && L.own(x, y) === 'head', lx = meanX(s, () => true, hip, hip + 2, s.w >> 1), lc = cut(s, (x, y) => y >= hip - 2);
  mk(V, id('body'), cut(s, (x, y) => y < hip && !isHead(x, y)), lx, hip, 5); mk(V, id('head'), cut(s, isHead), meanX(s, isHead, Math.max(0, neck - 2), neck, lx), neck, 7, id('body'));
  mk(V, id('legF'), lc, lx, hip, 1, null, { t: id('legN'), dk: 1 }); mk(V, id('legN'), lc, lx, hip, 3);
  V.walk[id('legN')] = { rot: [14, 0], lift: [1, .75] }; V.walk[id('legF')] = { rot: [14, .5], lift: [1, .25] };
  V.idle[id('body')] = { y: [bob * .8, 0, 1] }; V.walk[id('body')] = { y: [bob, 0, 2] }; V.info = 'profile: head / torso / near + far leg (arms stay fused to the torso)'; return V;
}
// Profile rebuilt from a front view: the near-side half of head and torso, with that side's arm and leg re-posed on the body axis.
function humanoidProfile(k, s) {
  const L = landmarks(s), { cx, neck, crotch, own } = L, h = s.h, id = n => k + '_' + n, bob = Math.max(.6, h * .012);
  const hc = cut(s, (x, y) => own(x, y) === 'head'), bc = cut(s, (x, y) => own(x, y) === 'body'); if (!bc) return humanoidSide(k, s);
  const hs = hc && cut(s, (x, y) => own(x, y) === 'head' && x <= cx + Math.round(.15 * hc.w)), bs = cut(s, (x, y) => own(x, y) === 'body' && x <= cx + Math.round(.1 * bc.w)) || bc;
  const ac = cut(s, (x, y) => own(x, y) === 'armL'), lc = cut(s, (x, y) => own(x, y) === 'legL' || (y >= crotch - 2 && y < crotch && own(x, y) === 'body' && x < cx));
  const mid = bs.x0 + bs.w / 2, place = (c, dx) => c && { ...c, x0: c.x0 + dx }, a2 = place(ac, Math.round(mid - (ac ? ac.x0 + ac.w / 2 : 0))), l2 = place(lc, Math.round(mid - (lc ? lc.x0 + lc.w / 2 : 0)));
  const all = [hs, bs, a2, l2].filter(Boolean), minx = Math.min(...all.map(c => c.x0)), W = Math.max(...all.map(c => c.x0 + c.w)) - minx; all.forEach(c => { c.x0 -= minx; });
  const V = newView(W, h), bx = Math.round(bs.x0 + bs.w / 2);
  mk(V, id('body'), bs, bx, crotch, 5); if (hs) mk(V, id('head'), hs, Math.round(hs.x0 + hs.w / 2), neck, 7, id('body'));
  if (l2) { mk(V, id('legF'), l2, bx, crotch, 1, null, { t: id('legN'), dk: 1 }); mk(V, id('legN'), l2, bx, crotch, 3); }
  if (a2) mk(V, id('arm'), a2, Math.round(a2.x0 + a2.w / 2), a2.y0 + 2, 8, id('body'));
  V.walk[id('legN')] = { rot: [14, 0], lift: [1, .75] }; V.walk[id('legF')] = { rot: [14, .5], lift: [1, .25] }; V.walk[id('arm')] = { rot: [10, .5] };
  V.idle[id('body')] = { y: [bob * .8, 0, 1] }; V.walk[id('body')] = { y: [bob, 0, 2] }; V.info = 'profile rebuilt from the front view'; return V;
}

// ---------- 3b. machines of any shape: thick core body + appendages found by morphological opening ----------
function machineView(k, s, side, o = {}) {
  const W = s.w, H = s.h, N = W * H, M = new Uint8Array(N); let area = 0; for (let i = 0; i < N; i++) if (s.idx[i]) { M[i] = 1; area++; }
  const r = Math.max(1, Math.round(Math.min(W, H) * (o.thick ?? .06))), er = box(M, W, H, r, true), core = box(er, W, H, r + 1, false); let any = false;
  for (let i = 0; i < N; i++) { core[i] = core[i] && M[i] ? 1 : 0; if (core[i]) any = true; } if (!any) core.set(M);
  const cl = label(W, H, core); let bid = 1; cl.areas.forEach((a, i) => { if (i && a > cl.areas[bid]) bid = i; });
  const rest = new Uint8Array(N); for (let i = 0; i < N; i++) rest[i] = M[i] && cl.lab[i] !== bid ? 1 : 0;
  const rl = label(W, H, rest), st = rl.areas.map((a, i) => ({ i, a, sx: 0, sy: 0, ax: 0, ay: 0, an: 0, maxy: 0, miny: H })); let bsx = 0, bsy = 0, bn = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, c = rl.lab[i]; if (!c) { if (M[i]) { bsx += x; bsy += y; bn++; } continue; } const t = st[c]; t.sx += x; t.sy += y; t.maxy = Math.max(t.maxy, y); t.miny = Math.min(t.miny, y);
    if ((x > 0 && cl.lab[i - 1] === bid) || (x < W - 1 && cl.lab[i + 1] === bid) || (y > 0 && cl.lab[i - W] === bid) || (y < H - 1 && cl.lab[i + W] === bid)) { t.ax += x + .5; t.ay += y + .5; t.an++; }
  }
  const bcx = Math.round(bsx / bn), bcy = Math.round(bsy / bn), minA = Math.max(3, area * .004), apps = st.slice(1).filter(t => t.a >= minA).sort((a, b) => b.a - a.a).slice(0, o.maxParts || 14), num = new Map(apps.map((t, j) => [t.i, j + 1]));
  const owner = i => num.get(rl.lab[i]) || 0, ground = H - 1 - Math.max(1, Math.round(H * .03)), V = newView(W, H), id = n => k + '_' + n, legs = [], others = [];
  mk(V, id('body'), cut(s, (x, y) => owner(y * W + x) === 0), bcx, bcy, 5);
  for (const t of apps) { t.px = Math.round(t.an ? t.ax / t.an : t.sx / t.a); t.py = Math.round(t.an ? t.ay / t.an : t.sy / t.a); (o.type !== 'floater' && t.an && t.maxy >= ground && t.sy / t.a > bcy ? legs : others).push(t); }
  legs.sort((a, b) => a.px - b.px); const liftPx = Math.max(1, Math.round(H * .03)), stride = Math.max(1.5, W * .04);
  const add = (t, name, z, par) => mk(V, id(name), cut(s, (x, y) => { const ow = owner(y * W + x); return ow === num.get(t.i) || (ow === 0 && Math.abs(x - t.px) <= 2 && Math.abs(y - t.py) <= 2); }), t.px, t.py, z, par);
  legs.forEach((t, j) => { if (!add(t, 'leg' + (j + 1), 3, null)) return; const ph = (j % 2) * .5, A = Math.max(4, Math.min(16, Math.asin(Math.min(.6, stride / Math.max(4, t.maxy - t.py))) * 180 / Math.PI)); V.walk[id('leg' + (j + 1))] = side ? { rot: [A, ph], lift: [liftPx, ph + .75] } : { lift: [liftPx, ph] }; });
  others.forEach((t, j) => { if (!add(t, 'part' + (j + 1), t.sy / t.a < bcy ? 4 : 3, id('body'))) return; V.idle[id('part' + (j + 1))] = { rot: [1.5, j * .17, 1] }; V.walk[id('part' + (j + 1))] = { rot: [2.5, j * .17, 2] }; });
  const fl = legs.length < 2; V.idle[id('body')] = { y: [fl ? Math.max(1, H * .025) : Math.max(.6, H * .01), 0, 1] }; V.walk[id('body')] = fl ? { y: [Math.max(1, H * .025), 0, 1] } : { y: [Math.max(.6, H * .012), 0, 2] };
  V.legs = legs.length; V.info = `core body + ${legs.length} ground leg${legs.length === 1 ? '' : 's'} + ${others.length} other articulated part${others.length === 1 ? '' : 's'}`; return V;
}

// ---------- 4. assemble a Bearframe machine rig (textured parts) for all four directions ----------
function roles(pal, s) {
  const use = new Array(pal.length + 1).fill(0); for (const i of s.idx) use[i]++;
  const pick = f => { let b = -1, bn = 0; pal.forEach((c, i) => { const [sa, v] = sv(c); if (f(sa, v, c) && use[i + 1] > bn) { bn = use[i + 1]; b = i; } }); return b < 0 ? null : toHex(pal[b]); };
  const r = { bone: pick((sa, v) => v > .5 && sa < .4), dark: pick((sa, v) => v > .2 && v <= .5 && sa < .5), under: pick((sa, v) => v <= .2), glow: pick((sa, v, c) => isGlow(c)), accent: pick((sa, v, c) => sa >= .4 && v > .25 && !isGlow(c)) };
  r.cloth = r.accent; for (const key in r) if (!r[key]) delete r[key]; return r;
}
// sp: { down?, up?, right?, left? } indexed sprites from pixelize() (side references face the way their slot says).
export function buildRig(sp, pal, opt = {}) {
  const prim = sp.down || sp.right || sp.left || sp.up; if (!prim) throw new Error('Assign at least one reference view.');
  let type = opt.type && opt.type !== 'auto' ? opt.type : prim.h / prim.w >= 1.35 ? 'humanoid' : 'machine';
  if (type === 'machine') type = machineView('x', prim === sp.left ? mirror(prim) : prim, prim !== sp.down && prim !== sp.up).legs >= 2 ? 'walker' : 'floater';
  const hum = type === 'humanoid', o = { type, thick: opt.thick }, glow = new Set(pal.map((c, i) => isGlow(c) ? i + 1 : 0).filter(Boolean)); let dark = 0; pal.forEach((c, i) => { if (lum(c) < lum(pal[dark])) dark = i; });
  const dg = s => remap(s, glow, dark + 1), R = sp.right, Lm = sp.left && mirror(sp.left), sideRef = R || Lm, src = {};
  const front = sp.down || (sp.up ? mirror(sp.up) : unfold(sideRef, true)), back = sp.up || dg(sp.down ? mirror(sp.down) : unfold(sideRef, false));
  src.down = sp.down ? 'reference' : sp.up ? 'reconstructed: back reference mirrored (no front reference)' : 'reconstructed: leading half of the side reference unfolded symmetrically';
  src.up = sp.up ? 'reference' : sp.down ? 'reconstructed: front silhouette mirrored, emissive details removed' : 'reconstructed: trailing half of the side reference unfolded symmetrically';
  src.right = R ? 'reference' : Lm ? 'mirrored copy of the left reference' : hum ? 'reconstructed from the front view: near-side half, arm and leg re-posed' : 'reconstructed: near-side slice of the front view (low confidence)';
  src.left = sp.left ? 'reference' : R ? 'mirrored copy of the right reference' : src.right;
  const fb = (k, s) => hum ? humanoidFront(k, s) : machineView(k, s, false, o);
  const sd = (k, real, f) => real ? (hum ? humanoidSide(k, real) : machineView(k, real, true, o)) : hum ? humanoidProfile(k, f) : machineView(k, sliceLeft(f, .6), true, o);
  const views = { down: fb('d', front), up: fb('u', back), right: sd('r', R || Lm, front), left: sd('l', Lm || R, mirror(front)) }; // left is built facing right, flipped at render
  const maxW = Math.max(...Object.values(views).map(v => v.w)), maxH = Math.max(...Object.values(views).map(v => v.h));
  const fw = opt.fw || (Math.ceil(maxW * 1.1) + 7 & ~1), fh = opt.fh || maxH + Math.max(2, Math.round(maxH * .04)) + 2;
  const rig = { name: opt.name || 'reference sprite', w: fw, h: fh, tiles: [Math.max(1, Math.round(maxW / 32)), Math.max(1, Math.round(maxW / 64))], colors: { ...DEFAULT_COLORS, ...roles(pal, prim) }, weather: {},
    views: {}, anims: { idle: {}, walk: {}, malfunction: {}, attack: {}, charge: {}, hurt: {}, defeat: {} }, tex: {}, texPal: pal.map(toHex), texGlow: [...glow], flipViews: ['left'] };
  const lines = [`Type: ${type}${opt.type && opt.type !== 'auto' ? '' : ' (auto-detected)'}. Frame ${fw}x${fh}, subject ${prim.w}x${prim.h}px, ${pal.length} colours, ${glow.size} emissive.`];
  for (const d in views) {
    const V = views[d], fx = Math.round((fw - V.w) / 2), fy = fh - 1 - V.h, abs = new Map(V.parts.map(p => [p.id, [p.x, p.y]])), b = V.parts[0].id;
    for (const p of V.parts) { if (p.p) { p.x -= abs.get(p.p)[0]; p.y -= abs.get(p.p)[1]; } else { p.x += fx; p.y += fy; } (V.idle[p.id] = V.idle[p.id] || {}).glow = [.4, 0, 1]; }
    Object.assign(rig.tex, V.tex); Object.assign(rig.anims.idle, V.idle); Object.assign(rig.anims.walk, V.walk); rig.views[d] = V.parts;
    rig.anims.malfunction[b] = { jit: 1.2, flick: .5 }; rig.anims.attack[b] = { x: [Math.max(1, V.w * .05), 0, 1] }; rig.anims.charge[b] = { y: [.6, 0, 3], glow: [.4, 0, 2] }; rig.anims.hurt[b] = { jit: 2 }; rig.anims.defeat[b] = { yTo: Math.max(1, V.h * .04), glowTo: -.6 };
    lines.push(`${d.toUpperCase()}: ${src[d]}. ${V.parts.length} parts — ${V.info}.`);
  }
  rig.ref = { type, sources: src, report: lines.join('\n') };
  return { rig, report: rig.ref.report, type };
}
