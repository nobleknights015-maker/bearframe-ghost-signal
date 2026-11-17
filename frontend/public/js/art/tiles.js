// Procedural environment art: baked 32x32 tile map + dynamic entity / drone drawing.
const T = 32;
const hsh = (x, y, s = 0) => { const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); };
const R = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, w, h); };

function rust(c, X, Y, x, y, s, n = 20, spread = 12) {
  const cx = 6 + hsh(x, y, s) * 20, cy = 6 + hsh(x, y, s + 1) * 20;
  for (let i = 0; i < n; i++) R(c, i % 3 ? '#4a2a1c' : '#6b3a22', X + cx + (hsh(x, y, s + 10 + i) - .5) * spread, Y + cy + (hsh(x, y, s + 40 + i) - .5) * spread * .7, 2, 1);
}

function ruinFloor(c,x,y,shadow) {
  const X=x*T,Y=y*T,v=hsh(x,y,427);
  R(c,v>.5?'#252e30':'#283130',X,Y,T,T);
  R(c,'#3b4946',X,Y,T,1);
  for(let i=0;i<18;i++){
   const px=Math.floor(hsh(x,y,i+1500)*30),py=Math.floor(hsh(x,y,i+2100)*30);
   R(c,i%3===0?'#4c574e':i%3===1?'#395248':'#1c2529',X+px,Y+py,1+(i%3),1+(i%2));
  }
  if(v>.6)for(let i=0;i<7;i++){
   const ox=4+Math.floor(hsh(x,y,i+600)*22);
   const oy=6+Math.floor(hsh(x,y,i+800)*20);
   R(c,i%2?'#4f775d':'#7c8461',X+ox,Y+oy,2,4);
  }
  if(v<.22){R(c,'#11181c',X+8,Y+10,15,12);R(c,'#535c58',X+8,Y+10,15,1);}
  if(shadow)R(c,'rgba(0,0,0,.23)',X,Y,T,4);
}

function surfaceFloor(c, x, y, shadow) {
  // Deterministic field palette: slate path, dust, moss, scattered basalt.
  // Only used for the expedition surface; original indoor missions are untouched.
  const X = x * T, Y = y * T, v = hsh(x, y, 91);
  const path = (x < 19 && y > 12 && y < 26) || (y > 15 && y < 21 && x < 48);
  R(c, path ? (v > .42 ? '#343b3a' : '#303a38') : (v > .5 ? '#253b36' : '#283f38'), X, Y, T, T);
  R(c, path ? '#41494a' : '#334c42', X, Y, T, 1);
  for (let i = 0; i < 20; i++) {
    const px = Math.floor(hsh(x + 3, y + 8, i + 120) * 30);
    const py = Math.floor(hsh(x + 7, y + 2, i + 160) * 30);
    R(c, path ? (i % 4 ? '#4f534d' : '#1d2b2b') : (i % 3 ? '#375c4c' : '#172d2b'), X + px, Y + py, 1 + i % 3, 1);
  }
  if (v > .56 && !path) {
    for (let i = 0; i < 6; i++) {
      const px = 4 + Math.floor(hsh(x, y, i + 211) * 23);
      const py = 9 + Math.floor(hsh(x, y, i + 311) * 16);
      R(c, i % 3 ? '#4c6750' : '#738461', X + px, Y + py, 2, 3);
      R(c, '#172e2a', X + px + 1, Y + py + 3, 1, 2);
    }
  }
  if (v < .12) { R(c, '#1b2629', X + 8, Y + 13, 15, 7); R(c, '#66716a', X + 8, Y + 12, 15, 1); }
  if (shadow) R(c, 'rgba(0,0,0,.18)', X, Y, T, 4);
}
function surfaceEdge(c, x, y, at) {
  const X = x * T, Y = y * T;
  R(c, '#0e1c1e', X, Y, T, T);
  for (let i = 0; i < 13; i++) {
    const px = Math.floor(hsh(x, y, i + 500) * 29), py = Math.floor(hsh(x, y, i + 550) * 29);
    R(c, i % 3 ? '#304a40' : '#415650', X + px, Y + py, 2, 1 + (i % 3));
  }
  if (at(x, y + 1) === 2) { R(c, '#56675c', X, Y + 21, T, 4); R(c, '#1e3131', X, Y + 25, T, 7); }
  if (at(x - 1, y) === 2) R(c, '#5e6d61', X, Y, 3, T);
  if (at(x + 1, y) === 2) R(c, '#5e6d61', X + 29, Y, 3, T);
}
function expeditionFrame(c, e, t) {
  // Original procedural humanoids with required Bearframe chest and ear displays.
  // Owner-created Sprite Studio exports can replace these once privately staged.
  const X = e.tx * T + 6, Y = e.ty * T - 16, role = e.role;
  const col = role === 'mira' ? '#c3a46b' : role === 'nova' ? '#69a8b0' : '#7d9e82';
  const dark = role === 'mira' ? '#564e45' : role === 'nova' ? '#35505c' : '#354a41';
  const eye = role === 'mira' ? '#ffe0aa' : role === 'nova' ? '#92f2ff' : '#b8f6c6';
  const bob = Math.sin(t * 1.8 + e.tx) > .65 ? 1 : 0;
  R(c, 'rgba(0,0,0,.3)', X + 1, Y + 42, 19, 3);
  R(c, '#11191d', X + 3, Y + 29 + bob, 5, 14); R(c, '#11191d', X + 12, Y + 29 + bob, 5, 14);
  R(c, dark, X + 4, Y + 30 + bob, 3, 12); R(c, dark, X + 13, Y + 30 + bob, 3, 12);
  R(c, '#131a1e', X + 1, Y + 13 + bob, 18, 20);
  R(c, dark, X + 3, Y + 14 + bob, 14, 17); R(c, col, X + 4, Y + 14 + bob, 12, 3);
  R(c, '#171e23', X - 2, Y + 15 + bob, 4, 17); R(c, '#171e23', X + 18, Y + 15 + bob, 4, 17);
  R(c, dark, X - 1, Y + 17 + bob, 2, 12); R(c, dark, X + 19, Y + 17 + bob, 2, 12);
  R(c, '#0a1216', X + 5, Y + 20 + bob, 10, 8); R(c, col, X + 6, Y + 21 + bob, 8, 1);
  R(c, eye, X + 8, Y + 23 + bob, 4, 3); // luminous chest display
  R(c, '#131a20', X + 2, Y + bob, 16, 15); R(c, dark, X + 4, Y + 1 + bob, 12, 11);
  R(c, '#090f14', X + 4, Y + 5 + bob, 12, 4); R(c, eye, X + 6, Y + 6 + bob, 8, 1);
  R(c, '#111b20', X, Y + 4 + bob, 3, 7); R(c, '#111b20', X + 17, Y + 4 + bob, 3, 7);
  R(c, eye, X + 1, Y + 6 + bob, 1, 3); R(c, eye, X + 18, Y + 6 + bob, 1, 3); // ear displays
  if (role === 'mira') { R(c, col, X + 6, Y - 1 + bob, 8, 2); R(c, '#1a2020', X + 3, Y + 29 + bob, 14, 2); }
  if (role === 'nova') R(c, eye, X + 3, Y + 18 + bob, 2, 4); // cartography probe
  if (role === 'kai') R(c, '#8eaf80', X + 17, Y + 17 + bob, 4, 7); // utility mount
}

