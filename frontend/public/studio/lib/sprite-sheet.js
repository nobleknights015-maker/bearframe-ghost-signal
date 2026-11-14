// Bearframe sprite project model + sheet import/export helpers. No dependencies; reusable outside the Studio.
// A project holds two independent sprite SETS: "exploration" (4-direction overworld) and "battle" (turn-based).
// Sheet layout: one row per direction in set.dirs, animations laid out left-to-right in set.anims order.
import { DIRS, DEFAULT_CFG } from './sprite-rig.js';

export const FORMAT = 'bearframe-sprite-project';
export const key = (dir, anim, i) => `${dir}|${anim}|${i}`;
const A = (name, frames, fps, type = name) => ({ name, type, frames, fps });
export const newSet = (fw, fh, dirs, anims) => ({ fw, fh, dirs, anims, cells: new Map(), edited: new Set() });
const base = (name, kind) => ({ format: FORMAT, version: 2, name, kind, cfg: null, rig: null, tiles: [1, 1], active: 'exploration', sets: {} });
export function blankProject(name = 'untitled', fw = 32, fh = 32) {
  const p = base(name, 'blank'); p.sets = { exploration: newSet(fw, fh, [...DIRS], [A('idle', 2, 4), A('walk', 4, 8)]), battle: newSet(fw * 2, fh * 2, ['right', 'left'], [A('idle', 2, 4), A('attack', 4, 8)]) }; return p;
}
export function humanoidProject(name = 'humanoid', cfg = DEFAULT_CFG) {
  const p = base(name, 'humanoid'); p.cfg = JSON.parse(JSON.stringify(cfg)); p.tiles = [1, 1];
  p.sets = { exploration: newSet(32, 56, [...DIRS], [A('idle', 4, 6), A('walk', 6, 10), A('scan', 2, 6)]),
    battle: newSet(64, 112, ['right', 'left'], [A('idle', 4, 6), A('attack', 4, 8), A('charge', 4, 8), A('hurt', 2, 8), A('malfunction', 4, 10), A('defeat', 5, 6)]) };
  return p;
}
export function machineProject(name, rig) {
  const p = base(name, 'machine'); p.rig = JSON.parse(JSON.stringify(rig)); p.tiles = rig.tiles || [1, 1];
  p.sets = { exploration: newSet(rig.w, rig.h, [...DIRS], [A('idle', 6, 6), A('walk', 8, 10), A('malfunction', 6, 10)]),
    battle: newSet(Math.round(rig.w * 1.5), Math.round(rig.h * 1.5), ['right', 'left'], [A('idle', 6, 6), A('attack', 6, 10), A('charge', 6, 10), A('hurt', 4, 10), A('malfunction', 6, 10), A('defeat', 6, 6)]) };
  return p;
}
export function cell(s, dir, anim, i) {
  const k = key(dir, anim, i); let c = s.cells.get(k);
  if (!c) { c = document.createElement('canvas'); c.width = s.fw; c.height = s.fh; s.cells.set(k, c); }
  return c;
}
export const totalFrames = s => s.anims.reduce((n, a) => n + a.frames, 0);
export function renameAnim(s, from, to) {
  for (const k of [...s.cells.keys()]) { const [d, a, i] = k.split('|'); if (a !== from) continue; const nk = key(d, to, i); s.cells.set(nk, s.cells.get(k)); s.cells.delete(k); if (s.edited.delete(k)) s.edited.add(nk); }
}
export function buildSheet(s, extra = {}) {
  const cv = document.createElement('canvas'); cv.width = s.fw * totalFrames(s); cv.height = s.fh * s.dirs.length; const c = cv.getContext('2d');
  const meta = { generator: 'Bearframe Sprite Studio', ...extra, frameWidth: s.fw, frameHeight: s.fh, anchor: { x: s.fw / 2, y: s.fh }, rows: s.dirs, animations: {} }; let col = 0;
  for (const a of s.anims) { meta.animations[a.name] = { type: a.type, start: col, count: a.frames, fps: a.fps }; for (let i = 0; i < a.frames; i++, col++) s.dirs.forEach((d, r) => c.drawImage(cell(s, d, a.name, i), col * s.fw, r * s.fh)); }
  return { canvas: cv, meta };
}
// Slice an existing sheet into the set at 1:1 pixels. If its column count does not match the set's animations,
// it is loaded as one animation called "sheet" so every frame stays editable.
export function importSheet(s, img, fw, fh) {
  const cols = Math.max(1, Math.floor(img.width / fw)), rows = Math.max(1, Math.min(DIRS.length, Math.floor(img.height / fh)));
  s.fw = fw; s.fh = fh; s.cells = new Map(); s.edited = new Set(); s.dirs = DIRS.slice(0, rows);
  if (cols !== totalFrames(s)) s.anims = [A('sheet', cols, 8, 'idle')];
  let col = 0;
  for (const a of s.anims) for (let i = 0; i < a.frames; i++, col++) for (let r = 0; r < rows; r++) { cell(s, DIRS[r], a.name, i).getContext('2d').drawImage(img, col * fw, r * fh, fw, fh, 0, 0, fw, fh); s.edited.add(key(DIRS[r], a.name, i)); }
  return { cols, rows };
}
// Change the canvas size without scaling: pixels stay 1:1, anchored at the feet (bottom-centre).
export function resizeSet(s, fw, fh) {
  for (const [k, old] of s.cells) { const c = document.createElement('canvas'); c.width = fw; c.height = fh; c.getContext('2d').drawImage(old, Math.floor((fw - s.fw) / 2), fh - s.fh); s.cells.set(k, c); }
  s.fw = fw; s.fh = fh;
}
export function serialize(p) {
  const sets = {};
  for (const n in p.sets) { const s = p.sets[n], cells = {}; for (const [k, c] of s.cells) cells[k] = c.toDataURL('image/png'); sets[n] = { fw: s.fw, fh: s.fh, dirs: s.dirs, anims: s.anims, edited: [...s.edited], cells }; }
  return JSON.stringify({ format: FORMAT, version: 2, name: p.name, kind: p.kind, cfg: p.cfg, rig: p.rig, tiles: p.tiles, active: p.active, sets });
}
export async function deserialize(text) {
  const o = JSON.parse(text); if (o.format !== FORMAT) throw new Error('Not a Bearframe sprite project');
  const p = { ...o, sets: {} }, jobs = [];
  for (const n in o.sets) {
    const r = o.sets[n], s = newSet(r.fw, r.fh, r.dirs, r.anims); s.edited = new Set(r.edited || []); p.sets[n] = s;
    for (const [k, url] of Object.entries(r.cells || {})) jobs.push(new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = s.fw; c.height = s.fh; c.getContext('2d').drawImage(im, 0, 0); s.cells.set(k, c); res(); }; im.onerror = res; im.src = url; }));
  }
  await Promise.all(jobs); if (!p.sets[p.active]) p.active = Object.keys(p.sets)[0];
  return p;
}
export function download(name, data, type = 'application/json') {
  const blob = data instanceof Blob ? data : new Blob([data], { type }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
// Minimal dependency-free ZIP writer (stored, no compression) for exporting individual frames.
let CRC; const crc32 = u8 => { if (!CRC) { CRC = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } } let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function zipStore(files) {
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  for (const f of files) {
    const nm = enc.encode(f.name), crc = crc32(f.data), h = new DataView(new ArrayBuffer(30)), c = new DataView(new ArrayBuffer(46));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint32(14, crc, true); h.setUint32(18, f.data.length, true); h.setUint32(22, f.data.length, true); h.setUint16(26, nm.length, true);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint32(16, crc, true); c.setUint32(20, f.data.length, true); c.setUint32(24, f.data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    parts.push(h.buffer, nm, f.data); central.push(c.buffer, nm); off += 30 + nm.length + f.data.length;
  }
  const cs = central.reduce((n, b) => n + (b.byteLength ?? b.length), 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, e.buffer], { type: 'application/zip' });
}
