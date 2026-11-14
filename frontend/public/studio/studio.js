// Bearframe Sprite Studio — standalone editor. Depends only on ./lib (no Ghost Signal code, no network services).
import { DEFAULT_CFG, PRESETS, ANIM_TYPES, JOINTS, drawAndroid, poseFor } from './lib/sprite-rig.js';
import { renderRig, SHAPES, COLOR_ROLES } from './lib/machine-rig.js';
import { MACHINE_PRESETS } from './lib/machine-presets.js';
import * as SS from './lib/sprite-sheet.js';
import { initRefUI } from './ref-ui.js';

const $ = id => document.getElementById(id), LS = 'bearframe_sprite_studio_autosave_v2';
const EXAMPLES = ['wraith-wtr07', 'heavy-sentinel', 'hexapod-cartography-engine', 'archive-sentinel', 'micro-drone'];
let P, S, cur = { dir: 'down', a: 0, f: 0 }, tool = 'pencil', color = '#ff3b30', zoom = 8, clip = null, undo = [], ref = null, playing = true, busy = false, pivots = [], saveT = 0;
const A = () => S.anims[cur.a], C = () => SS.cell(S, cur.dir, A().name, cur.f), K = () => SS.key(cur.dir, A().name, cur.f);
const status = t => { $('status').textContent = t; };
const el = (tag, props = {}, kids = []) => { const e = Object.assign(document.createElement(tag), props); kids.forEach(k => e.append(k)); return e; };
const autosave = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(LS, SS.serialize(P)); } catch (_) { status('Autosave off: project too large for browser storage. Use Save project.'); } }, 800); };
window.__studio = { get project() { return P; }, get set() { return S; }, get cur() { return cur; }, SS, get busy() { return busy; } };

async function setProject(p) {
  P = p; S = P.sets[P.active]; cur = { dir: S.dirs[0], a: 0, f: 0 }; undo = [];
  const need = P.kind !== 'blank' && S.cells.size === 0; refresh(); if (need) await generate('all'); else autosave();
}
function refresh() {
  $('pname').value = P.name; $('kind').value = P.kind; $('set-sel').value = P.active; $('fw').value = S.fw; $('fh').value = S.fh; $('tw').value = P.tiles[0]; $('th').value = P.tiles[1];
  if (!S.dirs.includes(cur.dir)) cur.dir = S.dirs[0]; cur.a = Math.min(cur.a, S.anims.length - 1); cur.f = Math.min(cur.f, A().frames - 1);
  zoom = Math.max(1, Math.min(20, Math.floor(Math.min(($('stage').clientWidth - 30) / S.fw, ($('stage').clientHeight - 30) / S.fh)) || 1)); $('zoom').value = zoom;
  buildCfg(); buildTabs(); buildStrip(); buildRig(); buildPalette(); drawEditor();
}

// ---------- procedural assist ----------
function renderCell(P0, S0, d, a, i) {
  const cv = SS.cell(S0, d, a.name, i); if (cv.width !== S0.fw || cv.height !== S0.fh) { cv.width = S0.fw; cv.height = S0.fh; }
  const c = cv.getContext('2d'); c.clearRect(0, 0, S0.fw, S0.fh);
  if (P0.kind === 'humanoid') drawAndroid(c, P0.cfg, d, poseFor(a.type, i, a.frames), S0.fw, S0.fh);
  else if (P0.kind === 'machine') renderRig(c, P0.rig, d, a.type, i, a.frames, S0.fw, S0.fh);
}
let genId = 0;
async function generate(mode) {
  if (P.kind === 'blank') return status('Blank canvas: draw frames by hand or import a sheet.');
  const my = ++genId, P0 = P, S0 = S, jobs = []; let n = 0; while (busy) await new Promise(r => setTimeout(r, 15)); if (my !== genId) return; busy = true;
  for (const d of S0.dirs) S0.anims.forEach((a, ai) => { for (let i = 0; i < a.frames; i++) { const k = SS.key(d, a.name, i); if (mode === 'frame' && !(d === cur.dir && ai === cur.a && i === cur.f)) continue; if (mode === 'unedited' && S0.edited.has(k)) continue; jobs.push([d, a, i, k]); } });
  try { for (const [d, a, i, k] of jobs) { if (my !== genId) break; renderCell(P0, S0, d, a, i); S0.edited.delete(k); if (++n % 4 === 0) { status(`Generating ${n}/${jobs.length}…`); await new Promise(r => setTimeout(r)); } } if (my === genId) status(`Generated ${n} frame${n === 1 ? '' : 's'} at ${S0.fw}×${S0.fh}.`); }
  catch (e) { status('Generate failed: ' + e.message); }
  busy = false; if (S0 === S) { buildStrip(); drawEditor(); autosave(); }
}
let regenT = 0; const regenSoon = () => { clearTimeout(regenT); regenT = setTimeout(() => generate('unedited'), 250); };