function floor(c, x, y, shadow) {
  const X = x * T, Y = y * T, v = hsh(x, y);
  R(c, v < .5 ? '#1e272b' : '#1b2327', X, Y, T, T);
  R(c, '#263136', X, Y, T, 1); R(c, '#263136', X, Y, 1, T); R(c, '#12181b', X, Y + T - 1, T, 1); R(c, '#12181b', X + T - 1, Y, 1, T);
  [[3, 3], [27, 3], [3, 27], [27, 27]].forEach(([a, b]) => R(c, '#34424a', X + a, Y + b, 2, 2));
  if (v > .86) for (let i = 6; i < 26; i += 4) { R(c, '#0c1012', X + 6, Y + i, 20, 2); R(c, '#2c383d', X + 6, Y + i + 2, 20, 1); }
  for (let i = 0; i < 16; i++) R(c, hsh(x, y, i + 7) > .5 ? '#161d20' : '#242e33', X + 1 + hsh(x + i, y, 1) * 30, Y + 1 + hsh(x, y + i, 2) * 30, 1, 1);
  if (hsh(x, y, 3) > .68) rust(c, X, Y, x, y, 3);
  if (hsh(x, y, 5) > .9) for (let i = 0; i < 14; i++) R(c, '#141a1d', X + 8 + hsh(x, y, 60 + i) * 14, Y + 8 + hsh(x, y, 80 + i) * 12, 3, 2);
  // large-scale grime / tint variation so plates do not read as a repeating grid
  const big = (hsh(x >> 2, y >> 2, 11) + hsh((x + 2) >> 2, (y + 1) >> 2, 12)) / 2;
  R(c, `rgba(0,0,0,${(big * .22).toFixed(3)})`, X, Y, T, T); if (big > .62) R(c, 'rgba(40,110,105,.05)', X, Y, T, T); if (big < .3) R(c, 'rgba(120,60,30,.05)', X, Y, T, T);
  if (hsh(x, y, 13) > .8) { for (let i = 0; i < 9; i++) R(c, 'rgba(120,160,175,.10)', X + 5 + i * 2 + hsh(x, y, 70 + i) * 4, Y + 20 + Math.sin(i + x) * 2, 3, 1); R(c, 'rgba(160,200,215,.14)', X + 10, Y + 21, 5, 1); } // damp sheen
  if (hsh(x, y, 14) > .9) { let px = 4 + hsh(x, y, 15) * 10, py = 3; for (let i = 0; i < 16; i++) { R(c, '#0d1215', X + px, Y + py, 1, 2); py += 1.6; px += hsh(x, y, 90 + i) > .5 ? 1 : -.4; } } // crack
  if (shadow) { R(c, 'rgba(0,0,0,.5)', X, Y, T, 3); R(c, 'rgba(0,0,0,.3)', X, Y + 3, T, 4); R(c, 'rgba(0,0,0,.14)', X, Y + 7, T, 5); if (hsh(x, y, 16) > .6) R(c, 'rgba(90,50,32,.5)', X + 4 + hsh(x, y, 17) * 22, Y, 1, 5 + hsh(x, y, 18) * 6); }
}
function wallFace(c, x, y) {
  const X = x * T, Y = y * T, v = hsh(x, y, 9);
  R(c, '#27323a', X, Y, T, T); R(c, '#44535b', X, Y, T, 3); R(c, '#0a0d0f', X, Y + 3, T, 1);
  R(c, '#1a2227', X + 15, Y + 4, 1, 23); R(c, '#1a2227', X, Y + 4, 1, 23);
  R(c, '#303d45', X + 2, Y + 6, 12, 1); R(c, '#303d45', X + 17, Y + 6, 13, 1);
  R(c, '#3a3220', X, Y + 26, T, 1); R(c, '#11171a', X, Y + 27, T, 5);
  if (v < .2) { for (let i = 10; i < 22; i += 3) { R(c, '#0a0d0f', X + 5, Y + i, 22, 2); R(c, '#3a474f', X + 5, Y + i + 2, 22, 1); } }
  else if (v < .38) { R(c, '#5b5433', X, Y + 12, T, 4); R(c, '#7d7446', X, Y + 12, T, 1); R(c, '#2a2716', X, Y + 16, T, 1); R(c, '#1a2227', X + 8, Y + 10, 3, 8); }
  else if (v < .5) { for (let py = 16; py < 22; py++) for (let px = 1; px < 31; px++) if (hsh(x * 40 + px, y * 40 + py, 2) > .32) R(c, ((px + py) >> 2) % 2 ? '#85752c' : '#15171a', X + px, Y + py, 1, 1); }
  else if (v < .62) {
    R(c, '#07090a', X + 8, Y + 9, 13, 9); R(c, '#3a474f', X + 8, Y + 8, 13, 1);
    ['#7a2b2b', '#2b5a6a', '#85752c'].forEach((col, i) => { R(c, col, X + 10 + i * 4, Y + 11, 1, 8 + i * 3); R(c, col, X + 10 + i * 4, Y + 18 + i * 3, 2, 1); });
  }
  for (let i = 0; i < 3; i++) if (hsh(x, y, 20 + i) > .5) R(c, '#5a3220', X + 2 + hsh(x, y, 30 + i) * 28, Y + 4, 1, 4 + hsh(x, y, 33 + i) * 14);
  [2, 13, 18, 29].forEach(a => { R(c, '#4a5a63', X + a, Y + 8, 1, 1); R(c, '#151c20', X + a, Y + 9, 1, 1); R(c, '#4a5a63', X + a, Y + 23, 1, 1); });
  R(c, 'rgba(160,190,200,.10)', X + 1, Y + 4, 30, 1); R(c, 'rgba(0,0,0,.14)', X, Y + 14, T, 6); R(c, 'rgba(0,0,0,.26)', X, Y + 20, T, 7);
}
function wallTop(c, x, y, at) {
  const X = x * T, Y = y * T;
  R(c, '#0b0e10', X, Y, T, T); R(c, '#12171a', X + 4, Y + 15, 24, 1);
  if (at(x, y - 1) === 2) { R(c, '#2a353b', X, Y, T, 5); R(c, '#44535b', X, Y, T, 1); }
  if (at(x - 1, y) === 2) { R(c, '#2a353b', X, Y, 5, T); R(c, '#44535b', X, Y, 1, T); }
  if (at(x + 1, y) === 2) { R(c, '#2a353b', X + T - 5, Y, 5, T); R(c, '#44535b', X + T - 1, Y, 1, T); }
}
function machine(c, p) {
  const X = p.x * T, Y = p.y * T, W = p.w * T, H = p.h * T;
  R(c, '#15170f', X + 1, Y + 1, W - 2, H - 2); R(c, '#4b5038', X + 2, Y + 2, W - 4, H - 16); R(c, '#5a6044', X + 2, Y + 2, W - 4, 1);
  R(c, '#2a2d20', X + 2, Y + H - 14, W - 4, 12); R(c, '#1c1e15', X + 2, Y + H - 3, W - 4, 1);
  for (let i = 0; i < p.w; i++) {
    const v = hsh(p.x + i, p.y, 4), bx = X + i * T;
    if (v < .4) { R(c, '#0d0e0a', bx + 8, Y + H - 12, 8, 8); R(c, '#6b4a12', bx + 10, Y + H - 10, 4, 4); R(c, '#2a2d20', bx + 12, Y + H - 9, 1, 2); }
    else if (v < .75) for (let k = 0; k < 4; k++) R(c, '#0d0e0a', bx + 6 + k * 5, Y + H - 12, 3, 8);
    else { R(c, '#6e6537', bx + 4, Y + H - 11, 24, 3); R(c, '#8a7f49', bx + 4, Y + H - 11, 24, 1); }
    R(c, '#3b3f2c', bx + 6, Y + 6, 20, Math.max(4, H - 24)); R(c, '#2a2d20', bx + 6, Y + 6, 20, 1);
    R(c, '#6e6537', bx + 22, Y + 4, 4, 4);
    if (hsh(p.x + i, p.y, 6) > .4) rust(c, bx, Y, p.x + i, p.y, 12, 18, 16);
  }
}
function crate(c, p) {
  const X = p.x * T, Y = p.y * T;
  R(c, '#231f18', X + 3, Y + 3, 26, 27); R(c, '#3a3327', X + 5, Y + 5, 22, 14); R(c, '#2c261d', X + 5, Y + 20, 22, 8);
  R(c, '#231f18', X + 15, Y + 5, 2, 23); R(c, '#4a4233', X + 5, Y + 5, 22, 1); rust(c, X, Y, p.x, p.y, 15, 10, 14);
}
function debris(c, p) {
  const X = p.x * T, Y = p.y * T;
  for (let i = 0; i < 26; i++) R(c, ['#2a3338', '#4a2a1c', '#11161a', '#3b3f2c'][i % 4], X + 3 + hsh(p.x, p.y, i) * 24, Y + 6 + hsh(p.x, p.y, 50 + i) * 20, 2 + (i % 3), 1 + (i % 2));
  R(c, '#6e6537', X + 12, Y + 14, 7, 2);
}
function cable(c, p) {
  for (let i = 0; i < p.w * T; i++) { const y = p.y * T + 16 + Math.round(Math.sin(i / 7 + p.x) * 4); R(c, '#0a0c0d', p.x * T + i, y, 1, 2); if (i % 9 === 0) R(c, '#5a3220', p.x * T + i, y, 2, 1); }
}
function hazard(c, p) {
  const X = p.x * T, Y = p.y * T, W = p.w * T, H = p.h * T;
  for (let py = 2; py < H - 2; py++) for (let px = 2; px < W - 2; px++) {
    const edge = px < 6 || py < 6 || px >= W - 6 || py >= H - 6;
    if (edge && hsh(X + px, Y + py, 3) > .4) R(c, ((px + py) >> 2) % 2 ? '#85752c' : '#15171a', X + px, Y + py, 1, 1);
  }
}

