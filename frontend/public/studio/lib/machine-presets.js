// Example machine rigs for Bearframe Sprite Studio. Pure data builders (no DOM): usable from Node to write example projects.
// These are ORIGINAL pixel-art interpretations used to validate three rig types and scales:
//   Heavy Sentinel (large humanoid, 2x2 tiles), Hexapod Cartography Engine (six independent legs, 4x2 tiles),
//   Archive Sentinel (floating spindle with counter-rotating rings, utility limbs, lantern core, escort drones, 3x3 tiles).
const P = (id, p, s, x, y, w, h, o = {}) => ({ id, p, s, x, y, w, h, ...o });
const ang = (dx, dy) => Math.round(Math.atan2(-dx, dy) * 1800 / Math.PI) / 10;
const set = (an, ids, ch) => ids.forEach(id => { an[id] = { ...(an[id] || {}), ...ch }; });
const ANCIENT = { bone: '#b9b2a4', dark: '#3a3f47', under: '#14161b', glow: '#3fd8e6', accent: '#d9772b', cloth: '#8a3b33', moss: '#5d7a2e', rust: '#8a4a26', brass: '#a58b4a' };
const drone = (o, id, x, y) => o.push(P(id, null, 'disc', x, y, 10, 7, { ox: 5, oy: 3.5, z: 20 }), P(id + 'e', id, 'disc', 0, .5, 4, 4, { ox: 2, oy: 2, g: 'glow', z: 21 }),
  P(id + 'r', id, 'ring', 0, -4, 14, 4, { ox: 7, oy: 2, th: 1.5, seg: 6, c: 'dark', z: 21 }), P(id + 'p', id, 'taper', 0, 3, 2, 5, { t: 0, c: 'dark', z: 19 }));
const droneAnims = (anims, ids) => { for (const k in anims) ids.forEach((id, j) => { anims[k][id] = k === 'defeat' ? { yTo: 70, rotTo: 60 } : { y: [2, j * .3], x: [1.5, .25 + j * .3], ...(k === 'malfunction' ? { jit: 6 } : {}) }; anims[k][id + 'e'] = k === 'defeat' ? { glowTo: -1 } : { glow: [.3, j * .3] }; }); };