// ---------- config panels ----------
function field(label, input) { const l = el('label', { textContent: label + ' ' }); l.append(input); return l; }
function sel(opts, val, on, tid) { const s = el('select'); s.dataset.testid = tid; opts.forEach(o => s.append(el('option', { value: o, textContent: o }))); s.value = val; s.onchange = () => on(s.value); return s; }
function range(min, max, step, val, on, tid) { const r = el('input', { type: 'range', min, max, step, value: val }); r.dataset.testid = tid; r.oninput = () => on(+r.value); return r; }
function colors(obj, keys) { const w = el('div'); keys.forEach(k => { const i = el('input', { type: 'color', value: obj[k] }); i.dataset.testid = 'color-' + k; i.oninput = () => { obj[k] = i.value; buildPalette(); regenSoon(); }; w.append(el('label', { className: 'col', textContent: k }, [i])); }); return w; }
function buildCfg() {
  const box = $('cfg'); box.innerHTML = '';
  if (P.kind === 'humanoid') {
    const c = P.cfg, up = (k, v) => { c[k] = v; regenSoon(); };
    box.append(field('Preset', sel(['—', ...Object.keys(PRESETS)], '—', v => { if (PRESETS[v]) { P.cfg = JSON.parse(JSON.stringify(PRESETS[v])); buildCfg(); buildPalette(); regenSoon(); } }, 'humanoid-preset')),
      field('Head', sel(['visor', 'mono', 'band'], c.head, v => up('head', v), 'cfg-head')), field('Armor', sel(['light', 'plated', 'heavy'], c.armor, v => up('armor', v), 'cfg-armor')),
      field('Cloak', sel(['none', 'short', 'long'], c.cloak, v => up('cloak', v), 'cfg-cloak')), field('Limb build', range(-1, 1, 1, c.build, v => up('build', v), 'cfg-build')), field('Damage', range(0, 3, 1, c.damage, v => up('damage', v), 'cfg-damage')));
    ['fins', 'modules', 'pouches', 'harness', 'backpack', 'antenna'].forEach(k => { const i = el('input', { type: 'checkbox', checked: !!c[k] }); i.dataset.testid = 'cfg-' + k; i.onchange = () => up(k, i.checked); box.append(el('label', { className: 'chk' }, [i, k])); });
    box.append(colors(c.colors, Object.keys(c.colors)));
  } else if (P.kind === 'machine') {
    const r = P.rig; r.weather = r.weather || {};
    if (r.ref) box.append(el('div', { className: 'hint', textContent: 'Reference-derived rig (' + r.ref.type + '): part pixels come from the reference artwork. Fix pixels in the editor, tune joints and motion below, or re-run Reference → Sprite.' }));
    box.append(field('Rig preset', sel(['—', ...Object.keys(MACHINE_PRESETS)], '—', v => { if (MACHINE_PRESETS[v] && confirm('Replace this project with the "' + v + '" rig?')) setProject(SS.machineProject(v.split(' (')[0], MACHINE_PRESETS[v]())); }, 'machine-preset')),
      el('div', { className: 'hint', textContent: `Design grid ${r.w}×${r.h}. ${Object.keys(r.views).join(' / ')} views.` }));
    ['rust', 'moss', 'wear'].forEach(k => box.append(field('Weathering: ' + k, range(0, 1, .05, r.weather[k] || 0, v => { r.weather[k] = v; regenSoon(); }, 'weather-' + k))));
    box.append(colors(r.colors, COLOR_ROLES));
  } else box.append(el('div', { className: 'hint', textContent: 'Hand-drawn project. Use the pixel tools, import a PNG sheet, or switch type to start from a rig.' }));
}
function buildRig() {
  $('rigpanel').style.display = P.kind === 'machine' ? '' : 'none'; if (P.kind !== 'machine') return;
  const vs = $('rig-view'), views = Object.keys(P.rig.views), keep = views.includes(vs.value) ? vs.value : (views.includes(cur.dir) ? cur.dir : views[0]);
  vs.innerHTML = ''; views.forEach(v => vs.append(el('option', { value: v, textContent: v }))); vs.value = keep;
  const list = $('rig-parts'), was = list.value; list.innerHTML = ''; P.rig.views[keep].forEach(p => list.append(el('option', { value: p.id, textContent: `${p.id}  [${p.s}]${p.p ? '  ← ' + p.p : ''}` })));
  list.value = P.rig.views[keep].some(p => p.id === was) ? was : (P.rig.views[keep][0] || {}).id; showPart();
}
function showPart() {
  const part = P.rig.views[$('rig-view').value].find(p => p.id === $('rig-parts').value); $('rig-anim-name').textContent = A().type;
  $('rig-part-json').value = part ? JSON.stringify(part, null, 1) : ''; $('rig-chan-json').value = part ? JSON.stringify(((P.rig.anims[A().type] || {})[part.id]) || {}) : ''; drawEditor();
}
$('rig-view').onchange = buildRig; $('rig-parts').onchange = showPart;
$('rig-apply').onclick = () => {
  try {
    const view = P.rig.views[$('rig-view').value], i = view.findIndex(p => p.id === $('rig-parts').value), part = JSON.parse($('rig-part-json').value), ch = JSON.parse($('rig-chan-json').value || '{}');
    if (!part.id || !SHAPES.includes(part.s)) throw new Error('part needs an id and a shape: ' + SHAPES.join(', '));
    view[i] = part; const an = P.rig.anims[A().type] = P.rig.anims[A().type] || {}; if (Object.keys(ch).length) an[part.id] = ch; else delete an[part.id];
    buildRig(); $('rig-parts').value = part.id; showPart(); regenSoon(); status('Rig updated.');
  } catch (e) { status('Rig JSON error: ' + e.message); }
};
$('rig-add').onclick = () => { const view = P.rig.views[$('rig-view').value]; let n = view.length + 1; while (view.some(p => p.id === 'part' + n)) n++; view.push({ id: 'part' + n, p: null, s: 'plate', x: P.rig.w / 2, y: P.rig.h / 2, w: 10, h: 10, z: 10 }); buildRig(); $('rig-parts').value = 'part' + n; showPart(); regenSoon(); };
$('rig-del').onclick = () => { const view = P.rig.views[$('rig-view').value], id = $('rig-parts').value; if (view.length < 2) return; view.splice(view.findIndex(p => p.id === id), 1); view.forEach(p => { if (p.p === id) p.p = null; }); buildRig(); regenSoon(); };

