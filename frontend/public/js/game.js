// Core engine: world, player, drone AI, Ghost Signal trace + archived trace echoes, lighting, scanning,
// evidence / case file, hiding, hazards, checkpoints.
// Mission-specific content lives in js/missions/* and talks to this class through a small API.
import { buildWraith, FW, FH, WALK, IDLE0, IDLEN, SCAN0 } from './art/wraith.js';
import { bakeMap, bakeOver, bakeDeep, bakeFog, drawEntity, drawDrone, drawLamp } from './art/tiles.js';

export const T = 32, VW = 480, VH = 270;
const DV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const ROW = { down: 0, up: 1, right: 2, left: 3 };
const ANG = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
const GHOST_DELAY = 5, SCAN_COST = 15, SCAN_R = 120, HIT = 20, FOV = 1.2;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const clone = o => JSON.parse(JSON.stringify(o));

export class Game {
  constructor(o) {
    Object.assign(this, o); // canvas, ui, input, sfx, store, settings, touchMode()
    this.ctx = this.canvas.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
    this.light = document.createElement('canvas'); this.light.width = VW; this.light.height = VH; this.lc = this.light.getContext('2d');
    const w = buildWraith(); this.sheet = w.sheet; this.ghostSheet = w.ghost; this.echoSheet = w.echo;
    this.mode = 'title'; this.caseFile = { ev: [], logs: [] };
    this.deep = bakeDeep(); this.fog = bakeFog(); this.lowFx = false; this.cam = null;
    this.motes = Array.from({ length: 34 }, (_, i) => ({ x: Math.random() * VW, y: Math.random() * VH, vx: (Math.random() - .5) * 5, vy: -1 - Math.random() * 3, ph: i }));
  }

  start(mission, snap, carry) {
    this.m = mission; this.map = mission.buildMap(); this.base = bakeMap(this.map, mission); this.over = bakeOver(this.map); this.cam = null;
    this.ents = mission.entities().map(e => ({ w: 1, h: 1, open: 0, ...e }));
    this.flags = {}; this.inv = {}; this.stats = { scans: 0, hits: 0, restores: 0, logs: 0, ev: 0 };
    this.caseFile = carry ? clone(carry) : { ev: [], logs: [] };
    this.player = { x: mission.start.x, y: mission.start.y, dir: mission.start.dir, energy: 100, light: false, moving: false, anim: 0, hurt: 0, scanT: 0, hidden: null };
    this.time = 0; this.hist = []; this.scan = null; this.scanCd = 0; this.plateT = 0; this.onPad = null; this.echo = null; this.detectFx = 0; this.onGrate = null;
    const { w, h } = this.map; this.solid = new Uint8Array(w * h);
    for (const p of mission.props) if (p.solid) for (let y = p.y; y < p.y + (p.h || 1); y++) for (let x = p.x; x < p.x + (p.w || 1); x++) this.solid[y * w + x] = 1;
    for (const e of this.ents) if (e.solid) for (let y = e.ty; y < e.ty + e.h; y++) for (let x = e.tx; x < e.tx + e.w; x++) this.solid[y * w + x] = 1;
    this.drones = this.makeDrones();
    this.mode = 'play'; this.ui.show('hud', true);
    if (snap) this.applySnap(snap); else { this.checkpoint(true); mission.onStart(this); }
  }
  get drone() { return this.drones[0]; }

  // ---------- mission API ----------
  ent(id) { return this.ents.find(e => e.id === id); }
  say(lines, cb) { this.mode = 'dialog'; this.ui.say(lines, () => { this.mode = 'play'; if (cb) cb(); }); }
  choose(prompt, options, cb) { this.mode = 'choice'; this.ui.choose(prompt, options, i => { this.mode = 'play'; cb(i); }); }
  terminal(title, text, cb) { this.mode = 'terminal'; this.ui.terminal(title, text, () => { this.mode = 'play'; if (cb) cb(); }); }
  toast(t, s) { this.ui.toast(t, s); }
  drain(n) { this.player.energy = Math.max(0, this.player.energy - n); }
  onEnt(e, p) { return p.x >= e.tx * T && p.x < (e.tx + e.w) * T && p.y >= e.ty * T && p.y < (e.ty + e.h) * T; }
  hasEv(id) { return this.caseFile.ev.some(e => e.id === id); }
  evCount(m = this.m.id) { return this.caseFile.ev.filter(e => e.m === m).length; }
  addEvidence(id) {
    const ev = this.m.evidence && this.m.evidence[id]; if (!ev || this.hasEv(id)) return false;
    this.caseFile.ev.push({ id, m: this.m.id, ...ev }); this.stats.ev++; this.sfx.pickup(); this.toast('EVIDENCE LOGGED: ' + ev.title, 3); return true;
  }
  addLog(id) {
    const lg = this.m.logs && this.m.logs[id]; if (!lg || this.caseFile.logs.some(l => l.id === id)) return false;
    this.caseFile.logs.push({ id, m: this.m.id, title: lg.title, text: lg.text }); this.stats.logs++; return true;
  }
  disturb(x, y) { for (const d of this.drones) if ((d.state === 'patrol' || d.state === 'investigate') && dist(d.x, d.y, x, y) < 300) this.investigate(d, this.clampZone(d, x, y), 1, 2.5); }
  playEcho(e) {
    const pts = e.path.map(([x, y]) => ({ x: x * T + 16, y: y * T + 22 }));
    this.echo = { id: e.id, pts, i: 0, x: pts[0].x, y: pts[0].y, dir: 'down', anim: 0, wait: 0 }; this.sfx.static(); this.toast('ARCHIVED TRACE — REPLAYING', 2.5);
  }
  openCase() {
    if (this.mode !== 'play' && this.mode !== 'pause') return; const from = this.mode; this.mode = 'case'; this.sfx.blip();
    this.ui.openCase(this.caseFile, () => { this.mode = from; });
  }
  finish() {
    this.mode = 'ending'; const pr = this.store.loadProgress();
    pr.done[this.m.id] = true; if (this.m.next) pr.unlocked[this.m.next] = true; pr.case = clone(this.caseFile);
    this.store.saveProgress(pr); this.store.clear(); this.ui.show('hud', false); this.onEnd(this);
  }