function heavySentinel() {
  const F = [], S = [];
  F.push(P('ring', 'torso', 'ring', 0, -36, 38, 38, { ox: 19, oy: 19, th: 3, seg: 12, z: -6, c: 'dark', g: 'glow', broken: .2 }),
    P('pelvis', 'torso', 'plate', 0, 0, 20, 9, { z: -1, c: 'dark' }), P('torso', null, 'plate', 36, 52, 28, 24, { oy: 24, z: 0, m: 1 }),
    P('chestL', 'torso', 'plate', -7, -19, 12, 11, { z: 1 }), P('chestR', 'torso', 'plate', 7, -19, 12, 11, { z: 1 }),
    P('core', 'torso', 'disc', 0, -9, 8, 8, { ox: 4, oy: 4, z: 2, g: 'glow', fo: 1 }), P('pack', 'torso', 'plate', 0, -20, 18, 16, { z: 2, c: 'dark', bo: 1 }),
    P('head', 'torso', 'plate', 0, -23, 14, 13, { oy: 13, z: 3 }), P('optic', 'head', 'disc', 0, -7, 7, 7, { ox: 3.5, oy: 3.5, z: 4, g: 'glow', fo: 1 }));
  for (const sg of [-1, 1]) {
    const n = sg < 0 ? 'L' : 'R';
    F.push(P('sh' + n, 'torso', 'plate', sg * 19, -21, 15, 14, { oy: 4, z: 4, m: 1 }), P('armU' + n, 'sh' + n, 'plate', sg, 8, 9, 14, { z: 1, c: 'dark', rm: -.12 }),
      P('armF' + n, 'armU' + n, 'plate', 0, 12, 12, 16, { z: 2, rm: 0 }), P('fist' + n, 'armF' + n, 'plate', 0, 15, 10, 8, { z: 2, c: 'dark', rm: 0 }),
      P('thigh' + n, 'pelvis', 'plate', sg * 8, 5, 12, 16, { z: 0, rm: .14 }), P('shin' + n, 'thigh' + n, 'plate', 0, 14, 13, 17, { z: 1, rm: 0 }), P('foot' + n, 'shin' + n, 'plate', 0, 15, 15, 7, { z: 1, c: 'dark', rm: 0 }));
  }
  F.push(P('banner', 'shL', 'banner', 0, 8, 12, 22, { z: 5, c: 'cloth', g: 'accent', fo: 1 }));
  S.push(P('ring', 'torso', 'ring', -10, -36, 10, 38, { ox: 5, oy: 19, th: 2.5, seg: 8, z: -6, c: 'dark', g: 'glow' }),
    P('armUB', 'torso', 'plate', 3, -14, 9, 14, { z: -3, c: 'dark', dk: 1 }), P('armFB', 'armUB', 'plate', 0, 12, 11, 16, { z: -3, dk: 1 }), P('fistB', 'armFB', 'plate', 0, 15, 10, 8, { z: -3, c: 'dark', dk: 1 }),
    P('thighB', 'pelvis', 'plate', 3, 5, 12, 16, { z: -2, dk: 1 }), P('shinB', 'thighB', 'plate', 0, 14, 12, 17, { z: -2, dk: 1 }), P('footB', 'shinB', 'plate', 2, 15, 16, 7, { z: -2, c: 'dark', dk: 1 }),
    P('pelvis', 'torso', 'plate', 0, 0, 16, 9, { z: -1, c: 'dark' }), P('torso', null, 'plate', 36, 52, 22, 24, { oy: 24, z: 0, m: 1 }),
    P('chest', 'torso', 'plate', 4, -19, 13, 12, { z: 1 }), P('core', 'torso', 'disc', 10, -9, 5, 8, { ox: 2.5, oy: 4, z: 2, g: 'glow' }), P('pack', 'torso', 'plate', -11, -20, 8, 16, { z: 1, c: 'dark' }),
    P('head', 'torso', 'plate', 2, -23, 13, 13, { oy: 13, z: 3 }), P('optic', 'head', 'disc', 5, -7, 5, 7, { ox: 2.5, oy: 3.5, z: 4, g: 'glow' }),
    P('thighA', 'pelvis', 'plate', -2, 5, 12, 16, { z: 2 }), P('shinA', 'thighA', 'plate', 0, 14, 13, 17, { z: 2 }), P('footA', 'shinA', 'plate', 2, 15, 16, 7, { z: 2, c: 'dark' }),
    P('sh', 'torso', 'plate', 0, -21, 15, 14, { oy: 4, z: 5, m: 1 }), P('armUA', 'sh', 'plate', 0, 8, 9, 14, { z: 4, c: 'dark' }), P('armFA', 'armUA', 'plate', 0, 12, 12, 16, { z: 5 }), P('fistA', 'armFA', 'plate', 0, 15, 10, 8, { z: 5, c: 'dark' }),
    P('banner', 'sh', 'banner', -2, 8, 11, 22, { z: 6, c: 'cloth', g: 'accent' }));
  const a = { idle: {}, walk: {}, attack: {}, charge: {}, hurt: {}, malfunction: {}, defeat: {} };
  set(a.idle, ['torso'], { y: [.7, 0] }); set(a.idle, ['core'], { glow: [.3, 0] }); set(a.idle, ['optic'], { glow: [.2, .3] }); set(a.idle, ['ring'], { spin: 1 }); set(a.idle, ['armUL', 'armUA', 'armUR', 'armUB'], { rot: [2, 0] });
  set(a.walk, ['thighL', 'thighA'], { rot: [22, 0] }); set(a.walk, ['thighR', 'thighB'], { rot: [22, .5] }); set(a.walk, ['shinL', 'shinA'], { rot: [11, .15] }); set(a.walk, ['shinR', 'shinB'], { rot: [11, .65] });
  set(a.walk, ['armUL', 'armUA'], { rot: [14, .5] }); set(a.walk, ['armUR', 'armUB'], { rot: [14, 0] }); set(a.walk, ['torso'], { y: [1, 0, 2] }); set(a.walk, ['ring'], { spin: 1 });
  set(a.attack, ['armUR', 'armUA'], { rot: [-85, 0, .5] }); set(a.attack, ['armFR', 'armFA'], { rot: [-30, 0, .5] }); set(a.attack, ['torso'], { rot: [5, 0, .5] }); set(a.attack, ['optic'], { glow: [.4, 0] }); set(a.attack, ['ring'], { spin: 2 });
  set(a.charge, ['torso'], { y: [2, 0, .5], jit: .6 }); set(a.charge, ['core', 'optic'], { glow: [.4, 0, 3] }); set(a.charge, ['ring'], { spin: 3, glow: [.4, 0, 3] });
  set(a.hurt, ['torso'], { rot: [-7, 0, .5], x: [-2, 0, .5] }); set(a.hurt, ['head'], { rot: [-10, 0, .5] }); set(a.hurt, ['optic', 'core'], { flick: .6 });
  set(a.malfunction, ['head'], { jit: 8 }); set(a.malfunction, ['armUL', 'armUA'], { jit: 12 }); set(a.malfunction, ['core', 'optic'], { flick: .6 }); set(a.malfunction, ['ring'], { spinJit: 2, flick: .6 }); set(a.malfunction, ['torso'], { jit: 1 });
  set(a.defeat, ['torso'], { yTo: 13, rotTo: 12 }); set(a.defeat, ['head'], { rotTo: 28 }); set(a.defeat, ['thighL', 'thighA', 'thighR', 'thighB'], { rotTo: -70 }); set(a.defeat, ['shinL', 'shinA', 'shinR', 'shinB'], { rotTo: 110 });
  set(a.defeat, ['core', 'optic'], { glowTo: -1 }); set(a.defeat, ['ring'], { glowTo: -1, rotTo: 25 }); set(a.defeat, ['armUL', 'armUA', 'armUR', 'armUB'], { rotTo: 20 });
  return { name: 'Heavy Sentinel', w: 72, h: 96, tiles: [2, 2], colors: { ...ANCIENT }, weather: { rust: .7, moss: .15, wear: .7 },
    views: { down: F.filter(p => !p.bo), up: F.filter(p => !p.fo).map(p => p.id === 'ring' ? { ...p, z: 6 } : p), right: S }, anims: a };
}