// ---------- tabs / frames ----------
function buildTabs() {
  const d = $('dirs'); d.innerHTML = ''; S.dirs.forEach(dir => { const b = el('button', { textContent: dir.toUpperCase(), className: dir === cur.dir ? 'on' : '' }); b.dataset.testid = 'dir-' + dir; b.onclick = () => { cur.dir = dir; undo = []; buildTabs(); buildStrip(); buildRig(); drawEditor(); }; d.append(b); });
  const a = $('anims'); a.innerHTML = ''; S.anims.forEach((an, i) => { const b = el('button', { textContent: an.name, className: i === cur.a ? 'on' : '' }); b.dataset.testid = 'anim-' + an.name; b.onclick = () => { cur.a = i; cur.f = 0; undo = []; buildTabs(); buildStrip(); buildRig(); drawEditor(); }; a.append(b); });
  const types = [...new Set([...ANIM_TYPES, ...(P.rig ? Object.keys(P.rig.anims) : [])])], ts = $('a-type'); ts.innerHTML = ''; types.forEach(t => ts.append(el('option', { value: t, textContent: t })));
  $('a-name').value = A().name; ts.value = A().type; $('a-frames').value = A().frames; $('a-fps').value = A().fps;
  const pv = $('dirprev'); pv.innerHTML = ''; S.dirs.forEach(dir => { const cv = el('canvas'); cv.dataset.dir = dir; pv.append(el('div', {}, [cv, dir])); });
}
function buildStrip() {
  const s = $('strip'); s.innerHTML = ''; const sc = Math.max(1, Math.floor(64 / S.fh)) || 1, k = S.fh > 64 ? 64 / S.fh : sc;
  for (let i = 0; i < A().frames; i++) {
    const cv = el('canvas', { width: S.fw, height: S.fh }); cv.style.width = Math.round(S.fw * k) + 'px'; cv.style.height = Math.round(S.fh * k) + 'px'; cv.getContext('2d').drawImage(SS.cell(S, cur.dir, A().name, i), 0, 0);
    const b = el('div', { className: 'fr' + (i === cur.f ? ' on' : '') + (S.edited.has(SS.key(cur.dir, A().name, i)) ? ' ed' : '') }, [cv, String(i + 1)]); b.dataset.testid = 'frame-' + i; b.onclick = () => { cur.f = i; undo = []; buildStrip(); drawEditor(); }; s.append(b);
  }
}
$('a-name').onchange = e => { const v = e.target.value.trim().replace(/[|\s]/g, '_'); if (!v || S.anims.some(a => a.name === v)) return buildTabs(); SS.renameAnim(S, A().name, v); A().name = v; buildTabs(); autosave(); };
$('a-type').onchange = e => { A().type = e.target.value; buildRig(); regenSoon(); };
$('a-frames').onchange = e => { A().frames = Math.max(1, Math.min(32, +e.target.value || 1)); cur.f = Math.min(cur.f, A().frames - 1); buildTabs(); regenSoon(); };
$('a-fps').onchange = e => { A().fps = Math.max(1, Math.min(30, +e.target.value || 1)); autosave(); };
$('a-add').onclick = () => { let n = 'anim' + (S.anims.length + 1); while (S.anims.some(a => a.name === n)) n += '_'; S.anims.push({ name: n, type: 'idle', frames: 4, fps: 8 }); cur.a = S.anims.length - 1; cur.f = 0; buildTabs(); buildRig(); regenSoon(); };
$('a-del').onclick = () => { if (S.anims.length < 2) return; const a = A(); for (const k of [...S.cells.keys()]) if (k.split('|')[1] === a.name) { S.cells.delete(k); S.edited.delete(k); } S.anims.splice(cur.a, 1); cur.a = 0; cur.f = 0; buildTabs(); buildStrip(); drawEditor(); autosave(); };

