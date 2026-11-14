// Procedural pixel-art sheet for Wraith (WTR-07), 32x56 frames (taller than the 32px tile grid).
// White/silver plates with 3-tone shading, gunmetal joints, dark understructure, red visor + chest display,
// side-head display modules with fins, harness, pouches, and a cloth-simulated dark red cloak (per-column hem wave).
// Columns: 0-5 walk cycle, 6-9 idle (breathing, cloak drift, display pulse), 10-11 scanner pose.
// Rows: down, up, right, left. An automatic 1px outline pass keeps the silhouette readable in the dark.
export const FW = 32, FH = 56, WALK = 6, IDLE0 = 6, IDLEN = 4, SCAN0 = 10, COLS = 12;
const P = { Wh: '#f4f0f1', W: '#d2ccd0', S: '#9d96a1', D: '#6c6672', G: '#3b3c47', Gd: '#25262e', K: '#121117', R: '#ff3b30', Rb: '#ffa08c', Rd: '#8a1712',
  C: '#8f1d2a', Ch: '#b32c39', Cd: '#5c1220', Cx: '#370a13', B: '#44342c', Bd: '#2a201b', OL: '#08070b' };
const hs = (x, s = 0) => { const n = Math.sin(x * 91.7 + s * 13.3) * 43758.5453; return n - Math.floor(n); };
const POSES = [];
for (let p = 0; p < 6; p++) POSES.push({ b: [0, 1, 0, 0, 1, 0][p], lL: [0, 3, 2, 0, 0, 0][p], lR: [0, 0, 0, 0, 3, 2][p], a: [0, -2, -1, 0, 2, 1][p], s: [0, 4, 2, 0, -4, -2][p], ph: p * 1.05, amp: 1.7 });
for (let i = 0; i < 4; i++) POSES.push({ b: [0, 0, 1, 1][i], ph: i * 1.57, amp: .8, hot: i === 2 });
for (let j = 0; j < 2; j++) POSES.push({ b: 0, scan: 1, hot: 1, flare: j === 0, ph: j * 1.5, amp: .8 });

// shaded armor plate (light from upper-left); dk = plate on the far side of the body
function pl(r, x, y, w, h, dk) {
  if (h < 1) return; r(x, y, w, h, dk ? P.S : P.W); r(x, y, w, 1, dk ? P.W : P.Wh); r(x, y, 1, h, dk ? P.W : P.Wh);
  if (w > 1) r(x + w - 1, y + 1, 1, h - 1, dk ? P.D : P.S); if (h > 1) r(x + 1, y + h - 1, w - 1, 1, dk ? P.D : P.S);
}
function leg(r, x, l) {
  pl(r, x, 34, 5, 7 - l); r(x, 36, 5, 1, P.G); r(x, 41 - l, 5, 2, P.K); r(x + 1, 42 - l, 3, 1, P.G); r(x + 2, 41 - l, 1, 1, P.R);
  pl(r, x, 43 - l, 5, 7); r(x + 3, 45 - l, 1, 3, P.D); pl(r, x - 1, 50 - l, 6, 3); r(x - 1, 53 - l, 6, 1, P.K);
}
function fins(r, b, hot) {
  r(9, b, 1, 4, P.S); r(9, 3 + b, 2, 5, P.W); r(9, 3 + b, 1, 5, P.Wh); r(22, b, 1, 4, P.S); r(21, 3 + b, 2, 5, P.W); r(22, 3 + b, 1, 5, P.S);
  r(8, 7 + b, 3, 6, P.G); r(8, 7 + b, 3, 1, P.Gd); r(8, 9 + b, 2, 3, hot ? P.Rb : P.R); r(9, 10 + b, 1, 1, P.Rd);
  r(21, 7 + b, 3, 6, P.G); r(21, 7 + b, 3, 1, P.Gd); r(22, 9 + b, 2, 3, hot ? P.Rb : P.R); r(22, 10 + b, 1, 1, P.Rd);
}
function pauldrons(r, b) {
  pl(r, 4, 16 + b, 7, 6); r(4, 21 + b, 7, 1, P.D); r(5, 18 + b, 5, 1, P.S); r(4, 16 + b, 1, 1, P.G);
  pl(r, 21, 16 + b, 7, 6); r(21, 21 + b, 7, 1, P.D); r(22, 18 + b, 5, 1, P.S); r(27, 16 + b, 1, 1, P.G);
}
function arms(r, o, strips) {
  const b = o.b || 0, a = o.a || 0;
  r(6, 22 + b, 3, 3, P.K); r(7, 23 + b, 1, 1, P.G); pl(r, 5, 25 + b + a, 4, 7); r(5, 32 + b + a, 4, 3, P.K); r(6, 33 + b + a, 2, 1, P.G);
  if (strips) r(5, 27 + b + a, 1, 3, P.R);
  if (o.scan) {
    r(23, 21 + b, 3, 3, P.K); pl(r, 23, 14 + b, 4, 7); r(26, 16 + b, 1, 3, P.R); r(23, 11 + b, 4, 3, P.K); r(24, 9 + b, 2, 2, o.flare ? P.Rb : P.R);
    if (o.flare) { r(24, 7 + b, 2, 1, P.R); r(22, 9 + b, 1, 2, P.R); r(27, 9 + b, 1, 2, P.R); }
  } else { r(23, 22 + b, 3, 3, P.K); r(24, 23 + b, 1, 1, P.G); pl(r, 23, 25 + b - a, 4, 7); r(23, 32 + b - a, 4, 3, P.K); r(24, 33 + b - a, 2, 1, P.G); if (strips) r(26, 27 + b - a, 1, 3, P.R); }
}

