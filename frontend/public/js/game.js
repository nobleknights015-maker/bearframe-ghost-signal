// Core engine: world, player, drone AI, Ghost Signal trace, lighting, scanning, checkpoints.
// Mission-specific content lives in js/missions/* and talks to this class through a small API.
import { buildWraith, FW, FH } from './art/wraith.js';
import { bakeMap, drawEntity, drawDrone, drawLamp } from './art/tiles.js';

export const T = 32, VW = 480, VH = 270;
const DV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const ROW = { down: 0, up: 1, right: 2, left: 3 };
const ANG = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
const GHOST_DELAY = 5, SCAN_COST = 15, SCAN_R = 120, HIT = 20;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

export class Game {
  constructor(o) {
    Object.assign(this, o); // canvas, ui, input, sfx, store, settings, touchMode()
    this.ctx = this.canvas.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
    this.light = document.createElement('canvas'); this.light.width = VW; this.light.height = VH; this.lc = this.light.getContext('2d');
    const w = buildWraith(); this.sheet = w.sheet; this.ghostSheet = w.ghost;
    this.mode = 'title';
  }

  start(mission, snap) {
    this.m = mission; this.map = mission.buildMap(); this.base = bakeMap(this.map, mission);
    this.ents = mission.entities().map(e => ({ w: 1, h: 1, open: 0, ...e }));
    this.flags = {}; this.inv = {}; this.stats = { scans: 0, hits: 0, restores: 0, logs: 0 };
    this.player = { x: mission.start.x, y: mission.start.y, dir: mission.start.dir, energy: 100, light: false, moving: false, anim: 0, hurt: 0 };
    this.time = 0; this.hist = []; this.scan = null; this.scanCd = 0; this.plateT = 0; this.onPad = null;
    const { w, h, grid } = this.map; this.solid = new Uint8Array(w * h);
    for (const p of mission.props) if (p.solid) for (let y = p.y; y < p.y + (p.h || 1); y++) for (let x = p.x; x < p.x + (p.w || 1); x++) this.solid[y * w + x] = 1;
    for (const e of this.ents) if (e.solid) for (let y = e.ty; y < e.ty + e.h; y++) for (let x = e.tx; x < e.tx + e.w; x++) this.solid[y * w + x] = 1;
    this.drone = this.makeDrone();
    this.mode = 'play'; this.ui.show('hud', true);
    if (snap) this.applySnap(snap); else { this.checkpoint(true); mission.onStart(this); }
  }

  // ---------- mission API ----------
  ent(id) { return this.ents.find(e => e.id === id); }
  say(lines, cb) { this.mode = 'dialog'; this.ui.say(lines, () => { this.mode = 'play'; if (cb) cb(); }); }
  terminal(title, text, cb) { this.mode = 'terminal'; this.ui.terminal(title, text, () => { this.mode = 'play'; if (cb) cb(); }); }
  toast(t, s) { this.ui.toast(t, s); }
  drain(n) { this.player.energy = Math.max(0, this.player.energy - n); }
  onEnt(e, p) { return p.x >= e.tx * T && p.x < (e.tx + e.w) * T && p.y >= e.ty * T && p.y < (e.ty + e.h) * T; }
  disturb(x, y) { const d = this.drone; if ((d.state === 'patrol' || d.state === 'investigate') && dist(d.x, d.y, x, y) < 300) { d.state = 'investigate'; d.target = this.clampZone(x, y); d.t = 2.5; d.repath = 0; } }
  finish() { this.mode = 'ending'; this.store.clear(); this.ui.show('hud', false); this.onEnd(this.stats, this.time); }