// ---------- pixel editor ----------
function checker(c, w, h, s) { for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) { c.fillStyle = ((x + y) / s) % 2 ? '#1b2026' : '#14181d'; c.fillRect(x, y, s, s); } }
function drawEditor() {
  const cv = $('edit'), c = cv.getContext('2d'), W = S.fw * zoom, H = S.fh * zoom; cv.width = W; cv.height = H; c.imageSmoothingEnabled = false; checker(c, W, H, Math.max(4, zoom * 4));
  if (ref && $('ref-overlay').checked) { const k = Math.min(W / ref.width, H / ref.height); c.globalAlpha = $('ref-op').value / 100; c.imageSmoothingEnabled = true; c.drawImage(ref, (W - ref.width * k) / 2, H - ref.height * k, ref.width * k, ref.height * k); c.imageSmoothingEnabled = false; c.globalAlpha = 1; }
  if ($('onion').checked && A().frames > 1) { c.globalAlpha = .28; c.drawImage(SS.cell(S, cur.dir, A().name, (cur.f - 1 + A().frames) % A().frames), 0, 0, W, H); c.globalAlpha = 1; }
  c.drawImage(C(), 0, 0, W, H);
  if ($('grid').checked && zoom >= 6) { c.fillStyle = 'rgba(255,255,255,.06)'; for (let x = 1; x < S.fw; x++) c.fillRect(x * zoom, 0, 1, H); for (let y = 1; y < S.fh; y++) c.fillRect(0, y * zoom, W, 1); }
  if ($('guides').checked) {
    c.fillStyle = 'rgba(63,216,230,.35)'; c.fillRect(Math.round(W / 2), 0, 1, H);
    if (P.kind === 'humanoid') for (const j in JOINTS) c.fillRect(0, Math.round(JOINTS[j] * H), W, 1);
    const tw = P.tiles[0] * 32 * (S.fw / (P.rig ? P.rig.w : S.fw)) * zoom; c.fillStyle = 'rgba(255,59,48,.6)'; c.fillRect((W - tw) / 2, H - 2, tw, 2);
    if (P.kind === 'machine') { renderCellPivots(); const selId = $('rig-parts').value; pivots.forEach(p => { c.fillStyle = p.id === selId ? '#ff3b30' : 'rgba(255,224,112,.7)'; const s = p.id === selId ? 5 : 3; c.fillRect(Math.round(p.x * zoom) - (s >> 1), Math.round(p.y * zoom) - (s >> 1), s, s); }); }
  }
}
function renderCellPivots() { try { pivots = renderRig(null, P.rig, cur.dir, A().type, cur.f, A().frames, S.fw, S.fh, { pivotsOnly: true }); } catch (_) { pivots = []; } }
const pxAt = e => { const r = $('edit').getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * S.fw), Math.floor((e.clientY - r.top) / r.height * S.fh)]; };
const hexOf = d => '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('');
function touch() { S.edited.add(K()); drawEditor(); autosave(); }
function pushUndo() { undo.push(C().getContext('2d').getImageData(0, 0, S.fw, S.fh)); if (undo.length > 40) undo.shift(); }
function paint(x, y) {
  if (x < 0 || y < 0 || x >= S.fw || y >= S.fh) return; const c = C().getContext('2d');
  if (tool === 'pencil') { c.fillStyle = color; c.fillRect(x, y, 1, 1); } else if (tool === 'eraser') c.clearRect(x, y, 1, 1);
  else if (tool === 'pick') { const d = c.getImageData(x, y, 1, 1).data; if (d[3]) setColor(hexOf(d)); return; }
  else if (tool === 'fill') {
    const img = c.getImageData(0, 0, S.fw, S.fh), D = img.data, at = (px, py) => (py * S.fw + px) * 4, o = at(x, y), t = [D[o], D[o + 1], D[o + 2], D[o + 3]], n = parseInt(color.slice(1), 16), rc = [n >> 16, (n >> 8) & 255, n & 255, 255];
    if (t.every((v, i) => v === rc[i])) return; const st = [[x, y]];
    while (st.length) { const [px, py] = st.pop(); if (px < 0 || py < 0 || px >= S.fw || py >= S.fh) continue; const q = at(px, py); if (D[q] !== t[0] || D[q + 1] !== t[1] || D[q + 2] !== t[2] || D[q + 3] !== t[3]) continue; D[q] = rc[0]; D[q + 1] = rc[1]; D[q + 2] = rc[2]; D[q + 3] = 255; st.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]); }
    c.putImageData(img, 0, 0);
  }
  touch();
}
let down = false;
$('edit').addEventListener('pointerdown', e => { e.preventDefault(); down = true; if (tool !== 'pick') pushUndo(); paint(...pxAt(e)); });
$('edit').addEventListener('pointermove', e => { if (down && (tool === 'pencil' || tool === 'eraser')) paint(...pxAt(e)); });
addEventListener('pointerup', () => { if (down) { down = false; buildStrip(); } });
function setColor(c) { color = c; $('color').value = c; }
function buildPalette() {
  const src = P.kind === 'humanoid' ? Object.values(P.cfg.colors) : P.kind === 'machine' ? Object.values(P.rig.colors) : ['#d2ccd0', '#3b3c47', '#121117', '#ff3b30', '#8f1d2a', '#3fd8e6'];
  const sh = (h, f) => { const n = parseInt(h.slice(1), 16), t = f > 0 ? 255 : 0, a = Math.abs(f); return '#' + [16, 8, 0].map(s => Math.round(((n >> s) & 255) * (1 - a) + t * a).toString(16).padStart(2, '0')).join(''); };
  const box = $('palette'); box.innerHTML = ''; [...new Set(src.flatMap(c => [sh(c, .45), c, sh(c, -.3), sh(c, -.55)]))].slice(0, 40).forEach(c => { const i = el('i'); i.style.background = c; i.title = c; i.onclick = () => setColor(c); box.append(i); });
}
document.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => { tool = b.dataset.tool; document.querySelectorAll('[data-tool]').forEach(x => x.classList.toggle('on', x === b)); });
document.querySelectorAll('[data-nudge]').forEach(b => b.onclick = () => { const [dx, dy] = b.dataset.nudge.split(',').map(Number), c = C().getContext('2d'), img = c.getImageData(0, 0, S.fw, S.fh); pushUndo(); c.clearRect(0, 0, S.fw, S.fh); c.putImageData(img, dx, dy); touch(); buildStrip(); });
$('color').oninput = e => { color = e.target.value; };
$('undo').onclick = () => { const u = undo.pop(); if (u) { C().getContext('2d').putImageData(u, 0, 0); touch(); buildStrip(); } };
$('copy').onclick = () => { clip = C().getContext('2d').getImageData(0, 0, S.fw, S.fh); status('Frame copied.'); };
$('paste').onclick = () => { if (!clip) return; pushUndo(); const c = C().getContext('2d'); c.clearRect(0, 0, S.fw, S.fh); c.putImageData(clip, 0, 0); touch(); buildStrip(); };
$('mirror').onclick = () => { pushUndo(); const t = el('canvas', { width: S.fw, height: S.fh }), c = C().getContext('2d'); t.getContext('2d').drawImage(C(), 0, 0); c.clearRect(0, 0, S.fw, S.fh); c.save(); c.translate(S.fw, 0); c.scale(-1, 1); c.drawImage(t, 0, 0); c.restore(); touch(); buildStrip(); };
$('clear').onclick = () => { pushUndo(); C().getContext('2d').clearRect(0, 0, S.fw, S.fh); touch(); buildStrip(); };
['onion', 'grid', 'guides', 'ref-overlay', 'ref-op'].forEach(id => $(id).oninput = drawEditor);
$('zoom').oninput = e => { zoom = +e.target.value; drawEditor(); };
addEventListener('keydown', e => { if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; const k = e.key.toLowerCase(); if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); $('undo').click(); } else if (k === 'b') document.querySelector('[data-tool=pencil]').click(); else if (k === 'e') document.querySelector('[data-tool=eraser]').click(); else if (k === 'g') document.querySelector('[data-tool=fill]').click(); else if (k === 'i') document.querySelector('[data-tool=pick]').click(); else if (k === ',' || k === '.') { cur.f = (cur.f + (k === '.' ? 1 : A().frames - 1)) % A().frames; buildStrip(); drawEditor(); } });