function rack(c, p) {
  const X = p.x * T, Y = p.y * T, W = p.w * T, H = p.h * T;
  R(c, '#0d0e0a', X + 2, Y + 1, W - 4, H - 2); R(c, '#2a2d20', X + 2, Y + 1, W - 4, 2);
  for (let y = 5; y < H - 6; y += 9) {
    R(c, '#3b3f2c', X + 3, Y + y + 7, W - 6, 1);
    for (let x = 4; x < W - 7; x += 5) { const v = hsh(p.x * 9 + x, p.y * 9 + y, 2); if (v < .18) continue; R(c, v > .6 ? '#6e6537' : '#4f6b5c', X + x, Y + y, 4, 7); R(c, v > .6 ? '#8a7f49' : '#6b8a78', X + x, Y + y, 1, 7); if (v > .85) R(c, '#c9b860', X + x + 1, Y + y + 3, 2, 1); }
  }
}

export function bakeMap(map, mission) {
  const cv = document.createElement('canvas'); cv.width = map.w * T; cv.height = map.h * T;
  const c = cv.getContext('2d');
  const at = (x, y) => (x < 0 || y < 0 || x >= map.w || y >= map.h) ? 0 : map.grid[y * map.w + x];
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    const g = at(x, y);
    if (g === 2) { if (mission.visualTheme === 'surface') surfaceFloor(c, x, y, at(x, y - 1) === 1); else if (mission.visualTheme === 'ruins') ruinFloor(c, x, y, at(x, y - 1) === 1); else floor(c, x, y, at(x, y - 1) === 1); }
    else if (g === 1) { if (mission.visualTheme === 'surface' || mission.visualTheme === 'ruins') surfaceEdge(c, x, y, at); else if (at(x, y + 1) === 2) wallFace(c, x, y); else wallTop(c, x, y, at); }
  }
  // soft ambient occlusion where floor meets side / lower walls
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) if (at(x, y) === 2) {
    const X = x * T, Y = y * T;
    if (at(x - 1, y) !== 2) { R(c, 'rgba(0,0,0,.32)', X, Y, 3, T); R(c, 'rgba(0,0,0,.15)', X + 3, Y, 4, T); }
    if (at(x + 1, y) !== 2) { R(c, 'rgba(0,0,0,.32)', X + T - 3, Y, 3, T); R(c, 'rgba(0,0,0,.15)', X + T - 7, Y, 4, T); }
    if (at(x, y + 1) !== 2) { R(c, 'rgba(0,0,0,.3)', X, Y + T - 3, T, 3); R(c, 'rgba(0,0,0,.14)', X, Y + T - 7, T, 4); }
  }
  const draw = { machine, crate, debris, cable, hazard, rack };
  for (const p of mission.props) if (p.solid) { R(c, 'rgba(0,0,0,.34)', p.x * T + 5, (p.y + (p.h || 1)) * T - 1, (p.w || 1) * T - 2, 5); R(c, 'rgba(0,0,0,.2)', (p.x + (p.w || 1)) * T - 1, p.y * T + 8, 4, (p.h || 1) * T - 6); }
  for (const p of mission.props) draw[p.t](c, p);
  return cv;
}

