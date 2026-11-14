// Procedural pixel-art sheet for Wraith (WTR-07): white/silver plates, gunmetal trim, dark understructure,
// red visor, chest display, side-head display modules with fins, dark red cloak.
// Columns: 0-3 walk cycle, 4-5 idle (breathing, cloak sway, display pulse), 6 scanner pose. Rows: down, up, right, left.
export const FW = 24, FH = 40, COLS = 7;
const P = { W: '#dcd6d8', S: '#a49ea6', D: '#6f6a74', K: '#17161c', G: '#34343e', R: '#ff3b30', Rb: '#ff8a78', Rd: '#7a1410',
  C: '#8a1a26', Cd: '#55101a', Cx: '#350a11', B: '#3a2e2a' };
const POSES = [
  { b: 0 }, { b: 1, lL: 2, a: -1, cs: 1, step: 1 }, { b: 0, cs: 0 }, { b: 1, lR: 2, a: 1, cs: -1, step: 3 },
  { b: 0 }, { b: 1, cs: 1, hot: 1 }, { b: 0, scan: 1, hot: 1 },
];

function leg(r, x, l, col = P.W) {
  r(x, 23, 3, 5 - l, col); r(x, 24, 3, 1, P.G); r(x, 28 - l, 3, 1, P.K); r(x + 1, 28 - l, 1, 1, P.R); r(x, 29 - l, 3, 5, col); r(x, 31 - l, 1, 2, P.S);
  r(x - 1, 34 - l, 4, 3, col); r(x - 1, 36 - l, 4, 1, P.D); r(x - 1, 37 - l, 4, 1, P.K);
}
function head(r, b, front, hot) {
  r(6, b, 1, 3, P.S); r(6, 2 + b, 2, 3, P.W); r(17, b, 1, 3, P.S); r(16, 2 + b, 2, 3, P.W);
  r(8, 2 + b, 8, 8, P.W); r(9, 1 + b, 6, 1, P.W); r(8, 9 + b, 8, 1, P.S);
  r(6, 5 + b, 2, 4, P.G); r(6, 6 + b, 1, 2, hot ? P.Rb : P.R); r(16, 5 + b, 2, 4, P.G); r(17, 6 + b, 1, 2, hot ? P.Rb : P.R);
  if (front) {
    const e = hot ? P.Rb : P.R;
    r(11, 1 + b, 2, 3, P.G); r(9, 5 + b, 6, 4, P.K); r(11, 5 + b, 2, 5, P.W);
    r(9, 6 + b, 2, 1, e); r(13, 6 + b, 2, 1, e); r(10, 7 + b, 1, 1, P.R); r(13, 7 + b, 1, 1, P.R);
  } else { r(11, 2 + b, 2, 6, P.G); r(9, 8 + b, 6, 1, P.S); }
}
function arms(r, b, a, strips, scan) {
  r(4, 15 + b, 2, 2, P.K); r(3, 17 + b + a, 3, 4, P.W); r(3, 21 + b + a, 3, 2, P.K);
  if (strips) r(3, 18 + b + a, 1, 2, P.R);
  if (scan) { r(18, 14 + b, 2, 2, P.K); r(19, 11 + b, 3, 4, P.W); r(19, 9 + b, 3, 2, P.K); r(20, 8 + b, 1, 1, P.Rb); r(21, 12 + b, 1, 2, P.R); }
  else { r(18, 15 + b, 2, 2, P.K); r(18, 17 + b - a, 3, 4, P.W); r(18, 21 + b - a, 3, 2, P.K); if (strips) r(20, 18 + b - a, 1, 2, P.R); }
  r(3, 11 + b, 5, 4, P.W); r(3, 14 + b, 5, 1, P.S); r(3, 11 + b, 1, 1, P.G); r(16, 11 + b, 5, 4, P.W); r(16, 14 + b, 5, 1, P.S); r(20, 11 + b, 1, 1, P.G);
}