// ---------- preview ----------
function tick(now) {
  if (P && A()) {
    const a = A(), i = playing ? Math.floor(now / 1000 * a.fps) % a.frames : cur.f, pc = $('preview'), k = Math.max(1, Math.min(6, Math.floor(Math.min(240 / S.fw, 260 / S.fh)))) || 1, s = S.fw > 240 || S.fh > 260 ? Math.min(240 / S.fw, 260 / S.fh) : k;
    if (pc.width !== S.fw || pc.height !== S.fh) { pc.width = S.fw; pc.height = S.fh; } pc.style.width = Math.round(S.fw * s) + 'px'; pc.style.height = Math.round(S.fh * s) + 'px';
    const c = pc.getContext('2d'); c.clearRect(0, 0, S.fw, S.fh); c.drawImage(SS.cell(S, cur.dir, a.name, i), 0, 0);
    document.querySelectorAll('#dirprev canvas').forEach(cv => { if (cv.width !== S.fw) { cv.width = S.fw; cv.height = S.fh; const q = Math.min(1, 60 / S.fw, 80 / S.fh) * (S.fw <= 30 ? 2 : 1); cv.style.width = Math.round(S.fw * q) + 'px'; cv.style.height = Math.round(S.fh * q) + 'px'; } const x = cv.getContext('2d'); x.clearRect(0, 0, S.fw, S.fh); x.drawImage(SS.cell(S, cv.dataset.dir, a.name, i), 0, 0); });
  }
  requestAnimationFrame(tick);
}
$('play').onclick = () => { playing = !playing; $('play').textContent = playing ? 'Pause' : 'Play'; };