// Foreground layer drawn above characters: overhead conduits and hanging cables (depth / layered scenery).
export function bakeOver(map, mission) {
  const cv = document.createElement('canvas'); cv.width = map.w * T; cv.height = map.h * T; const c = cv.getContext('2d');
  const at = (x, y) => (x < 0 || y < 0 || x >= map.w || y >= map.h) ? 0 : map.grid[y * map.w + x];
  if (mission && (mission.visualTheme === 'surface' || mission.visualTheme === 'ruins')) return cv; // no indoor ceiling pipes outdoors
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    const X = x * T, Y = y * T;
    if (at(x, y) === 2 && y % 6 === 2 && hsh(y, 3, 5) > .25) { // overhead conduit run
      R(c, 'rgba(4,6,8,.5)', X, Y + 9, T, 6); R(c, 'rgba(70,90,100,.22)', X, Y + 9, T, 1); R(c, 'rgba(0,0,0,.16)', X, Y + 15, T, 4);
      if (x % 3 === 0) { R(c, 'rgba(4,6,8,.62)', X + 12, Y + 7, 5, 10); R(c, 'rgba(110,101,55,.3)', X + 12, Y + 7, 5, 1); }
    }
    if (at(x, y) === 1 && at(x, y + 1) === 2 && hsh(x, y, 41) > .8) { // cable drooping from a wall face
      const len = 14 + hsh(x, y, 42) * 22, ox = 6 + hsh(x, y, 43) * 18;
      for (let i = 0; i < len; i++) R(c, 'rgba(5,6,8,.85)', X + ox + Math.round(Math.sin(i / 6 + x) * 2), Y + 26 + i, 1, 1);
      R(c, 'rgba(122,43,43,.9)', X + ox + Math.round(Math.sin(len / 6 + x) * 2), Y + 26 + len, 2, 2);
    }
    if (at(x, y) === 1 && at(x, y - 1) === 2) R(c, 'rgba(0,0,0,.28)', X, Y - 4, T, 4); // lower wall lip shades the floor above it
  }
  return cv;
}
// Parallax under-structure seen through the void around rooms.
export function bakeDeep() {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d');
  R(c, '#030507', 0, 0, S, S);
  for (let i = 0; i < 4; i++) { R(c, '#070b0f', 0, 20 + i * 64, S, 9); R(c, '#0b1116', 0, 20 + i * 64, S, 1); R(c, '#070b0f', 30 + i * 64, 0, 7, S); R(c, '#0b1116', 30 + i * 64, 0, 1, S); }
  for (let i = 0; i < S; i += 2) { R(c, '#060a0d', i, (i * 2 + 40) % S, 2, 2); R(c, '#060a0d', S - i, (i * 2 + 104) % S, 2, 2); }
  for (let i = 0; i < 22; i++) { const x = hsh(i, 1, 2) * S, y = hsh(i, 2, 3) * S; R(c, '#0a1014', x, y, 10 + hsh(i, 3) * 26, 3); R(c, i % 5 ? '#101a20' : '#3a1512', x + 2, y + 1, 2, 1); }
  return cv;
}
// Soft drifting haze texture (drawn additively at very low alpha).
export function bakeFog() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const c = cv.getContext('2d');
  for (let i = 0; i < 26; i++) for (const ox of [0, -256, 256]) {
    const x = hsh(i, 5) * 256 + ox, y = hsh(i, 6) * 128, r = 22 + hsh(i, 7) * 40, g = c.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, 'rgba(150,180,190,.5)'); g.addColorStop(1, 'rgba(150,180,190,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return cv;
}

function roman(c, x, y, n, col) { for (let i = 0; i < n; i++) R(c, col, x + i * 3, y, 2, 7); R(c, col, x - 1, y, n * 3 + 1, 1); R(c, col, x - 1, y + 6, n * 3 + 1, 1); }

export function drawLamp(c, l, on, k) {
  const X = l.x * T + 12, Y = l.y * T + 10;
  R(c, '#15170f', X - 1, Y - 1, 10, 7); R(c, on ? `rgba(255,${60 + k * 40 | 0},40,${.5 + k * .5})` : '#3a1512', X, Y, 8, 5);
}