function front(r, o) {
  const b = o.b || 0;
  for (let x = 5; x <= 26; x++) { // cloak behind the body
    const len = 28 + Math.round(Math.sin(x * .8 + o.ph) * o.amp) + Math.floor(hs(x) * 3), edge = x < 8 || x > 23;
    r(x, 17 + b, 1, len, edge ? P.C : Math.sin(x * 1.3 + o.ph * .5) > .6 ? P.Cx : P.Cd); if (x === 6 || x === 25) r(x, 19 + b, 1, len - 6, P.Ch);
  }
  leg(r, 10, o.lL || 0); leg(r, 17, o.lR || 0); r(15, 34 + b, 2, 4, P.K);
  r(10, 17 + b, 12, 15, P.K); pl(r, 10, 18 + b, 5, 5); pl(r, 17, 18 + b, 5, 5); r(11, 17 + b, 1, 4, P.B); r(20, 17 + b, 1, 4, P.B);
  r(14, 20 + b, 4, 4, o.hot ? P.R : P.Rd); r(15, 18 + b, 2, 7, o.hot ? P.Rb : P.R); r(13, 21 + b, 1, 2, P.Rd); r(18, 21 + b, 1, 2, P.Rd);
  pl(r, 12, 25 + b, 8, 2); r(13, 28 + b, 6, 2, P.S); r(13, 29 + b, 6, 1, P.D); r(11, 25 + b, 1, 3, P.R); r(20, 25 + b, 1, 3, P.R);
  r(9, 31 + b, 14, 3, P.B); r(9, 33 + b, 14, 1, P.Bd); r(15, 31 + b, 2, 3, P.S); r(9, 33 + b, 3, 3, P.Bd); r(20, 33 + b, 3, 3, P.Bd); r(10, 34 + b, 1, 1, P.B); r(21, 34 + b, 1, 1, P.B);
  arms(r, o, true); pauldrons(r, b);
  r(10, 14 + b, 12, 3, P.C); r(10, 14 + b, 12, 1, P.Ch); r(11, 17 + b, 10, 1, P.Cd); r(13, 15 + b, 1, 2, P.Cd); r(18, 15 + b, 1, 2, P.Cd);
  fins(r, b, o.hot);
  pl(r, 11, 3 + b, 10, 12); r(11, 3 + b, 1, 1, P.OL); r(20, 3 + b, 1, 1, P.OL); r(15, 3 + b, 2, 4, P.G); r(11, 14 + b, 10, 1, P.D);
  r(12, 8 + b, 8, 6, P.K); r(15, 7 + b, 2, 8, P.W); r(15, 7 + b, 1, 8, P.Wh);
  const e = o.hot ? P.Rb : P.R;
  r(12, 9 + b, 3, 1, e); r(13, 10 + b, 2, 1, P.R); r(14, 11 + b, 1, 1, P.Rd); r(17, 9 + b, 3, 1, e); r(17, 10 + b, 2, 1, P.R); r(17, 11 + b, 1, 1, P.Rd);
}
function back(r, o) {
  const b = o.b || 0;
  leg(r, 10, o.lL || 0); leg(r, 17, o.lR || 0); arms(r, o, false);
  for (let x = 7; x <= 24; x++) {
    const len = 31 + Math.round(Math.sin(x * .8 + o.ph) * o.amp) + Math.floor(hs(x) * 3), f = Math.sin(x * 1.1 + o.ph * .6);
    r(x, 15 + b, 1, len, x === 7 || x === 24 ? P.Cd : f > .35 ? P.Cd : f < -.75 ? P.Ch : P.C); if (f > .8) r(x, 24 + b, 1, len - 12, P.Cx);
  }
  pauldrons(r, b); r(10, 14 + b, 12, 3, P.Cd); r(10, 14 + b, 12, 1, P.C);
  fins(r, b, o.hot);
  pl(r, 11, 3 + b, 10, 12); r(11, 3 + b, 1, 1, P.OL); r(20, 3 + b, 1, 1, P.OL); r(15, 4 + b, 2, 8, P.G); r(12, 12 + b, 8, 1, P.S); r(13, 13 + b, 6, 1, P.D);
}
function sleg(r, x, l, dk) {
  pl(r, x, 34, 6, 7 - l, dk); r(x, 36, 6, 1, P.G); r(x, 41 - l, 6, 2, P.K); r(x + 3, 41 - l, 1, 1, dk ? P.Rd : P.R);
  pl(r, x + 1, 43 - l, 5, 7, dk); pl(r, x, 50 - l, 8, 3, dk); r(x, 53 - l, 8, 1, P.K);
}
function side(r, o) {
  const b = o.b || 0, s = o.s || 0, a = o.a || 0;
  for (let x = 4; x <= 14; x++) { // cloak trails behind (left of the body)
    const top = 16 + b + Math.max(0, 9 - x) * 2, len = 46 + Math.round(Math.sin(x * .9 + o.ph) * o.amp) + Math.floor(hs(x) * 3) - top - (s ? 1 : 0);
    r(x - (s && x < 8 ? 1 : 0), top, 1, len, x < 6 ? P.C : Math.sin(x * 1.4 + o.ph * .5) > .5 ? P.Cx : P.Cd); if (x === 5) r(x, top + 2, 1, len - 5, P.Ch);
  }
  if (s) { const A = 13 + s, Bx = 13 - s, pass = Math.abs(s) === 2; sleg(r, Bx, pass ? 2 : 0, true); sleg(r, A, 0, false); } else sleg(r, 13, 0, false);
  r(12, 17 + b, 8, 15, P.K); r(11, 18 + b, 3, 8, P.G); r(11, 18 + b, 3, 1, P.Gd); r(11, 22 + b, 3, 1, P.Gd);
  pl(r, 15, 18 + b, 5, 6); r(19, 20 + b, 1, 3, o.hot ? P.Rb : P.R); pl(r, 15, 25 + b, 4, 3); r(14, 25 + b, 1, 3, P.R);
  r(11, 31 + b, 10, 3, P.B); r(11, 33 + b, 10, 1, P.Bd); r(12, 32 + b, 4, 4, P.Bd); r(13, 33 + b, 2, 1, P.B);
  pl(r, 12, 16 + b, 7, 6); r(12, 21 + b, 7, 1, P.D); r(13, 18 + b, 5, 1, P.S);
  if (o.scan) { r(16, 22 + b, 3, 3, P.K); pl(r, 18, 23 + b, 7, 4); r(20, 25 + b, 3, 1, P.R); r(25, 23 + b, 3, 4, P.K); r(28, 24 + b, 1, 2, o.flare ? P.Rb : P.R); if (o.flare) { r(29, 23 + b, 1, 1, P.R); r(29, 26 + b, 1, 1, P.R); r(30, 24 + b, 1, 2, P.R); } }
  else { r(14 + (a >> 1), 22 + b, 3, 3, P.K); pl(r, 13 + a, 25 + b, 4, 7); r(13 + a, 27 + b, 1, 3, P.R); r(13 + a, 32 + b, 4, 3, P.K); r(14 + a, 33 + b, 2, 1, P.G); }
  r(11, 14 + b, 10, 3, P.C); r(11, 14 + b, 10, 1, P.Ch); r(8, 15 + b, 4, 3, P.C); r(8, 17 + b, 4, 1, P.Cd);
  pl(r, 11, 3 + b, 10, 12); r(11, 3 + b, 1, 1, P.OL); r(20, 3 + b, 1, 1, P.OL); r(15, 14 + b, 6, 1, P.D);
  r(17, 8 + b, 4, 6, P.K); r(18, 9 + b, 3, 1, o.hot ? P.Rb : P.R); r(18, 10 + b, 2, 1, P.R); r(18, 11 + b, 1, 1, P.Rd); r(20, 12 + b, 1, 3, P.W);
  r(12, 6 + b, 5, 7, P.G); r(12, 6 + b, 5, 1, P.Gd); r(13, 7 + b, 3, 5, o.hot ? P.Rb : P.R); r(14, 8 + b, 1, 3, P.Rd);
  r(13, b, 1, 4, P.S); r(13, 3 + b, 2, 4, P.W); r(13, 3 + b, 1, 4, P.Wh);
}

