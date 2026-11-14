// Procedural environment art: baked 32x32 tile map + dynamic entity / drone drawing.
const T = 32;
const hsh = (x, y, s = 0) => { const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); };
const R = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, w, h); };

function rust(c, X, Y, x, y, s, n = 20, spread = 12) {
  const cx = 6 + hsh(x, y, s) * 20, cy = 6 + hsh(x, y, s + 1) * 20;
  for (let i = 0; i < n; i++) R(c, i % 3 ? '#4a2a1c' : '#6b3a22', X + cx + (hsh(x, y, s + 10 + i) - .5) * spread, Y + cy + (hsh(x, y, s + 40 + i) - .5) * spread * .7, 2, 1);
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
  if (shadow) { R(c, 'rgba(0,0,0,.4)', X, Y, T, 4); R(c, 'rgba(0,0,0,.2)', X, Y + 4, T, 4); }
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

export function bakeMap(map, mission) {
  const cv = document.createElement('canvas'); cv.width = map.w * T; cv.height = map.h * T;
  const c = cv.getContext('2d');
  R(c, '#030405', 0, 0, cv.width, cv.height);
  const at = (x, y) => (x < 0 || y < 0 || x >= map.w || y >= map.h) ? 0 : map.grid[y * map.w + x];
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    const g = at(x, y);
    if (g === 2) floor(c, x, y, at(x, y - 1) === 1);
    else if (g === 1) { if (at(x, y + 1) === 2) wallFace(c, x, y); else wallTop(c, x, y, at); }
  }
  const draw = { machine, crate, debris, cable, hazard };
  for (const p of mission.props) draw[p.t](c, p);
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
  if (d.state === 'chase') { R(c, '#ff3b30', X + 10, Y - 12, 2, 6); R(c, '#ff3b30', X + 10, Y - 5, 2, 2); }
  if (d.state === 'investigate') { R(c, '#ffe070', X + 9, Y - 12, 4, 1); R(c, '#ffe070', X + 12, Y - 11, 1, 3); R(c, '#ffe070', X + 10, Y - 8, 2, 1); R(c, '#ffe070', X + 10, Y - 5, 2, 2); }
}