export function drawEntity(c, e, g) {
  const X = e.tx * T, Y = e.ty * T, W = (e.w || 1) * T, H = (e.h || 1) * T, t = g.time, f = g.flags;
  switch (e.type) {
    case 'terminal': {
      R(c, '#15170f', X + 2, Y + 1, 28, 30); R(c, '#3b3f2c', X + 3, Y + 2, 26, 18); R(c, '#2a2d20', X + 3, Y + 20, 26, 10);
      R(c, '#03140b', X + 6, Y + 4, 20, 13);
      const fl = Math.sin(t * 9 + e.tx) > -.9 ? 1 : .4;
      for (let i = 0; i < 4; i++) R(c, `rgba(125,255,176,${fl * (i === ((t * 2 | 0) % 4) ? 1 : .6)})`, X + 8, Y + 6 + i * 3, 6 + ((e.tx * 7 + i * 5) % 10), 1);
      if ((t * 2 | 0) % 2) R(c, '#7dffb0', X + 22, Y + 14, 2, 2);
      for (let i = 0; i < 5; i++) R(c, '#6e6537', X + 6 + i * 4, Y + 23, 3, 2); R(c, '#5a3220', X + 24, Y + 27, 3, 1);
      break;
    }
    case 'pad': {
      const on = g.onEnt(e, g.player);
      R(c, '#15170f', X + 2, Y + 2, 28, 28); R(c, '#3b3f2c', X + 3, Y + 3, 26, 26); R(c, '#11161a', X + 6, Y + 6, 20, 20);
      const k = on ? 1 : .35 + .25 * Math.sin(t * 3);
      for (let i = 0; i < 3; i++) R(c, `rgba(255,176,32,${k})`, X + 9 + i * 2, Y + 9 + i * 5, 14 - i * 4, 2);
      R(c, `rgba(255,176,32,${k})`, X + 15, Y + 8, 2, 14);
      break;
    }
    case 'plate': {
      const on = g.plateT > 0;
      R(c, '#4b5038', X + 3, Y + 3, 26, 26); R(c, '#1a2024', X + 5, Y + (on ? 6 : 5), 22, 22); R(c, '#2a353b', X + 5, Y + (on ? 6 : 5), 22, 1);
      [[6, 6], [24, 6], [6, 24], [24, 24]].forEach(([a, b]) => R(c, on ? '#7dffb0' : '#6b4a12', X + a, Y + b, 2, 2));
      roman(c, X + 12, Y + 12, 1, on ? '#7dffb0' : '#6e6537'); R(c, on ? '#7dffb0' : '#6e6537', X + 16, Y + 12, 1, 7); R(c, on ? '#7dffb0' : '#6e6537', X + 18, Y + 18, 1, 1); R(c, on ? '#7dffb0' : '#6e6537', X + 20, Y + 12, 1, 7); R(c, on ? '#7dffb0' : '#6e6537', X + 17, Y + 16, 1, 3); R(c, on ? '#7dffb0' : '#6e6537', X + 19, Y + 16, 1, 3);
      break;
    }
    case 'cell': {
      R(c, '#15170f', X + 11, Y + 9, 10, 15); R(c, '#6e6537', X + 12, Y + 10, 8, 13); R(c, '#8a7f49', X + 12, Y + 10, 2, 13); R(c, '#5a3220', X + 16, Y + 17, 3, 2);
      R(c, Math.sin(t * 6) > 0 ? '#7dffb0' : '#2f6b4a', X + 15, Y + 12, 2, 3);
      break;
    }
    case 'gen': {
      R(c, '#15170f', X + 1, Y + 1, W - 2, H - 2); R(c, '#4b5038', X + 2, Y + 2, W - 4, 12); R(c, '#2a2d20', X + 2, Y + 14, W - 4, 16);
      R(c, '#0d0e0a', X + 8, Y + 16, 14, 12);
      if (f.cellIn) { R(c, '#6e6537', X + 11, Y + 17, 8, 10); R(c, '#7dffb0', X + 14, Y + 19, 2, 3); }
      for (let i = 0; i < 5; i++) R(c, f.power ? (((t * 6 | 0) + i) % 5 < 3 ? '#7dffb0' : '#2f6b4a') : '#3a1512', X + 28 + i * 6, Y + 18, 4, 3);
      for (let k = 0; k < 6; k++) R(c, '#0d0e0a', X + 28 + k * 5, Y + 24, 3, 4);
      R(c, '#6e6537', X + 4, Y + 5, W - 8, 3); R(c, '#8a7f49', X + 4, Y + 5, W - 8, 1);
      break;
    }
    case 'breaker': case 'lever': {
      const on = e.type === 'lever' ? f.lever : (f.seq || []).includes(e.n) || f.power;
      R(c, '#15170f', X + 5, Y + 1, 22, 30); R(c, '#3b3f2c', X + 6, Y + 2, 20, 28); R(c, '#0d0e0a', X + 14, Y + 10, 4, 14);
      R(c, e.type === 'lever' ? '#8a1a26' : '#8a7f49', X + 11, Y + (on ? 20 : 9), 10, 5); R(c, '#15170f', X + 11, Y + (on ? 24 : 13), 10, 1);
      R(c, on ? '#7dffb0' : '#3a1512', X + 22, Y + 4, 2, 2);
      if (e.type === 'breaker') roman(c, X + 8, Y + 4, e.n, '#c9b860');
      break;
    }
    case 'door': {
      const h = Math.round(H * (1 - e.open));
      R(c, '#15170f', X + 8, Y - 2, 16, 3); R(c, '#15170f', X + 8, Y + H - 1, 16, 3);
      if (h > 0) {
        R(c, '#15170f', X + 9, Y, 14, h); R(c, '#4b5038', X + 11, Y, 10, h - 1); R(c, '#5a6044', X + 11, Y, 1, h - 1);
        for (let i = 4; i < h - 4; i += 8) R(c, i % 16 ? '#85752c' : '#2a2d20', X + 13, Y + i, 6, 3);
      }
      R(c, e.open > .5 ? '#7dffb0' : '#b02a20', X + 14, Y - 2, 4, 2);
      break;
    }
    case 'exit': case 'hatch': {
      R(c, '#15170f', X + 4, Y, W - 4, H); R(c, '#39413f', X + 8, Y + 3, W - 10, H - 6); R(c, '#4a5553', X + 8, Y + 3, 1, H - 6);
      R(c, '#15170f', X + 8, Y + H / 2 - 1, W - 10, 2);
      for (let i = 8; i < H - 8; i += 10) R(c, '#85752c', X + 14, Y + i, 10, 2);
      const col = e.type === 'exit' ? (f.power ? '#7dffb0' : (Math.sin(t * 2) > .6 ? '#b02a20' : '#3a1512')) : '#3a1512';
      R(c, col, X + (e.type === 'exit' ? 4 : W - 4), Y + 6, 3, H - 12);
      break;
    }
    case 'bulkhead': {
      R(c, '#0a0b0c', X, Y + 2, W, H - 2); R(c, '#2e2a26', X + 3, Y + 4, W - 6, H - 8); R(c, '#3d3833', X + 3, Y + 4, W - 6, 1);
      R(c, '#0a0b0c', X + W / 2 - 1, Y + 4, 2, H - 8);
      for (let px = 5; px < W - 5; px++) for (let py = 22; py < 26; py++) if (hsh(px, py, e.tx) > .35) R(c, ((px + py) >> 2) % 2 ? '#85752c' : '#15171a', X + px, Y + py, 1, 1);
      [8, 20, W - 22, W - 10].forEach(bx => R(c, '#57504a', X + bx, Y + 8, 3, 3));
      R(c, '#c9b860', X + W / 2 - 9, Y + 9, 5, 9); R(c, '#2e2a26', X + W / 2 - 7, Y + 11, 1, 5);
      R(c, `rgba(255,176,32,${.35 + .35 * Math.sin(t * 1.3)})`, X + W / 2 + 6, Y + 10, 3, 3);
      break;
    }
    case 'locker': {
      R(c, '#15170f', X + 2, Y, 28, 31); R(c, '#3b3f2c', X + 3, Y + 1, 26, 2); R(c, '#3b3f2c', X + 3, Y + 1, 3, 29); R(c, '#3b3f2c', X + 26, Y + 1, 3, 29);
      R(c, '#050607', X + 6, Y + 3, 20, 27);
      for (let i = 0; i < 5; i++) R(c, i % 2 ? '#85752c' : '#15171a', X + 6 + i * 4, Y + 28, 4, 2);
      if (g.player.hidden === e) { R(c, '#ff3b30', X + 12, Y + 9, 2, 1); R(c, '#ff3b30', X + 17, Y + 9, 2, 1); R(c, '#7a1410', X + 15, Y + 17, 2, 3); R(c, '#2a2a30', X + 11, Y + 6, 9, 1); }
      break;
    }
    case 'clue': {
      const bl = !e.done && (t * 3 | 0) % 2, mk = e.done ? '#2f6b4a' : '#ff3b30';
      if (e.kind === 'machine') {
        R(c, '#15170f', X + 2, Y + 2, 28, 29); R(c, '#3b3f2c', X + 3, Y + 3, 26, 14); R(c, '#2a2d20', X + 3, Y + 17, 26, 13);
        R(c, '#07090a', X + 8, Y + 7, 14, 9); R(c, '#7a2b2b', X + 10, Y + 9, 1, 9); R(c, '#2b5a6a', X + 14, Y + 9, 1, 12); R(c, '#85752c', X + 18, Y + 9, 1, 7);
        R(c, '#5a3220', X + 5, Y + 20, 6, 3); R(c, '#6b3a22', X + 20, Y + 24, 5, 2);
        if ((t * 9 + e.tx | 0) % 7 === 0) R(c, '#fff3c0', X + 9 + hsh(t * 9 | 0, e.tx) * 10, Y + 8 + hsh(e.ty, t * 9 | 0) * 6, 2, 2);
        R(c, e.done ? '#7dffb0' : e.scanned ? (bl ? '#ff3b30' : '#7a1410') : '#3a1512', X + 24, Y + 5, 2, 2);
      } else if (e.kind === 'signal') {
        const k = e.done ? .3 : .5 + .5 * Math.sin(t * 5), col = `rgba(125,255,176,${k})`;
        for (let i = 0; i < 3; i++) { const s = 4 + i * 5 + (e.done ? 0 : (t * 6 | 0) % 3); R(c, col, X + 16 - s, Y + 16 - s, s * 2, 1); R(c, col, X + 16 - s, Y + 16 + s, s * 2 + 1, 1); R(c, col, X + 16 - s, Y + 16 - s, 1, s * 2); R(c, col, X + 16 + s, Y + 16 - s, 1, s * 2); }
        R(c, '#7dffb0', X + 15, Y + 15, 2, 2);
      } else {
        const col = e.done ? '#4a5258' : '#9aa3aa';
        [[8, 8], [15, 14], [9, 20], [17, 25]].forEach(([a, b], i) => { R(c, col, X + a, Y + b, 4, 2); R(c, col, X + a + (i % 2 ? -1 : 1), Y + b + 2, 3, 2); });
        if (!e.done) { R(c, bl ? mk : '#7a1410', X + 3, Y + 3, 5, 1); R(c, bl ? mk : '#7a1410', X + 3, Y + 3, 1, 5); R(c, bl ? mk : '#7a1410', X + 24, Y + 28, 5, 1); R(c, bl ? mk : '#7a1410', X + 28, Y + 24, 1, 5); }
      }
      break;
    }
    case 'projector': {
      const on = g.echo && g.echo.id === e.id, k = on ? 1 : .4 + .2 * Math.sin(t * 2);
      R(c, '#15170f', X + 5, Y + 6, 22, 25); R(c, '#3b3f2c', X + 6, Y + 7, 20, 10); R(c, '#2a2d20', X + 6, Y + 17, 20, 13);
      R(c, '#0d0e0a', X + 10, Y + 9, 12, 6); R(c, `rgba(255,190,90,${k})`, X + 12, Y + 10, 8, 4); R(c, '#6e6537', X + 8, Y + 21, 16, 2);
      for (let i = 0; i < 3; i++) R(c, on && ((t * 8 | 0) + i) % 3 === 0 ? '#ffbe5a' : '#6b4a12', X + 9 + i * 5, Y + 25, 3, 2);
      break;
    }
    case 'jet': {
      const s = g.jetState(e);
      R(c, '#0c1012', X + 9, Y + 9, 14, 14); R(c, '#3b3f2c', X + 9, Y + 9, 14, 1); R(c, '#3b3f2c', X + 9, Y + 22, 14, 1); R(c, '#3b3f2c', X + 9, Y + 9, 1, 14); R(c, '#3b3f2c', X + 22, Y + 9, 1, 14);
      R(c, s ? '#85752c' : '#2a2d20', X + 14, Y + 14, 4, 4);
      if (s) for (let i = 0; i < (s === 2 ? 14 : 3); i++) { const q = (t * 12 | 0) + i * 7; R(c, `rgba(220,230,235,${s === 2 ? .25 + hsh(q, i) * .5 : .3})`, X + 4 + hsh(q, e.tx + i) * (s === 2 ? 22 : 12) + (s === 2 ? 0 : 6), Y + (s === 2 ? -6 : 8) + hsh(e.ty + i, q) * (s === 2 ? 30 : 10), 3 + (i % 3), 3 + (i % 2)); }
      break;
    }
    case 'steamwall': {
      R(c, '#3b3f2c', X + 12, Y, 8, 3); R(c, '#3b3f2c', X + 12, Y + H - 3, 8, 3);
      if (g.m.blocked(e, g)) for (let i = 0; i < 46; i++) { const q = (t * 14 | 0) + i * 5; R(c, `rgba(220,230,235,${.2 + hsh(q, i) * .5})`, X - 4 + hsh(q, i + 3) * (W + 2), Y + hsh(i, q) * (H - 4), 4 + (i % 4), 3 + (i % 3)); }
      break;
    }
    case 'lens': {
      const off = e.offT > t;
      R(c, '#15170f', X + 11, Y + 4, 10, 26); R(c, '#3b3f2c', X + 12, Y + 5, 8, 24); R(c, '#15170f', X + 7, Y + 6, 18, 12); R(c, '#4d5136', X + 8, Y + 7, 16, 10);
      const a = e.ang === undefined ? e.base : e.ang, lx = Math.round(Math.cos(a) * 4), ly = Math.round(Math.sin(a) * 2);
      R(c, '#0d0e0a', X + 12 + lx, Y + 9 + ly, 8, 6); R(c, off ? '#1c1e15' : e.al > 0 ? '#ff5a1f' : '#ffb020', X + 13 + lx, Y + 10 + ly, 6, 4);
      if (off && (t * 10 | 0) % 3 === 0) R(c, '#fff3c0', X + 9 + hsh(t * 10 | 0, 2) * 12, Y + 6 + hsh(3, t * 10 | 0) * 8, 2, 2);
      break;
    }
    case 'valve': {
      const on = (f.v || [])[e.n - 1];
      R(c, '#15170f', X + 4, Y + 1, 24, 30); R(c, '#3b3f2c', X + 5, Y + 2, 22, 28); R(c, '#6e6537', X, Y + 20, 32, 5); R(c, '#8a7f49', X, Y + 20, 32, 1);
      R(c, '#0d0e0a', X + 9, Y + 7, 14, 14);
      if (on) { R(c, '#b02a36', X + 15, Y + 8, 2, 12); R(c, '#b02a36', X + 10, Y + 13, 12, 2); } else for (let i = 0; i < 11; i++) { R(c, '#8a1a26', X + 10 + i, Y + 8 + i, 2, 2); R(c, '#8a1a26', X + 20 - i, Y + 8 + i, 2, 2); }
      R(c, '#c9b860', X + 15, Y + 13, 2, 2); R(c, f.vent ? '#7dffb0' : on ? '#ffb020' : '#3a1512', X + 23, Y + 4, 2, 2); roman(c, X + 7, Y + 23, e.n, '#15170f');
      break;
    }
    case 'sensor': {
      const safe = (f.safe || []).includes(e.k), bad = e.badT > t;
      R(c, bad ? '#b02a20' : safe ? '#2f6b4a' : '#2c383d', X + 3, Y + 3, 26, 1); R(c, bad ? '#b02a20' : safe ? '#2f6b4a' : '#2c383d', X + 3, Y + 28, 26, 1);
      R(c, bad ? '#b02a20' : safe ? '#2f6b4a' : '#2c383d', X + 3, Y + 3, 1, 26); R(c, bad ? '#b02a20' : safe ? '#2f6b4a' : '#2c383d', X + 28, Y + 3, 1, 26);
      R(c, bad ? '#ff5a1f' : safe ? '#7dffb0' : '#3a474f', X + 15, Y + 15, 2, 2);
      break;
    }
    case 'item': {
      R(c, '#15170f', X + 7, Y + 14, 18, 16); R(c, '#3b3f2c', X + 8, Y + 15, 16, 5); R(c, '#2a2d20', X + 8, Y + 20, 16, 9);
      R(c, '#15170f', X + 11, Y + 3, 10, 13); R(c, '#6e6537', X + 12, Y + 4, 8, 11); R(c, '#8a7f49', X + 12, Y + 4, 2, 11); R(c, '#4f6b5c', X + 12, Y + 8, 8, 2);
      R(c, `rgba(255,190,90,${.5 + .5 * Math.sin(t * 4)})`, X + 15, Y + 5, 2, 2);
      break;
    }
    case 'grate': {
      R(c, '#0c1012', X + 3, Y + 3, 26, 26);
      for (let i = 5; i < 27; i += 4) R(c, '#3a474f', X + 4 + (i % 8 ? 0 : 1), Y + i, 24, 2);
      R(c, '#5a3220', X + 3, Y + 3, 3, 3); R(c, '#85752c', X + 25, Y + 25, 3, 3);
      break;
    }
    case 'npc': {
      const actor = g.actorSheets && g.actorSheets[e.id];
      if (actor && actor.ready) {
        const frame = 6 + (Math.floor(t * 2) % 4);
        c.drawImage(actor.image, frame * 32, 0, 32, 56, X, Y + 32 - 56, 32, 56);
        break;
      }
      if (e.role === 'mira' || e.role === 'nova' || e.role === 'kai' || e.role === 'surveyor') { expeditionFrame(c, e, t); break; }
      const sw = Math.round(Math.sin(t * 1.1) * 1), bx = X + 6 + sw, by = Y - 16, k = .55 + .45 * Math.sin(t * 1.7);
      R(c, 'rgba(0,0,0,.45)', X + 6, Y + 27, 20, 4);
      R(c, '#1d2a26', bx + 4, by + 12, 12, 24); R(c, '#4f6b5c', bx + 5, by + 13, 10, 12); R(c, '#6b8a78', bx + 5, by + 13, 2, 12); R(c, '#3d5448', bx + 6, by + 25, 8, 10);
      R(c, '#8a7f49', bx + 3, by + 12, 14, 2); R(c, '#6e6537', bx + 9, by + 16, 2, 6);
      R(c, '#1d2a26', bx + 1, by + 14, 3, 20); R(c, '#4f6b5c', bx + 1, by + 15, 2, 9); R(c, '#8a7f49', bx + 1, by + 24, 3, 1); R(c, '#3d5448', bx + 1, by + 25, 2, 9);
      R(c, '#1d2a26', bx + 16, by + 14, 3, 20); R(c, '#4f6b5c', bx + 17, by + 15, 2, 9); R(c, '#8a7f49', bx + 16, by + 24, 3, 1); R(c, '#3d5448', bx + 17, by + 25, 2, 9);
      R(c, '#1d2a26', bx + 5, by + 35, 4, 11); R(c, '#3d5448', bx + 6, by + 35, 2, 10); R(c, '#1d2a26', bx + 11, by + 35, 4, 11); R(c, '#3d5448', bx + 12, by + 35, 2, 10); R(c, '#8a7f49', bx + 5, by + 40, 4, 1); R(c, '#8a7f49', bx + 11, by + 40, 4, 1);
      R(c, '#1d2a26', bx + 5, by, 10, 12); R(c, '#4f6b5c', bx + 6, by + 1, 8, 10); R(c, '#6b8a78', bx + 6, by + 1, 8, 1); R(c, '#0d1412', bx + 6, by + 4, 8, 3);
      R(c, `rgba(191,233,255,${k})`, bx + 7, by + 5, 6, 1); R(c, '#5a3220', bx + 11, by + 8, 2, 2);
      R(c, '#0a0c0d', bx + 3, by + 9, 1, 14); R(c, '#0a0c0d', bx + 16, by + 9, 1, 11); R(c, '#2b5a6a', bx + 3, by + 22, 1, 1);
      break;
    }
    case 'marking': {
      const k = e.pingT && e.pingT > t ? 1 : .6, col = `rgba(201,184,96,${k})`;
      roman(c, X + 10, Y + 12, 2, col); roman(c, X + 26, Y + 12, 3, col); roman(c, X + 45, Y + 12, 1, col);
      R(c, col, X + 20, Y + 15, 2, 1); R(c, col, X + 39, Y + 15, 2, 1);
      break;
    }
  }
}