  snapshot() {
    const p = this.player, es = {};
    for (const e of this.ents) es[e.id] = { hidden: !!e.hidden, gone: !!e.gone, done: !!e.done, scanned: !!e.scanned };
    return { v: 2, mission: this.m.id, flags: clone(this.flags), inv: { ...this.inv }, stats: { ...this.stats }, time: this.time, es, case: clone(this.caseFile),
      player: { x: p.hidden ? p.hx : p.x, y: p.hidden ? p.hy : p.y, dir: p.dir, energy: p.energy, light: p.light } };
  }
  checkpoint(silent) { this.snap = this.snapshot(); const ok = this.store.save(this.snap); if (!silent) this.toast(ok ? 'CHECKPOINT RECORDED' : 'CHECKPOINT HELD IN MEMORY ONLY', 2); return ok; }
  applySnap(s, minEnergy = 0) {
    this.snap = s; this.flags = clone(s.flags); this.inv = { ...s.inv }; this.time = s.time; this.stats = { ...this.stats, ...s.stats };
    this.caseFile = s.case ? clone(s.case) : { ev: [], logs: [] };
    Object.assign(this.player, s.player, { energy: Math.max(s.player.energy, minEnergy), hurt: 0, moving: false, hidden: null, scanT: 0 });
    for (const e of this.ents) { e.pingT = 0; e.offT = 0; if (s.es && s.es[e.id]) Object.assign(e, s.es[e.id]); if (e.type === 'door') e.open = this.m.doorOpen(e.id, this) ? 1 : 0; }
    this.hist = []; this.scan = null; this.plateT = 0; this.drones = this.makeDrones(); this.onPad = null; this.echo = null; this.detectFx = 0; this.cam = null;
    if (this.m.migrate) this.m.migrate(this);
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
    for (const e of this.ents) {
      if (tx < e.tx || tx >= e.tx + e.w || ty < e.ty || ty >= e.ty + e.h) continue;
      if (e.type === 'door' && e.open < .6) return true;
      if (e.type === 'steamwall' && this.m.blocked(e, this)) return true;
    }
    return false;
  }
  free(x, y) { const l = x - 6, r = x + 6, t = y - 8, b = y + 2; return !(this.solidAt(l, t) || this.solidAt(r, t) || this.solidAt(l, b) || this.solidAt(r, b)); }
  tryMove(p, dx, dy) { if (this.free(p.x + dx, p.y + dy)) { p.x += dx; p.y += dy; return true; } return false; }
  los(ax, ay, bx, by, from = 8) { const dd = dist(ax, ay, bx, by); for (let s = from; s < dd - 6; s += 6) if (this.solidAt(ax + (bx - ax) * s / dd, ay + (by - ay) * s / dd)) return false; return true; }
  jetState(e) { const ph = (this.time + e.ph) % 3.5; return ph < 1.4 ? 2 : ph > 3 ? 1 : 0; }