function leg(out, id, par, hx, hy, ux, lx, ground, bodyY, z, dk) {
  const ul = 17, un = Math.hypot(ux, .9), ua = ang(ux, -.9), ky = bodyY + hy - ul * .9 / un, la = ang(lx, 1), L = (ground - ky) * Math.hypot(lx, 1), o = dk ? { dk: 1 } : {};
  out.push(P(id + 'U', par, 'plate', hx, hy, 7, ul, { r: ua, z, ...o }), P(id + 'L', id + 'U', 'plate', 0, ul - 1, 6, Math.round(L * .58), { r: Math.round((la - ua) * 10) / 10, z, m: 1, ...o }),
    P(id + 'T', id + 'L', 'taper', 0, Math.round(L * .58) - 1, 6, Math.round(L * .42) + 1, { t: .1, c: 'dark', z, ...o }), P(id + 'K', id + 'U', 'disc', 0, ul - 1, 8, 8, { ox: 4, oy: 4, c: 'dark', z: z + .5, ...o }));
}
function hexapod() {
  const S = [], F = [], BY = 58, ringO = { ox: 38, oy: 10, th: 5, seg: 18, sd: 'lattice', g: 'glow', broken: .12 };
  const top = (o, side) => o.push(P('mast', 'body', 'plate', side ? -2 : 0, -7, 5, 18, { oy: 18, c: 'dark', z: 0 }), P('ringB', 'mast', 'ring', 0, -17, 76, 20, { ...ringO, half: 'back', z: -5 }), P('ringF', 'mast', 'ring', 0, -17, 76, 20, { ...ringO, half: 'front', z: 8, m: 1 }),
    P('hub', 'mast', 'disc', 0, -17, 10, 6, { ox: 5, oy: 3, c: 'dark', z: 1 }), P('wires', 'mast', 'cable', 0, -14, 60, 20, { ox: 30, c: 'under', n: 7, g: 'glow', z: -4 }), P('vines', 'mast', 'cable', 0, -12, 70, 15, { ox: 35, c: 'moss', n: 9, z: 9 }));
  leg(S, 'fF', 'body', 27, 3, .42, .2, 91, BY, -4, 1); leg(S, 'fM', 'body', 5, 3, .1, .05, 91, BY, -4, 1); leg(S, 'fR', 'body', -17, 3, -.42, -.2, 91, BY, -4, 1);
  S.push(P('tail', 'body', 'taper', -29, 0, 10, 20, { r: 90, t: .1, z: -1 }), P('body', null, 'plate', 64, BY, 60, 13, { ox: 30, oy: 6.5, m: 1 }), P('deck', 'body', 'plate', -10, -9, 24, 5, { z: 1, m: 1 }),
    P('belly', 'body', 'plate', 0, 5, 40, 4, { c: 'dark', z: -1 }), P('head', 'body', 'plate', 28, -1, 17, 13, { ox: 0, oy: 6.5, z: 2 }),
    P('eye1', 'head', 'disc', 11, 0, 8, 8, { ox: 4, oy: 4, g: 'glow', z: 3 }), P('eye2', 'head', 'disc', 5, -4, 4, 4, { ox: 2, oy: 2, g: 'glow', z: 3 }), P('eye3', 'head', 'disc', 5, 4, 3, 3, { ox: 1.5, oy: 1.5, g: 'glow', z: 3 }),
    P('probe1', 'head', 'taper', 15, 3, 3, 14, { r: -78, t: .1, c: 'dark', z: 1 }), P('probe2', 'head', 'taper', 15, -2, 3, 10, { r: -102, t: .1, c: 'dark', z: 1 }));
  top(S, true);
  leg(S, 'nF', 'body', 22, 3, .42, .2, 93, BY, 4); leg(S, 'nM', 'body', 0, 3, .1, .05, 93, BY, 4); leg(S, 'nR', 'body', -22, 3, -.42, -.2, 93, BY, 4);
  drone(S, 'd1', 112, 20); drone(S, 'd2', 14, 30);
  F.push(P('body', null, 'plate', 64, BY, 24, 15, { ox: 12, oy: 7.5, m: 1 }), P('deck', 'body', 'plate', 0, -10, 16, 5, { z: 1, m: 1 }),
    P('head', 'body', 'plate', 0, 2, 17, 12, { oy: 6, z: 3, fo: 1 }), P('eye1', 'head', 'disc', 0, 0, 8, 8, { ox: 4, oy: 4, g: 'glow', z: 4, fo: 1 }), P('eye2', 'head', 'disc', -6, -2, 4, 4, { ox: 2, oy: 2, g: 'glow', z: 4, fo: 1 }), P('eye3', 'head', 'disc', 6, 2, 3, 3, { ox: 1.5, oy: 1.5, g: 'glow', z: 4, fo: 1 }),
    P('probe1', 'head', 'taper', -4, 5, 3, 10, { t: .1, c: 'dark', z: 2, fo: 1 }), P('probe2', 'head', 'taper', 4, 5, 3, 8, { t: .1, c: 'dark', z: 2, fo: 1 }), P('tail', 'body', 'taper', 0, 2, 10, 14, { t: .15, z: 3, bo: 1 }));
  top(F, false);
  for (const sg of [-1, 1]) { const n = sg < 0 ? 'L' : 'R'; leg(F, n + 'R', 'body', sg * 9, 0, sg * .5, sg * .16, 87, BY, -2, 1); leg(F, n + 'M', 'body', sg * 10, 2, sg * .78, sg * .22, 90, BY, 2); leg(F, n + 'F', 'body', sg * 9, 4, sg * 1.05, sg * .3, 94, BY, 5); }
  drone(F, 'd1', 112, 20); drone(F, 'd2', 14, 30);
  const A = ['nF', 'nR', 'fM', 'LF', 'LR', 'RM'], B = ['nM', 'fF', 'fR', 'LM', 'RF', 'RR'], all = [...A, ...B], U = l => l.map(x => x + 'U'), Lo = l => l.map(x => x + 'L');
  const a = { idle: {}, walk: {}, attack: {}, charge: {}, hurt: {}, malfunction: {}, defeat: {} };
  set(a.idle, ['body'], { y: [.8, 0] }); set(a.idle, ['ringB', 'ringF'], { spin: 1 }); set(a.idle, ['eye1', 'eye2', 'eye3'], { glow: [.3, 0] }); set(a.idle, ['probe1'], { rot: [4, 0] }); set(a.idle, ['probe2'], { rot: [4, .5] });
  set(a.walk, U(A), { rot: [8, 0], lift: [3, 0] }); set(a.walk, Lo(A), { rot: [6, .25] }); set(a.walk, U(B), { rot: [8, .5], lift: [3, .5] }); set(a.walk, Lo(B), { rot: [6, .75] });
  set(a.walk, ['body'], { y: [.8, 0, 2], rot: [.8, 0] }); set(a.walk, ['ringB', 'ringF'], { spin: 1 });
  set(a.attack, ['probe1'], { rot: [-25, 0, .5], x: [5, 0, .5] }); set(a.attack, ['probe2'], { rot: [25, 0, .5], x: [5, 0, .5] }); set(a.attack, ['eye1', 'eye2', 'eye3'], { glow: [.4, 0, 2] }); set(a.attack, ['body'], { x: [3, 0, .5] }); set(a.attack, ['ringB', 'ringF'], { spin: 3 });
  set(a.charge, ['body'], { y: [3, 0, .5], jit: .5 }); set(a.charge, ['ringB', 'ringF'], { spin: 6, glow: [.4, 0, 3] }); set(a.charge, ['eye1'], { glow: [.4, 0, 3] }); set(a.charge, U(all), { rot: [-5, 0, .5] });
  set(a.hurt, ['body'], { rot: [-5, 0, .5], x: [-3, 0, .5] }); set(a.hurt, ['eye1', 'eye2', 'eye3'], { flick: .6 }); set(a.hurt, ['mast'], { rot: [8, 0, .5] });
  set(a.malfunction, U(['nF', 'fR', 'LF', 'RR']), { jit: 10 }); set(a.malfunction, Lo(['nM', 'RM']), { jit: 8 }); set(a.malfunction, ['ringB', 'ringF'], { spinJit: 2.5, flick: .6 }); set(a.malfunction, ['eye1', 'eye2'], { flick: .6 }); set(a.malfunction, ['body'], { jit: 1.5 }); set(a.malfunction, ['mast'], { jit: 5 });
  set(a.defeat, ['body'], { yTo: 20, rotTo: 7 }); set(a.defeat, U(['nF', 'fF', 'RF', 'RM', 'RR']), { rotTo: 28 }); set(a.defeat, U(['nR', 'fR', 'nM', 'fM', 'LF', 'LM', 'LR']), { rotTo: -28 }); set(a.defeat, Lo(all), { rotTo: 10 });
  set(a.defeat, ['eye1', 'eye2', 'eye3'], { glowTo: -1 }); set(a.defeat, ['ringB', 'ringF'], { glowTo: -1 }); set(a.defeat, ['mast'], { rotTo: 18 });
  droneAnims(a, ['d1', 'd2']);
  return { name: 'Hexapod Cartography Engine', w: 128, h: 96, tiles: [4, 2], colors: { ...ANCIENT }, weather: { rust: .5, moss: .8, wear: .5 }, views: { down: F.filter(p => !p.bo), up: F.filter(p => !p.fo), right: S }, anims: a };
}