// ---------- project / import / export ----------
$('pname').onchange = e => { P.name = e.target.value || 'untitled'; autosave(); };
$('set-sel').onchange = async e => { P.active = e.target.value; S = P.sets[P.active]; cur = { dir: S.dirs[0], a: 0, f: 0 }; undo = []; const need = P.kind !== 'blank' && S.cells.size === 0; refresh(); if (need) await generate('all'); };
$('kind').onchange = e => { const k = e.target.value; if (!confirm('Start a new ' + k + ' project? Unsaved work in the current project is lost.')) return ($('kind').value = P.kind); setProject(k === 'humanoid' ? SS.humanoidProject('humanoid') : k === 'machine' ? SS.machineProject('machine', MACHINE_PRESETS['Custom machine (blank rig)']()) : SS.blankProject('hand-drawn')); };
$('btn-new').onclick = () => { if (confirm('Start a new project?')) setProject(SS.humanoidProject('Wraith WTR-07', DEFAULT_CFG)); };
$('btn-save').onclick = () => SS.download(P.name.replace(/\W+/g, '-').toLowerCase() + '.bfsprite.json', SS.serialize(P));
$('btn-open').onclick = () => $('file-proj').click();
$('file-proj').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { await setProject(await SS.deserialize(await f.text())); status('Project opened.'); } catch (err) { status('Open failed: ' + err.message); } e.target.value = ''; };
$('btn-import').onclick = () => $('file-sheet').click();
const loadImg = file => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('not an image')); im.src = URL.createObjectURL(file); });
$('file-sheet').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const im = await loadImg(f), r = SS.importSheet(S, im, Math.max(1, +$('imp-w').value), Math.max(1, +$('imp-h').value)); cur = { dir: S.dirs[0], a: 0, f: 0 }; refresh(); autosave(); status(`Imported ${r.cols} columns × ${r.rows} rows. Frames are marked as hand-edited.`); } catch (err) { status('Import failed: ' + err.message); } e.target.value = ''; };
$('btn-ref').onclick = () => $('file-ref').click();
$('file-ref').onchange = async e => { const f = e.target.files[0]; if (!f) return; ref = await loadImg(f); const cv = $('refcv'); cv.width = ref.width; cv.height = ref.height; cv.getContext('2d').drawImage(ref, 0, 0); $('ref-overlay').checked = true; drawEditor(); status('Reference loaded. Click it to sample colours.'); };
$('refcv').onclick = e => { if (!ref) return; const cv = $('refcv'), r = cv.getBoundingClientRect(), d = cv.getContext('2d').getImageData(Math.floor((e.clientX - r.left) / r.width * cv.width), Math.floor((e.clientY - r.top) / r.height * cv.height), 1, 1).data; setColor(hexOf(d)); };
$('btn-regen-size').onclick = () => { const fw = +$('fw').value, fh = +$('fh').value; if (!(fw >= 4 && fh >= 4)) return; if (S.edited.size && !confirm('Re-rendering replaces hand-edited frames in this set. Continue?')) return; S.fw = fw; S.fh = fh; S.cells = new Map(); S.edited = new Set(); refresh(); generate('all'); };
$('btn-resize').onclick = () => { const fw = +$('fw').value, fh = +$('fh').value; if (!(fw >= 4 && fh >= 4)) return; SS.resizeSet(S, fw, fh); undo = []; refresh(); autosave(); status('Canvas resized; pixels kept 1:1.'); };
$('tw').onchange = $('th').onchange = () => { P.tiles = [Math.max(1, +$('tw').value), Math.max(1, +$('th').value)]; drawEditor(); autosave(); };
$('gen-all').onclick = () => { if (!S.edited.size || confirm('This overwrites hand-edited frames. Continue?')) generate('all'); };
$('gen-unedited').onclick = () => generate('unedited'); $('gen-frame').onclick = () => generate('frame');
const fileBase = () => P.name.replace(/\W+/g, '-').toLowerCase() + '_' + P.active;
const meta = () => ({ name: P.name, kind: P.kind, set: P.active, footprintTiles: P.tiles });
$('btn-export').onclick = () => { const { canvas, meta: m } = SS.buildSheet(S, meta()); canvas.toBlob(b => { SS.download(fileBase() + '.png', b); setTimeout(() => SS.download(fileBase() + '.json', JSON.stringify(m, null, 1)), 300); status(`Exported ${canvas.width}×${canvas.height} transparent sheet + metadata.`); }, 'image/png'); };
$('btn-zip').onclick = async () => {
  const files = [], { meta: m } = SS.buildSheet(S, meta());
  for (const d of S.dirs) for (const a of S.anims) for (let i = 0; i < a.frames; i++) { const blob = await new Promise(r => SS.cell(S, d, a.name, i).toBlob(r, 'image/png')); files.push({ name: `${d}/${a.name}_${String(i).padStart(2, '0')}.png`, data: new Uint8Array(await blob.arrayBuffer()) }); }
  files.push({ name: 'metadata.json', data: new TextEncoder().encode(JSON.stringify(m, null, 1)) }); SS.download(fileBase() + '_frames.zip', SS.zipStore(files)); status(`Exported ${files.length - 1} frames.`);
};
EXAMPLES.forEach(n => $('examples').append(el('option', { value: n, textContent: n })));
$('examples').onchange = async e => { const n = e.target.value; e.target.value = ''; if (!n) return; try { await setProject(await SS.deserialize(await (await fetch(`examples/${n}.bfsprite.json`)).text())); status('Example loaded: ' + n); } catch (err) { status('Example failed: ' + err.message); } };

initRefUI({ SS, apply: async (rig, keep) => {
  if (keep && P.kind === 'machine' && P.rig && P.rig.ref && P.active === 'exploration' && S.fw === rig.w && S.fh === rig.h) {
    P.rig = JSON.parse(JSON.stringify(rig)); P.name = rig.name; P.tiles = rig.tiles;
    for (const n in P.sets) if (P.sets[n] !== S && !P.sets[n].edited.size) P.sets[n].cells = new Map();
    refresh(); await generate('unedited');
  } else await setProject(SS.machineProject(rig.name, rig));
  while (busy) await new Promise(r => setTimeout(r, 20)); return S;
} });
(async () => {
  let p = null; try { const t = localStorage.getItem(LS); if (t) p = await SS.deserialize(t); } catch (_) { p = null; }
  await setProject(p || SS.humanoidProject('Wraith WTR-07', DEFAULT_CFG)); requestAnimationFrame(tick);
})();
