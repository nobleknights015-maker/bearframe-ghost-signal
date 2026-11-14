// Procedural pixel-art sheet for Wraith (WTR-07): white/silver plates, dark understructure,
// red visor, chest display, side-head display modules with fins, dark red cloak.
export const FW = 24, FH = 40;
const P = { W: '#dcd6d8', S: '#a49ea6', D: '#6f6a74', K: '#17161c', G: '#34343e', R: '#ff3b30', Rd: '#7a1410',
  C: '#8a1a26', Cd: '#55101a', Cx: '#350a11', B: '#3a2e2a' };

function leg(r, x, l, col = P.W) {
  r(x, 23, 3, 5 - l, col); r(x, 28 - l, 3, 1, P.K); r(x, 29 - l, 3, 5, col); r(x, 31 - l, 1, 2, P.S);
  r(x - 1, 34 - l, 4, 3, col); r(x - 1, 36 - l, 4, 1, P.D); r(x - 1, 37 - l, 4, 1, P.K);
}
function head(r, b, front) {
  r(6, b, 1, 2, P.S); r(6, 2 + b, 2, 3, P.W); r(17, b, 1, 2, P.S); r(16, 2 + b, 2, 3, P.W);
  r(8, 2 + b, 8, 8, P.W); r(9, 1 + b, 6, 1, P.W); r(8, 9 + b, 8, 1, P.S);
  r(6, 5 + b, 2, 4, P.G); r(6, 6 + b, 1, 2, P.R); r(16, 5 + b, 2, 4, P.G); r(17, 6 + b, 1, 2, P.R);
  if (front) {
    r(11, 1 + b, 2, 3, P.G); r(9, 5 + b, 6, 4, P.K); r(11, 5 + b, 2, 5, P.W);
    r(9, 6 + b, 2, 1, P.R); r(13, 6 + b, 2, 1, P.R); r(10, 7 + b, 1, 1, P.R); r(13, 7 + b, 1, 1, P.R);
  } else { r(11, 2 + b, 2, 6, P.G); r(9, 8 + b, 6, 1, P.S); }
}
function arms(r, b, a, strips) {
  r(4, 15 + b, 2, 2, P.K); r(3, 17 + b + a, 3, 4, P.W); r(3, 21 + b + a, 3, 2, P.K);
  r(18, 15 + b, 2, 2, P.K); r(18, 17 + b - a, 3, 4, P.W); r(18, 21 + b - a, 3, 2, P.K);
  if (strips) { r(3, 18 + b + a, 1, 2, P.R); r(20, 18 + b - a, 1, 2, P.R); }
  r(3, 11 + b, 5, 4, P.W); r(3, 14 + b, 5, 1, P.S); r(16, 11 + b, 5, 4, P.W); r(16, 14 + b, 5, 1, P.S);
}