export function drawDrone(c, d, t) {
  const off = d.state === 'disabled', bob = off ? 3 : Math.round(Math.sin(t * 4) * 1.5);
  const X = Math.round(d.x) - 11, Y = Math.round(d.y) - 20 + bob;
  R(c, 'rgba(0,0,0,.45)', X + 3, Math.round(d.y) + 3, 16, 4);
  R(c, '#15170f', X, Y + 3, 22, 16); R(c, '#4d5136', X + 1, Y + 4, 20, 9); R(c, '#62674a', X + 1, Y + 4, 20, 1); R(c, '#2a2d20', X + 1, Y + 13, 20, 5);
  R(c, '#5a3220', X + 3, Y + 7, 4, 2); R(c, '#6b3a22', X + 15, Y + 10, 3, 2); R(c, '#6e6537', X + 2, Y + 15, 18, 1);
  R(c, '#15170f', X + 16, Y - 3, 1, 6); R(c, '#15170f', X + 17, Y - 4, 2, 1);
  R(c, '#0a0c0d', X + 6, Y + 19, 1, 4); R(c, '#0a0c0d', X + 14, Y + 19, 1, 3); R(c, '#7a2b2b', X + 6, Y + 22, 1, 1);
  const lx = d.dir === 'left' ? 3 : d.dir === 'right' ? 13 : 8, col = off ? '#1c1e15' : d.state === 'chase' ? '#ff5a1f' : d.state === 'investigate' ? ((t * 6 | 0) % 2 ? '#ffe070' : '#8a6a10') : '#ffb020';
  if (d.dir !== 'up') { R(c, '#0d0e0a', X + lx - 1, Y + 6, 8, 7); R(c, col, X + lx, Y + 7, 6, 5); if (!off) R(c, '#fff3c0', X + lx + 1, Y + 8, 2, 1); }
  else R(c, col, X + 9, Y + 4, 4, 1);
  if (off && (t * 10 | 0) % 3 === 0) { R(c, '#fff3c0', X + 4 + hsh(t | 0, (t * 10 | 0)) * 14, Y + 2 + hsh((t * 10 | 0), 3) * 12, 2, 2); }
  if (d.alert > .05 && d.state !== 'chase' && !off) { R(c, '#15170f', X + 3, Y - 8, 16, 4); R(c, d.alert > .6 ? '#ff5a1f' : '#ffe070', X + 4, Y - 7, Math.round(14 * d.alert), 2); }
  if (d.state === 'chase') { R(c, '#ff3b30', X + 10, Y - 12, 2, 6); R(c, '#ff3b30', X + 10, Y - 5, 2, 2); }
  if (d.state === 'investigate' && !(d.alert > .05)) { R(c, '#ffe070', X + 9, Y - 12, 4, 1); R(c, '#ffe070', X + 12, Y - 11, 1, 3); R(c, '#ffe070', X + 10, Y - 8, 2, 1); R(c, '#ffe070', X + 10, Y - 5, 2, 2); }
}