function archiveSentinel() {
  const build = v => {
    const o = [], side = v === 's', halo = { ox: 58, oy: 16, th: 6, seg: 24, sd: 'halo', g: 'glow', broken: .18 }, inner = { ox: 37, oy: 10, th: 4, seg: 15, sd: 'inner', c: 'dark', g: 'glow', broken: .1 };
    o.push(P('spine', null, 'plate', 64, 72, side ? 18 : 26, 16, { oy: 16, m: 1 }), P('obelisk', 'spine', 'taper', 0, -14, side ? 12 : 16, 50, { r: 180, t: .12, z: 1 }),
      P('shardL', 'spine', 'taper', side ? -6 : -9, -12, 9, 36, { r: 176, t: .15, z: 0 }), P('shardR', 'spine', 'taper', side ? 6 : 9, -12, 8, 26, { r: 185, t: .2, z: 0 }),
      P('collar', 'spine', 'plate', 0, 0, 20, 6, { c: 'dark', z: 2 }), P('lantern', 'spine', 'glass', 0, 5, 14, 36, { g: 'glow', z: 1 }), P('cage', 'lantern', 'plate', 0, 35, 18, 6, { c: 'brass', z: 2 }),
      P('spike', 'lantern', 'taper', 0, 39, 14, 52, { t: .05, z: 1 }), P('finL', 'lantern', 'taper', -9, 30, 7, 30, { r: 6, t: .1, z: 0, c: 'dark' }), P('finR', 'lantern', 'taper', 9, 30, 7, 24, { r: -6, t: .1, z: 0, c: 'dark' }),
      P('haloB', 'spine', 'ring', 0, -26, 116, 32, { ...halo, half: 'back', z: -6 }), P('haloF', 'spine', 'ring', 0, -26, 116, 32, { ...halo, half: 'front', z: 8, m: 1 }),
      P('innerB', 'spine', 'ring', 0, -18, 74, 20, { ...inner, half: 'back', z: -5 }), P('innerF', 'spine', 'ring', 0, -18, 74, 20, { ...inner, half: 'front', z: 7 }),
      P('fil', 'spine', 'cable', 0, -22, 104, 26, { ox: 52, c: 'under', n: 12, g: 'glow', z: -3 }), P('vines', 'spine', 'cable', 0, -19, 110, 18, { ox: 55, c: 'moss', n: 10, z: 9 }),
      P('banL', 'spine', 'banner', -30, -10, 9, 32, { c: 'cloth', g: 'accent', z: -2 }), P('banR', 'spine', 'banner', 27, -8, 9, 26, { c: 'cloth', g: 'accent', z: -2 }));
    if (v !== 'b') { const lx = side ? 5 : -4; o.push(P('lens1', 'spine', 'disc', lx - 3, -8, 7, 7, { ox: 3.5, oy: 3.5, g: 'glow', z: 3 }), P('lens2', 'spine', 'disc', lx + 4, -11, 4, 4, { ox: 2, oy: 2, g: 'glow', z: 3 }), P('lens3', 'spine', 'disc', lx + 3, -4, 3, 3, { ox: 1.5, oy: 1.5, g: 'glow', z: 3 })); }
    for (const sg of [-1, 1]) {
      const n = sg < 0 ? 'L' : 'R', far = side && sg < 0, d = side ? 1 : sg, zz = far ? -4 : 3, ex = far ? { dk: 1 } : {};
      o.push(P('armU' + n, 'spine', 'plate', side ? (far ? 6 : 3) : sg * 12, -6, 8, 24, { r: -d * (far ? 38 : 52), z: zz, ...ex }), P('armJ' + n, 'armU' + n, 'disc', 0, 23, 9, 9, { ox: 4.5, oy: 4.5, c: 'dark', z: zz + .6, ...ex }),
        P('armF' + n, 'armU' + n, 'plate', 0, 23, 7, 22, { r: d * 80, z: zz + .3, m: 1, ...ex }), P('clawA' + n, 'armF' + n, 'taper', -2, 21, 4, 12, { r: 18, t: 0, c: 'dark', z: zz + .3, ...ex }), P('clawB' + n, 'armF' + n, 'taper', 2, 21, 4, 12, { r: -18, t: 0, c: 'dark', z: zz + .3, ...ex }));
    }
    drone(o, 'd1', 14, 62); drone(o, 'd2', 116, 96); drone(o, 'd3', 100, 130);
    return o;
  };
  const a = { idle: {}, walk: {}, attack: {}, charge: {}, hurt: {}, malfunction: {}, defeat: {} }, H = ['haloB', 'haloF'], I = ['innerB', 'innerF'], L3 = ['lens1', 'lens2', 'lens3'];
  for (const k of ['idle', 'walk', 'attack', 'charge']) { set(a[k], ['spine'], { y: [2, 0] }); set(a[k], H, { spin: 1 }); set(a[k], I, { spin: -1 }); set(a[k], ['lantern'], { glow: [.25, 0] }); }
  set(a.idle, ['armUL'], { rot: [4, 0] }); set(a.idle, ['armUR'], { rot: [4, .5] }); set(a.idle, L3, { glow: [.3, .2] }); set(a.idle, ['clawAL', 'clawAR'], { rot: [6, 0] }); set(a.idle, ['clawBL', 'clawBR'], { rot: [-6, 0] });
  set(a.walk, ['spine'], { y: [2, 0], rot: [2.5, .25] }); set(a.walk, H, { spin: 2 }); set(a.walk, I, { spin: -2 }); set(a.walk, ['armUL', 'armUR'], { rot: [6, .25] });
  set(a.attack, ['armUR'], { rot: [-42, 0, .5] }); set(a.attack, ['armFR'], { rot: [-50, 0, .5] }); set(a.attack, ['clawAR'], { rot: [22, 0, 2] }); set(a.attack, ['clawBR'], { rot: [-22, 0, 2] }); set(a.attack, L3, { glow: [.4, 0, 2] }); set(a.attack, H, { spin: 3 });
  set(a.charge, ['spine'], { y: [2, 0], jit: .5 }); set(a.charge, H, { spin: 6, glow: [.4, 0, 3] }); set(a.charge, I, { spin: -6, glow: [.4, 0, 3] }); set(a.charge, ['lantern'], { glow: [.4, 0, 3] }); set(a.charge, ['armUL', 'armUR'], { rot: [-14, 0, .5] });
  set(a.hurt, ['spine'], { x: [-4, 0, .5], rot: [-6, 0, .5] }); set(a.hurt, H, { rot: [8, 0, .5] }); set(a.hurt, ['lantern', ...L3], { flick: .6 });
  set(a.malfunction, ['spine'], { jit: 2, y: [1, 0] }); set(a.malfunction, H, { spinJit: 3, flick: .6, jit: 3 }); set(a.malfunction, I, { spinJit: 3, flick: .6 }); set(a.malfunction, ['lantern', 'lens1'], { flick: .7 }); set(a.malfunction, ['armUL', 'armFR'], { jit: 14 });
  set(a.defeat, ['spine'], { yTo: 16, rotTo: 14 }); set(a.defeat, H, { rotTo: -20, yTo: 12, glowTo: -1 }); set(a.defeat, I, { rotTo: 16, yTo: 8, glowTo: -1 }); set(a.defeat, ['lantern', ...L3], { glowTo: -1 }); set(a.defeat, ['armUL', 'armUR'], { rotTo: 40 }); set(a.defeat, ['armFL', 'armFR'], { rotTo: -50 });
  droneAnims(a, ['d1', 'd2', 'd3']);
  return { name: 'Archive Sentinel', w: 128, h: 176, tiles: [3, 3], colors: { ...ANCIENT, cloth: '#5a3a44' }, weather: { rust: .35, moss: .7, wear: .45 }, views: { down: build('f'), up: build('b'), right: build('s') }, anims: a };
}