  // ---------- update ----------
  update(dt) {
    const acts = this.input.take();
    this.ui.update(dt);
    if (this.mode === 'dialog') { if (acts.includes('interact')) this.ui.advance(); return; }
    if (this.mode === 'choice') { if (acts.includes('opt1')) this.ui.pick(0); else if (acts.includes('opt2')) this.ui.pick(1); return; }
    if (this.mode === 'terminal') { if (acts.includes('interact') || acts.includes('pause')) this.ui.closeTerminal(); return; }
    if (this.mode === 'case') { if (acts.includes('case') || acts.includes('pause')) this.ui.closeCase(); return; }
    if (this.mode === 'pause') { if (acts.includes('pause')) this.onResume(); else if (acts.includes('case')) this.openCase(); return; }
    if (this.mode !== 'play') return;
    if (acts.includes('pause')) { this.onPause(); return; }
    if (acts.includes('case')) { this.openCase(); return; }
    this.time += dt;
    const p = this.player, ct = this.camTarget();
    if (!this.cam) this.cam = ct; else { const k = 1 - Math.exp(-dt * 5); this.cam.x += (ct.x - this.cam.x) * k; this.cam.y += (ct.y - this.cam.y) * k; }
    for (const m of this.motes) { m.x = (m.x + m.vx * dt + VW) % VW; m.y = (m.y + m.vy * dt + VH) % VH; }
    if (p.hidden) {
      if (acts.includes('interact') || this.input.dir) { p.hidden = null; p.x = p.hx; p.y = p.hy; this.sfx.door(); acts.length = 0; }
    } else {
      if (acts.includes('light')) this.toggleLight();
      if (acts.includes('scan')) this.doScan();
      this.updatePlayer(dt);
    }
    this.hist.push({ t: this.time, x: p.x, y: p.y, dir: p.dir, f: this.frame(), hid: !!p.hidden });
    while (this.hist.length > 2 && this.hist[1].t <= this.time - GHOST_DELAY) this.hist.shift();
    this.m.update(this, dt);
    if (this.mode !== 'play') return;
    this.updateWorld(dt);
    for (const d of this.drones) this.updateDrone(d, dt);
    if (p.light) { p.energy -= dt * 1.1; if (p.energy <= 5) { p.light = false; this.toast('RESERVE POWER — FLASHLIGHT DISABLED', 2.5); } }
    if (this.scan) { this.scan.r += dt * 260; if (this.scan.r > SCAN_R + 30) this.scan = null; }
    this.scanCd -= dt; p.hurt -= dt; p.scanT -= dt; this.detectFx = Math.max(0, this.detectFx - dt);
    if (p.energy <= 0) { this.restore(); return; }
    if (acts.includes('interact')) { const e = this.target(); if (e) this.use(e); }
    this.refreshHud();
  }
  updateWorld(dt) {
    const p = this.player; let pad = null, grate = null;
    for (const e of this.ents) {
      if (e.type === 'door') {
        const want = this.m.doorOpen(e.id, this) || (e.open > .6 && this.onEnt(e, { x: p.x, y: p.y - 3 }));
        const was = e.open; e.open = Math.max(0, Math.min(1, e.open + (want ? 3 : -3) * dt));
        if ((was === 0 && e.open > 0) || (was === 1 && e.open < 1)) this.sfx.door();
      } else if (e.type === 'pad') { if (this.onEnt(e, p)) pad = e; }
      else if (e.type === 'grate') { if (this.onEnt(e, p)) grate = e; }
      else if (e.type === 'jet') {
        if (this.jetState(e) === 2 && p.hurt <= 0 && this.onEnt(e, p)) { p.hurt = 1; this.drain(8); this.sfx.spark(); this.toast('STEAM VENT — ENERGY −8', 1.5); }
      } else if (e.type === 'lens') {
        if (e.offT > this.time) continue;
        const ex = e.tx * T + 16, ey = e.ty * T + 16, a = e.base + Math.sin(this.time * .7 + e.tx) * e.sweep, dd = dist(ex, ey, p.x, p.y - 6); e.ang = a;
        const da = Math.abs(((Math.atan2(p.y - 6 - ey, p.x - ex) - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (!p.hidden && dd < 140 && da < .3 && this.los(ex, ey, p.x, p.y - 6, 22)) {
          e.al = (e.al || 0) + dt * 1.8;
          if (e.al >= 1 && !(e.cd > this.time)) { e.cd = this.time + 4; e.al = 0; this.disturb(p.x, p.y); this.detectFx = .6; this.sfx.alert(); this.toast('SENTRY LENS TRACKED YOU — UNITS INVESTIGATING', 2.5); }
        } else e.al = Math.max(0, (e.al || 0) - dt);
      }
    }
    if (pad) { p.energy = Math.min(100, p.energy + 34 * dt); if (this.onPad !== pad) { this.sfx.charge(); this.checkpoint(); } }
    this.onPad = pad;
    if (grate && this.onGrate !== grate) { this.sfx.hit(); this.disturb(p.x, p.y); this.toast('LOOSE GRATING — NOISE', 1.8); }
    this.onGrate = grate;
    const ec = this.echo;
    if (ec) {
      const n = ec.pts[ec.i + 1];
      if (!n) { ec.wait += dt; if (ec.wait > 1.4) { this.echo = null; if (this.m.onEcho) this.m.onEcho(ec.id, this); } }
      else {
        const dx = n.x - ec.x, dy = n.y - ec.y, sp = 58 * dt; ec.anim += dt * 7;
        if (Math.abs(dx) > 1) { ec.x += Math.sign(dx) * Math.min(sp, Math.abs(dx)); ec.dir = dx > 0 ? 'right' : 'left'; }
        else if (Math.abs(dy) > 1) { ec.y += Math.sign(dy) * Math.min(sp, Math.abs(dy)); ec.dir = dy > 0 ? 'down' : 'up'; }
        else ec.i++;
      }
    }
  }
  stealth() {
    const p = this.player;
    if (this.drones.some(d => d.state === 'chase')) return ['DETECTED', 'hot'];
    if (p.hidden) return ['HIDDEN', 'safe'];
    if (this.drones.some(d => d.state === 'investigate')) return ['UNITS SEARCHING', 'warn'];
    if (this.drones.some(d => d.alert > .05 && d.state !== 'disabled')) return ['SUSPICIOUS', 'warn'];
    return ['UNDETECTED', ''];
  }
  refreshHud() {
    const p = this.player, e = this.mode === 'play' && !p.hidden ? this.target() : null, key = this.touchMode() ? '' : '<b>[E]</b> ';
    const st = `LIGHT ${p.light ? '<b>ON</b>' : 'OFF'} &middot; SCAN ${this.scanCd > 0 ? '...' : p.energy > SCAN_COST ? '<b>READY</b>' : 'LOW'}${this.inv.cell ? ' &middot; <b>POWER CELL</b>' : ''}${this.inv.spindle ? ' &middot; <b>RECORD SPINDLE</b>' : ''}`;
    this.ui.hud(p.energy, this.m.objective(this), st, p.hidden ? key + 'LEAVE ALCOVE' : e ? key + this.label(e) : '', this.stealth());
  }
  frame() { const p = this.player; return p.scanT > 0 ? SCAN0 + (p.scanT > .3 ? 0 : 1) : p.moving ? Math.floor(p.anim) % WALK : IDLE0 + (Math.floor(this.time / .32) % IDLEN); }
  camTarget() { const p = this.player, v = p.hidden ? [0, 0] : DV[p.dir]; return { x: Math.max(0, Math.min(this.map.w * T - VW, p.x + v[0] * 22 - VW / 2)), y: Math.max(0, Math.min(this.map.h * T - VH, p.y - 24 + v[1] * 16 - VH / 2)) }; }
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
    if (p.moving) { const a = Math.floor(p.anim); p.anim += dt * 11; if (Math.floor(p.anim) !== a && Math.floor(p.anim) % 3 === 1) this.sfx.step(); } else p.anim = 0;
  }
  toggleLight() {
    const p = this.player; if (!p.light && p.energy <= 5) { this.toast('INSUFFICIENT ENERGY', 2); this.sfx.deny(); return; }
    p.light = !p.light; this.sfx.blip();
  }
  doScan() {
    const p = this.player; if (this.scanCd > 0) return;
    if (p.energy <= SCAN_COST) { this.toast('INSUFFICIENT ENERGY FOR SCAN', 2); this.sfx.deny(); return; }
    p.energy -= SCAN_COST; this.scanCd = 1.5; p.scanT = .55; this.scan = { x: p.x, y: p.y - 10, r: 6 }; this.stats.scans++; this.sfx.scan();
    const found = []; let marks = 0, stunned = false;
    for (const e of this.ents) {
      if (e.gone) continue; const ex = (e.tx + e.w / 2) * T, ey = (e.ty + e.h / 2) * T;
      if (dist(p.x, p.y, ex, ey) > SCAN_R) continue;
      e.pingT = this.time + 3.5; if (e.hidden) { e.hidden = false; found.push(e); }
      if (e.type === 'clue' && !e.scanned) { e.scanned = true; if (!e.done) marks++; }
      if (e.type === 'lens') { e.offT = this.time + 6; e.al = 0; stunned = true; this.toast('SENTRY LENS DISRUPTED — 6 SECONDS', 2.5); }
    }
    for (const d of this.drones) if (d.state !== 'disabled' && dist(p.x, p.y, d.x, d.y) < SCAN_R) { d.state = 'disabled'; d.t = 5; stunned = true; this.toast('SECURITY UNIT DISRUPTED — 5 SECONDS', 2.5); }
    if (stunned) this.sfx.stun(); else this.disturb(p.x, p.y);
    if (marks) this.toast(`SCAN: ${marks} ANOMAL${marks > 1 ? 'IES' : 'Y'} MARKED — EXAMINE TO LOG EVIDENCE`, 3.2);
    this.m.onScan(this, found, stunned || marks > 0);
  }
  label(e) {
    if (e.type === 'clue') return e.done ? null : (e.kind === 'machine' && !e.scanned) ? 'DAMAGED — SCAN TO ANALYZE' : 'EXAMINE ' + e.name;
    if (e.type === 'locker') return 'HIDE IN ALCOVE';
    if (e.type === 'projector') return this.echo ? null : 'REPLAY ARCHIVED TRACE';
    return this.m.label(e, this);
  }
  use(e) {
    const p = this.player;
    if (e.type === 'clue') {
      if (e.kind === 'machine' && !e.scanned) { this.sfx.deny(); return this.toast('NOTHING VISIBLE UNAIDED — USE THE SCANNER', 2.5); }
      e.done = true; this.addEvidence(e.ev); if (this.m.onEvidence) this.m.onEvidence(e.ev, this); return;
    }
    if (e.type === 'locker') {
      if (this.drones.some(d => d.state === 'chase' && d.vis)) { this.sfx.deny(); return this.toast('CANNOT HIDE — UNIT HAS VISUAL', 2); }
      p.hx = p.x; p.hy = p.y; p.hidden = e; p.light = false; p.x = e.tx * T + 16; p.y = e.ty * T + 24; this.sfx.door(); return;
    }
    if (e.type === 'projector') return this.playEcho(e);
    this.m.interact(e, this);
  }
  target() {
    const p = this.player; let best = null, bd = 20;
    for (const e of this.ents) {
      if (!e.interact || e.hidden || e.gone || !this.label(e)) continue;
      const x0 = e.tx * T, y0 = e.ty * T, x1 = x0 + e.w * T, y1 = y0 + e.h * T, px = p.x, py = p.y - 3;
      const d = Math.hypot(Math.max(x0 - px, 0, px - x1), Math.max(y0 - py, 0, py - y1));
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  get ghost() {
    if (!this.flags.ghost || !this.hist.length) return null; const g = this.hist[0], p = this.player;
    if (g.hid || g.t > this.time - GHOST_DELAY + .2 || dist(g.x, g.y, p.x, p.y) < 8) return null; return g;
  }

  // ---------- drones: patrol -> suspicious -> pursuit -> search -> return to patrol ----------
  makeDrones() {
    return (this.m.drones || [this.m.drone]).map(c => ({ c, x: c.start[0] * T + 16, y: c.start[1] * T + 16, dir: 'down', state: 'patrol', wp: 0, t: 0, lost: 0, hitCd: 0, path: [], repath: 0, target: null, last: null, seen: null, invCd: 0, blind: 0, alert: 0, searchN: 0, vis: false, returning: false }));
  }
  inZone(d, tx, ty) { const z = d.c.zone; return tx >= z[0] && ty >= z[1] && tx <= z[2] && ty <= z[3]; }
  clampZone(d, x, y) { const z = d.c.zone; return { x: Math.max(z[0] * T + 16, Math.min(z[2] * T + 16, x)), y: Math.max(z[1] * T + 16, Math.min(z[3] * T + 16, y)) }; }
  dWalk(d, tx, ty) { return this.inZone(d, tx, ty) && this.tile(tx, ty) === 2 && !this.solid[ty * this.map.w + tx]; }
  investigate(d, target, n, t) { d.state = 'investigate'; d.target = target; d.t = t; d.searchN = n; d.repath = 0; d.returning = false; }
  bfs(d, sx, sy, gx, gy) {
    const w = this.map.w, prev = new Map(), q = [[sx, sy]]; prev.set(sy * w + sx, -1);
    let best = [sx, sy], bd = Math.abs(sx - gx) + Math.abs(sy - gy);
    for (let i = 0; i < q.length && bd > 0; i++) {
      const [x, y] = q[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = ny * w + nx; if (prev.has(k) || !this.dWalk(d, nx, ny)) continue;
        prev.set(k, y * w + x); q.push([nx, ny]); const dd = Math.abs(nx - gx) + Math.abs(ny - gy); if (dd < bd) { bd = dd; best = [nx, ny]; }
      }
    }
    const path = []; let k = best[1] * w + best[0];
    while (prev.has(k) && prev.get(k) !== -1) { path.unshift([k % w, Math.floor(k / w)]); k = prev.get(k); }
    return path;
  }
  sees(d, x, y, range) {
    if (!this.inZone(d, Math.floor(x / T), Math.floor(y / T))) return false;
    const dd = dist(d.x, d.y, x, y); if (dd > range) return false;
    const [fx, fy] = DV[d.dir]; if (dd > 36 && (fx * (x - d.x) + fy * (y - d.y)) / dd < Math.cos(FOV)) return false;
    return this.los(d.x, d.y, x, y);
  }
  updateDrone(d, dt) {
    const p = this.player; d.hitCd -= dt; d.invCd -= dt; d.blind -= dt;
    if (d.state === 'disabled') { d.vis = false; d.t -= dt; if (d.t <= 0) { d.state = 'patrol'; d.blind = 1.2; d.repath = 0; d.alert = 0; d.returning = true; } return; }
    const dd = dist(d.x, d.y, p.x, p.y - 4), g = this.ghost;
    const vis = d.vis = !p.hidden && d.blind <= 0 && this.sees(d, p.x, p.y - 4, p.light ? 150 : 100);
    if (d.state === 'chase') {
      if (vis) { d.lost = 0; d.last = { x: p.x, y: p.y - 2 }; }
      else { d.lost += dt; if (d.lost > 2.5) { this.investigate(d, d.last, 2, 1.5); d.alert = .5; this.toast('UNIT LOST VISUAL — SEARCHING', 2); } }
    } else if (vis) {
      d.alert = Math.min(1, d.alert + (dd < 48 ? 5 : p.light ? 2.4 : 1.4) * dt); d.seen = { x: p.x, y: p.y - 2 };
      if (d.alert >= 1) { d.state = 'chase'; d.lost = 0; d.last = d.seen; this.detectFx = 1; this.sfx.alert(); this.toast('DETECTED — BREAK LINE OF SIGHT', 2); }
    } else {
      if (d.alert > .45 && d.seen && d.state === 'patrol') { this.investigate(d, this.clampZone(d, d.seen.x, d.seen.y), 1, 2); d.seen = null; }
      d.alert = Math.max(0, d.alert - dt * .35);
      if (d.state === 'patrol' && d.invCd <= 0 && g && this.sees(d, g.x, g.y - 4, 120)) { this.investigate(d, this.clampZone(d, g.x, g.y), 0, 3); this.sfx.blip(); }
    }
    if (d.state !== 'chase' && vis) { // suspicious: halt and stare while the detection meter fills
      const dx = p.x - d.x, dy = p.y - d.y; d.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    } else {
      const wps = d.c.waypoints, wp = wps[d.wp];
      const goal = d.state === 'chase' ? d.last : d.state === 'investigate' ? d.target : { x: wp[0] * T + 16, y: wp[1] * T + 16 };
      const speed = (d.state === 'chase' ? 60 : d.state === 'investigate' ? 48 : 34) * dt;
      if (d.state === 'chase' && vis && dd < 40) this.stepToward(d, goal.x, goal.y, speed, true);
      else {
        d.repath -= dt;
        if (d.repath <= 0) { d.path = this.bfs(d, Math.floor(d.x / T), Math.floor(d.y / T), Math.floor(goal.x / T), Math.floor(goal.y / T)); d.repath = .3; }
        if (d.path.length) { const n = d.path[0], nx = n[0] * T + 16, ny = n[1] * T + 16; this.stepToward(d, nx, ny, speed, false); if (Math.abs(d.x - nx) < 1 && Math.abs(d.y - ny) < 1) d.path.shift(); }
        else if (d.state === 'patrol') { d.wp = (d.wp + 1) % wps.length; d.returning = false; d.repath = 0; }
        else if (d.state === 'investigate') {
          d.t -= dt; d.dir = ['up', 'right', 'down', 'left'][(this.time * 2 | 0) % 4];
          if (d.t <= 0) {
            if (d.searchN > 0) { d.searchN--; d.target = this.searchPoint(d); d.t = 1.2; d.repath = 0; }
            else { d.state = 'patrol'; d.invCd = 5; d.returning = true; d.repath = 0; let bi = 0, bd = 1e9; wps.forEach((w, i) => { const q = dist(d.x, d.y, w[0] * T + 16, w[1] * T + 16); if (q < bd) { bd = q; bi = i; } }); d.wp = bi; }
          }
        }
      }
    }
    if (!p.hidden && d.hitCd <= 0 && dd < 15) {
      d.hitCd = 1.3; p.hurt = 1.3; this.drain(HIT); this.stats.hits++; this.sfx.hit(); this.toast(`CONTACT — ENERGY −${HIT}`, 1.5);
    }
  }
  searchPoint(d) {
    const tx = Math.floor(d.x / T), ty = Math.floor(d.y / T);
    for (let i = 0; i < 10; i++) { const x = tx + Math.floor(Math.random() * 7) - 3, y = ty + Math.floor(Math.random() * 7) - 3; if ((x !== tx || y !== ty) && this.dWalk(d, x, y)) return { x: x * T + 16, y: y * T + 16 }; }
    return { x: d.x, y: d.y };
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
  renderSecurityUnit(ctx,drone,time) {
    if(this.drawSecurityUnit?.(ctx,drone,time)!==true)drawDrone(ctx,drone,time);
  }
  render() {
    if (!this.m) return;
    const c = this.ctx, p = this.player, f = this.flags, t = this.time, flick = this.settings.flicker;
    if (!this.cam) this.cam = this.camTarget();
    const cx = Math.round(this.cam.x), cy = Math.round(this.cam.y), fx = !this.lowFx;
    const vis = (x, y, r) => x > cx - r && y > cy - r && x < cx + VW + r && y < cy + VH + r;
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    const ox = -((cx * .45) % 256), oy = -((cy * .45) % 256);
    for (let y = oy; y < VH; y += 256) for (let x = ox; x < VW; x += 256) c.drawImage(this.deep, Math.round(x), Math.round(y));
    c.drawImage(this.base, cx, cy, VW, VH, 0, 0, VW, VH);
    c.save(); c.translate(-cx, -cy);
    const lampsOn = !!f.lights, lk = l => f.power ? 1 : flick ? (Math.sin(t * 7 + l.x * 3) > -.6 && Math.sin(t * 23 + l.y) > -.9 ? .75 + .25 * Math.sin(t * 3 + l.x) : .15) : .8;
    for (const l of this.m.lamps) drawLamp(c, l, lampsOn, lk(l));
    for (const e of this.ents) if (!e.hidden && !e.gone && vis((e.tx + e.w / 2) * T, (e.ty + e.h / 2) * T, 80)) drawEntity(c, e, this);
    for (const e of this.ents) if (e.pingT > t && !e.gone && e.interact) { // scan brackets
      const x0 = e.tx * T, y0 = e.ty * T, x1 = x0 + e.w * T - 1, y1 = y0 + e.h * T - 1; c.fillStyle = `rgba(255,59,48,${Math.min(1, e.pingT - t)})`;
      [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(([x, y, sx, sy]) => { c.fillRect(Math.min(x, x + sx * 5), y, 6, 1); c.fillRect(x, Math.min(y, y + sy * 5), 1, 6); });
    }
    const g = this.ghost, ec = this.echo;
    if (g) {
      const gl = flick && Math.sin(t * 31) > .93 ? 3 : 0; c.globalAlpha = flick ? .5 + .2 * Math.sin(t * 13) : .6;
      c.drawImage(this.ghostSheet, g.f * FW, ROW[g.dir] * FH, FW, FH, Math.round(g.x) - 16 + gl, Math.round(g.y) - (this.fieldSpriteAnchorY??52), FW, FH); c.globalAlpha = 1;
    }
    if (ec) {
      const gl = flick && Math.sin(t * 27) > .85 ? -2 : 0, fr = ec.pts[ec.i + 1] ? Math.floor(ec.anim * 1.4) % WALK : IDLE0; c.globalAlpha = flick ? .55 + .25 * Math.sin(t * 9) : .65;
      c.drawImage(this.echoSheet, fr * FW, ROW[ec.dir] * FH, FW, FH, Math.round(ec.x) - 16 + gl, Math.round(ec.y) - (this.fieldSpriteAnchorY??52), FW, FH); c.globalAlpha = 1;
    }
    const drawP = () => {
      if (p.hidden) return;
      const X = Math.round(p.x), Y = Math.round(p.y); c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(X - 10, Y, 20, 4); c.fillStyle = 'rgba(0,0,0,.34)'; c.fillRect(X - 8, Y - 1, 16, 6); c.fillRect(X - 5, Y - 2, 10, 8);
      if (!(p.hurt > 0 && (t * 14 | 0) % 2)) c.drawImage(this.sheet, this.frame() * FW, ROW[p.dir] * FH, FW, FH, X - 16, Y - (this.fieldSpriteAnchorY??52), FW, FH);
    };
    for (const d of this.drones) if (d.y < p.y) this.renderSecurityUnit(c, d, t);
    drawP();
    for (const d of this.drones) if (d.y >= p.y) this.renderSecurityUnit(c, d, t);
    c.restore();
    c.drawImage(this.over, cx, cy, VW, VH, 0, 0, VW, VH);

    // darkness + light sources
    const lc = this.lc, sx = p.x - cx, sy = p.y - cy - 24;
    lc.globalCompositeOperation = 'source-over'; lc.clearRect(0, 0, VW, VH); lc.fillStyle = `rgba(2,4,7,${f.power ? .45 : .9})`; lc.fillRect(0, 0, VW, VH);
    lc.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a) => { if (x < -r || y < -r || x > VW + r || y > VH + r) return; const gr = lc.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); lc.fillStyle = gr; lc.fillRect(x - r, y - r, r * 2, r * 2); };
    hole(sx, sy, p.hidden ? 40 : 62, .9);
    if (p.light) {
      const a = ANG[p.dir], gr = lc.createRadialGradient(sx, sy, 4, sx, sy, 160); gr.addColorStop(0, 'rgba(0,0,0,.95)'); gr.addColorStop(.75, 'rgba(0,0,0,.8)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = gr; lc.beginPath(); lc.moveTo(sx, sy); lc.arc(sx, sy, 160, a - .58, a + .58); lc.closePath(); lc.fill();
    }
    if (lampsOn) for (const l of this.m.lamps) hole(l.x * T + 16 - cx, l.y * T + 14 - cy, 96, .75 * lk(l));
    for (const e of this.ents) {
      if (e.hidden || e.gone) continue; const ex = (e.tx + e.w / 2) * T - cx, ey = (e.ty + e.h / 2) * T - cy, ty = e.type;
      if (ty === 'sensor' || ty === 'jet' || ty === 'grate') continue;
      if (ty === 'terminal' || ty === 'npc') hole(ex, ey, 44, .7); else if (ty === 'pad' || ty === 'cell' || ty === 'item' || ty === 'projector') hole(ex, ey, 30, .6);
      else if (ty === 'bulkhead' || ty === 'exit' || ty === 'lens') hole(ex, ey, 40, f.power && ty === 'exit' ? .8 : .35);
      else if (ty === 'clue' && e.scanned && !e.done) hole(ex, ey, 26, .5);
      else if (e.pingT > t) hole(ex, ey, 34, .7 * Math.min(1, e.pingT - t));
    }
    for (const d of this.drones) if (d.state !== 'disabled') hole(d.x - cx, d.y - 10 - cy, 36, .7);
    if (g) hole(g.x - cx, g.y - 22 - cy, 30, .55);
    if (ec) hole(ec.x - cx, ec.y - 16 - cy, 30, .6);
    if (this.scan) hole(this.scan.x - cx, this.scan.y - cy, this.scan.r + 10, .5);
    c.drawImage(this.light, 0, 0);

    c.globalCompositeOperation = 'lighter';
    const glow = (x, y, r, col) => { if (x < -r || y < -r || x > VW + r || y > VH + r) return; const gr = c.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); };
    const wedge = (x, y, a, half, r, col) => { if (x < -r || y < -r || x > VW + r || y > VH + r) return; c.fillStyle = col; c.beginPath(); c.moveTo(x, y); c.arc(x, y, r, a - half, a + half); c.closePath(); c.fill(); };
    if (lampsOn && !f.power) for (const l of this.m.lamps) glow(l.x * T + 16 - cx, l.y * T + 14 - cy, 64, `rgba(255,40,30,${.2 * lk(l)})`);
    if (fx) {
      if (lampsOn) for (const l of this.m.lamps) wedge(l.x * T + 16 - cx, l.y * T + 12 - cy, Math.PI / 2, .5, 120, f.power ? 'rgba(170,220,215,.035)' : `rgba(255,60,40,${(.05 * lk(l)).toFixed(3)})`);
      for (const e of this.ents) { if (e.hidden || e.gone) continue; const ex = (e.tx + e.w / 2) * T - cx, ey = (e.ty + e.h / 2) * T - cy;
        if (e.type === 'terminal') glow(ex, ey - 6, 46, 'rgba(125,255,176,.13)'); else if (e.type === 'pad' || e.type === 'projector' || e.type === 'item') glow(ex, ey, 30, 'rgba(255,176,32,.12)'); else if (e.type === 'npc') glow(ex, ey - 26, 22, 'rgba(191,233,255,.16)'); }
      if (!p.hidden) { glow(sx, sy - 18, 12, 'rgba(255,59,48,.20)'); glow(sx, sy - 2, 10, 'rgba(255,59,48,.14)'); }
      for (const d of this.drones) if (d.state !== 'disabled') glow(d.x - cx, d.y - 12 - cy, 18, d.state === 'chase' ? 'rgba(255,90,31,.22)' : 'rgba(255,176,32,.16)');
      c.globalAlpha = .07; const fo = (t * 6 + cx * .8) % 256, fy0 = Math.round(Math.sin(t * .2) * 10);
      for (let x = -fo; x < VW; x += 256) { c.drawImage(this.fog, Math.round(x), 40 + fy0); c.drawImage(this.fog, Math.round(x + 128), 150 - fy0); }
      c.globalAlpha = 1;
      for (const m of this.motes) { const dd = Math.hypot(m.x - sx, m.y - sy), a = (dd < 70 ? .5 : p.light && dd < 150 ? .3 : .1) * (.6 + .4 * Math.sin(t * 2 + m.ph)); c.fillStyle = `rgba(200,215,220,${a.toFixed(2)})`; c.fillRect(Math.round((m.x - cx * .3 % VW + VW) % VW), Math.round(m.y), 1, 1); }
    }
    if (g) glow(g.x - cx, g.y - 16 - cy, 24, 'rgba(125,255,200,.16)');
    if (ec) glow(ec.x - cx, ec.y - 16 - cy, 26, 'rgba(255,190,90,.18)');
    for (const d of this.drones) if (d.state !== 'disabled') wedge(d.x - cx, d.y - 8 - cy, ANG[d.dir], FOV, p.light ? 150 : 100, d.state === 'chase' ? 'rgba(255,60,30,.10)' : d.alert > .05 || d.state === 'investigate' ? 'rgba(255,200,60,.09)' : 'rgba(255,176,32,.05)');
    for (const e of this.ents) if (e.type === 'lens' && !(e.offT > t) && e.ang !== undefined) wedge(e.tx * T + 16 - cx, e.ty * T + 16 - cy, e.ang, .3, 140, e.al > 0 ? 'rgba(255,60,30,.16)' : 'rgba(255,176,32,.09)');
    c.globalCompositeOperation = 'source-over';
    if (this.scan) {
      const s = this.scan, a = Math.max(0, 1 - s.r / (SCAN_R + 30)); c.strokeStyle = `rgba(255,59,48,${a})`; c.lineWidth = 2;
      c.beginPath(); c.arc(Math.round(s.x - cx), Math.round(s.y - cy), s.r, 0, 6.3); c.stroke();
      c.strokeStyle = `rgba(255,160,150,${a * .5})`; c.lineWidth = 1; c.beginPath(); c.arc(Math.round(s.x - cx), Math.round(s.y - cy), Math.max(1, s.r - 8), 0, 6.3); c.stroke();
    }
    if (p.hurt > .9) { c.fillStyle = 'rgba(255,40,30,.22)'; c.fillRect(0, 0, VW, VH); }
    if (this.detectFx > 0) { c.fillStyle = `rgba(255,40,30,${this.detectFx * .8})`; c.fillRect(0, 0, VW, 3); c.fillRect(0, VH - 3, VW, 3); c.fillRect(0, 0, 3, VH); c.fillRect(VW - 3, 0, 3, VH); }
  }
}