  snapshot() {
    const p = this.player, es = {};
    for (const e of this.ents) es[e.id] = { hidden: !!e.hidden, gone: !!e.gone };
    return { v: 1, mission: this.m.id, flags: JSON.parse(JSON.stringify(this.flags)), inv: { ...this.inv }, stats: { ...this.stats }, time: this.time, es,
      player: { x: p.x, y: p.y, dir: p.dir, energy: p.energy, light: p.light } };
  }
  checkpoint(silent) { this.snap = this.snapshot(); const ok = this.store.save(this.snap); if (!silent) this.toast(ok ? 'CHECKPOINT RECORDED' : 'CHECKPOINT HELD IN MEMORY ONLY', 2); return ok; }
  applySnap(s, minEnergy = 0) {
    this.snap = s; this.flags = JSON.parse(JSON.stringify(s.flags)); this.inv = { ...s.inv }; this.time = s.time; this.stats = { ...this.stats, ...s.stats };
    Object.assign(this.player, s.player, { energy: Math.max(s.player.energy, minEnergy), hurt: 0, moving: false });
    for (const e of this.ents) { if (s.es[e.id]) Object.assign(e, s.es[e.id]); if (e.type === 'door') e.open = this.m.doorOpen(e.id, this) ? 1 : 0; }
    this.hist = []; this.scan = null; this.plateT = 0; this.drone = this.makeDrone(); this.onPad = null;
  }
  restore() {
    this.stats.restores++; const st = { ...this.stats }; this.ui.fade(true); this.mode = 'restoring'; this.sfx.deny();
    setTimeout(() => { this.applySnap(this.snap, 50); this.stats = st; this.mode = 'play'; this.ui.fade(false); this.toast('ENERGY DEPLETED — LAST CHECKPOINT RESTORED', 3.5); }, 600);
  }

  // ---------- collision ----------
  tile(tx, ty) { return (tx < 0 || ty < 0 || tx >= this.map.w || ty >= this.map.h) ? 0 : this.map.grid[ty * this.map.w + tx]; }
  solidAt(px, py) {
    const tx = Math.floor(px / T), ty = Math.floor(py / T);
    if (this.tile(tx, ty) !== 2 || this.solid[ty * this.map.w + tx]) return true;
    for (const e of this.ents) if (e.type === 'door' && e.open < .6 && tx >= e.tx && tx < e.tx + e.w && ty >= e.ty && ty < e.ty + e.h) return true;
    return false;
  }
  free(x, y) { const l = x - 6, r = x + 6, t = y - 8, b = y + 2; return !(this.solidAt(l, t) || this.solidAt(r, t) || this.solidAt(l, b) || this.solidAt(r, b)); }
  tryMove(p, dx, dy) { if (this.free(p.x + dx, p.y + dy)) { p.x += dx; p.y += dy; return true; } return false; }