function front(r, f) {
  const b = f % 2, lL = f === 1 ? 2 : 0, lR = f === 3 ? 2 : 0, a = f === 1 ? -1 : f === 3 ? 1 : 0;
  r(4, 12 + b, 16, 20, P.Cd); r(4, 13 + b, 2, 19, P.C); r(18, 13 + b, 2, 19, P.C);
  r(4, 32 + b, 2, 3, P.Cd); r(7, 32 + b, 1, 2, P.Cx); r(18, 32 + b, 2, 2, P.Cd); r(16, 32 + b, 1, 3, P.Cx); r(11, 32 + b, 2, 2, P.Cx);
  leg(r, 8, lL); leg(r, 13, lR); r(11, 23 + b, 2, 3, P.K);
  r(8, 12 + b, 8, 10, P.K); r(8, 13 + b, 3, 3, P.W); r(13, 13 + b, 3, 3, P.W);
  r(10, 14 + b, 4, 3, P.Rd); r(11, 13 + b, 2, 5, P.R);
  r(10, 18 + b, 4, 2, P.W); r(9, 17 + b, 1, 2, P.R); r(14, 17 + b, 1, 2, P.R);
  r(7, 21 + b, 10, 2, P.B); r(11, 21 + b, 2, 2, P.S); r(7, 23 + b, 1, 2, P.B); r(16, 23 + b, 1, 2, P.B);
  arms(r, b, a, true);
  r(7, 10 + b, 10, 2, P.C); r(8, 12 + b, 8, 1, P.Cd);
  head(r, b, true);
}
function back(r, f) {
  const b = f % 2, lL = f === 1 ? 2 : 0, lR = f === 3 ? 2 : 0, a = f === 1 ? -1 : f === 3 ? 1 : 0;
  leg(r, 8, lL); leg(r, 13, lR); arms(r, b, a, false);
  r(5, 11 + b, 14, 22, P.C); r(5, 11 + b, 1, 22, P.Cd); r(18, 11 + b, 1, 22, P.Cd);
  r(8, 13 + b, 1, 19, P.Cd); r(12, 14 + b, 1, 19, P.Cd); r(15, 13 + b, 1, 18, P.Cd);
  r(6, 33 + b, 2, 2, P.C); r(10, 33 + b, 2, 3, P.Cd); r(15, 33 + b, 2, 2, P.C);
  r(7, 10 + b, 10, 2, P.Cd);
  head(r, b, false);
}
function side(r, f) {
  const b = f % 2, sx = f === 1 ? 2 : f === 3 ? -2 : 0, cs = b ? -1 : 0;
  r(5 + cs, 12 + b, 6, 20, P.Cd); r(4 + cs, 16 + b, 2, 15, P.C); r(4 + cs, 31 + b, 2, 3, P.Cd); r(7 + cs, 32 + b, 2, 2, P.Cx);
  if (b) { const fl = f === 1 ? 12 : 8, bl = f === 1 ? 8 : 12; sleg(r, bl, 1, P.S); sleg(r, fl, 0, P.W); } else sleg(r, 10, 0, P.W);
  r(9, 12 + b, 6, 10, P.K); r(12, 13 + b, 3, 4, P.W); r(14, 14 + b, 1, 3, P.R); r(9, 13 + b, 2, 5, P.G);
  r(12, 18 + b, 3, 2, P.W); r(9, 21 + b, 6, 2, P.B); r(10, 23 + b, 2, 2, P.B);
  r(9, 11 + b, 5, 4, P.W); r(9, 14 + b, 5, 1, P.S);
  r(10 + (sx >> 1), 15 + b, 3, 2, P.K); r(10 + sx, 17 + b, 3, 4, P.W); r(10 + sx, 18 + b, 1, 2, P.R); r(10 + sx, 21 + b, 3, 2, P.K);
  r(8, 10 + b, 8, 2, P.C); r(6, 11 + b, 3, 2, P.C);
  r(8, 2 + b, 8, 8, P.W); r(9, 1 + b, 6, 1, P.W); r(13, 5 + b, 3, 4, P.K); r(14, 6 + b, 2, 1, P.R); r(14, 7 + b, 1, 1, P.R);
  r(12, 9 + b, 4, 1, P.S); r(9, 4 + b, 4, 5, P.G); r(10, 5 + b, 2, 3, P.R); r(10, 6 + b, 1, 1, P.Rd);
  r(10, b, 1, 2, P.S); r(10, 2 + b, 2, 2, P.W);
}
function sleg(r, x, l, col) {
  r(x, 23, 4, 5 - l, col); r(x, 28 - l, 4, 1, P.K); r(x, 29 - l, 4, 5, col);
  r(x, 34 - l, 5, 3, col); r(x, 36 - l, 5, 1, P.D); r(x, 37 - l, 5, 1, P.K);
}

export function buildWraith() {
  const sheet = document.createElement('canvas'); sheet.width = FW * 4; sheet.height = FH * 4;
  const c = sheet.getContext('2d');
  [front, back, side].forEach((fn, row) => {
    for (let f = 0; f < 4; f++) fn((x, y, w, h, col) => { c.fillStyle = col; c.fillRect(f * FW + x, row * FH + y, w, h); }, f);
  });
  c.save(); c.scale(-1, 1); c.drawImage(sheet, 0, 2 * FH, FW * 4, FH, -FW * 4, 3 * FH, FW * 4, FH); c.restore();
  // mirrored row reverses frame order; that is fine for a symmetric walk cycle
  const ghost = document.createElement('canvas'); ghost.width = sheet.width; ghost.height = sheet.height;
  const g = ghost.getContext('2d'); g.drawImage(sheet, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(125,255,200,.72)'; g.fillRect(0, 0, ghost.width, ghost.height);
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,.55)';
  for (let y = 0; y < ghost.height; y += 2) g.fillRect(0, y, ghost.width, 1);
  return { sheet, ghost };
}