function microDrone() {
  const o = [], a = { idle: {}, walk: {}, attack: {}, charge: {}, hurt: {}, malfunction: {}, defeat: {} }; drone(o, 'd', 12, 12);
  for (const k in a) { a[k].d = k === 'defeat' ? { yTo: 9, rotTo: 70 } : { y: [1.5, 0], ...(k === 'malfunction' ? { jit: 10 } : {}), ...(k === 'walk' ? { rot: [6, .25] } : {}) }; a[k].de = k === 'defeat' ? { glowTo: -1 } : { glow: [.3, 0, k === 'charge' ? 3 : 1] }; }
  return { name: 'Micro-drone', w: 24, h: 24, tiles: [1, 1], colors: { ...ANCIENT }, weather: { rust: .2, moss: 0, wear: .2 }, views: { down: o, up: o.filter(p => p.id !== 'de'), right: o }, anims: a };
}
function blank() { return { name: 'Custom machine', w: 48, h: 48, tiles: [1, 1], colors: { ...ANCIENT }, weather: { rust: 0, moss: 0, wear: 0 }, views: { down: [P('body', null, 'plate', 24, 28, 20, 16, { oy: 8 }), P('eye', 'body', 'disc', 0, 0, 6, 6, { ox: 3, oy: 3, g: 'glow', z: 1 })], right: [P('body', null, 'plate', 24, 28, 20, 16, { oy: 8 }), P('eye', 'body', 'disc', 6, 0, 6, 6, { ox: 3, oy: 3, g: 'glow', z: 1 })] }, anims: { idle: { body: { y: [1, 0] }, eye: { glow: [.3, 0] } }, walk: { body: { y: [1, 0, 2] } } } }; }

export const MACHINE_PRESETS = { 'Heavy Sentinel (humanoid titan)': heavySentinel, 'Hexapod Cartography Engine': hexapod, 'Archive Sentinel (floating boss)': archiveSentinel, 'Micro-drone (flyer)': microDrone, 'Custom machine (blank rig)': blank };