function outline(cv) {
  const c = cv.getContext('2d'), w = cv.width, h = cv.height, img = c.getImageData(0, 0, w, h), d = img.data, src = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) src[i] = d[i * 4 + 3] > 0 ? 1 : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (src[i]) continue; const fx = x % FW, fy = y % FH;
    if ((fx > 0 && src[i - 1]) || (fx < FW - 1 && src[i + 1]) || (fy > 0 && src[i - w]) || (fy < FH - 1 && src[i + w])) { d[i * 4] = 8; d[i * 4 + 1] = 7; d[i * 4 + 2] = 11; d[i * 4 + 3] = 255; }
  }
  c.putImageData(img, 0, 0);
}
function tinted(sheet, col, gapY, gapX) {
  const cv = document.createElement('canvas'); cv.width = sheet.width; cv.height = sheet.height;
  const g = cv.getContext('2d'); g.drawImage(sheet, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = col; g.fillRect(0, 0, cv.width, cv.height);
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,.55)';
  for (let y = 0; y < cv.height; y += gapY) g.fillRect(0, y, cv.width, 1);
  if (gapX) { g.fillStyle = 'rgba(0,0,0,.4)'; for (let x = 1; x < cv.width; x += gapX) g.fillRect(x, 0, 1, cv.height); }
  return cv;
}

export function buildWraith() {
  const sheet = document.createElement('canvas'); sheet.width = FW * COLS; sheet.height = FH * 4;
  const c = sheet.getContext('2d');
  [front, back, side].forEach((fn, row) => {
    POSES.forEach((o, f) => fn((x, y, w, h, col) => { if (w > 0 && h > 0) { c.fillStyle = col; c.fillRect(f * FW + x, row * FH + y, w, h); } }, o));
  });
  for (let f = 0; f < COLS; f++) { c.save(); c.translate(f * FW + FW, 3 * FH); c.scale(-1, 1); c.drawImage(sheet, f * FW, 2 * FH, FW, FH, 0, 0, FW, FH); c.restore(); }
  outline(sheet);
  return { sheet, ghost: tinted(sheet, 'rgba(125,255,200,.72)', 2, 0), echo: tinted(sheet, 'rgba(255,190,90,.8)', 2, 3) };
}