function front(r, o) {
  const b = o.b || 0, cs = o.cs || 0, a = o.a || 0;
  r(4, 12 + b, 16, 14, P.Cd); r(4, 13 + b, 2, 13, P.C); r(18, 13 + b, 2, 13, P.C);
  r(4 + cs, 26 + b, 16, 6, P.Cd); r(4 + cs, 26 + b, 2, 6, P.C); r(18 + cs, 26 + b, 2, 6, P.C);
  r(4 + cs, 32 + b, 2, 3, P.Cd); r(7 + cs, 32 + b, 1, 2, P.Cx); r(18 + cs, 32 + b, 2, 2, P.Cd); r(16 + cs, 32 + b, 1, 3, P.Cx); r(11 + cs, 32 + b, 2, 2, P.Cx);
  leg(r, 8, o.lL || 0); leg(r, 13, o.lR || 0); r(11, 23 + b, 2, 3, P.K);
  r(8, 12 + b, 8, 10, P.K); r(8, 13 + b, 3, 3, P.W); r(13, 13 + b, 3, 3, P.W); r(9, 12 + b, 1, 2, P.B); r(14, 12 + b, 1, 2, P.B);
  r(10, 14 + b, 4, 3, o.hot ? P.R : P.Rd); r(11, 13 + b, 2, 5, o.hot ? P.Rb : P.R);
  r(10, 18 + b, 4, 2, P.W); r(9, 17 + b, 1, 2, P.R); r(14, 17 + b, 1, 2, P.R);
  r(7, 21 + b, 10, 2, P.B); r(11, 21 + b, 2, 2, P.S); r(7, 23 + b, 1, 2, P.B); r(16, 23 + b, 1, 2, P.B);
  arms(r, b, a, true, o.scan);
  r(7, 10 + b, 10, 2, P.C); r(8, 12 + b, 8, 1, P.Cd);
  head(r, b, true, o.hot);
}
function back(r, o) {
  const b = o.b || 0, cs = o.cs || 0;
  leg(r, 8, o.lL || 0); leg(r, 13, o.lR || 0); arms(r, b, o.a || 0, false, o.scan);
  r(5, 11 + b, 14, 15, P.C); r(5 + cs, 26 + b, 14, 7, P.C); r(5, 11 + b, 1, 15, P.Cd); r(18, 11 + b, 1, 15, P.Cd); r(5 + cs, 26 + b, 1, 7, P.Cd); r(18 + cs, 26 + b, 1, 7, P.Cd);
  r(8, 13 + b, 1, 13, P.Cd); r(12, 14 + b, 1, 12, P.Cd); r(15, 13 + b, 1, 13, P.Cd);
  r(8 + cs, 26 + b, 1, 6, P.Cd); r(12 + cs, 26 + b, 1, 7, P.Cd); r(15 + cs, 26 + b, 1, 5, P.Cd);
  r(6 + cs, 33 + b, 2, 2, P.C); r(10 + cs, 33 + b, 2, 3, P.Cd); r(15 + cs, 33 + b, 2, 2, P.C);
  r(7, 10 + b, 10, 2, P.Cd);
  head(r, b, false, o.hot);
}
function sleg(r, x, l, col) {
  r(x, 23, 4, 5 - l, col); r(x, 24, 4, 1, P.G); r(x, 28 - l, 4, 1, P.K); r(x, 29 - l, 4, 5, col);
  r(x, 34 - l, 5, 3, col); r(x, 36 - l, 5, 1, P.D); r(x, 37 - l, 5, 1, P.K);
}
function side(r, o) {
  const b = o.b || 0, f = o.step || 0, sx = f === 1 ? 2 : f === 3 ? -2 : 0, cs = o.cs ? -1 : 0;
  r(5, 12 + b, 6, 12, P.Cd); r(5 + cs, 24 + b, 6, 8, P.Cd); r(4 + cs, 16 + b, 2, 15, P.C); r(4 + cs * 2, 31 + b, 2, 3, P.Cd); r(7 + cs, 32 + b, 2, 2, P.Cx);
  if (f) { const fl = f === 1 ? 12 : 8, bl = f === 1 ? 8 : 12; sleg(r, bl, 1, P.S); sleg(r, fl, 0, P.W); } else sleg(r, 10, 0, P.W);
  r(9, 12 + b, 6, 10, P.K); r(12, 13 + b, 3, 4, P.W); r(14, 14 + b, 1, 3, o.hot ? P.Rb : P.R); r(9, 13 + b, 2, 5, P.G);
  r(12, 18 + b, 3, 2, P.W); r(9, 21 + b, 6, 2, P.B); r(10, 23 + b, 2, 2, P.B);
  r(9, 11 + b, 5, 4, P.W); r(9, 14 + b, 5, 1, P.S); r(9, 11 + b, 1, 1, P.G);
  if (o.scan) { r(11, 15 + b, 3, 2, P.K); r(13, 16 + b, 5, 3, P.W); r(14, 17 + b, 2, 1, P.R); r(18, 16 + b, 2, 3, P.K); r(20, 17 + b, 1, 1, P.Rb); }
  else { r(10 + (sx >> 1), 15 + b, 3, 2, P.K); r(10 + sx, 17 + b, 3, 4, P.W); r(10 + sx, 18 + b, 1, 2, P.R); r(10 + sx, 21 + b, 3, 2, P.K); }
  r(8, 10 + b, 8, 2, P.C); r(6 + cs, 11 + b, 3, 2, P.C);
  r(8, 2 + b, 8, 8, P.W); r(9, 1 + b, 6, 1, P.W); r(13, 5 + b, 3, 4, P.K); r(14, 6 + b, 2, 1, o.hot ? P.Rb : P.R); r(14, 7 + b, 1, 1, P.R);
  r(12, 9 + b, 4, 1, P.S); r(9, 4 + b, 4, 5, P.G); r(10, 5 + b, 2, 3, o.hot ? P.Rb : P.R); r(10, 6 + b, 1, 1, P.Rd);
  r(10, b, 1, 3, P.S); r(10, 2 + b, 2, 2, P.W);
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
    POSES.forEach((o, f) => fn((x, y, w, h, col) => { c.fillStyle = col; c.fillRect(f * FW + x, row * FH + y, w, h); }, o));
  });
  for (let f = 0; f < COLS; f++) { // left-facing row = per-frame mirror of right-facing row
    c.save(); c.translate(f * FW + FW, 3 * FH); c.scale(-1, 1); c.drawImage(sheet, f * FW, 2 * FH, FW, FH, 0, 0, FW, FH); c.restore();
  }
  return { sheet, ghost: tinted(sheet, 'rgba(125,255,200,.72)', 2, 0), echo: tinted(sheet, 'rgba(255,190,90,.8)', 2, 3) };
}