  // ---------- update ----------
  update(dt) {
    const acts = this.input.take();
    this.ui.update(dt);
    if (this.mode === 'dialog') { if (acts.includes('interact')) this.ui.advance(); return; }
    if (this.mode === 'terminal') { if (acts.includes('interact') || acts.includes('pause')) this.ui.closeTerminal(); return; }
    if (this.mode === 'pause') { if (acts.includes('pause')) this.onResume(); return; }
    if (this.mode !== 'play') return;
    if (acts.includes('pause')) { this.onPause(); return; }
    this.time += dt;
    const p = this.player;
    if (acts.includes('light')) this.toggleLight();
    if (acts.includes('scan')) this.doScan();
    this.updatePlayer(dt);
    this.hist.push({ t: this.time, x: p.x, y: p.y, dir: p.dir, f: this.frame() });
    while (this.hist.length > 2 && this.hist[1].t <= this.time - GHOST_DELAY) this.hist.shift();
    this.m.update(this, dt);
    if (this.mode !== 'play') return;
    for (const e of this.ents) if (e.type === 'door') {
      const want = this.m.doorOpen(e.id, this) || (e.open > .6 && this.onEnt(e, { x: p.x, y: p.y - 3 }));
      const was = e.open; e.open = Math.max(0, Math.min(1, e.open + (want ? 3 : -3) * dt));
      if ((was === 0 && e.open > 0) || (was === 1 && e.open < 1)) this.sfx.door();
    }
    this.updateDrone(dt);
    if (p.light) { p.energy -= dt * 1.1; if (p.energy <= 5) { p.light = false; this.toast('RESERVE POWER — FLASHLIGHT DISABLED', 2.5); } }
    let pad = null; for (const e of this.ents) if (e.type === 'pad' && this.onEnt(e, p)) pad = e;
    if (pad) { p.energy = Math.min(100, p.energy + 34 * dt); if (this.onPad !== pad) { this.sfx.charge(); this.checkpoint(); } }
    this.onPad = pad;
    if (this.scan) { this.scan.r += dt * 260; if (this.scan.r > SCAN_R + 30) this.scan = null; }
    this.scanCd -= dt; p.hurt -= dt;
    if (p.energy <= 0) { this.restore(); return; }
    if (acts.includes('interact')) { const e = this.target(); if (e) this.m.interact(e, this); }
    this.refreshHud();
  }
  refreshHud() {
    const p = this.player, e = this.mode === 'play' ? this.target() : null, key = this.touchMode() ? '' : '<b>[E]</b> ';
    const st = `LIGHT ${p.light ? '<b>ON</b>' : 'OFF'} &middot; SCAN ${this.scanCd > 0 ? '...' : p.energy > SCAN_COST ? '<b>READY</b>' : 'LOW'}${this.inv.cell ? ' &middot; <b>POWER CELL</b>' : ''}`;
    this.ui.hud(p.energy, this.m.objective(this), st, e ? key + this.m.label(e, this) : '');
  }
  frame() { const p = this.player; return p.moving ? Math.floor(p.anim) % 4 : 0; }
  updatePlayer(dt) {
    const p = this.player, d = this.input.dir; p.moving = false;
    if (d) {
      p.dir = d; const [vx, vy] = DV[d], sp = 84 * dt;
      if (this.tryMove(p, vx * sp, vy * sp)) p.moving = true;
      else for (const s of [-1, 1]) { // corner assist: slide around door frames and machine edges
        const ox = vy ? s : 0, oy = vx ? s : 0; let ok = false;
        for (let k = 2; k <= 10; k += 2) if (this.free(p.x + ox * k + vx * 2, p.y + oy * k + vy * 2)) { ok = true; break; }
        if (ok) { if (this.tryMove(p, ox * sp, oy * sp)) p.moving = true; break; }
      }
    }
    if (p.moving) { const a = Math.floor(p.anim); p.anim += dt * 8; if (Math.floor(p.anim) !== a && Math.floor(p.anim) % 2) this.sfx.step(); } else p.anim = 0;
  }
  toggleLight() {
    const p = this.player; if (!p.light && p.energy <= 5) { this.toast('INSUFFICIENT ENERGY', 2); this.sfx.deny(); return; }
    p.light = !p.light; this.sfx.blip();
  }
  doScan() {
    const p = this.player; if (this.scanCd > 0) return;
    if (p.energy <= SCAN_COST) { this.toast('INSUFFICIENT ENERGY FOR SCAN', 2); this.sfx.deny(); return; }
    p.energy -= SCAN_COST; this.scanCd = 1.5; this.scan = { x: p.x, y: p.y - 10, r: 6 }; this.stats.scans++; this.sfx.scan();
    const found = [];
    for (const e of this.ents) {
      if (e.gone) continue; const ex = (e.tx + e.w / 2) * T, ey = (e.ty + e.h / 2) * T;
      if (dist(p.x, p.y, ex, ey) > SCAN_R) continue;
      e.pingT = this.time + 3.5; if (e.hidden) { e.hidden = false; found.push(e); }
    }
    const d = this.drone; let stunned = false;
    if (d.state !== 'disabled' && dist(p.x, p.y, d.x, d.y) < SCAN_R) { d.state = 'disabled'; d.t = 5; stunned = true; this.sfx.stun(); this.toast('SECURITY UNIT DISRUPTED — 5 SECONDS', 2.5); }
    else this.disturb(p.x, p.y);
    this.m.onScan(this, found, stunned);
  }
  target() {
    const p = this.player; let best = null, bd = 20;
    for (const e of this.ents) {
      if (!e.interact || e.hidden || e.gone || !this.m.label(e, this)) continue;
      const x0 = e.tx * T, y0 = e.ty * T, x1 = x0 + e.w * T, y1 = y0 + e.h * T, px = p.x, py = p.y - 3;
      const d = Math.hypot(Math.max(x0 - px, 0, px - x1), Math.max(y0 - py, 0, py - y1));
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  get ghost() {
    if (!this.flags.ghost || !this.hist.length) return null; const g = this.hist[0], p = this.player;
    if (g.t > this.time - GHOST_DELAY + .2 || dist(g.x, g.y, p.x, p.y) < 8) return null; return g;
  }

  // ---------- drone ----------
  makeDrone() { const d = this.m.drone; return { x: d.start[0] * T + 16, y: d.start[1] * T + 16, dir: 'down', state: 'patrol', wp: 0, t: 0, lost: 0, hitCd: 0, path: [], repath: 0, target: null, last: null, invCd: 0, blind: 0 }; }
  inZone(tx, ty) { const z = this.m.drone.zone; return tx >= z[0] && ty >= z[1] && tx <= z[2] && ty <= z[3]; }
  clampZone(x, y) { const z = this.m.drone.zone; return { x: Math.max(z[0] * T + 16, Math.min(z[2] * T + 16, x)), y: Math.max(z[1] * T + 16, Math.min(z[3] * T + 16, y)) }; }
  dWalk(tx, ty) { return this.inZone(tx, ty) && this.tile(tx, ty) === 2 && !this.solid[ty * this.map.w + tx]; }
  bfs(sx, sy, gx, gy) {
    const w = this.map.w, prev = new Map(), q = [[sx, sy]]; prev.set(sy * w + sx, -1);
    let best = [sx, sy], bd = Math.abs(sx - gx) + Math.abs(sy - gy);
    for (let i = 0; i < q.length && bd > 0; i++) {
      const [x, y] = q[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = ny * w + nx; if (prev.has(k) || !this.dWalk(nx, ny)) continue;
        prev.set(k, y * w + x); q.push([nx, ny]); const d = Math.abs(nx - gx) + Math.abs(ny - gy); if (d < bd) { bd = d; best = [nx, ny]; }
      }
    }
    const path = []; let k = best[1] * w + best[0];
    while (prev.get(k) !== -1 && prev.has(k)) { path.unshift([k % w, Math.floor(k / w)]); k = prev.get(k); }
    return path;
  }
  sees(d, x, y, range) {
    if (!this.inZone(Math.floor(x / T), Math.floor(y / T))) return false;
    const dd = dist(d.x, d.y, x, y); if (dd > range) return false;
    const [fx, fy] = DV[d.dir]; if (dd > 36 && (fx * (x - d.x) + fy * (y - d.y)) / dd < 0) return false;
    for (let s = 8; s < dd - 6; s += 6) if (this.solidAt(d.x + (x - d.x) * s / dd, d.y + (y - d.y) * s / dd)) return false;
    return true;
  }
  updateDrone(dt) {
    const d = this.drone, p = this.player; d.hitCd -= dt; d.invCd -= dt; d.blind -= dt;
    if (d.state === 'disabled') { d.t -= dt; if (d.t <= 0) { d.state = 'patrol'; d.blind = 1.2; d.repath = 0; } return; }
    const seeP = d.blind <= 0 && this.sees(d, p.x, p.y - 4, p.light ? 150 : 100), g = this.ghost;
    if (seeP) { if (d.state !== 'chase') this.sfx.alert(); d.state = 'chase'; d.lost = 0; d.last = { x: p.x, y: p.y - 2 }; }
    else if (d.state === 'chase') { d.lost += dt; if (d.lost > 2.5) { d.state = 'investigate'; d.target = d.last; d.t = 2.5; } }
    else if (d.state === 'patrol' && d.invCd <= 0 && g && this.sees(d, g.x, g.y - 4, 120)) { d.state = 'investigate'; d.target = this.clampZone(g.x, g.y); d.t = 3; d.repath = 0; this.sfx.blip(); }

    const wp = this.m.drone.waypoints[d.wp];
    const goal = d.state === 'chase' ? d.last : d.state === 'investigate' ? d.target : { x: wp[0] * T + 16, y: wp[1] * T + 16 };
    const speed = (d.state === 'chase' ? 60 : d.state === 'investigate' ? 48 : 34) * dt;
    if (d.state === 'chase' && seeP && dist(d.x, d.y, goal.x, goal.y) < 40) this.stepToward(d, goal.x, goal.y, speed, true);
    else {
      d.repath -= dt;
      if (d.repath <= 0) { d.path = this.bfs(Math.floor(d.x / T), Math.floor(d.y / T), Math.floor(goal.x / T), Math.floor(goal.y / T)); d.repath = .3; }
      if (d.path.length) { const n = d.path[0], nx = n[0] * T + 16, ny = n[1] * T + 16; this.stepToward(d, nx, ny, speed, false); if (Math.abs(d.x - nx) < 1 && Math.abs(d.y - ny) < 1) d.path.shift(); }
      else if (d.state === 'patrol') d.wp = (d.wp + 1) % this.m.drone.waypoints.length;
      else if (d.state === 'investigate') { d.t -= dt; d.dir = ['up', 'right', 'down', 'left'][(this.time * 2 | 0) % 4]; if (d.t <= 0) { d.state = 'patrol'; d.invCd = 6; } }
    }
    if (d.hitCd <= 0 && dist(d.x, d.y, p.x, p.y - 4) < 15) {
      d.hitCd = 1.3; p.hurt = 1.3; this.drain(HIT); this.stats.hits++; this.sfx.hit(); this.toast(`CONTACT — ENERGY −${HIT}`, 1.5);
    }
  }
  stepToward(d, x, y, sp, checked) {
    const dx = x - d.x, dy = y - d.y; let mx = 0, my = 0;
    if (Math.abs(dx) > 1 && (!checked || Math.abs(dx) >= Math.abs(dy))) mx = Math.sign(dx) * Math.min(sp, Math.abs(dx));
    else if (Math.abs(dy) > 1) my = Math.sign(dy) * Math.min(sp, Math.abs(dy));
    else if (Math.abs(dx) > 1) mx = Math.sign(dx) * Math.min(sp, Math.abs(dx));
    if (checked && this.solidAt(d.x + mx + Math.sign(mx) * 8, d.y + my + Math.sign(my) * 8)) return;
    d.x += mx; d.y += my; if (mx) d.dir = mx > 0 ? 'right' : 'left'; else if (my) d.dir = my > 0 ? 'down' : 'up';
  }

  // ---------- render ----------
  render() {
    if (!this.m) return;
    const c = this.ctx, p = this.player, f = this.flags, t = this.time, flick = this.settings.flicker;
    const cx = Math.max(0, Math.min(this.map.w * T - VW, Math.round(p.x - VW / 2))), cy = Math.max(0, Math.min(this.map.h * T - VH, Math.round(p.y - 20 - VH / 2)));
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.drawImage(this.base, cx, cy, VW, VH, 0, 0, VW, VH);
    c.save(); c.translate(-cx, -cy);
    const lampsOn = !!f.lights, lk = l => f.power ? 1 : flick ? (Math.sin(t * 7 + l.x * 3) > -.6 && Math.sin(t * 23 + l.y) > -.9 ? .75 + .25 * Math.sin(t * 3 + l.x) : .15) : .8;
    for (const l of this.m.lamps) drawLamp(c, l, lampsOn, lk(l));
    for (const e of this.ents) if (!e.hidden && !e.gone) drawEntity(c, e, this);
    for (const e of this.ents) if (e.pingT > t && !e.gone && e.interact) { // scan brackets
      const x0 = e.tx * T, y0 = e.ty * T, x1 = x0 + e.w * T - 1, y1 = y0 + e.h * T - 1; c.fillStyle = `rgba(255,59,48,${Math.min(1, e.pingT - t)})`;
      [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(([x, y, sx, sy]) => { c.fillRect(Math.min(x, x + sx * 5), y, 6, 1); c.fillRect(x, Math.min(y, y + sy * 5), 1, 6); });
    }
    const g = this.ghost;
    if (g) {
      const gl = flick && Math.sin(t * 31) > .93 ? 3 : 0; c.globalAlpha = flick ? .5 + .2 * Math.sin(t * 13) : .6;
      c.drawImage(this.ghostSheet, g.f * FW, ROW[g.dir] * FH, FW, FH, Math.round(g.x) - 12 + gl, Math.round(g.y) - 36, FW, FH); c.globalAlpha = 1;
    }
    const drawP = () => {
      c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(Math.round(p.x) - 7, Math.round(p.y) + 1, 14, 3);
      if (!(p.hurt > 0 && (t * 14 | 0) % 2)) c.drawImage(this.sheet, this.frame() * FW, ROW[p.dir] * FH, FW, FH, Math.round(p.x) - 12, Math.round(p.y) - 36, FW, FH);
    };
    if (this.drone.y < p.y) { drawDrone(c, this.drone, t); drawP(); } else { drawP(); drawDrone(c, this.drone, t); }
    c.restore();

    // darkness + light sources
    const lc = this.lc, sx = p.x - cx, sy = p.y - cy - 16;
    lc.globalCompositeOperation = 'source-over'; lc.clearRect(0, 0, VW, VH); lc.fillStyle = `rgba(2,4,7,${f.power ? .45 : .9})`; lc.fillRect(0, 0, VW, VH);
    lc.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a) => { if (x < -r || y < -r || x > VW + r || y > VH + r) return; const gr = lc.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); lc.fillStyle = gr; lc.fillRect(x - r, y - r, r * 2, r * 2); };
    hole(sx, sy, 62, .9);
    if (p.light) {
      const a = ANG[p.dir], gr = lc.createRadialGradient(sx, sy, 4, sx, sy, 160); gr.addColorStop(0, 'rgba(0,0,0,.95)'); gr.addColorStop(.75, 'rgba(0,0,0,.8)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = gr; lc.beginPath(); lc.moveTo(sx, sy); lc.arc(sx, sy, 160, a - .58, a + .58); lc.closePath(); lc.fill();
    }
    if (lampsOn) for (const l of this.m.lamps) hole(l.x * T + 16 - cx, l.y * T + 14 - cy, 96, .75 * lk(l));
    for (const e of this.ents) {
      if (e.hidden || e.gone) continue; const ex = (e.tx + e.w / 2) * T - cx, ey = (e.ty + e.h / 2) * T - cy;
      if (e.type === 'terminal') hole(ex, ey, 44, .7); else if (e.type === 'pad' || e.type === 'cell') hole(ex, ey, 30, .6);
      else if (e.type === 'bulkhead' || e.type === 'exit') hole(ex, ey, 40, f.power && e.type === 'exit' ? .8 : .35);
      else if (e.pingT > t) hole(ex, ey, 34, .7 * Math.min(1, e.pingT - t));
    }
    const d = this.drone; if (d.state !== 'disabled') hole(d.x - cx, d.y - 10 - cy, 36, .7);
    if (g) hole(g.x - cx, g.y - 16 - cy, 28, .55);
    if (this.scan) hole(this.scan.x - cx, this.scan.y - cy, this.scan.r + 10, .5);
    c.drawImage(this.light, 0, 0);

    c.globalCompositeOperation = 'lighter';
    const glow = (x, y, r, col) => { if (x < -r || y < -r || x > VW + r || y > VH + r) return; const gr = c.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); };
    if (lampsOn && !f.power) for (const l of this.m.lamps) glow(l.x * T + 16 - cx, l.y * T + 14 - cy, 64, `rgba(255,40,30,${.2 * lk(l)})`);
    if (g) glow(g.x - cx, g.y - 16 - cy, 24, 'rgba(125,255,200,.16)');
    c.globalCompositeOperation = 'source-over';
    if (this.scan) {
      const s = this.scan, a = Math.max(0, 1 - s.r / (SCAN_R + 30)); c.strokeStyle = `rgba(255,59,48,${a})`; c.lineWidth = 2;
      c.beginPath(); c.arc(Math.round(s.x - cx), Math.round(s.y - cy), s.r, 0, 6.3); c.stroke();
      c.strokeStyle = `rgba(255,160,150,${a * .5})`; c.lineWidth = 1; c.beginPath(); c.arc(Math.round(s.x - cx), Math.round(s.y - cy), Math.max(1, s.r - 8), 0, 6.3); c.stroke();
    }
    if (p.hurt > .9) { c.fillStyle = 'rgba(255,40,30,.22)'; c.fillRect(0, 0, VW, VH); }
  }
}
